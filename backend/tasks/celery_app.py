from celery import Celery
from config import REDIS_URL

app = Celery("isula_vitrage", broker=REDIS_URL, backend=REDIS_URL)
app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Paris",
    task_track_started=True,
    result_expires=3600,
)
