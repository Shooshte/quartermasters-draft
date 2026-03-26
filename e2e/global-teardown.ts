import { execSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

export default async function globalTeardown(_config: FullConfig) {
  try {
    // Use a shell loop instead of xargs -r for macOS compatibility
    execSync(
      'docker ps --filter "label=qd-e2e-worker" -q | while read -r id; do docker rm -f "$id"; done',
      { stdio: "pipe", timeout: 15_000 },
    );
  } catch {
    // Best effort; run-e2e.sh cleanup trap handles the rest
  }

  // Worker databases (qd_worker_N) are intentionally NOT dropped here.
  // When run via run-e2e.sh, `docker compose down -v` destroys the entire
  // Postgres volume. When run standalone, globalSetup's DROP IF EXISTS
  // handles stale databases on the next run.
}
