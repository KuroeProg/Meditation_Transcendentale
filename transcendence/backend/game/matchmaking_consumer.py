"""Matchmaking WebSocket consumer: player queue and match pairing.

Handles queue join/leave and broadcasts match_found events.
Delegates queue management to services.
"""
import json
from asgiref.sync import sync_to_async
from game.services.elasticsearch_service import get_player_stats
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from game.services.errors import (
	json_invalid,
	action_unknown,
)
from game.services.matchmaking import (
	dequeue_player_from_matchmaking,
	normalize_player_id,
	normalize_competitive,
	normalize_time_control,
	normalize_increment,
	queue_player_for_matchmaking,
)
from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)
from game.services.payloads import build_ws_matchmaking_payload


ERROR_PLAYER_ID_REQUIRED = {'error': 'Player ID required'}


class MatchmakingConsumer(AsyncWebsocketConsumer):
	"""Pure matchmaking logic WebSocket consumer: pairing players from queue.
	
	Separated from game consumer for clean domain boundary.
	Manages join/leave queue and broadcasts match_found events.
	"""
	_redis = None
	MATCHMAKING_ROOM_ID = 'matchmaking'
	MATCHMAKING_QUEUE_KEY = 'matchmaking:queue'

	@classmethod
	def get_redis(cls):
		"""Get or initialize Redis async client."""
		if cls._redis is None:
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	async def connect(self):
		"""Setup: join group, accept connection, initialize player tracking."""
		# Always initialize attributes first because disconnect may be called
		# even when connect exits early.
		self.room_group_name = f'chess_{self.MATCHMAKING_ROOM_ID}'
		self.matchmaking_player_id = None
		self.queue_key = None
		self.time_control = 600
		self.increment = 0
		self.competitive = False
		self._joined_group = False

		route_game_id = self.scope['url_route']['kwargs'].get('game_id')
		self.game_id = route_game_id or self.MATCHMAKING_ROOM_ID
		if route_game_id is not None and route_game_id != self.MATCHMAKING_ROOM_ID:
			await self.close()
			return

		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		self._joined_group = True
		await self.accept()

	async def disconnect(self, close_code):
		"""Cleanup: remove from group and dequeue player if in queue."""
		if getattr(self, '_joined_group', False):
			await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

		if getattr(self, 'matchmaking_player_id', None) is not None and self.queue_key:
			redis_client = self.get_redis()
			await dequeue_player_from_matchmaking(
				redis_client,
				self.channel_layer,
				self.room_group_name,
				self.queue_key,
				self.matchmaking_player_id,
				self.time_control,
				self.increment,
				self.competitive,
			)

	async def receive(self, text_data):
		"""Parse action and route to handler (join_queue or leave_queue)."""
		try:
			data = json.loads(text_data)
		except json.JSONDecodeError:
			await self.send(text_data=json.dumps(json_invalid()))
			return

		action = str(data.get('action', '')).lower()
		if not action:
			await self.send(text_data=json.dumps(action_unknown()))
			return

		if action == 'join_queue':
			await self.handle_join_queue(data)
		elif action == 'leave_queue':
			await self.handle_leave_queue(data)
		elif action == 'get_stats':
			await self.handle_get_stats(data)
		else:
			await self.send(text_data=json.dumps(action_unknown()))

	async def handle_join_queue(self, data):
		"""Add player to matchmaking queue if not already queued."""
		if not self.matchmaking_player_id:
			player_id = normalize_player_id(data.get('player_id'))
			self.time_control = normalize_time_control(data.get('time_control'))
			self.increment = normalize_increment(data.get('increment'))
			self.competitive = normalize_competitive(data.get('competitive'))
			self.queue_key = f"{self.MATCHMAKING_QUEUE_KEY}:{self.time_control}:{self.increment}:{int(self.competitive)}"
			if player_id is None:
				await self.send(text_data=json.dumps(ERROR_PLAYER_ID_REQUIRED))
				return
	
			self.matchmaking_player_id = player_id
			redis_client = self.get_redis()

			await queue_player_for_matchmaking(
				redis_client,
				self.channel_layer,
				self.room_group_name,
				self.queue_key,
				player_id,
				self.time_control,
				self.increment,
				self.competitive,
				fetch_user_coalition,
				fetch_user_public_profile,
			)

	async def handle_leave_queue(self, data):
		"""Remove player from matchmaking queue."""
		player_id = normalize_player_id(data.get('player_id')) or self.matchmaking_player_id
		if player_id is None:
			return

		if self.queue_key:
			redis_client = self.get_redis()
			await dequeue_player_from_matchmaking(
				redis_client,
				self.channel_layer,
				self.room_group_name,
				self.queue_key,
				player_id,
				self.time_control,
				self.increment,
				self.competitive,
			)
		if self.matchmaking_player_id == player_id:
			self.matchmaking_player_id = None

	async def handle_get_stats(self, data):
		"""Retrieve and return player statistics from Elasticsearch."""
		# 1. Retrieve and verify the player ID sent by the frontend
		player_id = normalize_player_id(data.get('player_id'))
		if player_id is None:
			await self.send(text_data=json.dumps({'error': 'Player ID is required'}))
			return
			
		# 2. Query Elasticsearch (wrapping the synchronous method to avoid blocking the WebSocket)
		print(f"CQRS : Demande de stats reçue pour le joueur {player_id}")
		stats = await sync_to_async(get_player_stats)(player_id)
		
		# 3. Send the result back to the frontend
		print(f"CQRS : Envoi des stats à {player_id} : {stats}")
		await self.send(text_data=json.dumps({
			'action': 'player_stats',
			'player_id': player_id,
			'stats': stats
		}))

	async def broadcast_matchmaking_event(self, event):
		"""Send matchmaking event to this WebSocket client (called by group_send)."""
		await self.send(text_data=json.dumps(build_ws_matchmaking_payload(event)))
