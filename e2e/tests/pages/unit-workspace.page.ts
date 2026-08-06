import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

type TargetSide = "allies" | "enemies" | "self";
type TargetPolicy = "highest_health" | "lowest_health" | "highest_damage" | "random" | "self";
type TargetRow = "tank" | "melee" | "ranged" | "support";
type PerRowMode = "all" | "limit";
type PositionRule = "any" | "adjacent";

const targetRows = ["tank", "melee", "ranged", "support"] as const;

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

  get targetSideSelect() {
    return this.page.getByTestId("unit-target-side-select");
  }

  get targetPolicySelect() {
    return this.page.getByTestId("unit-target-policy-select");
  }

  get targetingSummary() {
    return this.page.getByTestId("unit-targeting-summary");
  }

  get maxTargetsPerRowInput() {
    return this.page.getByTestId("unit-target-max-targets-per-row-input");
  }

  targetRowCountButton(count: 1 | 2 | 3 | 4) {
    return this.page.getByTestId(`unit-target-row-count-toggle-${count}`);
  }

  perRowModeButton(mode: PerRowMode) {
    return this.page.getByTestId(`unit-target-per-row-toggle-${mode}`);
  }

  positionRuleButton(rule: PositionRule) {
    return this.page.getByTestId(`unit-target-position-toggle-${rule}`);
  }

  allowedRowButton(row: TargetRow) {
    return this.page.getByTestId(`unit-target-allowed-row-${row}`);
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

  async setTargeting(side: TargetSide, policy: TargetPolicy) {
    await this.targetSideSelect.selectOption(side);
    await this.targetPolicySelect.selectOption(policy);
  }

  async setTargetRowCount(count: 1 | 2 | 3 | 4) {
    await this.targetRowCountButton(count).click();
  }

  async setPerRowMode(mode: PerRowMode) {
    await this.perRowModeButton(mode).click();
  }

  async setMaxTargetsPerRow(count: number) {
    if ((await this.maxTargetsPerRowInput.count()) === 0) {
      await this.setPerRowMode("limit");
    }
    await this.maxTargetsPerRowInput.fill(String(count));
  }

  async setPositionRule(rule: PositionRule) {
    await this.positionRuleButton(rule).click();
  }

  async setAllowedRows(rows: readonly TargetRow[]) {
    if (rows.length === 0) {
      throw new Error("At least one target row must remain eligible");
    }

    for (const row of rows) {
      if ((await this.allowedRowButton(row).getAttribute("aria-pressed")) !== "true") {
        await this.allowedRowButton(row).click();
      }
    }

    for (const row of targetRows) {
      if (
        !rows.includes(row) &&
        (await this.allowedRowButton(row).getAttribute("aria-pressed")) === "true"
      ) {
        await this.allowedRowButton(row).click();
      }
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
