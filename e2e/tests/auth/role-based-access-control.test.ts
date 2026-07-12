import { expect, test } from "./auth.fixtures";

test.describe("Role-Based Access Control", () => {
  test("default page for game master is /create", async ({ gmPage: page }) => {
    await page.goto("/");
    await page.waitForURL("**/create");
    expect(page.url()).toContain("/create");
  });

  test("default page for player is /play", async ({ playerPage: page }) => {
    await page.goto("/");
    await page.waitForURL("**/play");
    expect(page.url()).toContain("/play");
  });

  test.describe("Game master can access all routes", () => {
    test("game master can access /create", async ({ gmPage: page }) => {
      await page.goto("/create");
      await expect(page).toHaveURL(/\/create/);
      await expect(page.getByTestId("entity-workspace")).toBeVisible();
    });

    test("game master can access /play", async ({ gmPage: page }) => {
      await page.goto("/play");
      await expect(page).toHaveURL(/\/play/);
      await expect(page.getByRole("heading", { name: "Play" })).toBeVisible();
    });

    test("game master can access /replay/abc123", async ({ gmPage: page }) => {
      await page.goto("/replay/abc123");
      await expect(page).toHaveURL(/\/replay\/abc123/);
      await expect(page.getByRole("heading", { name: "Battle lab" })).toBeVisible();
    });
  });

  test.describe("Player can access permitted routes", () => {
    test("player can access /play", async ({ playerPage: page }) => {
      await page.goto("/play");
      await expect(page).toHaveURL(/\/play/);
      await expect(page.getByRole("heading", { name: "Play" })).toBeVisible();
    });
  });

  for (const route of ["/create", "/battle", "/replay/abc123"]) {
    test(`player is shown a 403 page when accessing ${route}`, async ({ playerPage: page }) => {
      await page.goto(route);
      await page.waitForURL("**/403");
      await expect(page).toHaveURL(/\/403$/);
      await expect(page.getByText("Access Denied")).toBeVisible();
      await expect(page.getByRole("link", { name: /go to play/i })).toHaveAttribute(
        "href",
        expect.stringContaining("/play"),
      );
    });
  }
});
