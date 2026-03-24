import json
import chess
import time
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

# Connexion à Redis
redis_url = settings.CACHES['default']['LOCATION']
redis_client = redis.from_url(redis_url)

class ChessConsumer(AsyncWebsocketConsumer):
	_redis = None
	
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

		# REJOINDRE LE GROUPE (C'est ici que Redis connecte les deux joueurs)
		await self.channel_layer.group_add(
			self.room_group_name,
			self.channel_name
		)
		await self.accept()

	async def disconnect(self, close_code):
		# QUITTER LE GROUPE
		await self.channel_layer.group_discard(
			self.room_group_name,
			self.channel_name
		)

	async def receive(self, text_data):
		data = json.loads(text_data)
		action = data.get('action')
		# On utilise le game_id de l'URL comme clé Redis
		game_state_json = await redis_client.get(self.game_id)

		if action == 'create_game' and game_state_json is None:
			await self.handle_create_game(data)
		elif action == 'play_move':
			await self.handle_play_move(game_state_json, data)
		elif action == 'reconnect' and game_state_json is not None:
			await self.handle_reconnect(game_state_json)
		else:
			await self.send(text_data=json.dumps({'error': 'Action inconnue ou état inexistant'}))

	async def handle_create_game(self, data):
		board = chess.Board()
		new_game_state = {
			"fen": board.fen(),
			"status": "active",
			"white_player_id": data.get('white_id', 42),
			"black_player_id": data.get('black_id', 84),
			"white_time_left": 600,
			"black_time_left": 600,
			"last_move_timestamp": time.time()
		}
		
		await redis_client.set(self.game_id, json.dumps(new_game_state))
		
		# BROADCAST : On prévient tout le groupe qu'une partie commence
		await self.channel_layer.group_send(
			self.room_group_name,
			{
				'type': 'broadcast_game_state', # Nom de la fonction à appeler plus bas
				'action': 'new_game_data',
				'game_state': new_game_state
			}
		)

	async def handle_play_move(self, game_state_json, data):
		game_state = json.loads(game_state_json)
		board = chess.Board(game_state['fen'])

		current_turn_player_id = game_state['white_player_id'] if board.turn else game_state['black_player_id']
		sender_id = data.get('player_id') 

		if sender_id != current_turn_player_id:
			await self.send(text_data=json.dumps({'error': "Ce n'est pas votre tour !"}))
			return
		
		attempted_move = data.get('move')
		try:
			move = chess.Move.from_uci(attempted_move)
			if move in board.legal_moves:
				board.push(move)
				
				# Mise à jour de l'état
				game_state['fen'] = board.fen()
				game_state['last_move_timestamp'] = time.time()
				
				# Sauvegarde Redis
				await redis_client.set(self.game_id, json.dumps(game_state))
				
				# BROADCAST : On envoie le nouveau coup aux DEUX joueurs
				await self.channel_layer.group_send(
					self.room_group_name,
					{
						'type': 'broadcast_game_state',
						'action': 'move_data',
						'game_state': game_state
					}
				)
			else:
				await self.send(text_data=json.dumps({'error': 'Coup illégal'}))
		except ValueError:
			await self.send(text_data=json.dumps({'error': 'Format de coup invalide'}))

	async def handle_reconnect(self, game_state_json):
		# Ici, pas besoin de broadcast, seul celui qui se reconnecte a besoin de l'info
		game_state = json.loads(game_state_json)
		await self.send(text_data=json.dumps({
			'action': 'reconnect_data',
			'game_state': game_state
		}))

	# CETTE MÉTHODE RÉCUPÈRE LES MESSAGES DU GROUPE REDIS ET LES ENVOIE AU NAVIGATEUR
	async def broadcast_game_state(self, event):
		await self.send(text_data=json.dumps({
			'action': event['action'],
			'game_state': event['game_state']
		}))