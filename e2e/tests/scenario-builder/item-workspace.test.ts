import { expect, test } from "../db-reset.fixture";

test.describe.configure({ mode: "serial" });

import { OAK_STAFF_ID } from "../helpers/seed-constants";
import { openNewEntity, saveEntityAndWait, expectAllStats, addLinkedEntity } from "../helpers/workspace-helpers";

test.describe("Item Workspace", () => {
  test("create a new item with default stats", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("entity-name-input").fill("Bronze Buckler");
    await saveEntityAndWait(gmPage, "items", "create");

    await expect(gmPage).toHaveURL(/item_id=/);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText("Item: Bronze Buckler");
  });

  test("save stays blocked until a name is present", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Items", "New Item");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await gmPage.getByTestId("entity-name-input").fill("Nameless No More");
    await expect(gmPage.getByTestId("entity-save-button")).toBeEnabled();
  });

  test("default zero stats persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("entity-name-input").fill("Empty Hilt");
    await saveEntityAndWait(gmPage, "items", "create");
    await expect(gmPage).toHaveURL(/item_id=/);

    await gmPage.reload();

    await expectAllStats(gmPage, "item", {
      meleeDmg: "0",
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      dodge: "0",
      criticalChance: "0",
      activationManaCost: "0",
      activationHealthCost: "0",
    });
  });

  test("decimal and negative non-cost stats persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("entity-name-input").fill("Cursed Sigil");
    await gmPage.getByTestId("item-meleeDmg-input").fill("12.5");
    await gmPage.getByTestId("item-spellDmg-input").fill("-3.5");
    await gmPage.getByTestId("item-dodge-input").fill("-1");
    await gmPage.getByTestId("item-criticalChance-input").fill("7.25");
    await saveEntityAndWait(gmPage, "items", "create");
    await expect(gmPage).toHaveURL(/item_id=/);

    await gmPage.reload();

    await expectAllStats(gmPage, "item", {
      meleeDmg: "12.5",
      spellDmg: "-3.5",
      dodge: "-1",
      criticalChance: "7.25",
    });
  });

  test("negative activation costs block saving", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("entity-name-input").fill("Broken Relay");
    await gmPage.getByTestId("item-activationManaCost-input").fill("-1");
    await gmPage.getByTestId("item-activationHealthCost-input").fill("-2");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await expect(gmPage.getByText("Must be zero or greater")).toHaveCount(2);
  });

  test("editing an existing item persists name and stat changes", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Items&item_id=${OAK_STAFF_ID}`);

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Oak Staff");
    await gmPage.getByTestId("entity-name-input").fill("Oak Staff Updated");
    await gmPage.getByTestId("item-spellDmg-input").fill("20");
    await saveEntityAndWait(gmPage, "items", "update");

    await gmPage.reload();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Oak Staff Updated");
    await expect(gmPage.getByTestId("item-spellDmg-input")).toHaveValue("20");
  });

  test("duplicate item names surface a save error", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Items&item_id=${OAK_STAFF_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Iron Sword");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("entity-save-error")).toHaveText("An item with this name already exists");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");
  });

  test("multiple linked spells persist as membership after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("entity-name-input").fill("Arcane Focus");
    await addLinkedEntity(gmPage, "item-spell-picker", "item-spell-picker-search", "item-add-spell-button", "Fireball");
    await addLinkedEntity(gmPage, "item-spell-picker", "item-spell-picker-search", "item-add-spell-button", "Healing Touch");
    await saveEntityAndWait(gmPage, "items", "create");
    await expect(gmPage).toHaveURL(/item_id=/);

    await gmPage.reload();

    await expect(gmPage.getByTestId("item-form-fields")).toContainText("Fireball");
    await expect(gmPage.getByTestId("item-form-fields")).toContainText("Healing Touch");
    await expect(gmPage.locator('[data-testid^="item-spell-row-"]')).toHaveCount(2);
  });

  test("removing the final linked spell persists after save", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Items&item_id=${OAK_STAFF_ID}`);

    await expect(gmPage.getByTestId("item-spell-row-0")).toContainText("Fireball");
    await gmPage.getByTestId("item-spell-remove-0").click();
    await expect(gmPage.locator('[data-testid^="item-spell-row-"]')).toHaveCount(0);

    await saveEntityAndWait(gmPage, "items", "update");

    await gmPage.reload();

    await expect(gmPage.locator('[data-testid^="item-spell-row-"]')).toHaveCount(0);

    await resetDb();
  });

  test("the spell picker supports search, shows at most five options, and hides already linked spells", async ({
    gmPage,
  }) => {
    await openNewEntity(gmPage, "Items", "New Item");

    await gmPage.getByTestId("item-spell-picker").click();
    await expect(gmPage.getByTestId("item-spell-picker-search")).toHaveAttribute(
      "placeholder",
      "Search spells...",
    );
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
    await expect(gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search spells..." })).toHaveCount(0);

    await gmPage.getByTestId("item-spell-picker-search").fill("fire");
    await expect(gmPage.getByRole("option", { name: "Fireball" })).toBeVisible();

    await gmPage.getByRole("option", { name: "Fireball" }).click();
    await gmPage.getByTestId("item-add-spell-button").click();
    await expect(gmPage.getByTestId("item-spell-row-0")).toContainText("Fireball");

    await gmPage.getByTestId("item-spell-picker").click();
    await expect(gmPage.getByRole("option", { name: "Fireball" })).toHaveCount(0);
  });
});
