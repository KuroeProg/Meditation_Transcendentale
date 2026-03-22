import json
import chess
import time
import redis.asyncio as redis
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

redis_url = settings.CACHES['default']['LOCATION']
redis_client = redis.from_url(redis_url)

class ChessConsumer(AsyncWebsocketConsumer):

	async def handle_create_game(self, session_id, data):
		board = chess.Board() # Generates the standard starting FEN
		new_game_state = {
			"fen": board.fen(),
			"status": "active",
			"white_player_id": 42,      # The database ID of the white player
			"black_player_id": 84,      # The database ID of the black player
			"white_time_left": 600,     # 10 minutes in seconds
			"black_time_left": 600,
			"last_move_timestamp": time.time() # To calculate how much time passed
		}
			
		# Save it to Redis (must convert dictionary to JSON string first)
		await redis_client.set(session_id, json.dumps(new_game_state))
			
		# Broadcast the new game state to the player...
		await self.send(text_data=json.dumps({
            'action': 'new_game_data',
            'game_state': new_game_state
        }))

	async def handle_play_move(self, game_state_json, session_id, data):
		game_state = json.loads(game_state_json)
		current_fen = game_state['fen']
		
		# Recreate the virtual board in Python using the saved FEN
		board = chess.Board(current_fen)
		
		attempted_move = data.get('move') # e.g., "e2e4"
		move = chess.Move.from_uci(attempted_move)
		# Check integrity...
		if move in board.legal_moves:
			board.push(move)
            # 2. Extract the brand new FEN string
			new_fen = board.fen()
            # 3. Update your Python dictionary
			game_state['fen'] = new_fen
			game_state['last_move_timestamp'] = time.time()
   			# 4. Save the updated dictionary back to Redis
            # await redis_client.set(...)
			await redis_client.set(session_id, json.dumps(game_state))
   
			await self.send(text_data=json.dumps({
            'action': 'move_data',
            'game_state': game_state
        }))
		else:
			await self.send(text_data=json.dumps({
                'error': 'invalid move'
            }))
			# Move is invalid! Reject it and send an error back to the player.


	async def handle_reconnect(self, game_state_json):
		game_state = json.loads(game_state_json)

		await self.send(text_data=json.dumps({
            'action': 'reconnect_data',
            'game_state': game_state
        }))

	async def receive(self, text_data):
		# Parse the incoming JSON from the React frontend
		data = json.loads(text_data)
		action = data.get('action')
		session_id = data.get('session_id')

		# 1. Ask Redis if this game already exists
		game_state_json = await redis_client.get(session_id)
  		# 1. The Switchboard
		if action == 'create_game' and game_state_json is None:
			await self.handle_create_game(session_id, data)
		elif action == 'play_move':
			await self.handle_play_move(game_state_json, session_id, data)

		elif action == 'reconnect' and game_state_json is not None:
			await self.handle_reconnect(game_state_json)
            
		else:
            # Always good practice to handle unexpected messages
			await self.send(text_data=json.dumps({
                'error': 'Unknown action'
            }))

