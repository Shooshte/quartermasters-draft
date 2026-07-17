// Source of truth: e2e/features/create/spell-workspace.feature
// Cross-reference: effect-picker and deletion scenarios for this feature are
// covered in e2e/tests/scenario-builder/library-spells-tab.test.ts.
import { expect, test } from "../db-reset.fixture";
import { BATTLE_CRY_ID, FIREBALL_ID } from "../helpers/seed-constants";
import { SpellWorkspacePage } from "../pages/spell-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

// ─── Basic CRUD ──────────────────────────────────────────────────────────────

test.describe("Spell Workspace — CRUD", () => {
  test("create a new spell with target policy and effect @smoke", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Arcane Volley");
    await spell.setTargetPolicy("highest_health");
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();

    await expect(gmPage).toHaveURL(/spell_id=/);
    await expect(spell.nameInput).toHaveValue("Arcane Volley");
  });

  test("target policy offers all five options", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    for (const policy of ["highest_health", "lowest_health", "highest_damage", "random", "self"]) {
      await expect(spell.targetPolicySelect.locator(`option[value="${policy}"]`)).toBeAttached();
    }
  });

  test("target policy is required — save stays blocked without one", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("No Policy Spell");
    // Don't select a target policy
    await spell.addEffect("Barbarian Roar");

    await expect(spell.saveButton).toBeDisabled();
  });

  test("name is required — save stays blocked without one", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.setTargetPolicy("random");
    await spell.addEffect("Barbarian Roar");

    await expect(spell.saveButton).toBeDisabled();
  });

  test("description is optional — spell saves without one", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Silent Strike");
    await spell.setTargetPolicy("random");
    // No description
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);
  });

  test("description persists after save and reload", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Ember Wave");
    await spell.setDescription("A rolling wave of fire");
    await spell.setTargetPolicy("random");
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(spell.descriptionInput).toHaveValue("A rolling wave of fire");
  });

  test("edit an existing spell and persist changes", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openById(FIREBALL_ID);

    await spell.fillName("Fireball Updated");
    await spell.saveUpdate();

    await gmPage.reload();
    await expect(spell.nameInput).toHaveValue("Fireball Updated");
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openById(FIREBALL_ID);

    await spell.fillName("Battle Cry");
    await spell.saveButton.click();

    await expect(spell.saveError).toBeVisible();
    await expect(spell.nameInput).toHaveValue("Battle Cry");
  });
});

// ─── Linked Effects ──────────────────────────────────────────────────────────

test.describe("Spell Workspace — Linked Effects", () => {
  test("at least one linked effect is required on create", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Empty Spell");
    await spell.setTargetPolicy("random");

    await expect(spell.saveButton).toBeDisabled();
  });

  test("add multiple effects in sequence order", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Combo Strike");
    await spell.setTargetPolicy("random");
    await spell.addEffect("Barbarian Roar");
    await spell.addEffect("Exhaust");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Barbarian Roar");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Exhaust");
  });

  test("reorder linked effects", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openById(FIREBALL_ID);

    // Fireball has effects: Arcane Damage (pos 0), Sizzling Flesh (pos 1)
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Arcane Damage");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Sizzling Flesh");

    // Move first effect down (swap positions)
    await gmPage.getByTestId("spell-effect-move-down-0").click();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Sizzling Flesh");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Arcane Damage");

    await spell.saveUpdate();
    await gmPage.reload();

    // Order should be swapped
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Sizzling Flesh");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Arcane Damage");
  });

  test("remove a linked effect while at least one remains", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openById(FIREBALL_ID);

    // Fireball has 2 effects
    await expect(gmPage.getByTestId("spell-effect-row-1")).toBeVisible();

    // Remove the second effect
    await spell.removeEffect(1);

    // Should still have one effect
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Arcane Damage");
    await expect(gmPage.getByTestId("spell-effect-row-1")).not.toBeVisible();

    await spell.saveUpdate();
    await gmPage.reload();

    // Only one effect should remain
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();
    await expect(gmPage.getByTestId("spell-effect-row-1")).not.toBeVisible();
  });

  test("at least one linked effect is required on edit", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openById(BATTLE_CRY_ID);

    // Battle Cry has 1 effect
    await expect(gmPage.getByTestId("spell-effect-row-0")).toBeVisible();

    // Remove the only effect
    await spell.removeEffect(0);

    await expect(spell.saveButton).toBeDisabled();
  });

  test("duplicate effects are allowed in the same spell", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Echo Blast");
    await spell.setTargetPolicy("random");
    await spell.addEffect("Barbarian Roar");
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Barbarian Roar");
    await expect(gmPage.getByTestId("spell-effect-row-1")).toContainText("Barbarian Roar");
  });
});

// ─── Target Scope ────────────────────────────────────────────────────────────

test.describe("Spell Workspace — Target Scope", () => {
  test("target scope defaults on new spell", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await expect(gmPage.getByTestId("spell-target-row-count-toggle-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-max-targets-per-row-input")).toHaveValue("1");
    await expect(gmPage.getByTestId("spell-target-position-toggle-any")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-target-scope-select")).toHaveValue("self_and_others");

    // Empty restrictions mean every row is visibly eligible.
    for (const rowType of ["melee", "tank", "ranged", "support"]) {
      await expect(gmPage.getByTestId(`spell-allowed-row-${rowType}`)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await expect(gmPage.getByTestId("spell-targeting-summary")).toContainText(
      "Eligible rows: Tank, Melee, Ranged, and Support.",
    );
  });

  test("first effect controls the target side for mixed effects", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();
    await spell.addEffect("Barbarian Roar");
    await spell.addEffect("Arcane Damage");

    const summary = gmPage.getByTestId("spell-targeting-summary");
    await expect(summary).toContainText("Target side: Allies, including the caster.");
    await expect(summary).toContainText("first linked effect, Barbarian Roar (Buff)");
    await expect(summary).toContainText("later Damage effects also apply to those allies.");

    await gmPage.getByTestId("spell-effect-move-up-1").click();

    await expect(summary).toContainText("Target side: Enemies.");
    await expect(summary).toContainText("first linked effect, Arcane Damage (Damage)");
    await expect(summary).toContainText("later Buff effects also apply to those enemies.");
  });

  test("Self summary and target scope persist after save and reload", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();
    await spell.fillName("Inner Ward");
    await spell.setTargetPolicy("highest_damage");
    await gmPage.getByTestId("spell-target-scope-select").selectOption("self");
    await gmPage.getByTestId("spell-target-row-count-toggle-4").click();
    await gmPage.getByTestId("spell-max-targets-per-row-input").fill("3");
    await gmPage.getByTestId("spell-target-position-toggle-adjacent").click();
    await gmPage.getByTestId("spell-allowed-row-ranged").click();
    await gmPage.getByTestId("spell-allowed-row-support").click();
    await spell.addEffect("Arcane Damage");
    await spell.saveCreate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-target-scope-select")).toHaveValue("self");
    const summary = gmPage.getByTestId("spell-targeting-summary");
    await expect(summary).toContainText("Eligible rows: Tank and Melee.");
    await expect(summary).toContainText(
      "Self scope selects only the caster when the caster's current row is eligible; otherwise the spell has no target. Row count, per-row limit, position rule, and priority do not add targets.",
    );
    await expect(summary).toContainText(
      "Target side: Caster. Self scope overrides the first effect's normal allegiance; if the caster's current row is eligible, every linked effect applies to the caster.",
    );
    await expect(summary).not.toContainText("occupied eligible rows");
    await expect(summary).not.toContainText("adjacent group");
  });

  test("create a spell targeting a whole row", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Inferno Wave");
    await spell.setTargetPolicy("random");
    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    // "All" toggle should be active, max-targets-per-row input should be hidden or show whole row
    await expect(gmPage.getByTestId("spell-max-targets-per-row-input")).not.toBeVisible();
  });

  test("create a spell with adjacent targeting", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Lightning Chain");
    await spell.setTargetPolicy("highest_damage");
    await gmPage.getByTestId("spell-max-targets-per-row-input").fill("3");
    await gmPage.getByTestId("spell-target-position-toggle-adjacent").click();
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-target-position-toggle-adjacent")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("adjacent requires at least 2 targets per row", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await gmPage.getByTestId("spell-max-targets-per-row-input").fill("1");
    await expect(gmPage.getByTestId("spell-target-position-toggle-adjacent")).toBeDisabled();
  });

  test("adjacent is disabled for whole row targeting", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await expect(gmPage.getByTestId("spell-target-position-toggle-adjacent")).toBeDisabled();
  });

  test("create a spell with row type restrictions", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Tank Buster");
    await spell.setTargetPolicy("highest_health");
    await gmPage.getByTestId("spell-allowed-row-ranged").click();
    await gmPage.getByTestId("spell-allowed-row-support").click();
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-allowed-row-melee")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-allowed-row-tank")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-allowed-row-ranged")).not.toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-allowed-row-support")).not.toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(gmPage.getByTestId("spell-targeting-summary")).toContainText(
      "Eligible rows: Tank and Melee.",
    );
  });

  test("create a spell targeting multiple rows", async ({ gmPage }) => {
    const spell = new SpellWorkspacePage(gmPage);
    await spell.openNew();

    await spell.fillName("Earthquake II");
    await spell.setTargetPolicy("random");
    await gmPage.getByTestId("spell-target-row-count-toggle-2").click();
    await gmPage.getByTestId("per-row-toggle").getByText("All").click();
    await spell.addEffect("Barbarian Roar");

    await spell.saveCreate();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();
    await expect(gmPage.getByTestId("spell-target-row-count-toggle-2")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
