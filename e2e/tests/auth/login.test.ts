import { expect, test } from "../worker-base.fixture";
import {
  expectPath,
  GM_EMAIL,
  GM_PASSWORD,
  login,
  loginAsGM,
  loginAsPlayer,
  PLAYER_EMAIL,
  PLAYER_PASSWORD,
} from "./auth.fixtures";

test.describe("Login", () => {
  test.describe("Unauthenticated visitor", () => {
    test("sees the login form with email, password, remember me, and submit", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByLabel("Remember me")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });

    test("game master is redirected to /create after login @smoke", async ({ page }) => {
      await login(page, GM_EMAIL, GM_PASSWORD);
      await page.waitForURL("**/create");
      await expectPath(page, "/create");
    });

    test("player is redirected to /play after login @smoke", async ({ page }) => {
      await login(page, PLAYER_EMAIL, PLAYER_PASSWORD);
      await page.waitForURL("**/play");
      await expectPath(page, "/play");
    });

    test("return path is honoured after login when allowed", async ({ page }) => {
      await page.goto("/login?next=/play");
      await page.getByLabel("Email").fill(GM_EMAIL);
      await page.getByLabel("Password").fill(GM_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL("**/play");
      await expectPath(page, "/play");
    });

    test("invalid credentials show an error", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("wrong@example.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByRole("alert")).toContainText("Invalid credentials");
      await expectPath(page, "/login");
    });

    test("submit button is disabled while login request is in flight", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(GM_EMAIL);
      await page.getByLabel("Password").fill(GM_PASSWORD);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Button should be disabled immediately after click (text changes to "Signing in…")
      await expect(submitButton).toBeDisabled();
    });

    test("player logging in with next to a forbidden route sees 403", async ({ page }) => {
      await page.goto("/login?next=/create");
      await page.getByLabel("Email").fill(PLAYER_EMAIL);
      await page.getByLabel("Password").fill(PLAYER_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await page.waitForURL("**/403");
      await expectPath(page, "/403");
      await expect(page.getByText("Access Denied")).toBeVisible();
      await expect(page.getByRole("link", { name: /go to play/i })).toHaveAttribute(
        "href",
        expect.stringContaining("/play"),
      );
    });

    test("external next parameter is rejected", async ({ page }) => {
      await page.goto("/login?next=https://example.com");
      await page.getByLabel("Email").fill(GM_EMAIL);
      await page.getByLabel("Password").fill(GM_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await page.waitForURL("**/create?**");
      await expectPath(page, "/create");
      await expect(page.getByRole("status")).toContainText("Invalid return URL");
    });
  });

  test.describe("Already authenticated user", () => {
    test("game master visiting /login without next is redirected to /create", async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAsGM(page);

      await page.goto("/login");
      await page.waitForURL("**/create");
      await expectPath(page, "/create");
      await context.close();
    });

    test("player visiting /login without next is redirected to /play", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAsPlayer(page);

      await page.goto("/login");
      await page.waitForURL("**/play");
      await expectPath(page, "/play");
      await context.close();
    });

    test("authenticated user visiting /login with next is redirected to next when allowed", async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAsGM(page);

      await page.goto("/login?next=/play");
      await page.waitForURL("**/play");
      await expectPath(page, "/play");
      await context.close();
    });

    test("authenticated player visiting /login with next to forbidden route sees 403", async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAsPlayer(page);

      await page.goto("/login?next=/create");
      await page.waitForURL("**/403");
      await expectPath(page, "/403");
      await expect(page.getByText("Access Denied")).toBeVisible();
      await expect(page.getByRole("link", { name: /go to play/i })).toHaveAttribute(
        "href",
        expect.stringContaining("/play"),
      );
      await context.close();
    });
  });
});
