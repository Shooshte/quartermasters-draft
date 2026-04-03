import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

export class ItemWorkspacePage {
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

  get spellRows() {
    return this.page.locator('[data-testid^="item-spell-row-"]');
  }

  get formFields() {
    return this.page.getByTestId("item-form-fields");
  }

  get spellPicker() {
    return this.page.getByTestId("item-spell-picker");
  }

  get spellPickerSearch() {
    return this.page.getByTestId("item-spell-picker-search");
  }

  async openNew() {
    await this.shell.startNewEntity("Items", "New Item");
  }

  async openById(itemId: string) {
    await this.page.goto(`/create?tab=Items&item_id=${itemId}`);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async fillStats(values: Record<string, string>) {
    for (const [field, value] of Object.entries(values)) {
      await this.page.getByTestId(`item-${field}-input`).fill(value);
    }
  }

  async linkSpell(name: string, search?: string) {
    await addLinkedEntity(
      this.page,
      "item-spell-picker",
      "item-spell-picker-search",
      "item-add-spell-button",
      name,
      search,
    );
  }

  async removeSpell(index: number) {
    await this.page.getByTestId(`item-spell-remove-${index}`).click();
  }

  async saveCreate() {
    await saveEntityAndWait(this.page, "items", "create");
    await expect(this.page).toHaveURL(/(?:\?|&)item_id=/);
    await expect(this.formFields).toBeVisible();
  }

  async saveUpdate() {
    await saveEntityAndWait(this.page, "items", "update");
  }
}
