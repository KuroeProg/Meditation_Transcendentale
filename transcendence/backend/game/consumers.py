import json
import asyncio
import contextlib
import chess
import time
import secrets
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)


class ChessConsumer(AsyncWebsocketConsumer):
	_redis = None
	MATCHMAKING_ROOM_ID = 'matchmaking'
	MATCHMAKING_QUEUE_KEY = 'matchmaking:queue'
	
	@classmethod
	def get_redis(cls):
		if cls._redis is None:
			# On récupère l'URL seulement quand on en a besoin
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	async def connect(self):
		# On récupère l'ID de la partie depuis l'URL (ex: /ws/chess/123/)
		self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'default_room')
		self.room_group_name = f'chess_{self.game_id}'
		self.is_matchmaking_room = self.game_id == self.MATCHMAKING_ROOM_ID
		self.matchmaking_player_id = None
		self.clock_task = None

		# REJOINDRE LE GROUPE (C'est ici que Redis connecte les deux joueurs)
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
		await self.accept()

		# A la reconnexion, renvoyer immédiatement l'état courant au client.
		game_state_json = await self.get_redis().get(self.game_id)
		if game_state_json is not None:
			await self.handle_reconnect(game_state_json)

		if not self.is_matchmaking_room:
			self.clock_task = asyncio.create_task(self._clock_loop())

	async def disconnect(self, close_code):
		# QUITTER LE GROUPE
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)

		if self.is_matchmaking_room and self.matchmaking_player_id is not None:
			await self._remove_from_matchmaking_queue(self.matchmaking_player_id)
			await self._broadcast_matchmaking_queue_size()

		if self.clock_task is not None:
			self.clock_task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await self.clock_task
			self.clock_task = None

	def _ensure_clock_fields(self, game_state):
		if 'white_time_left' not in game_state:
			game_state['white_time_left'] = 600
		if 'black_time_left' not in game_state:
			game_state['black_time_left'] = 600
		if 'last_move_timestamp' not in game_state:
			game_state['last_move_timestamp'] = time.time()

	def _ensure_draw_fields(self, game_state):
		if 'draw_offer_from_player_id' not in game_state:
			game_state['draw_offer_from_player_id'] = None

	async def _ensure_player_profiles(self, game_state):
		changed = False
		white_id = game_state.get('white_player_id')
		black_id = game_state.get('black_player_id')

		if 'white_player_profile' not in game_state or not isinstance(game_state.get('white_player_profile'), dict):
			profile = await fetch_user_public_profile(white_id)
			if profile is not None:
				game_state['white_player_profile'] = profile
				changed = True

		if 'black_player_profile' not in game_state or not isinstance(game_state.get('black_player_profile'), dict):
			profile = await fetch_user_public_profile(black_id)
			if profile is not None:
				game_state['black_player_profile'] = profile
				changed = True

		return changed

	def _clear_draw_offer(self, game_state):
		game_state['draw_offer_from_player_id'] = None

	def _normalize_game_player_ids(self, game_state):
		white_id = self._normalize_player_id(game_state.get('white_player_id'))
		black_id = self._normalize_player_id(game_state.get('black_player_id'))
		return white_id, black_id

	def _is_player_in_game(self, sender_id, game_state):
		white_id, black_id = self._normalize_game_player_ids(game_state)
		return sender_id == white_id or sender_id == black_id

	def _get_other_player_id(self, sender_id, game_state):
		white_id, black_id = self._normalize_game_player_ids(game_state)
		if sender_id == white_id:
			return black_id
		if sender_id == black_id:
			return white_id
		return None

	async def _broadcast_current_game_state(self, game_state):
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'broadcast_game_state',
				'action': 'game_state',
				'game_state': game_state,
			},
		)

	def _apply_elapsed_for_active_turn(self, game_state, board, now_ts):
		if game_state.get('status') != 'active':
			return

		last_ts = float(game_state.get('last_move_timestamp', now_ts))
		elapsed = max(0.0, now_ts - last_ts)
		if elapsed <= 0:
			return

		if board.turn:
			key = 'white_time_left'
		else:
			key = 'black_time_left'

		remaining = max(0.0, float(game_state.get(key, 0)) - elapsed)
		game_state[key] = remaining
		game_state['last_move_timestamp'] = now_ts

	def _mark_timeout_if_needed(self, game_state, board):
		if game_state.get('status') != 'active':
			return False

		turn_key = 'white_time_left' if board.turn else 'black_time_left'
		remaining = float(game_state.get(turn_key, 0))
		if remaining > 0:
			return False

		winner_id = game_state['black_player_id'] if board.turn else game_state['white_player_id']
		game_state['status'] = 'timeout'
		game_state['winner_player_id'] = winner_id
		game_state['result'] = '1-0' if winner_id == game_state['white_player_id'] else '0-1'
		return True

	async def _tick_game_clock(self):
		if self.is_matchmaking_room:
			return

		lock_key = f'clock_lock:{self.game_id}'
		got_lock = await self.get_redis().set(lock_key, self.channel_name, ex=2, nx=True)
		if not got_lock:
			return

		game_state_json = await self.get_redis().get(self.game_id)
		if game_state_json is None:
			return

		game_state = json.loads(game_state_json)
		if game_state.get('status') != 'active':
			return

		self._ensure_clock_fields(game_state)
		board = chess.Board(game_state['fen'])
		now_ts = time.time()
		self._apply_elapsed_for_active_turn(game_state, board, now_ts)
		self._mark_timeout_if_needed(game_state, board)

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'broadcast_game_state',
				'action': 'game_state',
				'game_state': game_state,
			},
		)

	async def _clock_loop(self):
		while True:
			await asyncio.sleep(1)
			await self._tick_game_clock()

	async def receive(self, text_data):
		data = json.loads(text_data)
		raw_action = data.get('action', data.get('type'))
		action = str(raw_action).lower() if raw_action is not None else None
		action_aliases = {
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
		action = action_aliases.get(action, action)

		if action == 'join_queue':
			await self.handle_join_queue(data)
			return
		if action == 'leave_queue':
			await self.handle_leave_queue(data)
			return

		# On utilise le game_id de l'URL comme clé Redis
		game_state_json = await self.get_redis().get(self.game_id)

		if action == 'create_game':
			# Permet de créer une nouvelle partie ou de réinitialiser une existante
			await self.handle_create_game(data)
		elif action == 'reset_game':
			# Réinitialise la partie et la crée vierge
			await self.get_redis().delete(self.game_id)
			await self.handle_create_game(data)
		elif action == 'play_move':
			await self.handle_play_move(game_state_json, data)
		elif action == 'resign':
			await self.handle_resign(game_state_json, data)
		elif action == 'draw_offer':
			await self.handle_draw_offer(game_state_json, data)
		elif action == 'draw_response':
			await self.handle_draw_response(game_state_json, data)
		elif action == 'reconnect':
			if game_state_json is not None:
				await self.handle_reconnect(game_state_json)
		else:
			await self.send(text_data=json.dumps({'error': 'Action inconnue ou état inexistant'}))

	async def _remove_from_matchmaking_queue(self, player_id):
		await self.get_redis().lrem(self.MATCHMAKING_QUEUE_KEY, 0, str(player_id))

	async def _broadcast_matchmaking_queue_size(self):
		queue_size = await self.get_redis().llen(self.MATCHMAKING_QUEUE_KEY)
		await self.channel_layer.group_send(
			f'chess_{self.MATCHMAKING_ROOM_ID}',
			{
				'type': 'broadcast_matchmaking_event',
				'action': 'queue_status',
				'queue_size': int(queue_size),
			},
		)

	async def _attempt_matchmaking(self):
		while await self.get_redis().llen(self.MATCHMAKING_QUEUE_KEY) >= 2:
			first_id = await self.get_redis().lpop(self.MATCHMAKING_QUEUE_KEY)
			second_id = await self.get_redis().lpop(self.MATCHMAKING_QUEUE_KEY)

			if first_id is None or second_id is None:
				break

			first_id = self._decode_redis_player_id(first_id)
			second_id = self._decode_redis_player_id(second_id)
			if first_id == second_id:
				continue

			white_id, black_id = first_id, second_id
			white_coalition = await fetch_user_coalition(white_id)
			black_coalition = await fetch_user_coalition(black_id)
			white_profile = await fetch_user_public_profile(white_id)
			black_profile = await fetch_user_public_profile(black_id)
			board = chess.Board()
			new_game_id = f"match_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
			new_game_state = {
				'fen': board.fen(),
				'status': 'active',
				'white_player_id': white_id,
				'black_player_id': black_id,
				'white_player_coalition': white_coalition,
				'black_player_coalition': black_coalition,
				'white_player_profile': white_profile,
				'black_player_profile': black_profile,
				'white_time_left': 600,
				'black_time_left': 600,
				'last_move_timestamp': time.time(),
				'draw_offer_from_player_id': None,
			}
			await self.get_redis().set(new_game_id, json.dumps(new_game_state))

			await self.channel_layer.group_send(
				f'chess_{self.MATCHMAKING_ROOM_ID}',
				{
					'type': 'broadcast_matchmaking_event',
					'action': 'match_found',
					'game_id': new_game_id,
					'white_player_id': white_id,
					'black_player_id': black_id,
				},
			)

			await self._broadcast_matchmaking_queue_size()

	async def handle_join_queue(self, data):
		if not self.is_matchmaking_room:
			await self.send(text_data=json.dumps({'error': 'Matchmaking indisponible dans cette room'}))
			return

		player_id = self._normalize_player_id(data.get('player_id'))
		if player_id is None:
			await self.send(text_data=json.dumps({'error': 'player_id requis'}))
			return

		self.matchmaking_player_id = player_id
		await self._remove_from_matchmaking_queue(player_id)
		await self.get_redis().rpush(self.MATCHMAKING_QUEUE_KEY, player_id)
		await self._broadcast_matchmaking_queue_size()
		await self._attempt_matchmaking()

	async def handle_leave_queue(self, data):
		if not self.is_matchmaking_room:
			return

		player_id = self._normalize_player_id(data.get('player_id')) or self.matchmaking_player_id
		if player_id is None:
			return

		await self._remove_from_matchmaking_queue(player_id)
		if self.matchmaking_player_id == player_id:
			self.matchmaking_player_id = None
		await self._broadcast_matchmaking_queue_size()

	async def handle_create_game(self, data):
		board = chess.Board()
		white_id = data.get('white_id', 42)
		black_id = data.get('black_id', 84)
		white_coalition = await fetch_user_coalition(white_id)
		black_coalition = await fetch_user_coalition(black_id)
		white_profile = await fetch_user_public_profile(white_id)
		black_profile = await fetch_user_public_profile(black_id)
		new_game_state = {
			"fen": board.fen(),
			"status": "active",
			"white_player_id": white_id,
			"black_player_id": black_id,
			"white_player_coalition": white_coalition,
			"black_player_coalition": black_coalition,
			"white_player_profile": white_profile,
			"black_player_profile": black_profile,
			"white_time_left": 600,
			"black_time_left": 600,
			"last_move_timestamp": time.time(),
			"draw_offer_from_player_id": None,
		}
		
		await self.get_redis().set(self.game_id, json.dumps(new_game_state))
		
		# BROADCAST : On prévient tout le groupe qu'une partie commence
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'broadcast_game_state', # Nom de la fonction à appeler plus bas
				'action': 'game_state',
				'game_state': new_game_state
			}
		)

	def _normalize_player_id(self, player_id):
		if player_id is None:
			return None
		return str(player_id)

	def _decode_redis_player_id(self, raw_value):
		if raw_value is None:
			return None
		if isinstance(raw_value, bytes):
			try:
				return raw_value.decode('utf-8')
			except UnicodeDecodeError:
				return str(raw_value)
		return str(raw_value)

	def _update_game_status(self, game_state, board):
		# Priorité explicite: checkmate > stalemate > draw > active.
		if board.is_checkmate():
			winner_id = game_state['black_player_id'] if board.turn else game_state['white_player_id']
			game_state['status'] = 'checkmate'
			game_state['winner_player_id'] = winner_id
			game_state['result'] = '1-0' if winner_id == game_state['white_player_id'] else '0-1'
			return

		if board.is_stalemate():
			game_state['status'] = 'stalemate'
			game_state['winner_player_id'] = None
			game_state['result'] = '1/2-1/2'
			return

		is_draw = (
			board.is_insufficient_material()
			or board.is_fivefold_repetition()
			or board.is_seventyfive_moves()
			or board.can_claim_threefold_repetition()
			or board.can_claim_fifty_moves()
		)
		if is_draw:
			game_state['status'] = 'draw'
			game_state['winner_player_id'] = None
			game_state['result'] = '1/2-1/2'
			return

		game_state['status'] = 'active'
		game_state['winner_player_id'] = None
		game_state['result'] = '*'

	async def handle_play_move(self, game_state_json, data):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return

		game_state = json.loads(game_state_json)
		board = chess.Board(game_state['fen'])
		self._ensure_clock_fields(game_state)
		self._ensure_draw_fields(game_state)

		if 'white_player_coalition' not in game_state:
			game_state['white_player_coalition'] = await fetch_user_coalition(game_state.get('white_player_id'))
		if 'black_player_coalition' not in game_state:
			game_state['black_player_coalition'] = await fetch_user_coalition(game_state.get('black_player_id'))
		await self._ensure_player_profiles(game_state)

		now_ts = time.time()
		self._apply_elapsed_for_active_turn(game_state, board, now_ts)
		if self._mark_timeout_if_needed(game_state, board):
			await self.get_redis().set(self.game_id, json.dumps(game_state))
			await self.channel_layer.group_send(
				self.room_group_name,
				{
					'type': 'broadcast_game_state',
					'action': 'game_state',
					'game_state': game_state
				}
			)
			await self.send(text_data=json.dumps({'error': 'Temps ecoule. La partie est terminee.'}))
			return

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		current_turn_player_id = game_state['white_player_id'] if board.turn else game_state['black_player_id']
		sender_id = self._normalize_player_id(data.get('player_id'))
		current_turn_player_id = self._normalize_player_id(current_turn_player_id)

		if sender_id != current_turn_player_id:
			await self.send(text_data=json.dumps({'error': "Ce n'est pas votre tour !"}))
			return
		
		attempted_move = data.get('move')
		if not isinstance(attempted_move, str):
			await self.send(text_data=json.dumps({'error': 'Le coup doit être au format UCI'}))
			return

		attempted_move = attempted_move.strip().lower()
		try:
			move = chess.Move.from_uci(attempted_move)
			if move in board.legal_moves:
				board.push(move)
				
				# Mise à jour de l'état
				game_state['fen'] = board.fen()
				game_state['last_move_uci'] = attempted_move
				game_state['last_move_timestamp'] = time.time()
				self._clear_draw_offer(game_state)
				self._update_game_status(game_state, board)
				
				# Sauvegarde Redis
				await self.get_redis().set(self.game_id, json.dumps(game_state))
				
				# BROADCAST : On envoie le nouveau coup aux DEUX joueurs
				await self._broadcast_current_game_state(game_state)
			else:
				await self.send(text_data=json.dumps({'error': 'Coup illégal'}))
		except ValueError:
			await self.send(text_data=json.dumps({'error': 'Format de coup invalide'}))

	async def handle_resign(self, game_state_json, data):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return

		game_state = json.loads(game_state_json)
		self._ensure_draw_fields(game_state)

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		sender_id = self._normalize_player_id(data.get('player_id'))
		if sender_id is None or not self._is_player_in_game(sender_id, game_state):
			await self.send(text_data=json.dumps({'error': 'Joueur invalide pour cette partie'}))
			return

		winner_id = self._get_other_player_id(sender_id, game_state)
		if winner_id is None:
			await self.send(text_data=json.dumps({'error': 'Impossible de determiner le vainqueur'}))
			return

		game_state['status'] = 'resigned'
		game_state['winner_player_id'] = winner_id
		game_state['result'] = '1-0' if winner_id == self._normalize_player_id(game_state.get('white_player_id')) else '0-1'
		self._clear_draw_offer(game_state)

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_draw_offer(self, game_state_json, data):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return

		game_state = json.loads(game_state_json)
		self._ensure_draw_fields(game_state)

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		sender_id = self._normalize_player_id(data.get('player_id'))
		if sender_id is None or not self._is_player_in_game(sender_id, game_state):
			await self.send(text_data=json.dumps({'error': 'Joueur invalide pour cette partie'}))
			return

		if game_state.get('draw_offer_from_player_id') is not None:
			await self.send(text_data=json.dumps({'error': 'Une proposition de nulle est deja en cours'}))
			return

		game_state['draw_offer_from_player_id'] = sender_id
		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_draw_response(self, game_state_json, data):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return

		game_state = json.loads(game_state_json)
		self._ensure_draw_fields(game_state)

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		offer_from = self._normalize_player_id(game_state.get('draw_offer_from_player_id'))
		if offer_from is None:
			await self.send(text_data=json.dumps({'error': 'Aucune proposition de nulle en cours'}))
			return

		sender_id = self._normalize_player_id(data.get('player_id'))
		if sender_id is None or not self._is_player_in_game(sender_id, game_state):
			await self.send(text_data=json.dumps({'error': 'Joueur invalide pour cette partie'}))
			return

		if sender_id == offer_from:
			await self.send(text_data=json.dumps({'error': 'Vous ne pouvez pas repondre a votre propre proposition'}))
			return

		accept_raw = data.get('accept')
		if isinstance(accept_raw, bool):
			accept = accept_raw
		else:
			accept = str(data.get('response', '')).lower() in ('accept', 'accepted', 'yes', 'true', '1')

		if accept:
			game_state['status'] = 'draw'
			game_state['winner_player_id'] = None
			game_state['result'] = '1/2-1/2'

		self._clear_draw_offer(game_state)
		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_reconnect(self, game_state_json):
		# Ici, pas besoin de broadcast, seul celui qui se reconnecte a besoin de l'info
		game_state = json.loads(game_state_json)
		self._ensure_clock_fields(game_state)
		self._ensure_draw_fields(game_state)
		updated = False
		if 'white_player_coalition' not in game_state:
			game_state['white_player_coalition'] = await fetch_user_coalition(game_state.get('white_player_id'))
			updated = True
		if 'black_player_coalition' not in game_state:
			game_state['black_player_coalition'] = await fetch_user_coalition(game_state.get('black_player_id'))
			updated = True
		if await self._ensure_player_profiles(game_state):
			updated = True

		board = chess.Board(game_state['fen'])
		now_ts = time.time()
		before_white = float(game_state.get('white_time_left', 0))
		before_black = float(game_state.get('black_time_left', 0))
		self._apply_elapsed_for_active_turn(game_state, board, now_ts)
		if self._mark_timeout_if_needed(game_state, board):
			updated = True
		if before_white != float(game_state.get('white_time_left', 0)):
			updated = True
		if before_black != float(game_state.get('black_time_left', 0)):
			updated = True
		if updated:
			await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self.send(text_data=json.dumps({
			'action': 'game_state',
			'game_state': game_state
		}))

	# CETTE MÉTHODE RÉCUPÈRE LES MESSAGES DU GROUPE REDIS ET LES ENVOIE AU NAVIGATEUR
	async def broadcast_game_state(self, event):
		await self.send(text_data=json.dumps({
			'action': event['action'],
			'game_state': event['game_state']
		}))

	async def broadcast_matchmaking_event(self, event):
		payload = {'action': event['action']}
		if 'queue_size' in event:
			payload['queue_size'] = event['queue_size']
		if 'game_id' in event:
			payload['game_id'] = event['game_id']
		if 'white_player_id' in event:
			payload['white_player_id'] = event['white_player_id']
		if 'black_player_id' in event:
			payload['black_player_id'] = event['black_player_id']
		await self.send(text_data=json.dumps(payload))