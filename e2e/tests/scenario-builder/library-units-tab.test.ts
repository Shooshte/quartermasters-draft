import { test, expect } from "../db-reset.fixture";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

const BARBARIAN_ID = "f0000000-0000-0000-0000-000000000001";
const RANGER_ID = "f0000000-0000-0000-0000-000000000003";
const ZEPHYR_MONK_ID = "f0000000-0000-0000-0000-000000000011";
const BASE = "http://localhost:3000/api/trpc";

/** Helper to delete a unit via the tRPC mutation API */
async function deleteUnitViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.units.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Display", () => {
  test("units are displayed with name and updated at", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    const barbarian = gmPage.getByRole("row", { name: /Barbarian/ });
    await expect(barbarian).toBeVisible();
    await expect(barbarian.getByText("Barbarian")).toBeVisible();

    const ranger = gmPage.getByRole("row", { name: /Ranger/ });
    await expect(ranger).toBeVisible();
    await expect(ranger.getByText("Ranger")).toBeVisible();
  });

  test("empty state is shown when no units exist", async ({
    gmPage,
    resetDb,
  }) => {
    // Delete all 11 units via API
    const unitIds = Array.from(
      { length: 11 },
      (_, i) => `f0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of unitIds) {
      await deleteUnitViaApi(gmPage.request, id);
    }

    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();
    await expect(gmPage.getByTestId("empty-list")).toBeVisible();

    // Restore DB for subsequent tests
    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Pagination", () => {
  test("units are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Page 1 should show 10 units
    const rows = gmPage.locator('tr[aria-selected]');
    await expect(rows).toHaveCount(10);

    // Pagination controls visible
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // First page: "Barbarian" visible (alphabetically first)
    await expect(gmPage.getByRole("row", { name: /Barbarian/ })).toBeVisible();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Second page: only "Zephyr Monk" (alphabetically last)
    await expect(gmPage.getByRole("row", { name: /Zephyr Monk/ })).toBeVisible();
    // Barbarian should no longer be shown
    await expect(gmPage.getByRole("row", { name: /Barbarian/ })).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zephyr Monk/ })).toBeVisible();

    // Go back to page 1
    await gmPage.getByRole("button", { name: "Previous page" }).click();
    await expect(gmPage.getByRole("row", { name: /Barbarian/ })).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zephyr Monk/ })).toBeVisible();

    // Change sort to Updated At
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    // Should be back on page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Alphabetically: Barbarian, Mage, ...
    expect(first).toBe("Barbarian");
    expect(second).toBe("Mage");
  });

  test("sort by name descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Descending: Zephyr Monk, Yeti Rider, ...
    expect(first).toBe("Zephyr Monk");
    expect(second).toBe("Yeti Rider");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Click Updated At to sort ascending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Barbarian was updated before Mage (2025-01-01 vs 2025-02-01)
    expect(first).toBe("Barbarian");
    expect(second).toBe("Mage");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Click Updated At twice: ascending then descending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Zephyr Monk was updated last (2025-11-01)
    expect(first).toBe("Zephyr Monk");
    expect(second).toBe("Yeti Rider");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Default: Name ascending — Barbarian first
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Barbarian",
    );

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Zephyr Monk",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Selection", () => {
  test("select a unit from the list via edit button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    const barbarianRow = gmPage.getByRole("row", { name: "Barbarian" });
    await barbarianRow.getByRole("button", { name: /Edit/ }).click();

    // Selected in list
    await expect(
      gmPage.getByRole("row", { name: "Barbarian" }),
    ).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian",
    );

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`unit_id=${BARBARIAN_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Units Library Tab — Unsaved Changes", () => {
  test("warn before opening a different unit with unsaved changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian",
    );

    // Make changes
    await gmPage.getByTestId("entity-name-input").fill("Barbarian Updated");

    // Try to select Mage via edit button
    const mageRow = gmPage.getByRole("row", { name: "Mage" });
    await mageRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves state
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(
      gmPage.getByRole("row", { name: "Barbarian" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Updated",
    );
  });

  test("discard unsaved changes and open a different unit", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian",
    );

    await gmPage.getByTestId("entity-name-input").fill("Barbarian Updated");
    const mageRow = gmPage.getByRole("row", { name: "Mage" });
    await mageRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(
      gmPage.getByRole("row", { name: "Mage" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Mage",
    );
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Units Library Tab — Deletion", () => {
  test("delete a unit that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();
    await expect(gmPage.getByRole("row", { name: "Ranger" })).toBeVisible();

    // Click delete on Ranger
    const rangerRow = gmPage.getByRole("row", { name: "Ranger" });
    await rangerRow.getByRole("button", { name: /Delete/ }).click();

    // Confirmation dialog
    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();

    // Confirm
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Ranger gone
    await expect(gmPage.getByRole("row", { name: "Ranger" })).not.toBeVisible();

    // Workspace should remain idle
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("cancel deletion of a unit", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    const rangerRow = gmPage.getByRole("row", { name: "Ranger" });
    await rangerRow.getByRole("button", { name: /Delete/ }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Cancel" }).click();

    // Ranger should still be visible
    await expect(gmPage.getByRole("row", { name: "Ranger" })).toBeVisible();
  });

  test("delete the currently open unit", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian",
    );

    const barbarianRow = gmPage.getByRole("row", { name: "Barbarian" });
    await barbarianRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be gone from list
    await expect(gmPage.getByRole("row", { name: "Barbarian" })).not.toBeVisible();

    // Workspace cleared
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();

    // URL should not contain unit_id
    expect(gmPage.url()).not.toContain("unit_id");
  });

  test("deleting the last unit on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Units" }).click();

    // Verify we have 2 pages
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(10);

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Only Zephyr Monk on page 2
    await expect(gmPage.getByRole("row", { name: /Zephyr Monk/ })).toBeVisible();
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(1);

    // Delete it
    const zephyrMonkRow = gmPage.getByRole("row", { name: /Zephyr Monk/ });
    await zephyrMonkRow.getByRole("button", { name: /Delete/ }).click();
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be returned to page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(gmPage.getByRole("row", { name: /Barbarian/ })).toBeVisible();
    await expect(gmPage.getByRole("row", { name: /Zephyr Monk/ })).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
