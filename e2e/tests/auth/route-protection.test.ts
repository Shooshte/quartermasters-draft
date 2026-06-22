// Source of truth: e2e/features/authentication/route-protection.feature
import { test } from "../worker-base.fixture";
import { expectPath, expectQueryParams } from "./auth.fixtures";

test.describe("Route Protection", () => {
  const protectedRoutes = ["/", "/create", "/play", "/replay/abc123"];

  for (const route of protectedRoutes) {
    test(`unauthenticated user is redirected to /login from ${route} @smoke`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("**/login**");
      await expectPath(page, "/login");
      await expectQueryParams(page, { next: route });
    });
  }

  test("unauthenticated user is redirected to /login from /403 without next", async ({ page }) => {
    await page.goto("/403");
    await page.waitForURL("**/login**");
    await expectPath(page, "/login");
    await expectQueryParams(page, { next: null });
  });
});
