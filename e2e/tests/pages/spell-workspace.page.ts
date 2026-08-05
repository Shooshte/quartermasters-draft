import { expect, type Page } from "@playwright/test";
import { addLinkedEntity, saveEntityAndWait } from "../helpers/workspace-helpers";
import { CreateShellPage } from "./create-shell.page";

export class SpellWorkspacePage {
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

  get targetPolicySelect() {
    return this.page.getByTestId("spell-target-policy-select");
  }

  get targetScopeSelect() {
    return this.page.getByTestId("spell-target-scope-select");
  }

  get descriptionInput() {
    return this.page.getByTestId("spell-description-input");
  }

  get effectPicker() {
    return this.page.getByTestId("spell-effect-picker");
  }

  get effectPickerSearch() {
    return this.page.getByTestId("spell-effect-picker-search");
  }

  get effectPickerOptions() {
    return this.page.locator('[role="listbox"] [role="option"]');
  }

  async openNew() {
    await this.shell.startNewEntity("Spells", "New Spell");
  }

  async openById(spellId: string) {
    await this.page.goto(`/create?tab=Spells&spell_id=${spellId}`);
  }

  async fillName(name: string) {
    await this.nameInput.fill(name);
  }

  async setDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  async setTargetPolicy(policy: string) {
    await this.targetPolicySelect.selectOption(policy);
  }

  async setTargetScope(scope: string) {
    await this.targetScopeSelect.selectOption(scope);
  }

  async addEffect(name: string, search?: string) {
    await addLinkedEntity(
      this.page,
      "spell-effect-picker",
      "spell-effect-picker-search",
      "spell-add-effect-button",
      name,
      search,
    );
  }

  async removeEffect(index: number) {
    await this.page.getByTestId(`spell-effect-remove-${index}`).click();
  }

  async editEffect(index: number) {
    await this.page.getByTestId(`spell-effect-edit-${index}`).click();
  }

  async saveCreate() {
    await saveEntityAndWait(this.page, "spells", "create");
    await expect(this.page).toHaveURL(/(?:\?|&)spell_id=/);
    await expect(this.nameInput).toBeVisible();
  }

  async saveUpdate() {
    await saveEntityAndWait(this.page, "spells", "update");
  }
}
