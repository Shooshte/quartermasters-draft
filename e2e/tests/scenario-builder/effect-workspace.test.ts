import { expect, test } from "../db-reset.fixture";

test.describe.configure({ mode: "serial" });

import { BARBARIAN_ROAR_ID } from "../helpers/seed-constants";

test.describe("Effect Workspace CRUD", () => {
  test("interval fields are visible but disabled for instant timing", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();
    await gmPage.getByRole("button", { name: "New Effect" }).click();

    await expect(gmPage.getByTestId("effect-intervalMs-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeVisible();
    await expect(gmPage.getByTestId("effect-intervalMs-input")).toBeDisabled();
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toBeDisabled();
  });

  test("validation blocks save when interval fields are missing", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Effects");
    await gmPage.getByRole("button", { name: "New Effect" }).click();
    await gmPage.getByTestId("entity-name-input").fill("Validation Check");
    await gmPage.getByTestId("effect-timing-type-select").selectOption("interval");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
  });

  test("timing chip background click forwards focus to the native select", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Effects");
    await gmPage.getByRole("button", { name: "New Effect" }).click();

    await gmPage.getByTestId("effect-timing-type-chip").click({
      position: { x: 2, y: 2 },
    });

    await expect(gmPage.getByTestId("effect-timing-type-select")).toBeFocused();
  });

  test("create a new effect from the workspace", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create?tab=Effects");
    await gmPage.getByRole("button", { name: "New Effect" }).click();

    await gmPage.getByTestId("entity-name-input").fill("Aardvark Pulse");
    await gmPage.getByTestId("effect-effect-type-select").selectOption("damage");
    await gmPage.getByTestId("effect-directSpellDmg-input").fill("4.5");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Aardvark Pulse");
    await expect(gmPage).toHaveURL(/effect_id=/);
    await expect(gmPage.getByRole("row", { name: /Aardvark Pulse/ })).toBeVisible();
  });

  test("create a new interval effect", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create?tab=Effects");
    await gmPage.getByRole("button", { name: "New Effect" }).click();

    await gmPage.getByTestId("entity-name-input").fill("Battle Rhythm");
    await gmPage.getByTestId("effect-timing-type-select").selectOption("interval");
    await gmPage.getByTestId("effect-intervalMs-input").fill("1000");
    await gmPage.getByTestId("effect-triggerCount-input").fill("3");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("effect-timing-type-select")).toHaveValue("interval");
    await expect(gmPage.getByTestId("effect-intervalMs-input")).toHaveValue("1000");
    await expect(gmPage.getByTestId("effect-triggerCount-input")).toHaveValue("3");
  });

  test("edit an existing effect and persist changes", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Effects&effect_id=${BARBARIAN_ROAR_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Barbarian Roar Updated");
    await gmPage.getByTestId("effect-effect-type-select").selectOption("debuff");
    await Promise.all([
      gmPage.waitForResponse((response) =>
        response.url().includes("/api/trpc/scenarioBuilder.effects.update") &&
        response.request().method() === "POST" &&
        response.ok(),
      ),
      gmPage.getByTestId("entity-save-button").click(),
    ]);

    await gmPage.reload();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian Roar Updated");
    await expect(gmPage.getByTestId("effect-effect-type-select")).toHaveValue("debuff");
  });

  test("duplicate name shows a save error and preserves form values", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Effects&effect_id=${BARBARIAN_ROAR_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Exhaust");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("entity-save-error")).toBeVisible();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Exhaust");
  });
});
