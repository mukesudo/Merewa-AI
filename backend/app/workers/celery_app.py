from celery import Celery

from ..core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "merewa",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Addis_Ababa",
    enable_utc=True,
)
