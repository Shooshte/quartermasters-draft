import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

type RowType = "tank" | "melee" | "ranged" | "support";

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

  get effectRows() {
    return this.page.locator('[data-testid^="item-effect-row-"]');
  }

  get formFields() {
    return this.page.getByTestId("item-form-fields");
  }

  get effectPicker() {
    return this.page.getByTestId("item-effect-picker");
  }

  get effectPickerSearch() {
    return this.page.getByTestId("item-effect-picker-search");
  }

  allowedRowButton(rowType: RowType) {
    return this.page.getByTestId(`item-allowed-row-${rowType}`);
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

  async setAllowedRows(rowTypes: readonly RowType[]) {
    for (const rowType of ["tank", "melee", "ranged", "support"] as const) {
      const shouldBeActive = rowTypes.includes(rowType);
      const isActive =
        (await this.allowedRowButton(rowType).getAttribute("aria-pressed")) === "true";
      if (isActive !== shouldBeActive) {
        await this.allowedRowButton(rowType).click();
      }
    }
  }

  effectRow(index: number) {
    return this.page.getByTestId(`item-effect-row-${index}`);
  }

  async linkEffect(name: string, search?: string) {
    await addLinkedEntity(
      this.page,
      "item-effect-picker",
      "item-effect-picker-search",
      "item-add-effect-button",
      name,
      search,
    );
  }

  async removeEffect(index: number) {
    await this.page.getByTestId(`item-effect-remove-${index}`).click();
  }

  async editEffect(index: number) {
    await this.page.getByTestId(`item-effect-edit-${index}`).click();
  }

  async moveEffectDown(index: number) {
    await this.page.getByTestId(`item-effect-move-down-${index}`).click();
  }

  async moveEffectUp(index: number) {
    await this.page.getByTestId(`item-effect-move-up-${index}`).click();
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
