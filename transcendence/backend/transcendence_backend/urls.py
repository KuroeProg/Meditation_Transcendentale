from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from accounts import views


def with_optional_trailing_slash(route, view_callable, name=None):
    patterns = [path(route, view_callable, name=name)]
    slash_route = route if route.endswith('/') else f'{route}/'
    if slash_route != route:
        patterns.append(path(slash_route, view_callable))
    return patterns

from transcendence_backend.views import client_log_view

urlpatterns = [
    path('admin/', admin.site.urls),
    *with_optional_trailing_slash('api/auth/42/login', views.Auth42View.as_view(), name='login_42'),
    *with_optional_trailing_slash('api/auth/42/callback', views.Callback42View.as_view(), name='callback_42'),
    path('api/auth/', include('accounts.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/logs/client/', client_log_view, name='client_log'),
    path('', include('django_prometheus.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)