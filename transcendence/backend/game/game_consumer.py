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


class GameConsumer(AsyncWebsocketConsumer):
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
		if cls._redis is None:
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	async def connect(self):
		self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'default_room')
		if self.game_id == 'matchmaking':
			await self.close()
			return

		self.room_group_name = f'chess_{self.game_id}'
		self.clock_task = None

		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		await self.accept()

		game_state_json = await self.get_redis().get(self.game_id)
		if game_state_json is not None:
			await self.handle_reconnect(game_state_json)

		self.clock_task = asyncio.create_task(self._clock_loop())

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

		if self.clock_task is not None:
			self.clock_task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await self.clock_task
			self.clock_task = None

	async def _broadcast_current_game_state(self, game_state):
		await self.channel_layer.group_send(self.room_group_name, build_group_game_state_event(game_state))

	async def _tick_game_clock(self):
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
		await self._broadcast_current_game_state(game_state)

	async def _clock_loop(self):
		while True:
			await asyncio.sleep(1)
			await self._tick_game_clock()

	def _normalize_action(self, data):
		raw_action = data.get('action', data.get('type'))
		action = str(raw_action).lower() if raw_action is not None else None
		return self.ACTION_ALIASES.get(action, action)

	async def _load_game_state_or_send_error(self, game_state_json):
		if game_state_json is None:
			await self.send(text_data=json.dumps({'error': 'Partie introuvable'}))
			return None
		return json.loads(game_state_json)

	async def _handle_action_with_game_state(self, action, data, game_state_json):
		if action == 'create_game':
			await self.handle_create_game(data)
		elif action == 'reset_game':
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

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
		except json.JSONDecodeError:
			await self.send(text_data=json.dumps({'error': 'JSON invalide'}))
			return

		action = self._normalize_action(data)
		game_state_json = await self.get_redis().get(self.game_id)
		await self._handle_action_with_game_state(action, data, game_state_json)

	async def handle_create_game(self, data):
		white_id = data.get('white_id', 42)
		black_id = data.get('black_id', 84)
		new_game_state = await build_new_game_state(white_id, black_id)

		await self.get_redis().set(self.game_id, json.dumps(new_game_state))
		await self._broadcast_current_game_state(new_game_state)

	async def handle_play_move(self, game_state_json, data):
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		board = chess.Board(game_state['fen'])
		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		ensure_draw_fields(game_state)
		await ensure_player_metadata(game_state)

		apply_elapsed_for_active_turn(game_state, board, now_ts)
		if mark_timeout_if_needed(game_state, board):
			await self.get_redis().set(self.game_id, json.dumps(game_state))
			await self._broadcast_current_game_state(game_state)
			await self.send(text_data=json.dumps({'error': 'Temps ecoule. La partie est terminee.'}))
			return

		if game_state.get('status') != 'active':
			await self.send(text_data=json.dumps({'error': 'Partie terminee'}))
			return

		success, error = apply_play_move(game_state, data.get('player_id'), data.get('move'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_resign(self, game_state_json, data):
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		success, error = apply_resign(game_state, data.get('player_id'))
		if not success:
			await self.send(text_data=json.dumps({'error': error}))
			return

		await self.get_redis().set(self.game_id, json.dumps(game_state))
		await self._broadcast_current_game_state(game_state)

	async def handle_draw_offer(self, game_state_json, data):
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

	async def handle_reconnect(self, game_state_json):
		game_state = await self._load_game_state_or_send_error(game_state_json)
		if game_state is None:
			return

		now_ts = time.time()
		ensure_clock_fields(game_state, now_ts)
		ensure_draw_fields(game_state)
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
		await self.send(text_data=json.dumps(build_ws_game_state_payload(game_state)))

	async def broadcast_game_state(self, event):
		await self.send(text_data=json.dumps(build_ws_game_state_payload(event['game_state'], event['action'])))
