// Source of truth: e2e/features/create/item-workspace.feature
import { expect, test } from "../db-reset.fixture";
import { OAK_STAFF_ID } from "../helpers/seed-constants";
import { expectAllStats } from "../helpers/workspace-helpers";
import { ItemWorkspacePage } from "../pages/item-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.describe("Item Workspace", () => {
  test("create a new item with default stats @smoke", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Bronze Buckler");
    await item.saveCreate();

    await expect(gmPage).toHaveURL(/item_id=/);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText(
      "Item: Bronze Buckler",
    );
  });

  test("name is required", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await expect(item.saveButton).toBeDisabled();
  });

  test("stat fields default to zero", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Empty Hilt");
    await item.saveCreate();

    await gmPage.reload();

    await expectAllStats(gmPage, "item", {
      meleeDmg: "0",
      rangedDmg: "0",
      mana: "0",
      manaRegen: "0",
      spellDmg: "0",
      dodge: "0",
      criticalChance: "0",
      activationManaCost: "0",
      activationHealthCost: "0",
    });
  });

  test("create an item with combat stats", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Obsidian Blade");
    await item.fillStats({
      meleeDmg: "18",
      rangedDmg: "0",
      spellDmg: "5",
      criticalChance: "12",
    });
    await item.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "item", {
      meleeDmg: "18",
      rangedDmg: "0",
      spellDmg: "5",
      criticalChance: "12",
    });
  });

  test("create an item with utility stats", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Shade Charm");
    await item.fillStats({
      mana: "-25",
      manaRegen: "4.5",
      dodge: "6",
    });
    await item.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "item", {
      mana: "-25",
      manaRegen: "4.5",
      dodge: "6",
    });
  });

  test("create an item with activation costs", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Mana Gauntlet");
    await item.fillStats({
      activationManaCost: "8",
      activationHealthCost: "3",
    });
    await item.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "item", {
      activationManaCost: "8",
      activationHealthCost: "3",
    });
  });

  test("stat fields accept decimal values", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Precise Blade");
    await item.fillStats({
      meleeDmg: "12.5",
      criticalChance: "7.25",
    });
    await item.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "item", {
      meleeDmg: "12.5",
      criticalChance: "7.25",
    });
  });

  test("stat fields accept negative values", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Cursed Sigil");
    await item.fillStats({
      spellDmg: "-3.5",
      dodge: "-1",
    });
    await item.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "item", {
      spellDmg: "-3.5",
      dodge: "-1",
    });
  });

  test("edit an existing item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.fillName("Oak Staff Updated");
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.nameInput).toHaveValue("Oak Staff Updated");
  });

  test("edit stat values on an existing item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.fillStats({ spellDmg: "20" });
    await item.saveUpdate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("item-spellDmg-input")).toHaveValue("20");
  });

  test("edit a linked spell", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.editSpell(0);

    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage).toHaveURL(/tab=Spells/);
    await expect(gmPage).toHaveURL(/spell_id=/);
    await expect(gmPage).not.toHaveURL(/item_id=/);
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.fillName("Iron Sword");
    await item.saveButton.click();

    await expect(item.saveError).toHaveText("An item with this name already exists");
    await expect(item.nameInput).toHaveValue("Iron Sword");
  });

  test("linked spells are optional on create", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Spell-less Relic");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.spellRows).toHaveCount(0);
  });

  test("activation costs cannot be negative", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Broken Relay");
    await item.fillStats({
      activationManaCost: "-1",
      activationHealthCost: "-2",
    });

    await expect(item.saveButton).toBeDisabled();
    await expect(gmPage.getByText("Must be zero or greater")).toHaveCount(2);
  });

  test("add a spell to an item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Flame Rod");
    await item.linkSpell("Fireball");
    await item.saveCreate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("item-spell-row-0")).toContainText("Fireball");
  });

  test("add multiple spells to an item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Arcane Focus");
    await item.linkSpell("Fireball");
    await item.linkSpell("Healing Touch");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.formFields).toContainText("Fireball");
    await expect(item.formFields).toContainText("Healing Touch");
    await expect(item.spellRows).toHaveCount(2);
  });

  test("remove a linked spell while at least one remains", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.linkSpell("Healing Touch");
    await item.saveUpdate();

    await item.removeSpell(0);
    await expect(item.spellRows).toHaveCount(1);
    await expect(gmPage.getByTestId("item-spell-row-0")).toContainText("Healing Touch");
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.spellRows).toHaveCount(1);
    await expect(gmPage.getByTestId("item-spell-row-0")).toContainText("Healing Touch");
  });

  test("removing the final linked spell is allowed on edit", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.removeSpell(0);
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.spellRows).toHaveCount(0);
  });

  test("edit linked spells on an existing item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.linkSpell("Battle Cry");
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.formFields).toContainText("Fireball");
    await expect(item.formFields).toContainText("Battle Cry");
    await expect(item.spellRows).toHaveCount(2);
  });

  test("search for a specific spell before linking it", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.spellPicker.click();
    await item.spellPickerSearch.fill("fire");
    await expect(gmPage.getByRole("option", { name: "Fireball" })).toBeVisible();
  });

  test("link-spell picker shows at most five options", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.spellPicker.click();
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
  });

  test("link-spell picker does not include the search prompt as an option", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.spellPicker.click();
    await expect(item.spellPickerSearch).toHaveAttribute("placeholder", "Search spells...");
    await expect(
      gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search spells..." }),
    ).toHaveCount(0);
  });

  test("duplicate spell links are not allowed", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Echo Crystal");
    await item.linkSpell("Fireball");

    await item.spellPicker.click();
    await expect(gmPage.getByRole("option", { name: "Fireball" })).toHaveCount(0);
  });
});
