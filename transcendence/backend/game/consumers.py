import json
import asyncio
import contextlib
import chess
import time
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from game.services.clock import (
	apply_elapsed_for_active_turn,
	ensure_clock_fields,
	mark_timeout_if_needed,
)
from game.services.game_state import (
	clear_draw_offer,
	ensure_draw_fields,
	get_other_player_id,
	is_player_in_game,
	normalize_game_player_ids,
	update_game_status,
)
from game.services.matchmaking import (
	attempt_matchmaking,
	broadcast_matchmaking_queue_size,
	normalize_player_id,
	remove_from_queue,
)
from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)
from game.services.state_builder import build_new_game_state, ensure_player_metadata


class ChessConsumer(AsyncWebsocketConsumer):
	_redis = None
	MATCHMAKING_ROOM_ID = 'matchmaking'
	MATCHMAKING_QUEUE_KEY = 'matchmaking:queue'
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
			redis_client = self.get_redis()
			await remove_from_queue(redis_client, self.MATCHMAKING_QUEUE_KEY, self.matchmaking_player_id)
			await broadcast_matchmaking_queue_size(
				redis_client,
				self.channel_layer,
				f'chess_{self.MATCHMAKING_ROOM_ID}',
				self.MATCHMAKING_QUEUE_KEY,
			)

		if self.clock_task is not None:
			self.clock_task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await self.clock_task
			self.clock_task = None

	def _ensure_draw_fields(self, game_state):
		ensure_draw_fields(game_state)

	def _clear_draw_offer(self, game_state):
		clear_draw_offer(game_state)

	def _normalize_game_player_ids(self, game_state):
		return normalize_game_player_ids(game_state)

	def _is_player_in_game(self, sender_id, game_state):
		return is_player_in_game(sender_id, game_state)

	def _get_other_player_id(self, sender_id, game_state):
		return get_other_player_id(sender_id, game_state)

	async def _broadcast_current_game_state(self, game_state):
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'broadcast_game_state',
				'action': 'game_state',
				'game_state': game_state,
			},
		)

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

		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		board = chess.Board(game_state['fen'])
		apply_elapsed_for_active_turn(game_state, board, now_ts)
		mark_timeout_if_needed(game_state, board)

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

	def _normalize_action(self, data):
		raw_action = data.get('action', data.get('type'))
		action = str(raw_action).lower() if raw_action is not None else None
		return self.ACTION_ALIASES.get(action, action)

	async def _handle_action_with_game_state(self, action, data, game_state_json):
		if action == 'create_game':
			# Permet de créer une nouvelle partie ou de réinitialiser une existante
			await self.handle_create_game(data)
			return

		if action == 'reset_game':
			# Réinitialise la partie et la crée vierge
			await self.get_redis().delete(self.game_id)
			await self.handle_create_game(data)
			return

		if action == 'play_move':
			await self.handle_play_move(game_state_json, data)
			return

		if action == 'resign':
			await self.handle_resign(game_state_json, data)
			return

		if action == 'draw_offer':
			await self.handle_draw_offer(game_state_json, data)
			return

		if action == 'draw_response':
			await self.handle_draw_response(game_state_json, data)
			return

		if action == 'reconnect':
			if game_state_json is not None:
				await self.handle_reconnect(game_state_json)
			return

		await self.send(text_data=json.dumps({'error': 'Action inconnue ou état inexistant'}))

	async def receive(self, text_data):
		data = json.loads(text_data)
		action = self._normalize_action(data)

		if action == 'join_queue':
			await self.handle_join_queue(data)
			return
		if action == 'leave_queue':
			await self.handle_leave_queue(data)
			return

		# On utilise le game_id de l'URL comme clé Redis
		game_state_json = await self.get_redis().get(self.game_id)
		await self._handle_action_with_game_state(action, data, game_state_json)

	async def handle_join_queue(self, data):
		if not self.is_matchmaking_room:
			await self.send(text_data=json.dumps({'error': 'Matchmaking indisponible dans cette room'}))
			return

		player_id = normalize_player_id(data.get('player_id'))
		if player_id is None:
			await self.send(text_data=json.dumps({'error': 'player_id requis'}))
			return

		self.matchmaking_player_id = player_id
		redis_client = self.get_redis()
		await remove_from_queue(redis_client, self.MATCHMAKING_QUEUE_KEY, player_id)
		await redis_client.rpush(self.MATCHMAKING_QUEUE_KEY, player_id)
		await broadcast_matchmaking_queue_size(
			redis_client,
			self.channel_layer,
			f'chess_{self.MATCHMAKING_ROOM_ID}',
			self.MATCHMAKING_QUEUE_KEY,
		)
		await attempt_matchmaking(
			redis_client,
			self.channel_layer,
			f'chess_{self.MATCHMAKING_ROOM_ID}',
			self.MATCHMAKING_QUEUE_KEY,
			fetch_user_coalition,
			fetch_user_public_profile,
		)

	async def handle_leave_queue(self, data):
		if not self.is_matchmaking_room:
			return

		player_id = normalize_player_id(data.get('player_id')) or self.matchmaking_player_id
		if player_id is None:
			return

		redis_client = self.get_redis()
		await remove_from_queue(redis_client, self.MATCHMAKING_QUEUE_KEY, player_id)
		if self.matchmaking_player_id == player_id:
			self.matchmaking_player_id = None
		await broadcast_matchmaking_queue_size(
			redis_client,
			self.channel_layer,
			f'chess_{self.MATCHMAKING_ROOM_ID}',
			self.MATCHMAKING_QUEUE_KEY,
		)

	async def handle_create_game(self, data):
		white_id = data.get('white_id', 42)
		black_id = data.get('black_id', 84)
		new_game_state = await build_new_game_state(white_id, black_id)
		
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
		return normalize_player_id(player_id)

	def _update_game_status(self, game_state, board):
		update_game_status(game_state, board)

	async def handle_play_move(self, game_state_json, data):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return

		game_state = json.loads(game_state_json)
		board = chess.Board(game_state['fen'])
		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		self._ensure_draw_fields(game_state)
		await ensure_player_metadata(game_state)

		apply_elapsed_for_active_turn(game_state, board, now_ts)
		if mark_timeout_if_needed(game_state, board):
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
		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		self._ensure_draw_fields(game_state)
		updated = False
		if await ensure_player_metadata(game_state):
			updated = True

		board = chess.Board(game_state['fen'])
		before_white = float(game_state.get('white_time_left', 0))
		before_black = float(game_state.get('black_time_left', 0))
		apply_elapsed_for_active_turn(game_state, board, now_ts)
		if mark_timeout_if_needed(game_state, board):
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