from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone


class LocalUser(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password_hash = models.CharField(max_length=255)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    image_url = models.URLField(blank=True, default='')
    coalition = models.CharField(max_length=50, blank=True, default='feu')
    level = models.FloatField(null=True, blank=True, default=None)
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    elo_bullet = models.IntegerField(default=1200)
    elo_blitz = models.IntegerField(default=1200)
    elo_rapid = models.IntegerField(default=1200)
    games_played = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    is_2fa_enabled = models.BooleanField(default=True)
    is_2fa_verified = models.BooleanField(default=True)

    class Meta:
        db_table = 'local_users'

    def __str__(self):
        return self.username

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)

    def get_avatar_url(self):
        if self.avatar:
            return self.avatar.url
        if self.image_url:
            return self.image_url
        return f'https://api.dicebear.com/7.x/initials/svg?seed={self.username}'

    def to_public_dict(self):
        image_link = self.get_avatar_url()
        # Comptes créés via OAuth 42 : password_hash vide ; inscription locale : hash présent.
        auth_provider = 'oauth42' if not (self.password_hash or '').strip() else 'local'
        return {
            'id': self.id,
            'login': self.username,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'bio': self.bio,
            'coalition': self.coalition,
            'coalition_name': self.coalition,
            'auth_provider': auth_provider,
            'level': self.level,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'elo_bullet': self.elo_bullet,
            'elo_blitz': self.elo_blitz,
            'elo_rapid': self.elo_rapid,
            'games_played': self.games_played,
            'games_won': self.games_won,
            'image': {
                'link': image_link,
                'versions': {'medium': image_link},
            },
        }


class Friendship(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('blocked', 'Blocked'),
    ]

    from_user = models.ForeignKey(
        LocalUser, on_delete=models.CASCADE, related_name='friendships_sent'
    )
    to_user = models.ForeignKey(
        LocalUser, on_delete=models.CASCADE, related_name='friendships_received'
    )
    blocked_by = models.ForeignKey(
        LocalUser,
        on_delete=models.SET_NULL,
        related_name='friendships_blocked',
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'friendships'
        unique_together = ('from_user', 'to_user')

    def to_dict(self):
        return {
            'id': self.id,
            'from_user': self.from_user.to_public_dict(),
            'to_user': self.to_user.to_public_dict(),
            'status': self.status,
            'blocked_by_id': self.blocked_by_id,
            'created_at': self.created_at.isoformat(),
        }
