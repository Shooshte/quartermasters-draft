import { test as base } from "@playwright/test";

const BASE_PORT = 3100;

/**
 * Base fixture that routes each Playwright worker to its dedicated app instance.
 * Every page created via this fixture has a baseURL of http://localhost:310X
 * where X = workerInfo.parallelIndex.
 *
 * Also patches browser.newContext() to inject baseURL automatically so tests
 * that manually create contexts (login, logout, session-management) get the
 * correct per-worker URL without needing to change every test function.
 */
export const test = base.extend<
  // test-scoped fixtures (none added)
  object,
  // worker-scoped fixtures
  { workerBaseURL: string }
>({
  // Worker-scoped fixture that computes the per-worker base URL
  workerBaseURL: [
    async ({}, use, workerInfo) => {
      await use(`http://localhost:${BASE_PORT + workerInfo.parallelIndex}`);
    },
    { scope: "worker" },
  ],

  // Override the built-in baseURL test fixture to use per-worker URL
  baseURL: async ({ workerBaseURL }, use) => {
    await use(workerBaseURL);
  },

  // Patch browser.newContext to inject baseURL automatically.
  // This ensures tests that manually create contexts (login, logout,
  // session-management) get the correct per-worker URL.
  browser: [
    async ({ browser, workerBaseURL }, use) => {
      const origNewContext = browser.newContext.bind(browser);
      const patched = Object.create(browser) as typeof browser;
      patched.newContext = ((opts?: Record<string, unknown>) =>
        origNewContext({ ...opts, baseURL: workerBaseURL })) as typeof browser.newContext;
      await use(patched);
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
