#!/usr/bin/env bash
# Truncates all application tables and re-seeds the database.
# Usage: reset-db.sh [database_name]
# Defaults to qd_worker_0 if no argument provided.
# This script is kept for manual debugging; automated tests use
# the worker-aware resetDb fixture directly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
DB_NAME="${1:-qd_worker_0}"

# Truncate all app tables (CASCADE handles FK dependencies)
docker compose -f "$E2E_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d "$DB_NAME" -c "
    TRUNCATE scenarios_rows_units, scenarios_rows, scenarios,
             units_items, units, items_spells, items,
             spells_effects, spells, effects
    CASCADE;
  "

# Re-seed from the dump created during globalSetup
docker compose -f "$E2E_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d "$DB_NAME" -f /tmp/qd-seed-dump.sql
