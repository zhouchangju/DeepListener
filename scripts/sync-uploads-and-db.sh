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

echo "Syncing uploads -> ${REMOTE}:${REMOTE_BASE}/public/uploads/"
rsync -avz --progress public/uploads/ "${REMOTE}:${REMOTE_BASE}/public/uploads/"

echo "Syncing database -> ${REMOTE}:${REMOTE_BASE}/prisma/dev.db"
rsync -avz --progress prisma/dev.db "${REMOTE}:${REMOTE_BASE}/prisma/dev.db"

echo "✅ Sync complete."
