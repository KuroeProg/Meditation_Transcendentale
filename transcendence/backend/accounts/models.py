from django.contrib.auth.hashers import check_password, make_password
from django.db import models


class LocalUser(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password_hash = models.CharField(max_length=255)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    coalition = models.CharField(max_length=50, blank=True, default='feu')

    class Meta:
        db_table = 'local_users'

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)

    def to_public_dict(self):
        return {
            'id': self.id,
            'login': self.username,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'coalition': self.coalition,
            'coalition_name': self.coalition,
            'image': {
                'link': 'https://picsum.photos/seed/local-user/256/256',
                'versions': {'medium': 'https://picsum.photos/seed/local-user/256/256'},
            },
        }
