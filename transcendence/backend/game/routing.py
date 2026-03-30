from django.urls import re_path
from game.game_consumer import GameConsumer
from game.matchmaking_consumer import MatchmakingConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chess/matchmaking/$', MatchmakingConsumer.as_asgi()),
    re_path(r'^ws/chess/(?P<game_id>\w+)/$', GameConsumer.as_asgi()),
]