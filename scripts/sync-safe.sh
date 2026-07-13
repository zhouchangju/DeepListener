#!/usr/bin/env bash
# Safe sync wrapper for DeepListener.
# Adds confirmation prompt and dry-run support before syncing to a remote.
#
# The remote target is read from environment variables (no hard-coded host):
#   SYNC_REMOTE       e.g. user@your-server.example.com   (required)
#   SYNC_REMOTE_BASE  e.g. /var/www/DeepListener          (required)
#
# Usage:
#   ./scripts/sync-safe.sh           # Interactive confirmation
#   ./scripts/sync-safe.sh --dry-run # Preview only, no changes
#   ./scripts/sync-safe.sh --yes     # Skip confirmation (for CI)
#
# Original videos under public/videos/ are intentionally never synced.

set -euo pipefail

DRY_RUN=false
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes|-y) AUTO_YES=true ;;
  esac
done

REMOTE="${SYNC_REMOTE:-}"
REMOTE_BASE="${SYNC_REMOTE_BASE:-}"

if [ -z "$REMOTE" ] || [ -z "$REMOTE_BASE" ]; then
  echo "sync:safe: SYNC_REMOTE and SYNC_REMOTE_BASE must be set." >&2
  echo "           Set them in your local .env (see .env.example) or export them." >&2
  exit 1
fi

echo "=== DeepListener Safe Sync ==="
echo "Source: public/uploads/ + prisma/dev.db"
echo "Original videos in public/videos are not synced."
echo "Target: ${REMOTE}:${REMOTE_BASE}/"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN — showing what would be synced:"
  rsync -avzn --progress public/uploads/ "${REMOTE}:${REMOTE_BASE}/public/uploads/" 2>&1 | head -30
  rsync -avzn --progress prisma/dev.db "${REMOTE}:${REMOTE_BASE}/prisma/dev.db" 2>&1 | head -10
  echo ""
  echo "Dry run complete. No changes made."
  exit 0
fi

if [ "$AUTO_YES" = false ]; then
  echo "⚠️  This will OVERWRITE files on the remote server."
  echo "   Uploads: public/uploads/ → ${REMOTE}:${REMOTE_BASE}/public/uploads/"
  echo "   Database: prisma/dev.db → ${REMOTE}:${REMOTE_BASE}/prisma/dev.db"
  echo ""
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Sync cancelled."
    exit 0
  fi
fi

echo "Syncing uploads..."
rsync -avz --progress public/uploads/ "${REMOTE}:${REMOTE_BASE}/public/uploads/"

echo "Syncing database..."
rsync -avz --progress prisma/dev.db "${REMOTE}:${REMOTE_BASE}/prisma/dev.db"

echo "✅ Sync complete."
