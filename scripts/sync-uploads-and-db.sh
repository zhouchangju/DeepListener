#!/usr/bin/env bash
# Sync local uploads and SQLite database to a self-hosted remote.
#
# The remote target is read from environment variables so that no host, user,
# or deployment path is hard-coded in the repository:
#
#   SYNC_REMOTE       e.g. user@your-server.example.com   (required)
#   SYNC_REMOTE_BASE  e.g. /var/www/DeepListener          (required)
#
# Load them from your local .env or export them in your shell before running.
# For an interactive confirmation prompt, use `npm run sync:safe` instead.
#
# Original videos under public/videos/ are intentionally never synced.

set -euo pipefail

REMOTE="${SYNC_REMOTE:-}"
REMOTE_BASE="${SYNC_REMOTE_BASE:-}"

if [ -z "$REMOTE" ] || [ -z "$REMOTE_BASE" ]; then
  echo "sync: SYNC_REMOTE and SYNC_REMOTE_BASE must be set." >&2
  echo "       Example: SYNC_REMOTE=user@host SYNC_REMOTE_BASE=/var/www/DeepListener npm run sync" >&2
  echo "       Or set them in your local .env (see .env.example)." >&2
  exit 1
fi

# Excludes shared by both uploads and database transfers:
#   *.part / *.tmp  — in-flight upload chunks from streamFileToDisk
#   *-wal / *-shm   — SQLite WAL/shared-memory sidecars (never copy raw;
#                     the DB is checkpointed below instead)
#   *.backup        — prior sync backups created by --backup --suffix
EXCLUDES=(
  --exclude='*.part'
  --exclude='*.tmp'
  --exclude='.tmp'
  --exclude='*-wal'
  --exclude='*-shm'
  --exclude='*.backup'
)

DB_PATH="prisma/dev.db"

# Checkpoint the WAL into the main DB file before transferring. rsync of a
# live SQLite file can produce a torn copy (half-old/half-new pages) if the
# server is writing while rsync reads. Checkpointing folds the WAL into the
# main file first so the transferred snapshot is internally consistent. If
# sqlite3 is not installed we warn and continue (rsync is still better than
# nothing, but the user should install sqlite3 to be safe).
if command -v sqlite3 >/dev/null 2>&1; then
  if [ -f "$DB_PATH" ]; then
    echo "Checkpointing WAL into ${DB_PATH}..."
    sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null
  fi
else
  echo "⚠️  sqlite3 not found on PATH; skipping WAL checkpoint." >&2
  echo "    Install sqlite3 to guarantee a consistent database snapshot." >&2
fi

echo "Syncing uploads -> ${REMOTE}:${REMOTE_BASE}/public/uploads/"
# --backup --suffix keeps the last overwritten file as *.bak so an accidental
# overwrite of a newer remote file is recoverable.
rsync -avz --progress --backup --suffix=.bak "${EXCLUDES[@]}" public/uploads/ "${REMOTE}:${REMOTE_BASE}/public/uploads/"

echo "Syncing database -> ${REMOTE}:${REMOTE_BASE}/prisma/dev.db"
rsync -avz --progress --backup --suffix=.bak "${EXCLUDES[@]}" "$DB_PATH" "${REMOTE}:${REMOTE_BASE}/prisma/dev.db"

echo "✅ Sync complete."
