#!/usr/bin/env bash
set -euo pipefail
# Rust integration tests use SQLx's isolated per-test databases.
# Reuse an explicitly supplied development/test server, or provision an ephemeral one.
if [ -n "${DATABASE_URL:-}" ]; then
  cargo test --workspace "$@"
  exit
fi
TEST_CONTAINER="qd-rust-tests-$$"
cleanup() { docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$TEST_CONTAINER" -p 127.0.0.1::5432 \
  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=qd_tests postgres:17-alpine >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$TEST_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  if [ "$attempt" = 30 ]; then echo 'Test PostgreSQL failed to start' >&2; exit 1; fi
  sleep 1
done
TEST_PORT=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}' "$TEST_CONTAINER")
DATABASE_URL="postgres://postgres:password@127.0.0.1:$TEST_PORT/qd_tests" cargo test --workspace "$@"
