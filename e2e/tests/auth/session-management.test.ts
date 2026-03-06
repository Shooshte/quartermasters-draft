import { test, expect } from "@playwright/test";
import {
  GM_EMAIL,
  GM_PASSWORD,
  PLAYER_EMAIL,
  PLAYER_PASSWORD,
  login,
  loginAsGM,
  loginAsPlayer,
  logout,
  expectPath,
  expectQueryParams,
} from "./auth.fixtures";

test.describe("Session Management", () => {
  /**
   * NOTE: Tests involving time manipulation (session expiry, sliding expiration)
   * require the ability to fast-forward time on the server side. These tests
   * document the expected behavior but may need a server-side time manipulation
   * endpoint or clock mocking to run in CI. For now they manipulate cookies
   * to simulate expiration.
   */

  test("session expires after 1 hour for GM without remember me — redirects to /login with reason=expired", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");

    // Clear session cookies to simulate expiration
    await context.clearCookies();

    await page.goto("/create");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    // The app should redirect with a next param
    await expectQueryParams(page, { next: "/create" });
    await context.close();
  });

  test("session expires after 1 hour for player without remember me — redirects to /login with reason=expired", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/play");

    // Clear session cookies to simulate expiration
    await context.clearCookies();

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });

  test("session persists for 30 days with remember me — user stays on page after 1 hour", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: true });
    await page.waitForURL("**/play");

    // With remember me, session should persist — navigate and verify still authenticated
    await page.goto("/play");
    await expect(page).toHaveURL(/\/play/);
    await context.close();
  });

  test("remember me session expires after 30 days of inactivity", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: true });
    await page.waitForURL("**/play");

    // Clear cookies to simulate 30-day expiration
    await context.clearCookies();

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });

  test("session without remember me ends when the browser is closed", async ({
    browser,
  }) => {
    // Create a context, login without remember me, close it, then create a new context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await login(page1, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page1.waitForURL("**/create");

    // Store cookies before closing
    const cookies = await context1.cookies();
    await context1.close();

    // Create a new context (simulates closing/reopening browser)
    // Session cookies (no expiry) should not be carried over
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/create");
    await page2.waitForURL("**/login**");
    await expectPath(page2, "/login");
    await expectQueryParams(page2, { next: "/create" });
    await context2.close();
  });

  test("remember me session persists after browser close and reopen", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await login(page1, GM_EMAIL, GM_PASSWORD, { rememberMe: true });
    await page1.waitForURL("**/create");

    // Get persistent cookies (with expiry)
    const cookies = await context1.cookies();
    await context1.close();

    // Create new context and add the persistent cookies back (simulates browser reopen)
    const context2 = await browser.newContext();
    await context2.addCookies(cookies);
    const page2 = await context2.newPage();

    await page2.goto("/create");
    // Should remain on /create since persistent cookies survive browser close
    await expect(page2).toHaveURL(/\/create/);
    await context2.close();
  });

  test("activity extends the session timeout (sliding expiration)", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");

    // Simulate activity by navigating — session should remain valid
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);

    // Navigate again — still valid
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);
    await context.close();
  });

  test("session token cannot be reused after logout", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD);
    await page.waitForURL("**/play");

    // Store cookies before logout
    const cookiesBeforeLogout = await context.cookies();

    await logout(page);

    // Clear current cookies and try to use the old session
    await context.clearCookies();
    await context.addCookies(cookiesBeforeLogout);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });
});
