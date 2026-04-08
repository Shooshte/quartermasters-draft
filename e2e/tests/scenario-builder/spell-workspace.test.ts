// Source of truth: e2e/features/create/spell-workspace.feature
// Cross-reference: effect-picker and deletion scenarios for this feature are
// covered in e2e/tests/scenario-builder/library-spells-tab.test.ts.
import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import { FIREBALL_ID, BATTLE_CRY_ID } from "../helpers/seed-constants";
import { SpellWorkspacePage } from "../pages/spell-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openNewSpell(page: Page) {
  await new SpellWorkspacePage(page).openNew();
}

async function addEffect(page: Page, effectName: string, search?: string) {
  await new SpellWorkspacePage(page).addEffect(effectName, search);
}

async function saveSpellAndWait(page: Page, mutation: "create" | "update") {
  const spell = new SpellWorkspacePage(page);
  if (mutation === "create") {
    await spell.saveCreate();
    return;
  }
  await spell.saveUpdate();
}

// ─── Basic CRUD ──────────────────────────────────────────────────────────────

test.describe("Spell Workspace — CRUD", () => {
  test("create a new spell with target policy and effect", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Arcane Volley");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("highest_health");
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");

    await expect(gmPage).toHaveURL(/spell_id=/);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Arcane Volley");
  });

  test("target policy offers all four options", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    const select = gmPage.getByTestId("spell-target-policy-select");
    for (const policy of ["highest_health", "lowest_health", "highest_damage", "random"]) {
      await expect(select.locator(`option[value="${policy}"]`)).toBeAttached();
    }
  });

  test("target policy is required — save stays blocked without one", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("No Policy Spell");
    // Don't select a target policy
    await addEffect(gmPage, "Barbarian Roar");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
  });

  test("name is required — save stays blocked without one", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await addEffect(gmPage, "Barbarian Roar");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
  });

  test("description is optional — spell saves without one", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Silent Strike");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    // No description
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);
  });

  test("description persists after save and reload", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Ember Wave");
    await gmPage.getByTestId("spell-description-input").fill("A rolling wave of fire");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-description-input")).toHaveValue("A rolling wave of fire");
  });

  test("edit an existing spell and persist changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await saveSpellAndWait(gmPage, "update");

    await gmPage.reload();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball Updated");
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Battle Cry");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("entity-save-error")).toBeVisible();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Battle Cry");
  });
});

// ─── Linked Effects ──────────────────────────────────────────────────────────

test.describe("Spell Workspace — Linked Effects", () => {
  test("at least one linked effect is required on create", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Empty Spell");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
  });

  test("add multiple effects in sequence order", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Combo Strike");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await addEffect(gmPage, "Barbarian Roar");
    await addEffect(gmPage, "Exhaust");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Barbarian Roar");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Exhaust");
  });

  test("reorder linked effects", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);

    // Fireball has effects: Arcane Damage (pos 0), Sizzling Flesh (pos 1)
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Arcane Damage");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Sizzling Flesh");

    // Move first effect down (swap positions)
    await gmPage.getByTestId("spell-effect-move-down-0").click();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Sizzling Flesh");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Arcane Damage");

    await saveSpellAndWait(gmPage, "update");
    await gmPage.reload();

    // Order should be swapped
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Sizzling Flesh");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Arcane Damage");
  });

  test("remove a linked effect while at least one remains", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);

    // Fireball has 2 effects
    await expect(gmPage.getByTestId("spell-effect-row-1")).toBeVisible();

    // Remove the second effect
    await gmPage.getByTestId("spell-effect-remove-1").click();

    // Should still have one effect
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Arcane Damage");
    await expect(gmPage.getByTestId("spell-effect-row-1")).not.toBeVisible();

    await saveSpellAndWait(gmPage, "update");
    await gmPage.reload();

    // Only one effect should remain
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();
    await expect(gmPage.getByTestId("spell-effect-row-1")).not.toBeVisible();
  });

  test("at least one linked effect is required on edit", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${BATTLE_CRY_ID}`);

    // Battle Cry has 1 effect
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();

    // Remove the only effect
    await gmPage.getByTestId("spell-effect-remove-0").click();

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
  });

  test("duplicate effects are allowed in the same spell", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Echo Blast");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await addEffect(gmPage, "Barbarian Roar");
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Barbarian Roar");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Barbarian Roar");
  });
});

// ─── Target Scope ────────────────────────────────────────────────────────────

test.describe("Spell Workspace — Target Scope", () => {
  test("target scope defaults on new spell", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await expect(gmPage.getByTestId("spell-target-row-count-input")).toHaveValue("1");
    await expect(gmPage.getByTestId("spell-max-targets-per-row-input")).toHaveValue("1");
    await expect(gmPage.getByTestId("spell-target-only-adjacent-checkbox")).not.toBeChecked();

    // No row type restriction pills should be active
    for (const rowType of ["melee", "tank", "ranged", "support"]) {
      await expect(gmPage.getByTestId(`spell-allowed-row-${rowType}`)).not.toHaveAttribute("aria-pressed", "true");
    }
  });

  test("create a spell targeting a whole row", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Inferno Wave");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    // "All" toggle should be active, max-targets-per-row input should be hidden or show whole row
    await expect(gmPage.getByTestId("spell-max-targets-per-row-input")).not.toBeVisible();
  });

  test("create a spell with adjacent targeting", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Lightning Chain");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("highest_damage");
    await gmPage.getByTestId("spell-max-targets-per-row-input").fill("3");
    await gmPage.getByTestId("spell-target-only-adjacent-checkbox").check();
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-target-only-adjacent-checkbox")).toBeChecked();
  });

  test("adjacent requires at least 2 targets per row", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("spell-max-targets-per-row-input").fill("1");
    await expect(gmPage.getByTestId("spell-target-only-adjacent-checkbox")).toBeDisabled();
  });

  test("adjacent is disabled for whole row targeting", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await expect(gmPage.getByTestId("spell-target-only-adjacent-checkbox")).toBeDisabled();
  });

  test("create a spell with row type restrictions", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Tank Buster");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("highest_health");
    await gmPage.getByTestId("spell-allowed-row-melee").click();
    await gmPage.getByTestId("spell-allowed-row-tank").click();
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-allowed-row-melee")).toHaveAttribute("aria-pressed", "true");
    await expect(gmPage.getByTestId("spell-allowed-row-tank")).toHaveAttribute("aria-pressed", "true");
    await expect(gmPage.getByTestId("spell-allowed-row-ranged")).not.toHaveAttribute("aria-pressed", "true");
    await expect(gmPage.getByTestId("spell-allowed-row-support")).not.toHaveAttribute("aria-pressed", "true");
  });

  test("create a spell targeting multiple rows", async ({ gmPage }) => {
    await openNewSpell(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Earthquake II");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await gmPage.getByTestId("spell-target-row-count-input").fill("2");
    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await addEffect(gmPage, "Barbarian Roar");

    await saveSpellAndWait(gmPage, "create");
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-target-row-count-input")).toHaveValue("2");
  });
});
