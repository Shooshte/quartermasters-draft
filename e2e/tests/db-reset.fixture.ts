import { execSync } from "node:child_process";
import path from "node:path";
import { test as authTest } from "./auth/auth.fixtures";

const E2E_DIR = path.resolve(import.meta.dirname, "..");

/**
 * Extends auth fixtures with a `resetDb` function that truncates all
 * application tables and re-seeds. Use in `beforeAll` or `beforeEach`
 * for any test suite that mutates data.
 */
export const test = authTest.extend<{ resetDb: () => Promise<void> }>({
  resetDb: async ({}, use) => {
    const reset = async () => {
      execSync(path.join(E2E_DIR, "scripts/reset-db.sh"), {
        stdio: "pipe",
        timeout: 30_000,
      });
    };
    await use(reset);
  },
});

export { expect } from "@playwright/test";
