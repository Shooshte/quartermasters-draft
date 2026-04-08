import { test as base, expect } from "../worker-base.fixture";
import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/login.page";

/** Seed credentials */
export const GM_EMAIL = "gm@example.com";
export const GM_PASSWORD = "password123";
export const PLAYER_EMAIL = "player@example.com";
export const PLAYER_PASSWORD = "password123";

/** Fill the login form and submit */
export async function login(
  page: Page,
  email: string,
  password: string,
  options?: { rememberMe?: boolean },
) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(email, password, options);
}

/** Log in as GM and wait for redirect */
export async function loginAsGM(page: Page, options?: { rememberMe?: boolean }) {
  await login(page, GM_EMAIL, GM_PASSWORD, options);
  await page.waitForURL("**/create");
}

/** Log in as player and wait for redirect */
export async function loginAsPlayer(page: Page, options?: { rememberMe?: boolean }) {
  await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, options);
  await page.waitForURL("**/play");
}

/** Click the logout button in the header */
export async function logout(page: Page) {
  const loginUrlPattern = /\/login(?:\?|$)/;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const button = page.getByRole("button", { name: /Log out|Logging out…/ });
    await button.click();

    try {
      await page.waitForURL(loginUrlPattern, { timeout: 20_000 });
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

/** Assert we're on a given path */
export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${escapeRegex(path)}(\\?.*)?$`));
}

/** Assert URL contains specific query params */
export async function expectQueryParams(
  page: Page,
  params: Record<string, string | null>,
) {
  const url = new URL(page.url());
  for (const [key, value] of Object.entries(params)) {
    expect(url.searchParams.get(key)).toBe(value);
  }
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Playwright fixture that provides pre-authenticated pages.
 * Usage: test("my test", async ({ gmPage, playerPage }) => { ... })
 */
export const test = base.extend<{
  gmPage: Page;
  playerPage: Page;
}>({
  gmPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsGM(page);
    await use(page);
    await context.close();
  },
  playerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page);
    await use(page);
    await context.close();
  },
});

export { expect };
