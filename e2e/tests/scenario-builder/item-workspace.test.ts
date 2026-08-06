// Source of truth: e2e/features/create/item-workspace.feature
import { expect, test } from "../db-reset.fixture";
import { IRON_SWORD_ID, OAK_STAFF_ID } from "../helpers/seed-constants";
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

  test("open a linked effect in the effect workspace", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(IRON_SWORD_ID);

    await item.editEffect(0);

    await expect(gmPage.getByRole("tab", { name: "Effects" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Arcane Damage");
    await expect(gmPage).toHaveURL(/tab=Effects/);
    await expect(gmPage).toHaveURL(/effect_id=/);
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

  test("a stat-only item is valid", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Stat-only Relic");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.effectRows).toHaveCount(0);
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

  test("add an effect to an item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Flame Rod");
    await item.linkEffect("Arcane Damage");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.effectRow(0)).toContainText("Arcane Damage");
    await expect(item.effectRow(0)).toContainText("1");
  });

  test("effects persist in linked order", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Arcane Focus");
    await item.linkEffect("Arcane Damage");
    await item.linkEffect("Sizzling Flesh");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.effectRows).toHaveCount(2);
    await expect(item.effectRow(0)).toContainText("Arcane Damage");
    await expect(item.effectRow(1)).toContainText("Sizzling Flesh");
  });

  test("reorder linked effects and persist the new order", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(IRON_SWORD_ID);

    await expect(item.effectRow(0)).toContainText("Arcane Damage");
    await expect(item.effectRow(1)).toContainText("Sizzling Flesh");
    await item.moveEffectDown(0);
    await expect(item.effectRow(0)).toContainText("Sizzling Flesh");
    await expect(item.effectRow(1)).toContainText("Arcane Damage");
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.effectRow(0)).toContainText("Sizzling Flesh");
    await expect(item.effectRow(1)).toContainText("Arcane Damage");
  });

  test("remove a linked effect while at least one remains", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.linkEffect("Sizzling Flesh");
    await item.saveUpdate();

    await item.removeEffect(0);
    await expect(item.effectRows).toHaveCount(1);
    await expect(item.effectRow(0)).toContainText("Sizzling Flesh");
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.effectRows).toHaveCount(1);
    await expect(item.effectRow(0)).toContainText("Sizzling Flesh");
  });

  test("removing the final linked effect leaves a valid stat-only item", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openById(OAK_STAFF_ID);

    await item.removeEffect(0);
    await item.saveUpdate();

    await gmPage.reload();
    await expect(item.effectRows).toHaveCount(0);
  });

  test("search for a specific effect before linking it", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.effectPicker.click();
    await item.effectPickerSearch.fill("Tectonic Pulse");
    await expect(gmPage.getByRole("option", { name: "Tectonic Pulse" })).toBeVisible();
  });

  test("link-effect picker shows at most five options", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.effectPicker.click();
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
  });

  test("link-effect picker uses the search prompt as a placeholder only", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.effectPicker.click();
    await expect(item.effectPickerSearch).toHaveAttribute("placeholder", "Search effects...");
    await expect(
      gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search effects..." }),
    ).toHaveCount(0);
  });

  test("duplicate effect links are allowed and persist", async ({ gmPage }) => {
    const item = new ItemWorkspacePage(gmPage);
    await item.openNew();

    await item.fillName("Echo Crystal");
    await item.linkEffect("Arcane Damage");
    await item.linkEffect("Arcane Damage");
    await item.saveCreate();

    await gmPage.reload();
    await expect(item.effectRows).toHaveCount(2);
    await expect(item.effectRow(0)).toContainText("Arcane Damage");
    await expect(item.effectRow(1)).toContainText("Arcane Damage");
  });
});
