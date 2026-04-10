import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from accounts.models import Friendship, LocalUser
from chat.invite_payload import build_game_invite_content_dict
from chat.models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user_id = None

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
            return

        action = data.get('action', '')

        if action == 'authenticate':
            self.user_id = data.get('user_id')
            if self.user_id:
                await self._set_user_online(self.user_id, True)
                user_group = f'user_{self.user_id}'
                await self.channel_layer.group_add(user_group, self.channel_name)
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
    def _is_blocked(self, user_id, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            participants = list(conversation.participants.values_list('id', flat=True))
            other_ids = [pid for pid in participants if pid != user_id]
            if not other_ids:
                return False
            from django.db.models import Q
            return Friendship.objects.filter(
                Q(from_user_id=user_id, to_user_id__in=other_ids, status='blocked') |
                Q(from_user_id__in=other_ids, to_user_id=user_id, status='blocked')
            ).exists()
        except Conversation.DoesNotExist:
            return True

    @database_sync_to_async
    def _set_user_online(self, user_id, online):
        from django.utils import timezone
        LocalUser.objects.filter(id=user_id).update(
            is_online=online,
            last_seen=timezone.now(),
        )


class NotificationConsumer(AsyncWebsocketConsumer):
    """Per-user WebSocket for global notifications (new messages, friend requests)."""

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs'].get('user_id')
        self.room_group_name = f'user_{self.user_id}'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self._set_user_online(int(self.user_id), True)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self._set_user_online(int(self.user_id), False)

    async def receive(self, text_data):
        pass

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'action': 'new_message',
            'message': event['message'],
        }))

    async def notification(self, event):
        await self.send(text_data=json.dumps(event['data']))

    @database_sync_to_async
    def _set_user_online(self, user_id, online):
        from django.utils import timezone
        LocalUser.objects.filter(id=user_id).update(
            is_online=online,
            last_seen=timezone.now(),
        )
