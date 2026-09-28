"""Automated PostgreSQL Database Backup Script for Namma Connect V2.

Performs logical database backup using pg_dump with timestamping, gzip compression,
SHA256 checksum generation, and automatic retention cleanup.
"""

import os
import sys
import time
import subprocess
import hashlib
from datetime import datetime
from urllib.parse import urlparse

BACKUP_DIR = os.getenv("BACKUP_DIR", os.path.join(os.path.dirname(__file__), "..", "backups"))
RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "14"))


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def create_backup():
    db_url = os.getenv("DATABASE_SYNC_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: Missing required environment variable: DATABASE_SYNC_URL (or DATABASE_URL).")
        sys.exit(1)
    parsed = urlparse(db_url)

    db_user = parsed.username
    db_pass = parsed.password
    db_host = parsed.hostname
    db_port = str(parsed.port or 5432)
    db_name = parsed.path.lstrip("/")
    if not db_user or not db_host or not db_name:
        print("ERROR: DATABASE_SYNC_URL must be a valid PostgreSQL connection string (postgresql://user:pass@host:port/dbname).")
        sys.exit(1)

    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"nammaconnect_backup_{db_name}_{timestamp}.sql.gz"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    print(f"[{datetime.utcnow().isoformat()}] Initiating database backup for '{db_name}'...")

    env = os.environ.copy()
    if db_pass:
        env["PGPASSWORD"] = db_pass

    cmd = f'pg_dump -h {db_host} -p {db_port} -U {db_user} -d {db_name} --no-owner --no-privileges | gzip > "{backup_path}"'

    try:
        res = subprocess.run(cmd, shell=True, env=env, check=True)
        if os.path.exists(backup_path) and os.path.getsize(backup_path) > 0:
            size_kb = os.path.getsize(backup_path) / 1024.0
            checksum = compute_sha256(backup_path)
            checksum_path = f"{backup_path}.sha256"
            with open(checksum_path, "w") as f:
                f.write(f"{checksum}  {backup_filename}\n")

            print(f"SUCCESS: Backup completed -> {backup_filename} ({size_kb:.2f} KB)")
            print(f"SHA256: {checksum}")
            cleanup_old_backups()
            return backup_path
        else:
            print("ERROR: Backup file was not generated or is empty.")
            sys.exit(1)
    except Exception as e:
        print(f"FAILED: Error executing database backup: {e}")
        sys.exit(1)


def cleanup_old_backups():
    now = time.time()
    cutoff = now - (RETENTION_DAYS * 86400)
    for fname in os.listdir(BACKUP_DIR):
        fpath = os.path.join(BACKUP_DIR, fname)
        if os.path.isfile(fpath) and (fname.endswith(".sql.gz") or fname.endswith(".sha256")):
            if os.path.getmtime(fpath) < cutoff:
                try:
                    os.remove(fpath)
                    print(f"Pruned expired backup file: {fname}")
                except Exception as e:
                    print(f"Warning: Could not remove {fname}: {e}")


if __name__ == "__main__":
    create_backup()
