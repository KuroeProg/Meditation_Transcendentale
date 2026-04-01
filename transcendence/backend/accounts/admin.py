from django.contrib import admin

from .models import LocalUser


@admin.register(LocalUser)
class LocalUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'coalition')
    search_fields = ('username', 'email')
