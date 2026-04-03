import { test as authTest } from "./auth/auth.fixtures";
import { resetWorkerDbByIndex } from "./helpers/worker-db";

/**
 * Extends auth fixtures with a worker-aware `resetDb` function that restores
 * each worker's application data directly through Postgres, without shelling
 * out through docker compose and psql for every test.
 */
export const test = authTest.extend<{ resetDb: () => Promise<void> }>({
  resetDb: async ({}, use, testInfo) => {
    const reset = async () => {
      await resetWorkerDbByIndex(testInfo.parallelIndex);
    };

    await use(reset);
  },
});

export { expect } from "@playwright/test";
