from django.urls import re_path

from chat.consumers import ChatConsumer, NotificationConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<conversation_id>\w+)/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/notifications/(?P<user_id>\w+)/$', NotificationConsumer.as_asgi()),
]
