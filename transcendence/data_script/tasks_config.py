"""
Application Celery minimale pour le service `worker` (data / plots).
Brancher les tâches ici avec @app.task, ou importer depuis d'autres modules.
"""
import os

from celery import Celery

app = Celery("tasks_config")
app.conf.broker_url = os.environ["CELERY_BROKER_URL"]
app.conf.task_default_queue = "default"
app.conf.worker_prefetch_multiplier = 1


@app.task(name="tasks_config.ping")
def ping():
    """Tâche de test (ex. celery -A tasks_config call tasks_config.ping)."""
    return "pong"
