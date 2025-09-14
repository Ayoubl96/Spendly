from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "spendly",
    broker=settings.CELERY_BROKER_DATABASE_URL,
    backend=settings.CELERY_RESULT_DATABASE_URL,
    include=["app.tasks.daily_bank_import"]
)

celery_app.conf.update(
    task_serializer=settings.CELERY_TASK_SERIALIZER,
    result_serializer=settings.CELERY_RESULT_SERIALIZER,
    accept_content=settings.CELERY_ACCEPT_CONTENT,
    timezone=settings.CELERY_TIMEZONE,
    enable_utc=settings.CELERY_ENABLE_UTC,

    task_routes={
        "app.tasks.daily_bank_import.*" : {"queue": "bank_imports"},
    },

    beat_schedule={
        "daily-bank-import":{
            "task": "app.tasks.daily_bank_import.process_daly_bank_imports",
            "schedule": crontab(hour=2, minute=0),
        },
    },

    task_track_started=True,
    task_time_limit= 30 * 60,
    task_soft_time_limit=25 * 60,
    worker_pretech_multipiler=1,
)


celery_app.autodiscover_tasks(["app.tasks"])
