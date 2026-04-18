import ssl

from celery import Celery
from celery.schedules import crontab

from ..core.config import get_settings


settings = get_settings()

broker_url = settings.resolved_redis_url
result_backend = broker_url if broker_url.startswith(("redis://", "rediss://")) else "cache+memory://"

celery_app = Celery(
    "merewa",
    broker=broker_url,
    backend=result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Addis_Ababa",
    enable_utc=True,
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE} if broker_url.startswith("rediss://") else None,
    redis_backend_use_ssl={
        "ssl_cert_reqs": ssl.CERT_NONE
    } if result_backend.startswith("rediss://") else None,
    beat_schedule={
        "daily-ai-generation": {
            "task": "merewa.generate_daily_ai_posts",
            "schedule": crontab(hour=8, minute=0),  # Run every day at 8:00 AM local time
            "kwargs": {"language": "am"},
        }
    }
)
