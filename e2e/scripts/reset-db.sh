#!/usr/bin/env bash
# Restores the application seed data directly over the worker database.
# Usage: reset-db.sh [database_name]
# Defaults to qd_worker_0 if no argument provided.
# This script is kept for manual debugging; automated tests use
# the worker-aware resetDb fixture directly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${1:-qd_worker_0}"

pnpm --filter @qd/e2e exec tsx "$SCRIPT_DIR/reset-db.ts" "$DB_NAME"
