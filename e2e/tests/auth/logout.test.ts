import { test, expect } from "../worker-base.fixture";
import {
  loginAsGM,
  loginAsPlayer,
  logout,
  expectPath,
  expectQueryParams,
} from "./auth.fixtures";

test.describe("Logout", () => {
  test("game master can log out", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsGM(page);

    await logout(page);
    await expectPath(page, "/login");

    // Verify session is cleared — navigating to a protected route redirects to login
    await page.goto("/create");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });

  test("player can log out", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page);

    await logout(page);
    await expectPath(page, "/login");

    // Verify session is cleared
    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });

  test("logged out user cannot access protected routes", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsGM(page);
    await logout(page);

    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/play" });
    await context.close();
  });

  test("game master logout from /replay/abc445 redirects to /login?next=/replay/abc445", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsGM(page);
    await page.goto("/replay/abc445");
    await logout(page);
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/replay/abc445" });

    // Verify session is cleared — navigating to a protected route redirects to login
    await page.goto("/create");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });

  test("player logout from /replay/abc445 redirects to /login?next=/replay/abc445", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page);
    await page.goto("/replay/abc445");
    await logout(page);
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: "/replay/abc445" });

    // Verify session is cleared — navigating to a protected route redirects to login
    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });

  test("game master logout from /403 redirects to /login without next param", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsGM(page);
    await page.goto("/403");
    await logout(page);
    await expectPath(page, "/login");
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBeNull();

    // Verify session is cleared — navigating to a protected route redirects to login
    await page.goto("/create");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });

  test("player logout from /403 redirects to /login without next param", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsPlayer(page);
    await page.goto("/403");
    await logout(page);
    await expectPath(page, "/login");
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBeNull();

    // Verify session is cleared — navigating to a protected route redirects to login
    await page.goto("/play");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await context.close();
  });
});
