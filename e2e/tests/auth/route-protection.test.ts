import { test } from "../worker-base.fixture";
import { expectPath, expectQueryParams } from "./auth.fixtures";

test.describe("Route Protection", () => {
  const protectedRoutes: [string, string | null][] = [
    ["/", "/"],
    ["/403", null],
    ["/create", "/create"],
    ["/play", "/play"],
    ["/replay/abc123", "/replay/abc123"]
  ];

  for (const [route, next] of protectedRoutes) {
    test(`unauthenticated user is redirected to /login from ${route}`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForURL("**/login**");
      await expectPath(page, "/login");
      await expectQueryParams(page, { next: next });
    });
  }
});
