import { defineConfig } from "@playwright/test";
import { BASE_PORT, DEFAULT_WORKERS } from "./constants";

const WORKERS = parseInt(process.env.E2E_WORKERS ?? String(DEFAULT_WORKERS), 10);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: WORKERS,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: `http://localhost:${BASE_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
