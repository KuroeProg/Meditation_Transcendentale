import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transcendence_backend.settings')

app = Celery('transcendence_backend')

# Load config from settings, prefix CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks (if any in apps)
app.autodiscover_tasks()
