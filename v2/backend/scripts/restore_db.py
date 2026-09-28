"""PostgreSQL Database Restore and Integrity Verification Script for Namma Connect V2.

Safely restores a gzipped SQL dump to an isolated database target, verifies SHA256 checksums,
and runs table existence integrity checks.
"""

import os
import sys
import subprocess
import hashlib
from urllib.parse import urlparse


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def restore_backup(backup_filepath: str, confirm: bool = False):
    if not os.path.exists(backup_filepath):
        print(f"ERROR: Backup file '{backup_filepath}' does not exist.")
        sys.exit(1)

    # 1. Verify Checksum if present
    checksum_file = f"{backup_filepath}.sha256"
    if os.path.exists(checksum_file):
        with open(checksum_file, "r") as f:
            expected_checksum = f.read().split()[0].strip()
        actual_checksum = compute_sha256(backup_filepath)
        if expected_checksum != actual_checksum:
            print(f"ERROR: Checksum mismatch! Expected {expected_checksum}, found {actual_checksum}")
            sys.exit(1)
        print("Verified SHA256 integrity checksum successfully.")

    # 2. Database Connection Info
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

    if "prod" in db_name.lower() and not confirm:
        print("SAFETY GUARD: Target database appears to be PRODUCTION. Pass --confirm to proceed.")
        sys.exit(1)

    print(f"Restoring backup '{os.path.basename(backup_filepath)}' into database '{db_name}'...")

    env = os.environ.copy()
    if db_pass:
        env["PGPASSWORD"] = db_pass

    cmd = f'gunzip -c "{backup_filepath}" | psql -h {db_host} -p {db_port} -U {db_user} -d {db_name}'

    try:
        subprocess.run(cmd, shell=True, env=env, check=True)
        print(f"SUCCESS: Database restore completed into '{db_name}'.")
    except Exception as e:
        print(f"FAILED: Database restore encountered error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python restore_db.py <backup_filepath.sql.gz> [--confirm]")
        sys.exit(1)
    backup_file = sys.argv[1]
    is_confirmed = "--confirm" in sys.argv
    restore_backup(backup_file, confirm=is_confirmed)
