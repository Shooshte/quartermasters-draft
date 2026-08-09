import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

type TargetScope = "self" | "self_allies" | "self_enemies" | "allies" | "enemies" | "both";
type TargetPriority = "highest_health" | "lowest_health" | "highest_damage" | "support" | "random";
type SelectionShape = "individual" | "adjacent";

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

  get targetScopeSelect() {
    return this.page.getByTestId("unit-target-scope-select");
  }

  get targetPrioritySelect() {
    return this.page.getByTestId("unit-target-priority-select");
  }

  get targetingSummary() {
    return this.page.getByTestId("unit-targeting-summary");
  }

  get targetCountInput() {
    return this.page.getByTestId("unit-target-count-input");
  }

  selectionShapeButton(shape: SelectionShape) {
    return this.page.getByTestId(`unit-target-shape-toggle-${shape}`);
  }

  finalStat(field: string) {
    return this.page.getByTestId(`unit-${field}-final`);
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

  async setTargeting(scope: TargetScope, priority: TargetPriority) {
    await this.targetScopeSelect.selectOption(scope);
    await this.targetPrioritySelect.selectOption(priority);
  }

  async setTargetCount(count: number) {
    await this.targetCountInput.fill(String(count));
  }

  async setSelectionShape(shape: SelectionShape) {
    await this.selectionShapeButton(shape).click();
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
