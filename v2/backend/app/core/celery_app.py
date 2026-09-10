"""Celery background worker and task queue initialization for NammaConnect V2."""

import os
from celery import Celery
from app.core.config import settings

redis_url = getattr(settings, "REDIS_URL", None) or os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "nammaconnect_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.recommendation_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    task_routes={
        "app.tasks.recommendation_tasks.process_user_interaction_task": {"queue": "analytics"},
        "app.tasks.recommendation_tasks.update_user_interest_profile_task": {"queue": "analytics"},
        "app.tasks.recommendation_tasks.precompute_home_recommendations_task": {"queue": "recommendation"},
        "app.tasks.recommendation_tasks.compute_user_similarities_task": {"queue": "recommendation"},
        "app.tasks.recommendation_tasks.recalculate_nc_score_task": {"queue": "nc_score"},
        "app.tasks.recommendation_tasks.generate_nc_score_snapshot_task": {"queue": "nc_score"},
        "app.tasks.recommendation_tasks.send_notification_task": {"queue": "notification"},
    },
)
