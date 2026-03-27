from django.contrib import admin
from django.urls import path, include
from views import Auth42View, Callback42View

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/42/login', Auth42View.as_view(), name='login_42'),
    path('api/auth/42/login/', Auth42View.as_view()),
    path('api/auth/42/callback', Callback42View.as_view(), name='callback_42'),
    path('api/auth/42/callback/', Callback42View.as_view()),
    path('api/auth/', include('accounts.urls')),
    path('', include('django_prometheus.urls')),
]