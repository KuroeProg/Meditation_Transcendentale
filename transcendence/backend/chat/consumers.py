import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q

from accounts.models import Friendship, LocalUser
from chat.invite_payload import build_game_invite_content_dict
from chat.models import Conversation, Message
from utils.presence import (
    mark_user_presence_connected,
    mark_user_presence_disconnected,
)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user_id = None
        self.user_group_name = None

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.user_group_name:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)
        if self.user_id:
            presence_state = await self._presence_disconnect(self.user_id)
            await self._broadcast_presence_if_changed(self.user_id, presence_state)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
            return

        action = data.get('action', '')

        if action == 'authenticate':
            try:
                self.user_id = int(data.get('user_id'))
            except (TypeError, ValueError):
                self.user_id = None

            if self.user_id:
                presence_state = await self._presence_connect(self.user_id)
                self.user_group_name = f'user_{self.user_id}'
                await self.channel_layer.group_add(self.user_group_name, self.channel_name)
                await self._broadcast_presence_if_changed(self.user_id, presence_state)
            return

        if action == 'send_message':
            await self._handle_send_message(data)
        elif action == 'typing':
            await self._handle_typing(data)
        elif action == 'read':
            await self._handle_read(data)
        elif action == 'game_invite':
            await self._handle_game_invite(data)

    async def _handle_send_message(self, data):
        if not self.user_id:
            await self.send(text_data=json.dumps({'error': 'Not authenticated'}))
            return

        content = data.get('content', '').strip()
        if not content:
            return

        is_blocked = await self._is_blocked(self.user_id, self.conversation_id)
        if is_blocked:
            await self.send(text_data=json.dumps({'error': 'Relation bloquee'}))
            return

        message = await self._save_message(self.user_id, self.conversation_id, content, 'text')
        if message:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                }
            )

    async def _handle_typing(self, data):
        if not self.user_id:
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_typing',
                'user_id': self.user_id,
                'username': data.get('username', ''),
                'is_typing': data.get('is_typing', True),
            }
        )

    async def _handle_read(self, data):
        if not self.user_id:
            return
        message_ids = data.get('message_ids', [])
        if message_ids:
            await self._mark_messages_read(self.user_id, message_ids)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_read',
                    'user_id': self.user_id,
                    'message_ids': message_ids,
                }
            )

    async def _handle_game_invite(self, data):
        if not self.user_id:
            return

        blocked = await self._game_invite_blocked_by_active_game()
        if blocked:
            await self.send(text_data=json.dumps(blocked))
            return

        content = json.dumps(build_game_invite_content_dict(data))

        message = await self._save_message(
            self.user_id, self.conversation_id, content, 'game_invite'
        )
        if message:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'action': 'new_message',
            'message': event['message'],
        }))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            'action': 'typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing'],
        }))

    async def chat_read(self, event):
        await self.send(text_data=json.dumps({
            'action': 'read',
            'user_id': event['user_id'],
            'message_ids': event['message_ids'],
        }))

    async def notification(self, event):
        await self.send(text_data=json.dumps(event.get('data', {})))

    async def _broadcast_presence_if_changed(self, user_id, presence_state):
        if not presence_state or not presence_state.get('changed'):
            return

        friend_ids = await _get_accepted_friend_ids(user_id)
        payload = {
            'action': 'friend_presence',
            'user_id': int(user_id),
            'is_online': bool(presence_state.get('online')),
        }

        for friend_id in friend_ids:
            await self.channel_layer.group_send(
                f'user_{friend_id}',
                {
                    'type': 'notification',
                    'data': payload,
                }
            )

    @database_sync_to_async
    def _save_message(self, user_id, conversation_id, content, msg_type):
        try:
            user = LocalUser.objects.get(id=user_id)
            conversation = Conversation.objects.get(id=conversation_id)
            if not conversation.participants.filter(id=user_id).exists():
                return None
            msg = Message.objects.create(
                conversation=conversation,
                sender=user,
                content=content,
                message_type=msg_type,
            )
            msg.read_by.add(user)
            conversation.save()
            return msg.to_dict()
        except (LocalUser.DoesNotExist, Conversation.DoesNotExist):
            return None

    @database_sync_to_async
    def _mark_messages_read(self, user_id, message_ids):
        try:
            user = LocalUser.objects.get(id=user_id)
            messages = Message.objects.filter(
                id__in=message_ids,
                conversation_id=self.conversation_id,
            )
            for msg in messages:
                msg.read_by.add(user)
        except LocalUser.DoesNotExist:
            pass

    @database_sync_to_async
    def _game_invite_blocked_by_active_game(self):
        from game.services.active_game import get_active_game_sync

        try:
            conversation = Conversation.objects.get(id=int(self.conversation_id))
        except (Conversation.DoesNotExist, TypeError, ValueError):
            return None
        participant_ids = list(conversation.participants.values_list('id', flat=True))
        other_ids = [pid for pid in participant_ids if int(pid) != int(self.user_id)]
        if not other_ids:
            return None
        other_id = int(other_ids[0])
        sender_id = int(self.user_id)
        if get_active_game_sync(sender_id):
            return {
                'error': 'Tu es déjà en partie. Impossible d’envoyer une invitation.',
                'code': 'sender_in_game',
            }
        if get_active_game_sync(other_id):
            return {
                'error': 'L’autre joueur est déjà en partie.',
                'code': 'receiver_in_game',
            }
        return None

    @database_sync_to_async
    def _is_blocked(self, user_id, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            participants = list(conversation.participants.values_list('id', flat=True))
            other_ids = [pid for pid in participants if pid != user_id]
            if not other_ids:
                return False
            return Friendship.objects.filter(
                Q(from_user_id=user_id, to_user_id__in=other_ids, status='blocked') |
                Q(from_user_id__in=other_ids, to_user_id=user_id, status='blocked')
            ).exists()
        except Conversation.DoesNotExist:
            return True

    @database_sync_to_async
    def _presence_connect(self, user_id):
        return mark_user_presence_connected(user_id)

    @database_sync_to_async
    def _presence_disconnect(self, user_id):
        return mark_user_presence_disconnected(user_id)


class NotificationConsumer(AsyncWebsocketConsumer):
    """Per-user WebSocket for global notifications (new messages, friend requests)."""

    async def connect(self):
        try:
            self.user_id = int(self.scope['url_route']['kwargs'].get('user_id'))
        except (TypeError, ValueError):
            await self.close(code=4400)
            return

        self.room_group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        presence_state = await self._presence_connect(self.user_id)
        await self._broadcast_presence_if_changed(self.user_id, presence_state)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        presence_state = await self._presence_disconnect(self.user_id)
        await self._broadcast_presence_if_changed(self.user_id, presence_state)

    async def receive(self, text_data):
        pass

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'action': 'new_message',
            'message': event['message'],
        }))

    async def notification(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def _broadcast_presence_if_changed(self, user_id, presence_state):
        if not presence_state or not presence_state.get('changed'):
            return

        friend_ids = await _get_accepted_friend_ids(user_id)
        payload = {
            'action': 'friend_presence',
            'user_id': int(user_id),
            'is_online': bool(presence_state.get('online')),
        }

        for friend_id in friend_ids:
            await self.channel_layer.group_send(
                f'user_{friend_id}',
                {
                    'type': 'notification',
                    'data': payload,
                }
            )

    @database_sync_to_async
    def _presence_connect(self, user_id):
        return mark_user_presence_connected(user_id)

    @database_sync_to_async
    def _presence_disconnect(self, user_id):
        return mark_user_presence_disconnected(user_id)


@database_sync_to_async
def _get_accepted_friend_ids(user_id):
    relations = Friendship.objects.filter(
        status='accepted'
    ).filter(
        Q(from_user_id=user_id) | Q(to_user_id=user_id)
    ).values_list('from_user_id', 'to_user_id')

    friend_ids = set()
    current_id = int(user_id)
    for from_id, to_id in relations:
        other_id = to_id if int(from_id) == current_id else from_id
        friend_ids.add(int(other_id))

    return list(friend_ids)
