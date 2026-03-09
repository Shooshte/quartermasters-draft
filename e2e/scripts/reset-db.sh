#!/usr/bin/env bash
# Truncates all application tables and re-seeds the database.
# Used by e2e tests that mutate data to restore the DB to its seeded state.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Truncate all app tables (CASCADE handles FK dependencies)
docker compose -f "$E2E_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d quartermasters-draft -c "
    TRUNCATE scenarios_rows_units, scenarios_rows, scenarios,
             units_items, units, items_spells, items,
             spells_effects, spells, effects
    CASCADE;
  "

# Re-seed using the existing built image (--no-deps avoids re-running migrate)
docker compose -f "$E2E_DIR/docker-compose.yml" run --rm --no-deps \
  -e DATABASE_URL=postgresql://postgres:password@postgres:5432/quartermasters-draft \
  seed pnpm --filter @qd/db db:seed
