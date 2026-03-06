import { test, expect } from "@playwright/test";
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
});
