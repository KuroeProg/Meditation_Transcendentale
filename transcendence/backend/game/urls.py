from django.urls import path
from game import views


def with_optional_trailing_slash(route, view_callable, name=None):
    patterns = [path(route, view_callable, name=name)]
    slash_route = route if route.endswith('/') else f'{route}/'
    if slash_route != route:
        patterns.append(path(slash_route, view_callable))
    return patterns


urlpatterns = [
    *with_optional_trailing_slash('history', views.game_history, name='game_history'),
    *with_optional_trailing_slash('history/<int:pk>', views.game_replay, name='game_replay'),
]
