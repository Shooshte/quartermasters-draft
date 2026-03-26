#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
WORKERS="${E2E_WORKERS:-4}"

cleanup() {
  echo "Tearing down..."
  docker ps --filter "label=qd-e2e-worker" -q | while read -r id; do docker rm -f "$id"; done 2>/dev/null || true
  docker compose -f "$E2E_DIR/docker-compose.yml" down -v --remove-orphans
}
trap cleanup EXIT

echo "Building app image..."
docker compose -f "$E2E_DIR/docker-compose.yml" --profile build build app-image

echo "Starting Postgres..."
docker compose -f "$E2E_DIR/docker-compose.yml" up -d --wait postgres

echo "Running Playwright tests with $WORKERS workers..."
E2E_WORKERS="$WORKERS" npx playwright test --config "$E2E_DIR/playwright.config.ts"
