"""Player matchmaking: queue management, pairing, match announcements."""
import json
import secrets
import time

import chess
from game.services.state_builder import build_new_game_state

def normalize_player_id(player_id):
	"""Convert player ID to string or None."""
	if player_id is None:
		return None
	return str(player_id)

def normalize_time_control(value, default=600):
	"""Assure que le temps est un entier positif raisonnable, y compris les cadences longues."""
	try:
		seconds = int(value)
		if 60 <= seconds <= 604800:
			return seconds
	except (ValueError, TypeError):
		pass
	return default

def normalize_increment(value, default=0):
    """Assure que l'incrément est un entier positif (max 60s)."""
    try:
        seconds = int(value)
        if 0 <= seconds <= 60:
            return seconds
    except (ValueError, TypeError):
        pass
    return default


def normalize_competitive(value, default=False):
	"""Convertit le flag competitive en booléen stable."""
	if isinstance(value, bool):
		return value
	if value is None:
		return default
	if isinstance(value, (int, float)):
		return bool(value)
	raw = str(value).strip().lower()
	if raw in {'1', 'true', 'yes', 'on', 'competitive'}:
		return True
	if raw in {'0', 'false', 'no', 'off', 'friendly', 'casual'}:
		return False
	return default

def decode_redis_player_id(raw_value):
	"""Decode player ID from Redis bytes or string format."""
	if raw_value is None:
		return None
	if isinstance(raw_value, bytes):
		try:
			return raw_value.decode('utf-8')
		except UnicodeDecodeError:
			return str(raw_value)
	return str(raw_value)


async def remove_from_queue(redis_client, queue_key, player_id):
	"""Remove player from matchmaking queue."""
	await redis_client.lrem(queue_key, 0, str(player_id))


async def queue_player_for_matchmaking(
	redis_client,
	channel_layer,
	room_group_name,
	queue_key,
	player_id,
	time_control,
	increment,
	competitive,
	fetch_user_coalition,
	fetch_user_public_profile,
):
	"""Add player to queue, attempt pairing, and broadcast queue status."""
	await remove_from_queue(redis_client, queue_key, player_id)
	await redis_client.rpush(queue_key, player_id)
	await broadcast_matchmaking_queue_size(
		redis_client,
		channel_layer,
		room_group_name,
		queue_key,
		time_control,
		increment,
		competitive,
	)
	await attempt_matchmaking(
		redis_client,
		channel_layer,
		room_group_name,
		time_control,
		increment,
		competitive,
		queue_key,
		fetch_user_coalition,
		fetch_user_public_profile,
	)


async def dequeue_player_from_matchmaking(
	redis_client,
	channel_layer,
	room_group_name,
	queue_key,
	player_id,
	time_control,
	increment,
	competitive,
):
	"""Remove player from queue and broadcast updated queue status."""
	await remove_from_queue(redis_client, queue_key, player_id)
	await broadcast_matchmaking_queue_size(
		redis_client,
		channel_layer,
		room_group_name,
		queue_key,
		time_control,
		increment,
		competitive,
	)


async def broadcast_matchmaking_queue_size(redis_client, channel_layer, room_group_name, queue_key, time_control, increment, competitive):
	"""Broadcast current queue size to all clients in matchmaking room."""
	queue_size = await redis_client.llen(queue_key)
	await channel_layer.group_send(
		room_group_name,
		{
			'type': 'broadcast_matchmaking_event',
			'action': 'queue_status',
			'queue_size': int(queue_size),
			'time_control': time_control,
			'increment': increment,
			'competitive': competitive,
		},
	)

async def attempt_matchmaking(
	redis_client,
	channel_layer,
	room_group_name,
	time_control,
	increment,
	competitive,
	queue_key,
	fetch_user_coalition,
	fetch_user_public_profile,
):
	"""Pair players from queue when at least 2 available."""
	while await redis_client.llen(queue_key) >= 2:
		first_id = await redis_client.lpop(queue_key)
		second_id = await redis_client.lpop(queue_key)

		if first_id is None or second_id is None:
			break

		first_id = decode_redis_player_id(first_id)
		second_id = decode_redis_player_id(second_id)
		if first_id == second_id:
			continue
		
		white_id, black_id = first_id, second_id
		
		# Build pristine state using the dedicated builder
		new_game_id = f"match_{int(time.time() * 1000)}_{secrets.token_hex(4)}"
		new_game_state = await build_new_game_state(
			white_id,
			black_id,
			time_control,
			increment,
			competitive,
		)
		await redis_client.set(new_game_id, json.dumps(new_game_state))

		await channel_layer.group_send(
			room_group_name,
			{
				'type': 'broadcast_matchmaking_event',
				'action': 'match_found',
				'game_id': new_game_id,
				'white_player_id': white_id,
				'black_player_id': black_id,
				'time_control': time_control,
				'increment': increment,
				'competitive': competitive,
			},
		)

		await broadcast_matchmaking_queue_size(
			redis_client,
			channel_layer,
			room_group_name,
			queue_key,
			time_control,
			increment,
			competitive,
		)
