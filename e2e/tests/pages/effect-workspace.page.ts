import { expect, type Page } from "@playwright/test";
import { saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

export class EffectWorkspacePage {
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

  get timingTypeSelect() {
    return this.page.getByTestId("effect-timing-type-select");
  }

  get triggerEveryActionsInput() {
    return this.page.getByTestId("effect-triggerEveryActions-input");
  }

  get lastsForActionsInput() {
    return this.page.getByTestId("effect-lastsForActions-input");
  }

  get effectTypeSelect() {
    return this.page.getByTestId("effect-effect-type-select");
  }

  get timingTypeChip() {
    return this.page.getByTestId("effect-timing-type-chip");
  }

  async openNew() {
    await this.shell.startNewEntity("Effects", "New Effect");
  }

  async openById(effectId: string) {
    await this.page.goto(`/create?tab=Effects&effect_id=${effectId}`);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async setTimingType(value: string) {
    await this.timingTypeSelect.selectOption(value);
  }

  async setEffectType(value: string) {
    await this.effectTypeSelect.selectOption(value);
  }

  async saveCreate() {
    await saveEntityAndWait(this.page, "effects", "create");
    await expect(this.page).toHaveURL(/(?:\?|&)effect_id=/);
    await expect(this.nameInput).toBeVisible();
  }

  async saveUpdate() {
    await saveEntityAndWait(this.page, "effects", "update");
  }
}
