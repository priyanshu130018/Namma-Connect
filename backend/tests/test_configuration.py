"""Tests for Centralized Settings, Environment Variable Loading, Endpoints, and Production Safety."""

import pytest
from app.core.config import settings, Settings
from app.services.cloudinary import CloudinaryService
from app.services.email import EmailService
from app.services.payment import PaymentService
from app.services.translation import TranslationService


def test_settings_centralized_defaults_and_endpoints():
    """Verify settings loads centralized endpoints and configuration defaults."""
    assert settings.PROJECT_NAME == "Namma Connect"
    assert settings.RESEND_API_URL == "https://api.resend.com/emails"
    assert settings.GEMINI_API_URL == "https://generativelanguage.googleapis.com/v1beta/models"
    assert "gemini" in settings.GEMINI_MODEL


def test_service_configuration_status_reporting():
    """Verify get_configured_services reports boolean presence without exposing credentials."""
    services = settings.get_configured_services()
    assert isinstance(services, dict)
    assert "cloudinary" in services
    assert "resend" in services
    assert "razorpay" in services
    assert "translation" in services
    assert "gemini" in services
    # Values must be purely boolean
    for k, v in services.items():
        assert isinstance(v, bool)


def test_resend_production_safety_fails_clearly():
    """Verify Resend service fails clearly without claiming success when unconfigured in production."""
    orig_env = settings.ENV
    orig_key = settings.RESEND_API_KEY
    try:
        settings.ENV = "production"
        settings.RESEND_API_KEY = ""
        res = EmailService.send_email(
            to_email="test_cust@example.com",
            subject="Verification",
            html_content="<p>Test</p>",
        )
        assert res["status"] == "failed"
        assert "unconfigured in production" in res["error"]
    finally:
        settings.ENV = orig_env
        settings.RESEND_API_KEY = orig_key


def test_cloudinary_production_safety_fails_clearly():
    """Verify Cloudinary fails clearly without silent local disk fallback when unconfigured in production."""
    orig_env = settings.ENV
    orig_cloud = settings.CLOUDINARY_CLOUD_NAME
    orig_key = settings.CLOUDINARY_API_KEY
    try:
        settings.ENV = "production"
        settings.CLOUDINARY_CLOUD_NAME = ""
        settings.CLOUDINARY_API_KEY = ""
        with pytest.raises(Exception) as exc_info:
            CloudinaryService.upload_media(b"fake_bytes", "sample.jpg")
        assert "Cloudinary is unconfigured in production" in str(exc_info.value)
    finally:
        settings.ENV = orig_env
        settings.CLOUDINARY_CLOUD_NAME = orig_cloud
        settings.CLOUDINARY_API_KEY = orig_key


def test_translation_endpoint_consumed_from_settings():
    """Verify TranslationService consumes GEMINI_API_URL from settings."""
    orig_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        assert TranslationService.translate_via_gemini("Hello", "kn") is None  # Unconfigured key returns None safely
    finally:
        settings.GEMINI_API_KEY = orig_key
    assert settings.GEMINI_API_URL.startswith("https://generativelanguage.googleapis.com/v1beta/models")


def test_celery_worker_translation_environment_resolution():
    """Verify that settings can resolve all translation integration environment variables."""
    assert hasattr(settings, "GEMINI_API_KEY")
    assert hasattr(settings, "GEMINI_API_URL")
    assert hasattr(settings, "GEMINI_MODEL")
    assert settings.GEMINI_MODEL == "gemini-3.5-flash-lite"
    assert "googleapis.com" in settings.GEMINI_API_URL


def test_celery_task_routes_translation_queue():
    """Verify that Celery task routing directs translate_resource_task to the translation queue."""
    from app.core.celery_app import celery_app
    task_route = celery_app.conf.task_routes.get("app.tasks.translation_tasks.translate_resource_task")
    assert task_route is not None
    assert task_route.get("queue") == "translation"


def test_configuration_path_resolution_local():
    """Verify configuration correctly resolves project root and authoritative .env when running locally."""
    from app.core.config import find_project_root, find_backend_dir, resolve_env_files, CURRENT_FILE, ROOT_DIR, BACKEND_DIR, ENV_FILES
    resolved_root = find_project_root(CURRENT_FILE)
    assert resolved_root.is_dir()
    # On host repository: compose.yaml or .git is present. Inside container: app/core is present.
    assert (resolved_root / "compose.yaml").is_file() or (resolved_root / ".git").is_dir() or (resolved_root / "app" / "core").is_dir()
    assert resolved_root == ROOT_DIR

    resolved_backend = find_backend_dir(CURRENT_FILE)
    assert resolved_backend.is_dir()
    assert resolved_backend == BACKEND_DIR

    resolved_envs = resolve_env_files(CURRENT_FILE)
    assert isinstance(resolved_envs, tuple)
    assert len(resolved_envs) >= 1


def test_configuration_path_resolution_docker_style(tmp_path):
    """Verify configuration path strategy works in Docker container paths (/app/app/core/config.py) without IndexError: 4."""
    from app.core.config import find_project_root, find_backend_dir, resolve_env_files

    # Recreate the exact Docker filesystem layout: /app/app/core/config.py
    docker_app = tmp_path / "app"
    docker_core = docker_app / "app" / "core"
    docker_core.mkdir(parents=True)
    docker_config = docker_core / "config.py"
    docker_config.touch()

    # The shallow path depth must not trigger IndexError: 4
    resolved_root = find_project_root(docker_config)
    assert resolved_root == docker_app

    resolved_backend = find_backend_dir(docker_config)
    assert resolved_backend == docker_app

    resolved_envs = resolve_env_files(docker_config)
    assert isinstance(resolved_envs, tuple)
    # When no .env exists on disk, it safely returns candidate paths without throwing exceptions
    assert any(str(docker_app) in path for path in resolved_envs)


def test_docker_os_environment_variable_precedence(tmp_path, monkeypatch):
    """Verify Docker/OS environment variables take strict precedence over .env file fallback."""
    fake_env = tmp_path / ".env"
    fake_env.write_text(
        "PROJECT_NAME=DotEnv Name\n"
        "DEBUG=False\n"
        "ENV=test\n",
        encoding="utf-8",
    )

    # Docker injects environment variables directly into os.environ
    monkeypatch.setenv("PROJECT_NAME", "Docker Injected Name")
    monkeypatch.setenv("DEBUG", "True")
    monkeypatch.setenv("ENV", "test")

    test_settings = Settings(_env_file=str(fake_env))
    assert test_settings.PROJECT_NAME == "Docker Injected Name"
    assert test_settings.DEBUG is True


def test_strict_validation_missing_jwt_secret_in_prod(monkeypatch):
    """Verify Settings raises ConfigurationError in production if JWT_SECRET is short or default."""
    from app.core.config import ConfigurationError
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_SYNC_URL", "postgresql://user:pass@localhost:5432/namma_connect_prod")
    monkeypatch.setenv("JWT_SECRET", "short_secret")
    with pytest.raises(ConfigurationError) as exc_info:
        Settings(_env_file=None)
    assert "less than the required minimum of 32 characters" in str(exc_info.value)


def test_strict_validation_sqlite_in_production(monkeypatch):
    """Verify Settings raises ConfigurationError in production if SQLite URL is provided."""
    from app.core.config import ConfigurationError
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_SYNC_URL", "sqlite:///prod.db")
    monkeypatch.setenv("JWT_SECRET", "a_very_secure_and_long_jwt_secret_32chars!")
    with pytest.raises(ConfigurationError) as exc_info:
        Settings(_env_file=None)
    assert "SQLite is strictly prohibited" in str(exc_info.value)


def test_strict_validation_invalid_database_scheme(monkeypatch):
    """Verify Settings raises ConfigurationError if database scheme is not postgresql."""
    from app.core.config import ConfigurationError
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("DATABASE_SYNC_URL", "mysql://user:pass@localhost:3306/db")
    monkeypatch.setenv("JWT_SECRET", "a_very_secure_and_long_jwt_secret_32chars!")
    with pytest.raises(ConfigurationError) as exc_info:
        Settings(_env_file=None)
    assert "DATABASE_SYNC_URL is invalid" in str(exc_info.value)


def test_strict_validation_valid_production_settings(monkeypatch):
    """Verify Settings initializes cleanly in production when all required values are valid."""
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_SYNC_URL", "postgresql://user:pass@db:5432/namma_connect_prod")
    monkeypatch.setenv("JWT_SECRET", "a_very_secure_and_long_jwt_secret_32chars!")
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/0")
    
    prod_settings = Settings(_env_file=None)
    assert prod_settings.ENV == "production"
    assert prod_settings.JWT_SECRET == "a_very_secure_and_long_jwt_secret_32chars!"
    assert prod_settings.DATABASE_SYNC_URL == "postgresql://user:pass@db:5432/namma_connect_prod"
    assert prod_settings.DATABASE_URL == "postgresql+asyncpg://user:pass@db:5432/namma_connect_prod"



