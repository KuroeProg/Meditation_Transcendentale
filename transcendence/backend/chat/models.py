from django.db import models

from accounts.models import LocalUser


class Conversation(models.Model):
    TYPE_CHOICES = [
        ('private', 'Private'),
        ('game', 'Game'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='private')
    participants = models.ManyToManyField(LocalUser, related_name='conversations')
    game_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_conversations'
        ordering = ['-updated_at']

    def to_dict(self, current_user=None):
        participants = list(self.participants.all())
        other = [p for p in participants if current_user is None or p.id != current_user.id]
        last_msg = self.messages.order_by('-created_at').first()
        unread = 0
        unread_text = 0
        unread_invite = 0
        if current_user:
            base_unread = self.messages.exclude(sender=current_user).exclude(read_by=current_user)
            unread = base_unread.count()
            unread_invite = base_unread.filter(message_type='game_invite').count()
            unread_text = base_unread.exclude(message_type='game_invite').count()

        return {
            'id': self.id,
            'type': self.type,
            'game_id': self.game_id,
            'participants': [
                {
                    'id': p.id,
                    'username': p.username,
                    'avatar': p.get_avatar_url(),
                    'is_online': p.is_online,
                    'coalition': p.coalition,
                }
                for p in other
            ],
            'last_message': last_msg.to_dict() if last_msg else None,
            'unread_count': unread,
            'unread_text_count': unread_text,
            'unread_invite_count': unread_invite,
            'updated_at': self.updated_at.isoformat(),
        }


class Message(models.Model):
    TYPE_CHOICES = [
        ('text', 'Text'),
        ('game_invite', 'Game Invite'),
        ('system', 'System'),
    ]

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        LocalUser, on_delete=models.CASCADE, related_name='sent_messages'
    )
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    read_by = models.ManyToManyField(LocalUser, related_name='read_messages', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender': {
                'id': self.sender.id,
                'username': self.sender.username,
                'avatar': self.sender.get_avatar_url(),
                'coalition': self.sender.coalition,
            },
            'content': self.content,
            'message_type': self.message_type,
            'read_by': list(self.read_by.values_list('id', flat=True)),
            'created_at': self.created_at.isoformat(),
        }
