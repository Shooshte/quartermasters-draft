import { expect, type Page } from "@playwright/test";
import { UNIT_IDS } from "../helpers/seed-constants";
import { saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

type RowType = "tank" | "melee" | "ranged" | "support";

export class ScenarioWorkspacePage {
  readonly shell: CreateShellPage;

  constructor(readonly page: Page) {
    this.shell = new CreateShellPage(page);
  }

  // ─── Locator Getters ────────────────────────────────────────────────────────

  get nameInput() {
    return this.page.getByTestId("scenario-name-input");
  }

  get saveButton() {
    return this.page.getByTestId("scenario-save-button");
  }

  get saveError() {
    return this.page.getByTestId("scenario-save-error");
  }

  get workspaceHeader() {
    return this.page.getByTestId("scenario-workspace-header");
  }

  get pickerOptions() {
    return this.page.locator('[role="listbox"] [role="option"]');
  }

  pickerSearch(rowType: RowType) {
    return this.page.getByTestId(`scenario-row-${rowType}-picker-search`);
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async openNew() {
    await this.shell.startNewEntity("Scenarios", "New Scenario");
  }

  async openById(id: string) {
    await this.page.goto(`/create?scenario_id=${id}`);
  }

  // ─── Form Interaction ───────────────────────────────────────────────────────

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async assignUnit(rowType: RowType, unitName: string, search = unitName) {
    const unitId = UNIT_IDS[unitName];
    await this.page.getByTestId(`scenario-row-${rowType}-picker`).click();
    await this.page.getByTestId(`scenario-row-${rowType}-picker-search`).fill(search);
    await expect(
      this.page.getByTestId(`scenario-row-${rowType}-picker-option-${unitId}`),
    ).toBeVisible();
    await this.page.getByTestId(`scenario-row-${rowType}-picker-option-${unitId}`).click();
    await this.page.getByTestId(`scenario-row-${rowType}-picker-add`).click();
  }

  async removeUnit(rowType: RowType, slotIndex: number) {
    await this.page.getByTestId(`scenario-row-${rowType}-remove-${slotIndex}`).click();
  }

  async moveUnitUp(rowType: RowType, slotIndex: number) {
    await this.page.getByTestId(`scenario-row-${rowType}-move-up-${slotIndex}`).click();
  }

  async editUnit(rowType: RowType, slotIndex: number) {
    await this.page.getByTestId(`scenario-row-${rowType}-edit-${slotIndex}`).click();
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  async saveCreate() {
    await saveEntityAndWait(this.page, "scenarios", "create", {
      saveButtonTestId: "scenario-save-button",
    });
    await expect(this.page).toHaveURL(/scenario_id=/);
  }

  async saveUpdate() {
    await saveEntityAndWait(this.page, "scenarios", "update", {
      saveButtonTestId: "scenario-save-button",
    });
  }

  // ─── Assertions ─────────────────────────────────────────────────────────────

  async expectRowEmpty(rowType: RowType) {
    await expect(this.page.locator(`[data-testid^="scenario-row-${rowType}-slot-"]`)).toHaveCount(
      0,
    );
    await expect(this.page.getByTestId(`scenario-row-${rowType}`)).toContainText(
      "No units assigned",
    );
  }

  async expectRowUnits(rowType: RowType, unitNames: string[]) {
    for (const [index, unitName] of unitNames.entries()) {
      await expect(
        this.page.getByTestId(`scenario-row-${rowType}-slot-${index + 1}`),
      ).toContainText(unitName);
    }
  }
}
