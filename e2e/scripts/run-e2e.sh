#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$E2E_DIR")"
WORKERS="${E2E_WORKERS:-6}"
IMAGE="qd-e2e-app:latest"
IMAGE_STAMP_FILE="$E2E_DIR/.app-image-fingerprint"
IMAGE_INPUTS=(
  e2e/Dockerfile
  .dockerignore
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  apps
  packages
)

hash_stream() {
  if command -v shasum >/dev/null 2>&1; then
    shasum | awk '{ print $1 }'
    return
  fi

  sha1sum | awk '{ print $1 }'
}

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum "$1"
    return
  fi

  sha1sum "$1"
}

compute_app_image_fingerprint() {
  (
    cd "$REPO_DIR"

    if ! git rev-parse --git-dir >/dev/null 2>&1; then
      printf 'no-git\n'
      return
    fi

    git rev-parse HEAD
    git status --porcelain=v1 --untracked-files=all -- "${IMAGE_INPUTS[@]}"

    while IFS= read -r path; do
      [ -f "$path" ] && hash_file "$path"
    done < <(git diff --name-only HEAD -- "${IMAGE_INPUTS[@]}")

    while IFS= read -r path; do
      [ -f "$path" ] && hash_file "$path"
    done < <(git ls-files --others --exclude-standard -- "${IMAGE_INPUTS[@]}")
  ) | hash_stream
}

cleanup() {
  echo "Tearing down..."
  docker ps --filter "label=qd-e2e-worker" -q | while read -r id; do docker rm -f "$id"; done 2>/dev/null || true
  docker compose -f "$E2E_DIR/docker-compose.yml" down -v --remove-orphans
}
trap cleanup EXIT

CURRENT_FINGERPRINT="$(compute_app_image_fingerprint)"
PREVIOUS_FINGERPRINT=""

if [ -f "$IMAGE_STAMP_FILE" ]; then
  PREVIOUS_FINGERPRINT="$(cat "$IMAGE_STAMP_FILE")"
fi

if [ "${E2E_FORCE_BUILD:-0}" = "1" ] || ! docker image inspect "$IMAGE" >/dev/null 2>&1 || [ "$CURRENT_FINGERPRINT" != "$PREVIOUS_FINGERPRINT" ]; then
  echo "Building app image..."
  docker compose -f "$E2E_DIR/docker-compose.yml" --profile build build app-image
  printf '%s\n' "$CURRENT_FINGERPRINT" > "$IMAGE_STAMP_FILE"
else
  echo "Reusing cached app image..."
fi

echo "Starting Postgres..."
docker compose -f "$E2E_DIR/docker-compose.yml" up -d --wait postgres

echo "Running Playwright tests with $WORKERS workers..."
if [ "$#" -gt 0 ]; then
  E2E_WORKERS="$WORKERS" npx playwright test --config "$E2E_DIR/playwright.config.ts" "$@"
else
  E2E_WORKERS="$WORKERS" npx playwright test --config "$E2E_DIR/playwright.config.ts"
fi
