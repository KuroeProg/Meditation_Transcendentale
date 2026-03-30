import json
import secrets
import time

import chess


def normalize_player_id(player_id):
    if player_id is None:
        return None
    return str(player_id)


def decode_redis_player_id(raw_value):
    if raw_value is None:
        return None
    if isinstance(raw_value, bytes):
        try:
            return raw_value.decode('utf-8')
        except UnicodeDecodeError:
            return str(raw_value)
    return str(raw_value)


async def remove_from_queue(redis_client, queue_key, player_id):
    await redis_client.lrem(queue_key, 0, str(player_id))


async def queue_player_for_matchmaking(
    redis_client,
    channel_layer,
    room_group_name,
    queue_key,
    player_id,
    fetch_user_coalition,
    fetch_user_public_profile,
):
    await remove_from_queue(redis_client, queue_key, player_id)
    await redis_client.rpush(queue_key, player_id)
    await broadcast_matchmaking_queue_size(
        redis_client,
        channel_layer,
        room_group_name,
        queue_key,
    )
    await attempt_matchmaking(
        redis_client,
        channel_layer,
        room_group_name,
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
):
    await remove_from_queue(redis_client, queue_key, player_id)
    await broadcast_matchmaking_queue_size(
        redis_client,
        channel_layer,
        room_group_name,
        queue_key,
    )


async def broadcast_matchmaking_queue_size(redis_client, channel_layer, room_group_name, queue_key):
    queue_size = await redis_client.llen(queue_key)
    await channel_layer.group_send(
        room_group_name,
        {
            'type': 'broadcast_matchmaking_event',
            'action': 'queue_status',
            'queue_size': int(queue_size),
        },
    )


async def attempt_matchmaking(
    redis_client,
    channel_layer,
    room_group_name,
    queue_key,
    fetch_user_coalition,
    fetch_user_public_profile,
):
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
        await redis_client.set(new_game_id, json.dumps(new_game_state))

        await channel_layer.group_send(
            room_group_name,
            {
                'type': 'broadcast_matchmaking_event',
                'action': 'match_found',
                'game_id': new_game_id,
                'white_player_id': white_id,
                'black_player_id': black_id,
            },
        )

        await broadcast_matchmaking_queue_size(
            redis_client,
            channel_layer,
            room_group_name,
            queue_key,
        )
