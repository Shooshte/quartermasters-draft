import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test as authTest } from "./auth/auth.fixtures";

const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPOSE_FILE = path.join(E2E_DIR, "docker-compose.yml");

/**
 * Extends auth fixtures with a worker-aware `resetDb` function that truncates
 * all application tables and re-seeds from the dump created during globalSetup.
 * Each worker targets only its own database (qd_worker_{parallelIndex}).
 */
export const test = authTest.extend<{ resetDb: () => Promise<void> }>({
  resetDb: async ({}, use, testInfo) => {
    const dbName = `qd_worker_${testInfo.parallelIndex}`;

    const reset = async () => {
      // Truncate all app tables in this worker's database
      execSync(
        `docker compose -f "${COMPOSE_FILE}" exec -T postgres ` +
          `psql -U postgres -d ${dbName} -c "` +
          `TRUNCATE scenarios_rows_units, scenarios_rows, scenarios, ` +
          `units_items, units, items_spells, items, ` +
          `spells_effects, spells, effects CASCADE;"`,
        { stdio: "pipe", timeout: 15_000 },
      );
      // Restore from seed dump (created during globalSetup, stored inside postgres container)
      execSync(
        `docker compose -f "${COMPOSE_FILE}" exec -T postgres ` +
          `psql -U postgres -d ${dbName} -f /tmp/qd-seed-dump.sql`,
        { stdio: "pipe", timeout: 15_000 },
      );
    };

    await use(reset);
  },
});

export { expect } from "@playwright/test";
