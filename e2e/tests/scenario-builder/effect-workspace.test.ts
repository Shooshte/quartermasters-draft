// Source of truth: e2e/features/create/effect-workspace.feature
// Cross-reference: deletion scenarios for this feature are covered in
// e2e/tests/scenario-builder/library-effects-tab.test.ts.
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ROAR_ID } from "../helpers/seed-constants";
import { runWorkerSql } from "../helpers/worker-db";
import { EffectWorkspacePage } from "../pages/effect-workspace.page";

const LEGACY_TIMING_EFFECT_ID = "a0000000-0000-0000-0000-000000000099";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.describe("Effect Workspace CRUD", () => {
  test("shows action duration only for instant stat modifiers", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await expect(gmPage.getByTestId("effect-triggerEveryActions-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-triggerEveryActions-input")).toBeDisabled();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeDisabled();
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toHaveCount(0);
    await effect.setEffectType("damage");
    await gmPage.getByTestId("effect-directSpellDmg-input").fill("4");
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toHaveCount(0);
    await effect.setEffectType("buff");
    await gmPage.getByTestId("effect-speed-input").fill("2");
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toBeEnabled();
    await effect.setTimingType("interval");
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toHaveCount(0);
    await expect(
      gmPage.getByText("Trigger every (affected-unit actions)", { exact: true }),
    ).toBeVisible();
    await expect(
      gmPage.getByText("Lasts for (affected-unit actions)", { exact: true }),
    ).toBeVisible();
  });

  test("validation blocks save when interval fields are missing", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();
    await effect.fillName("Validation Check");
    await effect.setTimingType("interval");

    await expect(effect.saveButton).toBeDisabled();
  });

  test("repairs incomplete migrated timing before saving", async ({ gmPage }, testInfo) => {
    await runWorkerSql(
      testInfo.parallelIndex,
      `INSERT INTO effects (id, name, timing_type, effect_type, direct_spell_dmg)
       VALUES ('${LEGACY_TIMING_EFFECT_ID}', 'Legacy Poison', 'interval', 'damage', 2)`,
    );
    const effect = new EffectWorkspacePage(gmPage);

    await effect.openById(LEGACY_TIMING_EFFECT_ID);

    await expect(gmPage.getByRole("alert")).toHaveText("Timing needs configuration");
    await expect(effect.saveButton).toBeDisabled();

    await gmPage.getByTestId("effect-triggerEveryActions-input").fill("2");
    await gmPage.getByTestId("effect-triggerCount-input").fill("3");

    await expect(gmPage.getByRole("alert")).not.toBeVisible();
    await expect(effect.saveButton).toBeEnabled();
    await effect.saveUpdate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("effect-triggerEveryActions-input")).toHaveValue("2");
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toHaveValue("3");
  });

  test("timing chip background click forwards focus to the native select", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await effect.timingTypeChip.click({
      position: { x: 2, y: 2 },
    });

    await expect(effect.timingTypeSelect).toBeFocused();
  });

  test("create a new effect from the workspace @smoke", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await effect.fillName("Aardvark Pulse");
    await effect.setEffectType("damage");
    await gmPage.getByTestId("effect-directSpellDmg-input").fill("4.5");
    await effect.saveCreate();

    await expect(effect.nameInput).toHaveValue("Aardvark Pulse");
    await expect(gmPage).toHaveURL(/effect_id=/);
    await expect(gmPage.getByRole("row", { name: /Aardvark Pulse/ })).toBeVisible();
  });

  test("create a new interval effect", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await effect.fillName("Battle Rhythm");
    await effect.setTimingType("interval");
    await gmPage.getByTestId("effect-triggerEveryActions-input").fill("2");
    await gmPage.getByTestId("effect-triggerCount-input").fill("3");
    await effect.saveCreate();

    await expect(effect.timingTypeSelect).toHaveValue("interval");
    await expect(gmPage.getByTestId("effect-triggerEveryActions-input")).toHaveValue("2");
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toHaveValue("3");
  });

  test("creates and reloads a signed mana capacity modifier", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await effect.fillName("Mana Drain");
    await gmPage.getByTestId("effect-mana-input").fill("-40");
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-lastsForActions-input")).toBeEnabled();
    await gmPage.getByTestId("effect-lastsForActions-input").fill("3");
    await effect.saveCreate();
    await gmPage.reload();

    await expect(gmPage.getByTestId("effect-mana-input")).toHaveValue("-40");
  });

  test("edit an existing effect and persist changes", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openById(BARBARIAN_ROAR_ID);

    await effect.fillName("Barbarian Roar Updated");
    await effect.setEffectType("debuff");
    await effect.saveUpdate();

    await gmPage.reload();

    await expect(effect.nameInput).toHaveValue("Barbarian Roar Updated");
    await expect(effect.effectTypeSelect).toHaveValue("debuff");
  });

  test("duplicate name shows a save error and preserves form values", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openById(BARBARIAN_ROAR_ID);

    await effect.fillName("Exhaust");
    await effect.saveButton.click();

    await expect(effect.saveError).toBeVisible();
    await expect(effect.nameInput).toHaveValue("Exhaust");
  });
});
