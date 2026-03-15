import { test, expect } from "../auth/auth.fixtures";

// Seed entity IDs
const BARBARIAN_ROAR_ID = "a0000000-0000-0000-0000-000000000001";
const FIREBALL_ID = "b0000000-0000-0000-0000-000000000001";
const BATTLE_CRY_ID = "b0000000-0000-0000-0000-000000000002";
const IRON_SWORD_ID = "d0000000-0000-0000-0000-000000000001";
const BARBARIAN_ID = "f0000000-0000-0000-0000-000000000001";
const AMBUSH_AT_DAWN_ID = "a2000000-0000-0000-0000-000000000001";
const CASTLE_SIEGE_ID = "a2000000-0000-0000-0000-000000000002";
const UNKNOWN_UUID = "00000000-0000-0000-0000-000000000099";

// ─── Core Shell Layout ───────────────────────────────────────────────────────

test.describe("Create Shell — Layout", () => {
  test("shows entity workspace, scenario workspace, and tabbed library", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await expect(gmPage.getByTestId("entity-workspace")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-workspace")).toBeVisible();
    await expect(gmPage.getByTestId("library-panel")).toBeVisible();
    for (const tab of ["Effects", "Spells", "Items", "Units", "Scenarios"]) {
      await expect(gmPage.getByRole("tab", { name: tab })).toBeVisible();
    }
  });
});

// ─── URL Parameters ──────────────────────────────────────────────────────────

test.describe("Create Shell — URL Parameters", () => {
  test("no params: Scenarios tab selected, workspaces idle", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await expect(
      gmPage.getByRole("tab", { name: "Scenarios" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
  });

  test("tab=Spells: Spells tab selected", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Spells");
    await expect(
      gmPage.getByRole("tab", { name: "Spells" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
  });

  test("scenario_id: loads scenario in workspace", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Scenarios" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );
    // Scenario should be selected in library
    await expect(
      gmPage.getByRole("row", { name: "Ambush at Dawn" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("entity_id (effect): auto-selects Effects tab and loads entity", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?entity_id=${BARBARIAN_ROAR_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Effects" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar",
    );
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
  });

  test("entity_id (spell): auto-selects Spells tab and loads entity", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?entity_id=${FIREBALL_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Spells" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
  });

  test("entity_id (item): auto-selects Items tab and loads entity", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?entity_id=${IRON_SWORD_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Items" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );
  });

  test("entity_id (unit): auto-selects Units tab and loads entity", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?entity_id=${BARBARIAN_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Units" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian",
    );
  });

  test("tab=Spells + scenario_id: Spells tab with scenario loaded", async ({
    gmPage,
  }) => {
    await gmPage.goto(
      `/create?tab=Spells&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(
      gmPage.getByRole("tab", { name: "Spells" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("tab + matching entity_id: correct tab and entity loaded", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Spells" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
    await expect(
      gmPage.getByRole("option", { name: "Fireball" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("tab + entity_id + scenario_id: all three loaded", async ({
    gmPage,
  }) => {
    await gmPage.goto(
      `/create?tab=Items&entity_id=${IRON_SWORD_ID}&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(
      gmPage.getByRole("tab", { name: "Items" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );
  });

  test("tab mismatch: entity loaded but not selected in library", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Items&entity_id=${BATTLE_CRY_ID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Items" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Battle Cry",
    );
    // No item should be selected
    const options = gmPage.getByRole("option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      await expect(options.nth(i)).toHaveAttribute("aria-selected", "false");
    }
  });

  test("invalid tab falls back to Scenarios", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Unknown");
    await expect(
      gmPage.getByRole("tab", { name: "Scenarios" }),
    ).toHaveAttribute("data-state", "active");
  });

  test("unknown entity_id shows not-found", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${UNKNOWN_UUID}`);
    await expect(
      gmPage.getByRole("tab", { name: "Spells" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-not-found")).toBeVisible();
  });

  test("unknown scenario_id shows not-found", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${UNKNOWN_UUID}`);
    await expect(gmPage.getByTestId("scenario-not-found")).toBeVisible();
  });
});

// ─── Browsing by Tab ─────────────────────────────────────────────────────────

test.describe("Create Shell — Browsing by Tab", () => {
  const entityTabTests = [
    { tab: "Effects", records: ["Barbarian Roar", "Rage"], singular: "Effect" },
    { tab: "Spells", records: ["Battle Cry", "Fireball"], singular: "Spell" },
    { tab: "Items", records: ["Iron Sword", "Oak Staff"], singular: "Item" },
    { tab: "Units", records: ["Barbarian", "Mage"], singular: "Unit" },
  ] as const;

  for (const { tab, records, singular } of entityTabTests) {
    test(`${tab} tab shows records and New button`, async ({ gmPage }) => {
      await gmPage.goto("/create");
      await gmPage.getByRole("tab", { name: tab }).click();
      await expect(gmPage.getByRole("tab", { name: tab })).toHaveAttribute(
        "data-state",
        "active",
      );
      for (const name of records) {
        await expect(gmPage.getByRole("option", { name })).toBeVisible();
      }
      await expect(
        gmPage.getByRole("button", { name: `New ${singular}` }),
      ).toBeVisible();
    });
  }

  test("Scenarios tab shows records and New button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );
    for (const name of ["Ambush at Dawn", "Castle Siege"]) {
      await expect(gmPage.getByRole("row", { name })).toBeVisible();
    }
    await expect(
      gmPage.getByRole("button", { name: "New Scenario" }),
    ).toBeVisible();
  });
});

// ─── Tab Switching Memory ────────────────────────────────────────────────────

test.describe("Create Shell — Tab Switching Memory", () => {
  test("switching back to a tab restores the selected record", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");

    // Select Fireball on Spells tab
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage.getByRole("option", { name: "Fireball" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    // Select Iron Sword on Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await gmPage.getByRole("option", { name: "Iron Sword" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );

    // Switch back to Spells
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(
      gmPage.getByRole("option", { name: "Fireball" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("switching tabs does not clear loaded workspaces", async ({
    gmPage,
  }) => {
    await gmPage.goto(
      `/create?tab=Spells&entity_id=${FIREBALL_ID}&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    // Switch to Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(
      gmPage.getByRole("tab", { name: "Items" }),
    ).toHaveAttribute("data-state", "active");
    // Workspaces should still show the loaded data
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );
  });
});

// ─── Record Selection ────────────────────────────────────────────────────────

test.describe("Create Shell — Record Selection", () => {
  const entityTests = [
    { tab: "Effects", name: "Barbarian Roar" },
    { tab: "Spells", name: "Fireball" },
    { tab: "Items", name: "Iron Sword" },
    { tab: "Units", name: "Barbarian" },
  ] as const;

  for (const { tab, name } of entityTests) {
    test(`selecting ${name} on ${tab} tab loads entity workspace`, async ({
      gmPage,
    }) => {
      // Pre-load a scenario first
      await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
        "Ambush at Dawn",
      );

      await gmPage.getByRole("tab", { name: tab }).click();
      await gmPage.getByRole("option", { name }).click();

      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(name);
      await expect(
        gmPage.getByRole("option", { name }),
      ).toHaveAttribute("aria-selected", "true");
      // Scenario workspace unchanged
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
        "Ambush at Dawn",
      );
    });
  }

  test("selecting a scenario loads scenario workspace only", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    const ambushRow = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );
    // Entity workspace unchanged
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
  });
});

// ─── Create Actions ──────────────────────────────────────────────────────────

test.describe("Create Shell — Create Actions", () => {
  const entityTests = [
    { tab: "Effects", singular: "Effect", record: "Barbarian Roar" },
    { tab: "Spells", singular: "Spell", record: "Fireball" },
    { tab: "Items", singular: "Item", record: "Iron Sword" },
    { tab: "Units", singular: "Unit", record: "Barbarian" },
  ] as const;

  for (const { tab, singular, record } of entityTests) {
    test(`New ${singular} clears selection and opens create mode`, async ({
      gmPage,
    }) => {
      await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
        "Ambush at Dawn",
      );

      await gmPage.getByRole("tab", { name: tab }).click();
      await gmPage.getByRole("option", { name: record }).click();
      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
        record,
      );

      await gmPage
        .getByRole("button", { name: `New ${singular}` })
        .click();
      // Selection cleared
      const options = gmPage
        .getByRole("tabpanel")
        .getByRole("option");
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        await expect(options.nth(i)).toHaveAttribute(
          "aria-selected",
          "false",
        );
      }
      // Entity workspace in create mode with empty name
      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("");
      // Scenario workspace unchanged
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
        "Ambush at Dawn",
      );
    });
  }

  test("New Scenario clears selection and opens create mode with 4 rows", async ({
    gmPage,
  }) => {
    await gmPage.goto(
      `/create?tab=Spells&entity_id=${FIREBALL_ID}`,
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    const ambushRow2 = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow2.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage.getByRole("button", { name: "New Scenario" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("");
    await expect(gmPage.getByTestId("scenario-row-tank")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-melee")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-ranged")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-support")).toBeVisible();
    // Entity workspace unchanged
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );
  });
});

// ─── Unsaved Changes ─────────────────────────────────────────────────────────

test.describe("Create Shell — Unsaved Changes", () => {
  test("switching tabs does NOT warn on unsaved entity changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // No dialog
    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).not.toBeVisible();
    await expect(
      gmPage.getByRole("tab", { name: "Items" }),
    ).toHaveAttribute("data-state", "active");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball Updated",
    );
  });

  test("switching tabs does NOT warn on unsaved scenario changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage
      .getByTestId("scenario-name-input")
      .fill("Ambush at Dawn Updated");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).not.toBeVisible();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn Updated",
    );
  });

  test("warn before selecting different entity with unsaved changes, cancel preserves", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("option", { name: "Battle Cry" }).click();

    // Dialog appears
    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();

    // Cancel
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).not.toBeVisible();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball Updated",
    );
    await expect(
      gmPage.getByRole("option", { name: "Fireball" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("discard unsaved entity changes and load different entity", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("option", { name: "Battle Cry" }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Battle Cry",
    );
    await expect(
      gmPage.getByRole("option", { name: "Battle Cry" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("warn before New Spell with unsaved changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();

    // Cancel preserves
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball Updated",
    );
  });

  test("warn before New Item (different type) with unsaved entity changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    // Switch to Items tab (no warning)
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).not.toBeVisible();

    // Click New Item (warning!)
    await gmPage.getByRole("button", { name: "New Item" }).click();
    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();

    // Cancel preserves
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball Updated",
    );
  });

  test("warn before selecting different scenario with unsaved changes, cancel preserves", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage
      .getByTestId("scenario-name-input")
      .fill("Ambush at Dawn Updated");
    const castleRow = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow.getByRole("button", { name: /Edit/ }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn Updated",
    );
    await expect(
      gmPage.getByRole("row", { name: "Ambush at Dawn" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("discard unsaved scenario changes and load different scenario", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage
      .getByTestId("scenario-name-input")
      .fill("Ambush at Dawn Updated");
    const castleRow2 = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow2.getByRole("button", { name: /Edit/ }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Castle Siege",
    );
    await expect(
      gmPage.getByRole("row", { name: "Castle Siege" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("warn before New Scenario with unsaved changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage
      .getByTestId("scenario-name-input")
      .fill("Ambush at Dawn Updated");
    await gmPage.getByRole("button", { name: "New Scenario" }).click();

    await expect(
      gmPage.getByTestId("unsaved-changes-dialog"),
    ).toBeVisible();

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn Updated",
    );
  });
});
