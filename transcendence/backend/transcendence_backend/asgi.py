import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# On définit les settings avant d'importer les routings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transcendence_backend.settings')

# Initialise l'application Django ASGI pour le HTTP
django_asgi_app = get_asgi_application()

import game.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    # Gère les WebSockets
    "websocket": AuthMiddlewareStack(
        URLRouter(
            game.routing.websocket_urlpatterns
        )
    ),
})