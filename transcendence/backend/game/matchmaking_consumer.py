import json
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from game.services.matchmaking import (
	dequeue_player_from_matchmaking,
	normalize_player_id,
	queue_player_for_matchmaking,
)
from game.services.player_profiles import (
	fetch_user_coalition,
	fetch_user_public_profile,
)
from game.services.payloads import build_ws_matchmaking_payload


class MatchmakingConsumer(AsyncWebsocketConsumer):
	_redis = None
	MATCHMAKING_ROOM_ID = 'matchmaking'
	MATCHMAKING_QUEUE_KEY = 'matchmaking:queue'

	@classmethod
	def get_redis(cls):
		if cls._redis is None:
			url = settings.CACHES['default']['LOCATION']
			cls._redis = redis.from_url(url)
		return cls._redis

	async def connect(self):
		self.game_id = self.scope['url_route']['kwargs'].get('game_id', 'default_room')
		if self.game_id != self.MATCHMAKING_ROOM_ID:
			await self.close()
			return

		self.room_group_name = f'chess_{self.MATCHMAKING_ROOM_ID}'
		self.matchmaking_player_id = None

		await self.channel_layer.group_add(self.room_group_name, self.channel_name)
		await self.accept()

	async def disconnect(self, close_code):
		await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

		if self.matchmaking_player_id is not None:
			redis_client = self.get_redis()
			await dequeue_player_from_matchmaking(
				redis_client,
				self.channel_layer,
				self.room_group_name,
				self.MATCHMAKING_QUEUE_KEY,
				self.matchmaking_player_id,
			)

	async def receive(self, text_data):
		try:
			data = json.loads(text_data)
		except json.JSONDecodeError:
			await self.send(text_data=json.dumps({'error': 'JSON invalide'}))
			return

		action = str(data.get('action', '')).lower()

		if action == 'join_queue':
			await self.handle_join_queue(data)
		elif action == 'leave_queue':
			await self.handle_leave_queue(data)
		else:
			await self.send(text_data=json.dumps({'error': 'Action inconnue'}))

	async def handle_join_queue(self, data):
		player_id = normalize_player_id(data.get('player_id'))
		if player_id is None:
			await self.send(text_data=json.dumps({'error': 'player_id requis'}))
			return

		self.matchmaking_player_id = player_id
		redis_client = self.get_redis()
		await queue_player_for_matchmaking(
			redis_client,
			self.channel_layer,
			self.room_group_name,
			self.MATCHMAKING_QUEUE_KEY,
			player_id,
			fetch_user_coalition,
			fetch_user_public_profile,
		)

	async def handle_leave_queue(self, data):
		player_id = normalize_player_id(data.get('player_id')) or self.matchmaking_player_id
		if player_id is None:
			return

		redis_client = self.get_redis()
		await dequeue_player_from_matchmaking(
			redis_client,
			self.channel_layer,
			self.room_group_name,
			self.MATCHMAKING_QUEUE_KEY,
			player_id,
		)
		if self.matchmaking_player_id == player_id:
			self.matchmaking_player_id = None

	async def broadcast_matchmaking_event(self, event):
		await self.send(text_data=json.dumps(build_ws_matchmaking_payload(event)))
