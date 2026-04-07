"""Game WebSocket consumer: pure chess game logic and real-time synchronization.

Handles moves, timeouts, resignations, draw flow, and reconnection.
Delegates game rules to services; owns I/O (Redis, WebSocket).
"""
import json
import asyncio
import contextlib
import chess
import time
import redis.asyncio as redis
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


class GameConsumer(AsyncWebsocketConsumer):
	"""Pure game logic WebSocket consumer: orchestrates moves, timeouts, draw flow.
	
	Separated from matchmaking consumer for clean domain boundary.
	Delegates business logic to services; owns I/O (Redis, WebSocket).
	"""
	_redis = None
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
	}

	@classmethod
	def get_redis(cls):
		"""Get or initialize Redis async client."""
		if cls._redis is None:
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	async def connect(self):
		"""Setup: join group, accept, send prior state if reconnecting, start clock."""
		self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'default_room')
		if self.game_id == 'matchmaking':
			await self.close()
			return

		self.room_group_name = f'chess_{self.game_id}'
		self.clock_task = None

		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		await self.accept()

		# Reconnecting client: sync state immediately
		game_state_json = await self.get_redis().get(self.game_id)
		game_state = None
		if game_state_json is not None:
			game_state = json.loads(game_state_json)
			await self.handle_reconnect(game_state_json)

		await self._sync_clock_task(game_state)

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
		await self._stop_clock_task()

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

	async def _broadcast_current_game_state(self, game_state):
		"""Broadcast game state to all connected clients in the game group."""
		await self.channel_layer.group_send(self.room_group_name, build_group_game_state_event(game_state))

	async def _tick_game_clock(self):
		"""Apply one second of time decay and detect timeouts."""
		await tick_game_clock(
			self.get_redis(),
			self.game_id,
			self.channel_name,
			self.channel_layer,
			self.room_group_name,
			build_group_game_state_event,
		)

	async def _clock_loop(self):
		"""Tick clock every second: apply time decay, detect timeout, broadcast state."""
		while True:
			await asyncio.sleep(1)
			await self._tick_game_clock()

	def _normalize_action(self, data):
		"""Map raw action name to canonical handler name using aliases."""
		raw_action = data.get('action', data.get('type'))
		action = str(raw_action).lower() if raw_action is not None else None
		return self.ACTION_ALIASES.get(action, action)

	async def _load_game_state_or_send_error(self, game_state_json):
		"""Parse game state JSON or send error if not found."""
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return None
		return json.loads(game_state_json)

	def _build_final_game_data(self, game_state, winner_id, termination_reason):
		"""Build normalized payload for final game persistence."""
		start_timestamp = game_state.get('start_timestamp', time.time())
		return {
			'player_white_id': game_state['white_player_id'],
			'player_black_id': game_state['black_player_id'],
			'winner_id': winner_id,
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

	async def _handle_action_with_game_state(self, action, data, game_state_json):
		"""Route action to appropriate handler based on action type."""
		# Game creation: no prior state needed
		if action == 'create_game':
			await self.handle_create_game(data)
			return

		if action == 'reset_game':
			await self.get_redis().delete(self.game_id)
			await self.handle_create_game(data)
			return

		# Game actions: dispatch table for clean routing
		game_action_handlers = {
			'play_move': self.handle_play_move,
			'resign': self.handle_resign,
			'draw_offer': self.handle_draw_offer,
			'draw_response': self.handle_draw_response,
			'reconnect': self.handle_reconnect,
		}

		handler = game_action_handlers.get(action)
		if handler is None:
			await self.send(text_data=json.dumps({'error': 'Action inconnue ou état inexistant'}))
			return

		# Reconnect only available if game exists; skip if not
		if action == 'reconnect' and game_state_json is None:
			return

		if action == 'reconnect':
			await handler(game_state_json)
			return

		await handler(game_state_json, data)

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

		game_state_json = await self.get_redis().get(self.game_id)
		await self._handle_action_with_game_state(action, data, game_state_json)

	async def handle_create_game(self, data):
		"""Create a new chess game with given white and black player IDs."""

		white_id = data.get('white_id', 42)
		black_id = data.get('black_id', 84)
		time_control = data.get('time_control', 600)
		increment = data.get('increment', 0)
		competitive = bool(data.get('competitive', False))

		new_game_state = await build_new_game_state(white_id, black_id, time_control, increment, competitive)
		await self.get_redis().set(self.game_id, json.dumps(new_game_state))
		await self._sync_clock_task(new_game_state)
		await self._broadcast_current_game_state(new_game_state)

	async def handle_play_move(self, game_state_json, data):
		"""Process a chess move: validate, apply, check timeout, broadcast."""
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return
 
		board = chess.Board(game_state['fen'])
		move_number = len(game_state.get('moves', [])) + 1
		move_start_time = game_state['last_move_timestamp']	
		pieces = {"p": "pawn", "n": "knight", "b": "bishop", "r": "rook", "q": "queen", "k": "king"}
		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		ensure_draw_fields(game_state)
		await ensure_player_metadata(game_state)

		apply_elapsed_for_active_turn(game_state, board, now_ts)
		if mark_timeout_if_needed(game_state, board):
			await self.get_redis().set(self.game_id, json.dumps(game_state))
			await self._broadcast_current_game_state(game_state)
			await self.send(text_data=json.dumps({'error': 'Temps ecoule. La partie est terminee.'}))
			winner_id = game_state.get('winner_player_id')
			final_game_data = self._build_final_game_data(game_state, winner_id, 'timeout')
	
			success = await async_save_full_game(final_game_data)
			if success:
				print("Fin de match : Stockage parfait et optimisé en Model accompli.")
			else:
				print("Alerte: Un problème est survenu et la database n'a pas été affectée.")
			#end game
			return

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		success, error = apply_play_move(game_state, data.get('player_id'), data.get('move'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		# On traque le mouvement AVANT de sauvegarder dans Redis !
		move = chess.Move.from_uci(data.get('move'))
		piece = board.piece_at(move.from_square)
		piece_symbol = piece.symbol().lower()
		move_obj = {
			'player_id': data.get('player_id'),
			'move_number': move_number,
			'san_notation': data.get('move'),
			'piece_played': pieces.get(piece_symbol, "unknown"),
			'time_taken_ms': int((time.time() - move_start_time) * 1000),
			'material_advantage': 0
		}
		game_state.setdefault('moves', []).append(move_obj)

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)
##########################
		
		if board.is_game_over():
			result = board.result()
			if result.winner == chess.WHITE:
				winner_id = game_state['white_player_id']
			elif result.winner == chess.BLACK:
				winner_id = game_state['black_player_id']
			else:
				winner_id = None

			final_game_data = self._build_final_game_data(game_state, winner_id, 'checkmate_or_draw')
	
			success = await async_save_full_game(final_game_data)
			if success:
				print("Fin de match : Stockage parfait et optimisé en Model accompli.")
			else:
				print("Alerte: Un problème est survenu et la database n'a pas été affectée.")
			#end game
			return
##########################
	async def handle_resign(self, game_state_json, data):
		"""Process player resignation and end game."""
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		success, error = apply_resign(game_state, data.get('player_id'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)
##########################
		winner_id = game_state.get('winner_player_id')

		final_game_data = self._build_final_game_data(game_state, winner_id, 'resign')

		success = await async_save_full_game(final_game_data)
		if success:
			print("Fin de match : Stockage parfait et optimisé en Model accompli.")
		else:
			print("Alerte: Un problème est survenu et la database n'a pas été affectée.")
		#end game
##########################
	async def handle_draw_offer(self, game_state_json, data):
		"""Process draw offer from a player."""
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
##########################
		if game_state.get('status') == 'draw':
			final_game_data = self._build_final_game_data(game_state, None, 'draw_agreement')
			success = await async_save_full_game(final_game_data)
			if success:
				print("Fin de match : Stockage parfait et optimisé en Model accompli.")
			else:
				print("Alerte: Un problème est survenu et la database n'a pas été affectée.")
			#end game
##########################
	async def handle_reconnect(self, game_state_json):
		"""Re-sync reconnecting player with current game state."""
		game_state, _ = await synchronize_reconnecting_player(self.get_redis(), self.game_id, game_state_json)
		if game_state is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return
		await self.send(text_data=json.dumps(build_ws_game_state_payload(game_state)))

	async def broadcast_game_state(self, event):
		"""Send game state to this WebSocket client (called by group_send)."""
		await self.send(text_data=json.dumps(build_ws_game_state_payload(event['game_state'], event['action'])))
