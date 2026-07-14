// Source of truth: e2e/features/create/effect-workspace.feature
// Cross-reference: deletion scenarios for this feature are covered in
// e2e/tests/scenario-builder/library-effects-tab.test.ts.
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ROAR_ID } from "../helpers/seed-constants";
import { EffectWorkspacePage } from "../pages/effect-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.describe("Effect Workspace CRUD", () => {
  test("interval fields are visible but disabled for instant timing", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();

    await expect(gmPage.getByTestId("effect-intervalTicks-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-intervalTicks-input")).toBeDisabled();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeDisabled();
    await expect(gmPage.getByText("Interval (ticks)", { exact: true })).toBeVisible();
    await expect(gmPage.getByText("Duration (ticks)", { exact: true })).toBeVisible();
  });

  test("validation blocks save when interval fields are missing", async ({ gmPage }) => {
    const effect = new EffectWorkspacePage(gmPage);
    await effect.openNew();
    await effect.fillName("Validation Check");
    await effect.setTimingType("interval");

    await expect(effect.saveButton).toBeDisabled();
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
    await gmPage.getByTestId("effect-intervalTicks-input").fill("1000");
    await gmPage.getByTestId("effect-durationTicks-input").fill("2500");
    await gmPage.getByTestId("effect-triggerCount-input").fill("3");
    await effect.saveCreate();

    await expect(effect.timingTypeSelect).toHaveValue("interval");
    await expect(gmPage.getByTestId("effect-intervalTicks-input")).toHaveValue("1000");
    await expect(gmPage.getByTestId("effect-durationTicks-input")).toHaveValue("2500");
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toHaveValue("3");
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
