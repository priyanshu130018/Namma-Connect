#!/usr/bin/env python3
import os
import sys
import argparse
import logging
import asyncio

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("deploy_check")

def load_env_file(filepath):
    if not filepath or not os.path.isfile(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'\"")
            if k not in os.environ:
                os.environ[k] = v

REQUIRED_PROD_VARS = [
    ("PROJECT_NAME", "Core Application"),
    ("VERSION", "Core Application"),
    ("ENV", "Core Application"),
    ("DATABASE_URL", "Database"),
    ("REDIS_URL", "Cache/Broker"),
    ("JWT_SECRET", "Security"),
    ("RAZORPAY_KEY_ID", "Payments"),
    ("RAZORPAY_KEY_SECRET", "Payments"),
    ("RAZORPAY_WEBHOOK_SECRET", "Payments"),
    ("GEMINI_API_KEY", "AI Assistant"),
    ("GEMINI_MODEL", "AI Assistant"),
    ("TOMTOM_API_KEY", "Geocoding"),
]

def check_env_vars():
    logger.info("── 1. Checking Production Environment Variables ──")
    missing = []
    for var, category in REQUIRED_PROD_VARS:
        val = os.environ.get(var)
        if not val or "GENERATE_" in val or "PROD_" in val:
            missing.append((var, category))
        else:
            logger.info(f"  [OK] {var:<24} ({category})")

    jwt_secret = os.environ.get("JWT_SECRET", "")
    if jwt_secret and len(jwt_secret) < 32:
        logger.warning(f"  [WARNING] JWT_SECRET length ({len(jwt_secret)}) is shorter than 32 characters!")

    if os.environ.get("DEBUG", "").lower() in ("true", "1"):
        logger.error("  [FAIL] DEBUG is set to True in production environment!")
        return False

    if missing:
        logger.warning(f"  [MISSING/PLACEHOLDER] {len(missing)} environment variable(s) not set:")
        for var, cat in missing:
            logger.warning(f"    - {var} ({cat})")
        return False
    return True

async def check_database():
    logger.info("── 2. Checking Database Connectivity & Alembic State ──")
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("  [FAIL] DATABASE_URL is not configured.")
        return False
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        engine = create_async_engine(db_url, echo=False)
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1;"))
            row = res.scalar()
            logger.info(f"  [OK] PostgreSQL connection successful (result={row}).")

            vec_res = await conn.execute(text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"))
            vec_row = vec_res.fetchone()
            if vec_row:
                logger.info(f"  [OK] pgvector extension active (version={vec_row[1]}).")
            else:
                logger.warning("  [WARNING] pgvector extension is not registered in target database!")

            try:
                elem_res = await conn.execute(text("SELECT version_num FROM alembic_version;"))
                version = elem_res.scalar()
                logger.info(f"  [OK] Current Alembic database head: {version}")
            except Exception as e:
                logger.warning(f"  [WARNING] Could not read alembic_version: {e}")
        await engine.dispose()
        return True
    except Exception as e:
        logger.error(f"  [FAIL] Database connectivity error: {e}")
        return False

def check_redis():
    logger.info("── 3. Checking Redis Connectivity ──")
    redis_url = os.environ.get("REDIS_URL", "")
    if not redis_url:
        logger.error("  [FAIL] REDIS_URL is not configured.")
        return False
    try:
        import redis
        client = redis.from_url(redis_url, socket_timeout=3)
        pong = client.ping()
        logger.info(f"  [OK] Redis ping response: {pong}")
        return True
    except Exception as e:
        logger.error(f"  [FAIL] Redis connectivity error: {e}")
        return False

def run_all_checks():
    print("=" * 70)
    print("Namma Connect V2 — Production Deployment Verification")
    print("=" * 70)

    env_ok = check_env_vars()
    db_ok = asyncio.run(check_database())
    redis_ok = check_redis()

    print("=" * 70)
    print("SUMMARY DIAGNOSTIC:")
    print(f"  Environment Variables: {'PASS' if env_ok else 'REVIEW REQUIRED'}")
    print(f"  PostgreSQL Connection: {'PASS' if db_ok else 'FAIL'}")
    print(f"  Redis Cache & Broker:  {'PASS' if redis_ok else 'FAIL'}")
    print("=" * 70)

    return env_ok and db_ok and redis_ok

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Namma Connect V2 Deployment Check")
    parser.add_argument("--env-file", default=None, help="Path to .env file to load")
    args = parser.parse_args()
    if args.env_file:
        load_env_file(args.env_file)
    success = run_all_checks()
    sys.exit(0 if success else 1)
