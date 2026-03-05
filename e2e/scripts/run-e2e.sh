#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

cleanup() {
  echo "Tearing down containers..."
  docker compose -f "$E2E_DIR/docker-compose.yml" down -v --remove-orphans
}
trap cleanup EXIT

echo "Starting containers..."
if ! docker compose -f "$E2E_DIR/docker-compose.yml" up --build -d --wait; then
  echo "Container startup failed. App logs:"
  docker compose -f "$E2E_DIR/docker-compose.yml" logs app
  exit 1
fi

echo "Running Playwright tests..."
npx playwright test --config "$E2E_DIR/playwright.config.ts"
