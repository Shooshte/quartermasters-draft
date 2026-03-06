import { test, expect } from "@playwright/test";
import { expectPath, expectQueryParams } from "./auth.fixtures";

test.describe("Route Protection", () => {
  const protectedRoutes = [
    "/",
    "/403",
    "/create",
    "/play",
    "/replay/abc123",
  ];

  for (const route of protectedRoutes) {
    test(`unauthenticated user is redirected to /login from ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForURL("**/login**");
      await expectPath(page, "/login");
      await expectQueryParams(page, { next: route });
    });
  }
});
