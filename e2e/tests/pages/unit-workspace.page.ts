import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

export class UnitWorkspacePage {
  readonly shell: CreateShellPage;

  constructor(readonly page: Page) {
    this.shell = new CreateShellPage(page);
  }

  get nameInput() {
    return this.page.getByTestId("entity-name-input");
  }

  get saveButton() {
    return this.page.getByTestId("entity-save-button");
  }

  get saveError() {
    return this.page.getByTestId("entity-save-error");
  }

  get itemRows() {
    return this.page.locator('[data-testid^="unit-item-row-"]');
  }

  get itemPicker() {
    return this.page.getByTestId("unit-item-picker");
  }

  get itemPickerSearch() {
    return this.page.getByTestId("unit-item-picker-search");
  }

  get formFields() {
    return this.page.getByTestId("unit-form-fields");
  }

  async openNew() {
    await this.shell.startNewEntity("Units", "New Unit");
  }

  async openById(unitId: string) {
    await this.page.goto(`/create?tab=Units&unit_id=${unitId}`);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillStats(values: Record<string, string>) {
    for (const [field, value] of Object.entries(values)) {
      await this.page.getByTestId(`unit-${field}-input`).fill(value);
    }
  }

  async linkItem(name: string, search?: string) {
    await addLinkedEntity(
      this.page,
      "unit-item-picker",
      "unit-item-picker-search",
      "unit-add-item-button",
      name,
      search,
    );
  }

  async removeItem(index: number) {
    await this.page.getByTestId(`unit-item-remove-${index}`).click();
  }

  async editItem(index: number) {
    await this.page.getByTestId(`unit-item-edit-${index}`).click();
  }

  async saveCreate() {
    await saveEntityAndWait(this.page, "units", "create");
    await expect(this.page).toHaveURL(/(?:\?|&)unit_id=/);
    await expect(this.formFields).toBeVisible();
  }

  async saveUpdate() {
    await saveEntityAndWait(this.page, "units", "update");
  }
}
