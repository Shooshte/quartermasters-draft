import type { Page } from "@playwright/test";

export class CreateShellPage {
  constructor(readonly page: Page) {}

  async goto(search?: string) {
    await this.page.goto(search ? `/create?${search}` : "/create");
  }

  async openTab(tabName: string) {
    await this.page.getByRole("tab", { name: tabName }).click();
  }

  async startNewEntity(tabName: string, buttonName: string) {
    await this.goto();
    await this.openTab(tabName);
    await this.page.getByRole("button", { name: buttonName }).click();
  }
}
