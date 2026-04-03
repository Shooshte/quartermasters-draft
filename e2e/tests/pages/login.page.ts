import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(readonly page: Page) {}

  get emailInput() {
    return this.page.getByLabel("Email");
  }

  get passwordInput() {
    return this.page.getByLabel("Password");
  }

  get rememberMeCheckbox() {
    return this.page.getByLabel("Remember me");
  }

  get submitButton() {
    return this.page.getByRole("button", { name: "Sign in" });
  }

  async goto(search?: string) {
    await this.page.goto(search ? `/login?${search}` : "/login");
  }

  async signIn(
    email: string,
    password: string,
    options?: { rememberMe?: boolean },
  ) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    if (options?.rememberMe) {
      await this.rememberMeCheckbox.check();
    }

    await this.submitButton.click();
  }
}
