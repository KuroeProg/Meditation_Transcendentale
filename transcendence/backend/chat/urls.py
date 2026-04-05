from django.urls import path

from . import views


def with_optional_trailing_slash(route, view_callable, name=None):
    patterns = [path(route, view_callable, name=name)]
    slash_route = route if route.endswith('/') else f'{route}/'
    if slash_route != route:
        patterns.append(path(slash_route, view_callable))
    return patterns


urlpatterns = [
    *with_optional_trailing_slash('conversations', views.conversation_list, name='conversation_list'),
    *with_optional_trailing_slash('conversations/create', views.create_conversation, name='create_conversation'),
    *with_optional_trailing_slash(
        'conversations/<int:conversation_id>/messages',
        views.conversation_messages,
        name='conversation_messages',
    ),
    *with_optional_trailing_slash(
        'conversations/<int:conversation_id>/send',
        views.send_message,
        name='send_message',
    ),
    *with_optional_trailing_slash(
        'conversations/<int:conversation_id>/invite',
        views.send_game_invite,
        name='send_game_invite',
    ),
]
