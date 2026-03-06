import { test, expect } from "./auth.fixtures";

test.describe("403 Forbidden Page", () => {
  test("player navigating to /create is redirected to /403 with access denied message", async ({
    playerPage: page,
  }) => {
    await page.goto("/create");
    await page.waitForURL("**/403");
    expect(page.url()).toContain("/403");

    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(
      page.getByText("You do not have permission to access this page"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/play"),
    );
  });

  test("/403 is accessible to a player and shows correct default link", async ({
    playerPage: page,
  }) => {
    await page.goto("/403");
    await expect(page).toHaveURL(/\/403/);

    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(
      page.getByText("You do not have permission to access this page"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/play"),
    );
  });

  test("/403 is accessible to a game master and shows correct default link", async ({
    gmPage: page,
  }) => {
    await page.goto("/403");
    await expect(page).toHaveURL(/\/403/);

    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(
      page.getByText("You do not have permission to access this page"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/create"),
    );
  });
});
