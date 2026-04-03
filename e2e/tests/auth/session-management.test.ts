// Source of truth: e2e/features/authentication/session-management.feature
import { test, expect } from "../worker-base.fixture";
import type { BrowserContext } from "@playwright/test";
import {
  GM_EMAIL,
  GM_PASSWORD,
  PLAYER_EMAIL,
  PLAYER_PASSWORD,
  login,
  logout,
  expectPath,
  expectQueryParams,
} from "./auth.fixtures";
import {
  countSessionsByToken,
  expireLatestSessionForUser,
  getLatestSessionForUser,
} from "../helpers/session-helpers";

const GM_USER_ID = "seed-gm-001";
const PLAYER_USER_ID = "seed-player-001";

function getAuthCookies(context: BrowserContext) {
  return context
    .cookies()
    .then((cookies) => cookies.filter((cookie) => cookie.name.startsWith("better-auth")));
}

test.describe("Session Management", () => {
  test("session expires after 1 hour for GM without remember me — redirects to /login with reason=expired", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");

    const authCookies = await getAuthCookies(context);
    expect(authCookies.length).toBeGreaterThan(0);
    authCookies.forEach((cookie) => expect(cookie.expires).toBeLessThanOrEqual(0));

    const nowEpoch = Math.floor(Date.now() / 1000);
    const session = getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);
    expect(session.expiresAtEpoch).toBeGreaterThan(nowEpoch);

    expireLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);

    await page.goto("/create");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/create", reason: "expired" });
    await expect(page.getByText("Session expired, please log in to continue")).toBeVisible();
    await context.close();
  });

  test("session expires after 1 hour for player without remember me — redirects to /login with reason=expired", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/play");

    const authCookies = await getAuthCookies(context);
    expect(authCookies.length).toBeGreaterThan(0);
    authCookies.forEach((cookie) => expect(cookie.expires).toBeLessThanOrEqual(0));

    const nowEpoch = Math.floor(Date.now() / 1000);
    const session = getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    expect(session.expiresAtEpoch).toBeGreaterThan(nowEpoch);

    expireLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play", reason: "expired" });
    await expect(page.getByText("Session expired, please log in to continue")).toBeVisible();
    await context.close();
  });

  test("session persists for 30 days with remember me — user stays on page after 1 hour", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: true });
    await page.waitForURL("**/play");

    const authCookies = await getAuthCookies(context);
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.some((cookie) => cookie.expires > 0)).toBe(true);
    const session = getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    expect(session.expiresAtEpoch).toBeGreaterThan(Math.floor(Date.now() / 1000));

    await page.goto("/play");
    await expect(page).toHaveURL(/\/play/);
    await context.close();
  });

  test("remember me session expires after 30 days of inactivity", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: true });
    await page.waitForURL("**/play");

    expireLatestSessionForUser(
      PLAYER_USER_ID,
      testInfo.parallelIndex,
      "NOW() - INTERVAL '31 days'",
    );

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play", reason: "expired" });
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

    const authCookies = await getAuthCookies(context1);
    expect(authCookies.length).toBeGreaterThan(0);
    authCookies.forEach((cookie) => expect(cookie.expires).toBeLessThanOrEqual(0));
    await context1.close();

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

    const cookies = await context1.cookies();
    const authCookies = cookies.filter((cookie) => cookie.name.startsWith("better-auth"));
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.some((cookie) => cookie.expires > 0)).toBe(true);
    await context1.close();

    const context2 = await browser.newContext();
    await context2.addCookies(cookies);
    const page2 = await context2.newPage();

    await page2.goto("/create");
    await expect(page2).toHaveURL(/\/create/);
    await context2.close();
  });

  test("activity extends the session timeout (sliding expiration)", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");

    const beforeActivity = getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);

    await page.waitForTimeout(1_100);
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);

    const afterActivity = getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);
    expect(afterActivity.token).toBe(beforeActivity.token);
    expect(afterActivity.expiresAtEpoch).toBeGreaterThanOrEqual(beforeActivity.expiresAtEpoch);
    expect(afterActivity.updatedAtEpoch).toBeGreaterThanOrEqual(beforeActivity.updatedAtEpoch);

    await context.close();
  });

  test("session token cannot be reused after logout", async ({ browser }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD);
    await page.waitForURL("**/play");

    const sessionBeforeLogout = getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    const cookiesBeforeLogout = await context.cookies();

    await logout(page);
    expect(countSessionsByToken(sessionBeforeLogout.token, testInfo.parallelIndex)).toBe(0);

    await context.clearCookies();
    await context.addCookies(cookiesBeforeLogout);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });
});
