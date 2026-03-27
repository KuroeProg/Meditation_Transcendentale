from django.contrib import admin
from django.urls import path, include
from views import login_42, callback_42

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/42/login', login_42, name='login_42'),
    path('api/auth/42/callback', callback_42, name='callback_42'),
    path('api/auth/', include('accounts.urls')),
    path('', include('django_prometheus.urls')),
]