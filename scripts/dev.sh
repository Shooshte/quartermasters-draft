#!/usr/bin/env bash
set -euo pipefail
# Export DATABASE_URL and AUTH_SECRET (or BETTER_AUTH_SECRET) before starting.
pnpm --filter @qd/web... build
PORT=3001 HOST=127.0.0.1 cargo run -p qd-server &
RUST_SERVER_PID=$!
cleanup() { kill "$RUST_SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
pnpm --filter @qd/web dev
