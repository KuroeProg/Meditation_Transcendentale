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


class GameInvite(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_CANCELLED = 'cancelled'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='game_invites',
    )
    source_message = models.OneToOneField(
        Message,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='game_invite_meta',
    )
    sender = models.ForeignKey(
        LocalUser,
        on_delete=models.CASCADE,
        related_name='sent_game_invites',
    )
    receiver = models.ForeignKey(
        LocalUser,
        on_delete=models.CASCADE,
        related_name='received_game_invites',
    )
    time_control_seconds = models.PositiveIntegerField(default=600)
    increment_seconds = models.PositiveSmallIntegerField(default=0)
    competitive = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    cancel_reason = models.CharField(max_length=40, null=True, blank=True)
    game_id = models.CharField(max_length=255, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_game_invites'
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                check=~models.Q(sender=models.F('receiver')),
                name='chat_game_invite_sender_receiver_different',
            ),
            models.UniqueConstraint(
                fields=['sender'],
                condition=models.Q(status=STATUS_PENDING),
                name='chat_one_pending_outgoing_invite_per_sender',
            ),
        ]
        indexes = [
            models.Index(fields=['receiver', 'status']),
            models.Index(fields=['sender', 'status']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'source_message_id': self.source_message_id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'time_control_seconds': self.time_control_seconds,
            'increment_seconds': self.increment_seconds,
            'competitive': self.competitive,
            'status': self.status,
            'cancel_reason': self.cancel_reason,
            'game_id': self.game_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
