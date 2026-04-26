"""Game WebSocket consumer: pure chess game logic and real-time synchronization.

Handles moves, timeouts, resignations, draw flow, and reconnection.
Also supports spectator connections (friends of players, read-only).
Delegates game rules to services; owns I/O (Redis, WebSocket).
"""
import json
import logging
import asyncio
import contextlib
import secrets
import chess
import time
import redis.asyncio as redis
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from game.services.actions import (
	apply_draw_offer,
	apply_draw_response,
	apply_play_move,
	apply_resign,
)
from game.services.clock import (
	apply_elapsed_for_active_turn,
	ensure_clock_fields,
	is_realtime_clock_enabled,
	mark_timeout_if_needed,
)
from game.services.game_state import (
	ensure_draw_fields,
	calculate_material_advantage,
)
from game.services.payloads import (
	build_group_game_state_event,
	build_ws_game_state_payload,
)
from game.services.state_builder import build_new_game_state, ensure_player_metadata
from game.services.clock_tick import tick_game_clock
from game.services.reconnect import synchronize_reconnecting_player
from game.services.errors import json_invalid, action_unknown

from game.services.save_game import async_save_full_game


logger = logging.getLogger('transcendence')

ACTIVE_GAME_KEY_PREFIX = 'active_game:'
ACTIVE_GAME_TTL = 7200  # 2 h safety TTL
# Une seule persistance BDD ELO par `game_id` (évite double fin abandon+timeout, etc.)
GAME_DB_PERSISTED_KEY_PREFIX = 'chessgame_db_done:'


class GameConsumer(AsyncWebsocketConsumer):
	"""Pure game logic WebSocket consumer: orchestrates moves, timeouts, draw flow.

	Roles:
	- 'player'    — one of the two authenticated players; can act.
	- 'spectator' — accepted friend of a player; read-only.
	- 'training'  — anonymous/local training game; no restrictions.

	Separated from matchmaking consumer for clean domain boundary.
	Delegates business logic to services; owns I/O (Redis, WebSocket).
	"""
	_redis = None

	# Aliases for action names sent by clients
	ACTION_ALIASES = {
		'play': 'play_move',
		'move': 'play_move',
		'resign_game': 'resign',
		'surrender': 'resign',
		'draw': 'draw_offer',
		'offer_draw': 'draw_offer',
		'propose_draw': 'draw_offer',
		'respond_draw': 'draw_response',
		'accept_draw': 'draw_response',
		'refuse_draw': 'draw_response',
		'rematch': 'rematch_offer',
		'offer_rematch': 'rematch_offer',
		'respond_rematch': 'rematch_response',
		'accept_rematch': 'rematch_response',
		'refuse_rematch': 'rematch_response',
	}

	# Actions only players may send
	PLAYER_ONLY_ACTIONS = {'play_move', 'resign', 'draw_offer', 'draw_response', 'create_game', 'reset_game', 'rematch_offer', 'rematch_response'}

	@classmethod
	def get_redis(cls):
		"""Get or initialize Redis async client."""
		if cls._redis is None:
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	# ─── lifecycle ──────────────────────────────────────────────────────────────

	async def connect(self):
		"""Setup: authenticate user, determine role, join group, sync state."""
		self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'default_room')
		if self.game_id == 'matchmaking':
			await self.close()
			return

		self.is_training = self.game_id == 'training'
		self.room_group_name = f'chess_{self.game_id}'
		self.clock_task = None

		# Read session-based user id (custom auth, not Django's built-in)
		session = self.scope.get('session', {})
		raw_uid = session.get('local_user_id') if session else None
		self.auth_user_id = str(raw_uid) if raw_uid is not None else None

		# Default role; updated below once game state is known
		self.role = 'training' if self.is_training else None

		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		await self.accept()

		# Reconnecting client: sync state and determine role
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = None
		if game_state_json is not None:
			game_state = json.loads(game_state_json)
			if not self.is_training:
				self.role = await self._resolve_role(game_state)
				if self.role is None:
					# Not a player nor an accepted friend — deny
					await self.send(text_data=json.dumps({'error': 'Accès refusé à cette partie'}))
					await self.close(code=4403)
					return
			if self.role == 'player':
				await _set_active_game(self.auth_user_id, self.game_id)
			await self.handle_reconnect(game_state_json)
		elif not self.is_training and self.auth_user_id is None:
			# No game state yet and unauthenticated on a real game → reject
			await self.send(text_data=json.dumps({'error': 'Authentification requise'}))
			await self.close(code=4401)
			return

		await self._sync_clock_task(game_state)

	async def disconnect(self, close_code):
		if hasattr(self, 'room_group_name'):
			await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
		await self._stop_clock_task()
		# Clear active presence when a player disconnects
		if getattr(self, 'role', None) == 'player' and getattr(self, 'auth_user_id', None):
			await _clear_active_game(self.auth_user_id, self.game_id)

	# ─── role resolution ────────────────────────────────────────────────────────

	async def _resolve_role(self, game_state):
		"""Return 'player', 'spectator', or None based on user identity and game state."""
		if self.auth_user_id is None:
			return None
		white_id = str(game_state.get('white_player_id', ''))
		black_id = str(game_state.get('black_player_id', ''))
		if self.auth_user_id in (white_id, black_id):
			return 'player'
		# Check if accepted friend of one of the players
		player_ids = []
		for pid in (white_id, black_id):
			try:
				player_ids.append(int(pid))
			except (ValueError, TypeError):
				pass
		if player_ids and await _is_accepted_friend_of_any(self.auth_user_id, player_ids):
			return 'spectator'
		return None

	# ─── clock helpers ──────────────────────────────────────────────────────────

	async def _stop_clock_task(self):
		"""Stop background clock task if it is currently running."""
		if self.clock_task is not None:
			self.clock_task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await self.clock_task
			self.clock_task = None

	async def _sync_clock_task(self, game_state):
		"""Start or stop per-second ticking depending on cadence metadata."""
		should_run = game_state is None or is_realtime_clock_enabled(game_state)
		if should_run and self.clock_task is None:
			self.clock_task = asyncio.create_task(self._clock_loop())
		elif not should_run:
			await self._stop_clock_task()

	async def _clock_loop(self):
		"""Tick clock every second: apply time decay, detect timeout, broadcast state."""
		while True:
			await asyncio.sleep(1)
			await self._tick_game_clock()

	async def _tick_game_clock(self):
		"""Apply one second of time decay and detect timeouts; trigger DB save on timeout."""
		_, timed_out_state = await tick_game_clock(
			self.get_redis(),
			self.game_id,
			self.channel_name,
			self.channel_layer,
			self.room_group_name,
			build_group_game_state_event,
		)
		if timed_out_state is not None:
			winner_id = timed_out_state.get('winner_player_id')
			await self._save_and_broadcast_final_state(timed_out_state, winner_id, 'timeout')

	# ─── broadcast helpers ──────────────────────────────────────────────────────

	async def _broadcast_current_game_state(self, game_state):
		"""Broadcast game state to all connected clients in the game group."""
		await self.channel_layer.group_send(self.room_group_name, build_group_game_state_event(game_state))

	async def _close_invite_joinability(self, reason='game_finished'):
		closed_invites = await _close_invite_joinability_for_game(self.game_id, reason)
		for invite in closed_invites:
			payload = {'action': 'invite_updated', 'invite': invite}
			for key in ('sender_id', 'receiver_id'):
				uid = invite.get(key)
				if uid:
					await self.channel_layer.group_send(
						f"user_{int(uid)}",
						{'type': 'notification', 'data': payload},
					)

	# ─── receive / routing ──────────────────────────────────────────────────────

	def _normalize_action(self, data):
		"""Map raw action name to canonical handler name using aliases."""
		raw_action = data.get('action', data.get('type'))
		action = str(raw_action).lower() if raw_action is not None else None
		return self.ACTION_ALIASES.get(action, action)

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
		except json.JSONDecodeError:
			await self.send(text_data=json.dumps(json_invalid()))
			return

		action = self._normalize_action(data)
		if action is None:
			await self.send(text_data=json.dumps(action_unknown()))
			return

		# Spectators may only observe — reject any mutating action
		if getattr(self, 'role', None) == 'spectator' and action in self.PLAYER_ONLY_ACTIONS:
			await self.send(text_data=json.dumps({'error': 'Les spectateurs ne peuvent pas agir'}))
			return

		# Anti-spoof: override player_id with the authenticated user's id
		if getattr(self, 'auth_user_id', None) and action in self.PLAYER_ONLY_ACTIONS:
			data = dict(data)
			data['player_id'] = self.auth_user_id

		game_state_json = await self.get_redis().get(self.game_id)
		await self._handle_action_with_game_state(action, data, game_state_json)

	async def _handle_action_with_game_state(self, action, data, game_state_json):
		"""Route action to appropriate handler based on action type."""
		if action == 'create_game':
			await self.handle_create_game(data)
			return

		if action == 'reset_game':
			r = self.get_redis()
			await r.delete(self.game_id)
			await r.delete(f'{GAME_DB_PERSISTED_KEY_PREFIX}{self.game_id}')
			await self.handle_create_game(data)
			return

		game_action_handlers = {
			'play_move': self.handle_play_move,
			'resign': self.handle_resign,
			'draw_offer': self.handle_draw_offer,
			'draw_response': self.handle_draw_response,
			'rematch_offer': self.handle_rematch_offer,
			'rematch_response': self.handle_rematch_response,
			'reconnect': self.handle_reconnect,
		}

		handler = game_action_handlers.get(action)
		if handler is None:
			await self.send(text_data=json.dumps({'error': 'Action inconnue ou état inexistant'}))
			return

		if action == 'reconnect' and game_state_json is None:
			return
		if action == 'reconnect':
			await handler(game_state_json)
			return

		await handler(game_state_json, data)

	# ─── helpers ────────────────────────────────────────────────────────────────

	async def _load_game_state_or_send_error(self, game_state_json):
		"""Parse game state JSON or send error if not found."""
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return None
		return json.loads(game_state_json)

	def _build_final_game_data(self, game_state, winner_id, termination_reason):
		"""Build normalized payload for final game persistence."""
		start_timestamp = game_state.get('start_timestamp', time.time())
		if winner_id == game_state.get('white_player_id'):
			game_result = 'white'
		elif winner_id == game_state.get('black_player_id'):
			game_result = 'black'
		else:
			game_result = 'draw'
		return {
			'player_white_id': game_state['white_player_id'],
			'player_black_id': game_state['black_player_id'],
			'winner_id': winner_id,
			'game_result': game_result,
			'start_timestamp': start_timestamp,
			'duration_seconds': int(time.time() - start_timestamp),
			'time_control_seconds': int(game_state.get('time_control_seconds', 600)),
			'increment_seconds': int(game_state.get('increment_seconds', game_state.get('increment', 0))),
			'time_category': game_state.get('time_category', 'rapid'),
			'is_competitive': bool(game_state.get('is_competitive', False)),
			'is_rated': bool(game_state.get('is_rated', game_state.get('is_competitive', False))),
			'game_mode': game_state.get('game_mode', 'standard'),
			'termination_reason': termination_reason,
			'moves': game_state.get('moves', []),
		}

	async def _save_and_broadcast_final_state(self, game_state, winner_id, termination_reason):
		"""Save game to DB, broadcast final state with Elo deltas, clear presence and invites.

		Idempotent: seul le premier finalisateur exécute la persistance BDD (SETNX) pour
		éviter double Elo / deux lignes Game si timeout et resign arrivent en course.
		L'état terminal est enregistré dans Redis *avant* l'appel BDD long pour que le tick
		d'horloge et l'autre joueur voient tout de suite une partie non active.
		"""
		r = self.get_redis()
		persist_key = f'{GAME_DB_PERSISTED_KEY_PREFIX}{self.game_id}'
		got_persist = await r.set(
			persist_key,
			json.dumps({'reason': termination_reason, 't': time.time()}),
			nx=True,
			ex=ACTIVE_GAME_TTL,
		)
		if not got_persist:
			# Une autre tâche a déjà finalisé (abandon, mat, nulle, timeout…)
			existing = await r.get(self.game_id)
			if existing is not None:
				parsed = json.loads(existing)
				await self._broadcast_current_game_state(parsed)
			return

		# Pinner l'état terminal immédiatement (avant la BDD) pour l'horloge et l'autre client WS
		await r.set(self.game_id, json.dumps(game_state))

		final_game_data = self._build_final_game_data(game_state, winner_id, termination_reason)
		try:
			success, deltas = await async_save_full_game(final_game_data)
		except Exception:
			await r.delete(persist_key)
			raise
		if not success:
			await r.delete(persist_key)
			logger.warning(
				"Game finalization: DB save failed, persist lock released for retry",
				extra={"game_id": self.game_id, "termination_reason": termination_reason},
			)
			return

		game_state['elo_deltas'] = deltas if isinstance(deltas, dict) else {}
		await r.set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)
		await self._close_invite_joinability('game_finished')
		for pid_key in ('white_player_id', 'black_player_id'):
			pid = game_state.get(pid_key)
			if pid is not None:
				await _clear_active_game(str(pid), self.game_id)
		logger.info(
			"Game finished",
			extra={
				"action": "game_finished",
				"game_id": self.game_id,
				"termination_reason": termination_reason,
				"winner_id": winner_id,
				"player_white_id": game_state['white_player_id'],
				"player_black_id": game_state['black_player_id'],
			},
		)

	# ─── action handlers ────────────────────────────────────────────────────────

	async def handle_create_game(self, data):
		"""Create a new chess game with given white and black player IDs."""
		white_id = data.get('white_id', 42)
		black_id = data.get('black_id', 84)
		time_control = data.get('time_control', 600)
		increment = data.get('increment', 0)
		competitive = bool(data.get('competitive', False))

		r = self.get_redis()
		# Repartir de zéro : même `game_id` = nouvelle partie (souvent `reset_game` a déjà nettoyé)
		await r.delete(f'{GAME_DB_PERSISTED_KEY_PREFIX}{self.game_id}')

		new_game_state = await build_new_game_state(white_id, black_id, time_control, increment, competitive)
		await r.set(self.game_id, json.dumps(new_game_state))

		# Register the connecting player's active game
		if self.auth_user_id:
			await _set_active_game(self.auth_user_id, self.game_id)
			self.role = 'player'

		await self._sync_clock_task(new_game_state)
		logger.info(
			"Players started a game",
			extra={
				"action": "game_started",
				"game_id": self.game_id,
				"player_white_id": white_id,
				"player_black_id": black_id,
				"time_control": time_control,
				"increment": increment,
				"competitive": competitive,
			},
		)
		await self._broadcast_current_game_state(new_game_state)

	async def handle_play_move(self, game_state_json, data):
		"""Process a chess move: validate, apply, check timeout, broadcast."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		board = chess.Board(game_state['fen'])
		move_number = len(game_state.get('moves', [])) + 1
		move_start_time = game_state.get('turn_start_timestamp', game_state.get('last_move_timestamp', time.time()))
		pieces = {"p": "pawn", "n": "knight", "b": "bishop", "r": "rook", "q": "queen", "k": "king"}
		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		ensure_draw_fields(game_state)
		await ensure_player_metadata(game_state)

		apply_elapsed_for_active_turn(game_state, board, now_ts)
		if mark_timeout_if_needed(game_state, board):
			await self.send(text_data=json.dumps({'error': 'Temps ecoule. La partie est terminee.'}))
			winner_id = game_state.get('winner_player_id')
			await self._save_and_broadcast_final_state(game_state, winner_id, 'timeout')
			return

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		move = chess.Move.from_uci(data.get('move'))
		piece = board.piece_at(move.from_square)
		piece_symbol = piece.symbol().lower() if piece else "unknown"

		success, error = apply_play_move(game_state, data.get('player_id'), data.get('move'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		final_board = chess.Board(game_state['fen'])
		advantage = calculate_material_advantage(final_board)

		move_obj = {
			'player_id': str(data.get('player_id')),
			'move_number': move_number,
			'san_notation': data.get('move'),
			'piece_played': pieces.get(piece_symbol, "unknown"),
			'time_taken_ms': int((time.time() - move_start_time) * 1000),
			'material_advantage': advantage,
		}
		game_state.setdefault('moves', []).append(move_obj)

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

		updated_board = chess.Board(game_state['fen'])
		if updated_board.is_game_over():
			outcome = updated_board.outcome()
			if outcome and outcome.winner == chess.WHITE:
				winner_id = game_state['white_player_id']
			elif outcome and outcome.winner == chess.BLACK:
				winner_id = game_state['black_player_id']
			else:
				winner_id = None
			await self._save_and_broadcast_final_state(game_state, winner_id, 'checkmate_or_draw')
			return

	async def handle_resign(self, game_state_json, data):
		"""Process player resignation and end game."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		success, error = apply_resign(game_state, data.get('player_id'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		winner_id = game_state.get('winner_player_id')
		await self._save_and_broadcast_final_state(game_state, winner_id, 'resign')

	async def handle_draw_offer(self, game_state_json, data):
		"""Process draw offer from a player."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		success, error = apply_draw_offer(game_state, data.get('player_id'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_draw_response(self, game_state_json, data):
		"""Process accept/reject of draw offer."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		success, error = apply_draw_response(
			game_state,
			data.get('player_id'),
			data.get('accept'),
			data.get('response'),
		)
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

		if game_state.get('status') == 'draw':
			await self._save_and_broadcast_final_state(game_state, None, 'draw_agreement')

	async def handle_reconnect(self, game_state_json):
		"""Re-sync reconnecting player with current game state."""
		game_state, _ = await synchronize_reconnecting_player(self.get_redis(), self.game_id, game_state_json)
		if game_state is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return
		payload = build_ws_game_state_payload(game_state)
		# Inform spectators of their role so the UI can disable controls
		if getattr(self, 'role', None) == 'spectator':
			payload['spectator'] = True
		await self.send(text_data=json.dumps(payload))

	async def broadcast_game_state(self, event):
		"""Send game state to this WebSocket client (called by group_send)."""
		payload = build_ws_game_state_payload(event['game_state'], event['action'])
		if getattr(self, 'role', None) == 'spectator':
			payload['spectator'] = True
		await self.send(text_data=json.dumps(payload))

	# ─── rematch handlers ────────────────────────────────────────────────────────

	async def handle_rematch_offer(self, game_state_json, data):
		"""Process rematch offer from a player after game ends."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		if game_state.get('status') == 'active':
			await self.send(text_data=json.dumps({'error': 'La partie est encore en cours'}))
			return

		sender_id = str(data.get('player_id', ''))
		white_id = str(game_state.get('white_player_id', ''))
		black_id = str(game_state.get('black_player_id', ''))
		if sender_id not in (white_id, black_id):
			await self.send(text_data=json.dumps({'error': 'Joueur invalide pour cette partie'}))
			return

		if game_state.get('rematch_offer_from_player_id') is not None:
			await self.send(text_data=json.dumps({'error': 'Une proposition de revanche est déjà en cours'}))
			return

		game_state['rematch_offer_from_player_id'] = sender_id
		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_rematch_response(self, game_state_json, data):
		"""Accept or decline a rematch offer; create new game on acceptance."""
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		offer_from = game_state.get('rematch_offer_from_player_id')
		if offer_from is None:
			await self.send(text_data=json.dumps({'error': 'Aucune proposition de revanche en cours'}))
			return

		sender_id = str(data.get('player_id', ''))
		white_id = str(game_state.get('white_player_id', ''))
		black_id = str(game_state.get('black_player_id', ''))
		if sender_id not in (white_id, black_id):
			await self.send(text_data=json.dumps({'error': 'Joueur invalide pour cette partie'}))
			return

		if sender_id == str(offer_from):
			await self.send(text_data=json.dumps({'error': 'Vous ne pouvez pas accepter votre propre proposition de revanche'}))
			return

		accept = data.get('accept', False)
		if isinstance(accept, str):
			accept = accept.lower() in ('true', '1', 'yes', 'accept', 'accepted')

		if not accept:
			game_state['rematch_offer_from_player_id'] = None
			await self.get_redis().set(self.game_id, json.dumps(game_state))
			await self._broadcast_current_game_state(game_state)
			return

		# Both accepted — create a new game with swapped colors
		new_game_id = f"rematch_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
		# Loser (original black) gets white in the rematch; winners swap sides
		new_white_id = black_id
		new_black_id = white_id
		time_control = int(game_state.get('time_control_seconds', 600))
		increment = int(game_state.get('increment_seconds', game_state.get('increment', 0)))
		competitive = bool(game_state.get('is_competitive', False))

		new_game_state = await build_new_game_state(new_white_id, new_black_id, time_control, increment, competitive)
		await self.get_redis().set(new_game_id, json.dumps(new_game_state))

		logger.info(
			"Rematch started",
			extra={
				"action": "rematch_started",
				"original_game_id": self.game_id,
				"new_game_id": new_game_id,
				"new_white_player_id": new_white_id,
				"new_black_player_id": new_black_id,
			},
		)

		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'rematch_started_event',
				'new_game_id': new_game_id,
				'white_player_id': new_white_id,
				'black_player_id': new_black_id,
			},
		)

	async def rematch_started_event(self, event):
		"""Send rematch_started notification to this WebSocket client."""
		await self.send(text_data=json.dumps({
			'action': 'rematch_started',
			'new_game_id': event['new_game_id'],
			'white_player_id': event['white_player_id'],
			'black_player_id': event['black_player_id'],
		}))


# ─── Redis active-game helpers ───────────────────────────────────────────────

async def _set_active_game(user_id: str, game_id: str):
	"""Record that a user is currently in game_id."""
	try:
		import redis.asyncio as _redis
		r = _redis.from_url(settings.CACHES['default']['LOCATION'])
		await r.set(f'{ACTIVE_GAME_KEY_PREFIX}{user_id}', game_id, ex=ACTIVE_GAME_TTL)
	except Exception:
		pass


async def _clear_active_game(user_id: str, game_id: str):
	"""Remove the active-game marker only if it still points to this game."""
	try:
		import redis.asyncio as _redis
		r = _redis.from_url(settings.CACHES['default']['LOCATION'])
		current = await r.get(f'{ACTIVE_GAME_KEY_PREFIX}{user_id}')
		if current and current.decode() == game_id:
			await r.delete(f'{ACTIVE_GAME_KEY_PREFIX}{user_id}')
	except Exception:
		pass


def get_active_game_sync(user_id: int) -> str | None:
	"""Synchronous helper used by HTTP views to read a user's active game."""
	try:
		import redis as _redis_sync
		r = _redis_sync.from_url(settings.CACHES['default']['LOCATION'])
		val = r.get(f'{ACTIVE_GAME_KEY_PREFIX}{user_id}')
		return val.decode() if val else None
	except Exception:
		return None


# ─── DB helpers ──────────────────────────────────────────────────────────────

@database_sync_to_async
def _is_accepted_friend_of_any(user_id_str: str, player_ids: list[int]) -> bool:
	"""Return True if user_id is an accepted friend of any id in player_ids."""
	from django.db.models import Q
	from accounts.models import Friendship
	try:
		uid = int(user_id_str)
	except (ValueError, TypeError):
		return False
	return Friendship.objects.filter(
		status='accepted',
	).filter(
		Q(from_user_id=uid, to_user_id__in=player_ids) |
		Q(from_user_id__in=player_ids, to_user_id=uid)
	).exists()


@database_sync_to_async
def _close_invite_joinability_for_game(game_id, reason='game_finished'):
	from chat.models import GameInvite

	closed = []
	invites = GameInvite.objects.filter(
		game_id=str(game_id),
		status=GameInvite.STATUS_ACCEPTED,
	).select_related('source_message')

	for invite in invites:
		invite.cancel_reason = reason
		invite.game_id = None
		invite.save(update_fields=['cancel_reason', 'game_id', 'updated_at'])

		msg = invite.source_message
		if msg is not None:
			try:
				content_obj = json.loads(msg.content)
			except (TypeError, ValueError, json.JSONDecodeError):
				content_obj = {}
			content_obj['invite_status'] = invite.status
			content_obj['cancel_reason'] = invite.cancel_reason
			content_obj['game_id'] = None
			msg.content = json.dumps(content_obj)
			msg.save(update_fields=['content'])

		closed.append(invite.to_dict())

	return closed
