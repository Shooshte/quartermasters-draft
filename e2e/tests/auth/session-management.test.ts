// Source of truth: e2e/features/authentication/session-management.feature

import type { BrowserContext } from "@playwright/test";
import {
  ageLatestSessionForUser,
  countSessionsByToken,
  deleteSessionsForUser,
  getLatestSessionForUser,
} from "../helpers/session-helpers";
import { expect, test } from "../worker-base.fixture";
import {
  expectPath,
  expectQueryParams,
  GM_EMAIL,
  GM_PASSWORD,
  login,
  logout,
  PLAYER_EMAIL,
  PLAYER_PASSWORD,
} from "./auth.fixtures";

const GM_USER_ID = "seed-gm-001";
const PLAYER_USER_ID = "seed-player-001";

function getAuthCookies(context: BrowserContext) {
  return context
    .cookies()
    .then((cookies) => cookies.filter((cookie) => cookie.name.startsWith("better-auth")));
}

function expectIssuedLifetime(
  session: { expiresAtEpoch: number; updatedAtEpoch: number },
  seconds: number,
) {
  expect(Math.abs(session.expiresAtEpoch - session.updatedAtEpoch - seconds)).toBeLessThanOrEqual(
    1,
  );
  const remaining = session.expiresAtEpoch - Math.floor(Date.now() / 1000);
  expect(remaining).toBeGreaterThan(seconds - 10);
  expect(remaining).toBeLessThanOrEqual(seconds + 2);
}

async function sessionCookie(context: BrowserContext) {
  const cookie = (await getAuthCookies(context)).find((cookie) =>
    cookie.name.endsWith("session_token"),
  );
  expect(cookie).toBeDefined();
  if (!cookie) throw new Error("Session token cookie missing");
  return cookie;
}

test.describe("Session Management", () => {
  test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
    await deleteSessionsForUser(GM_USER_ID, testInfo.parallelIndex);
    await deleteSessionsForUser(PLAYER_USER_ID, testInfo.parallelIndex);
  });

  test("session expires after 1 hour for GM without remember me — redirects to /login with reason=expired @smoke", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");

    const authCookies = await getAuthCookies(context);
    expect(authCookies.length).toBeGreaterThan(0);
    for (const cookie of authCookies) {
      expect(cookie.expires).toBeLessThanOrEqual(0);
    }

    const session = await getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);
    expectIssuedLifetime(session, 3600);

    await ageLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex, 61 * 60);

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
    for (const cookie of authCookies) {
      expect(cookie.expires).toBeLessThanOrEqual(0);
    }

    const session = await getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    expectIssuedLifetime(session, 3600);

    await ageLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex, 61 * 60);

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
    const session = await getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    expectIssuedLifetime(session, 30 * 24 * 3600);
    const before = await ageLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex, 61 * 60);

    await page.goto("/play");
    await expect(page).toHaveURL(/\/play/);
    const renewed = await getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex);
    expect(renewed.expiresAtEpoch).toBeGreaterThan(before.expiresAtEpoch);
    expectIssuedLifetime(renewed, 30 * 24 * 3600);
    await context.close();
  });

  test("remember me session expires after 30 days of inactivity", async ({ browser }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD, { rememberMe: true });
    await page.waitForURL("**/play");

    expectIssuedLifetime(
      await getLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex),
      30 * 24 * 3600,
    );
    await ageLatestSessionForUser(PLAYER_USER_ID, testInfo.parallelIndex, 31 * 24 * 3600);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play", reason: "expired" });
    await context.close();
  });

  test("session without remember me ends when the browser is closed", async ({ browser }) => {
    // Create a context, login without remember me, close it, then create a new context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await login(page1, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page1.waitForURL("**/create");

    const authCookies = await getAuthCookies(context1);
    expect(authCookies.length).toBeGreaterThan(0);
    for (const cookie of authCookies) {
      expect(cookie.expires).toBeLessThanOrEqual(0);
    }
    await context1.close();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/create");
    await page2.waitForURL("**/login**");
    await expectPath(page2, "/login");
    await expectQueryParams(page2, { next: "/create" });
    await context2.close();
  });

  test("remember me session persists after browser close and reopen", async ({ browser }) => {
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

    for (let renewal = 0; renewal < 2; renewal++) {
      const before = await ageLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex, 59 * 60);
      await page.goto("/create");
      await expect(page).toHaveURL(/\/create/);
      const after = await getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);
      expect(after.token).toBe(before.token);
      expect(after.expiresAtEpoch).toBeGreaterThan(before.expiresAtEpoch);
      expectIssuedLifetime(after, 3600);
    }

    await context.close();
  });

  for (const activity of ["browser navigation", "API request"] as const) {
    test(`remembered ${activity} advances the persistent cookie in the browser`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: true });
      await page.waitForURL("**/create");
      const initial = await sessionCookie(context);
      expect(initial.expires - Date.now() / 1000).toBeGreaterThan(30 * 24 * 3600 - 10);
      // Cross the cookie's whole-second timestamp boundary without causing auth activity.
      await expect
        .poll(() => Math.floor(Date.now() / 1000))
        .toBeGreaterThan(Math.floor(initial.expires - 30 * 24 * 3600) + 1);
      const before = await ageLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex, 61 * 60);
      if (activity === "browser navigation") {
        const responsePromise = page.waitForResponse(
          (response) => new URL(response.url()).pathname === "/api/v1/auth/session",
        );
        await page.goto("/create");
        const response = await responsePromise;
        expect(await response.headerValue("set-cookie")).toContain("better-auth.session_token=");
        await expect(page).toHaveURL(/\/create/);
      } else {
        const responsePromise = page.waitForResponse((response) =>
          response.url().includes("/api/v1/battle/scenario-options"),
        );
        const status = await page.evaluate(async () => {
          const response = await fetch("/api/v1/battle/scenario-options");
          return response.status;
        });
        expect(status).toBe(200);
        const response = await responsePromise;
        expect(await response.headerValue("set-cookie")).toContain("better-auth.session_token=");
      }
      const renewedCookie = await sessionCookie(context);
      expect(renewedCookie.value).toBe(initial.value);
      expect(renewedCookie.expires).toBeGreaterThan(initial.expires);
      expect(renewedCookie.expires - Date.now() / 1000).toBeGreaterThan(30 * 24 * 3600 - 10);
      const after = await getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex);
      expect(after.expiresAtEpoch).toBeGreaterThan(before.expiresAtEpoch);
      expectIssuedLifetime(after, 30 * 24 * 3600);
      await context.close();
    });
  }

  test("deleting the dont_remember marker cannot lengthen a short session", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, GM_EMAIL, GM_PASSWORD, { rememberMe: false });
    await page.waitForURL("**/create");
    const marker = (await getAuthCookies(context)).find((cookie) =>
      cookie.name.includes("dont_remember"),
    );
    expect(marker).toBeDefined();
    await context.clearCookies({ name: /dont_remember/ });
    await ageLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex, 59 * 60);
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);
    expectIssuedLifetime(await getLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex), 3600);
    expect((await sessionCookie(context)).expires).toBe(-1);
    await ageLatestSessionForUser(GM_USER_ID, testInfo.parallelIndex, 61 * 60);
    await page.goto("/create");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/create", reason: "expired" });
    await context.close();
  });

  test("session token cannot be reused after logout", async ({ browser }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, PLAYER_EMAIL, PLAYER_PASSWORD);
    await page.waitForURL("**/play");

    const sessionBeforeLogout = await getLatestSessionForUser(
      PLAYER_USER_ID,
      testInfo.parallelIndex,
    );
    const cookiesBeforeLogout = await context.cookies();

    await logout(page);
    expect(await countSessionsByToken(sessionBeforeLogout.token, testInfo.parallelIndex)).toBe(0);

    await context.clearCookies();
    await context.addCookies(cookiesBeforeLogout);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });
});
