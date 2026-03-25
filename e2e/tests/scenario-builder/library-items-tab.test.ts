import { test, expect } from "../db-reset.fixture";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

const IRON_SWORD_ID = "d0000000-0000-0000-0000-000000000001";
const LEATHER_SHIELD_ID = "d0000000-0000-0000-0000-000000000003";
const WYRM_SCALE_ID = "d0000000-0000-0000-0000-000000000011";
const BASE = "http://localhost:3000/api/trpc";

/** Helper to delete an item via the tRPC mutation API */
async function deleteItemViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.items.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Display", () => {
  test("items are displayed with name and updated at", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    const ironSword = gmPage.getByRole("row", { name: /Iron Sword/ });
    await expect(ironSword).toBeVisible();
    await expect(ironSword.getByText("Iron Sword")).toBeVisible();

    const oakStaff = gmPage.getByRole("row", { name: /Oak Staff/ });
    await expect(oakStaff).toBeVisible();
    await expect(oakStaff.getByText("Oak Staff")).toBeVisible();
  });

  test("empty state is shown when no items exist", async ({
    gmPage,
    resetDb,
  }) => {
    // Delete all 11 items via API
    const itemIds = Array.from(
      { length: 11 },
      (_, i) => `d0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of itemIds) {
      await deleteItemViaApi(gmPage.request, id);
    }

    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByTestId("empty-list")).toBeVisible();

    // Restore DB for subsequent tests
    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Pagination", () => {
  test("items are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Page 1 should show 10 items
    const rows = gmPage.locator('tr[aria-selected]');
    await expect(rows).toHaveCount(10);

    // Pagination controls visible
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // First page: "Iron Sword" visible (alphabetically first)
    await expect(gmPage.getByRole("row", { name: /Iron Sword/ })).toBeVisible();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Second page: only "Wyrm Scale" (alphabetically last)
    await expect(gmPage.getByRole("row", { name: /Wyrm Scale/ })).toBeVisible();
    // Iron Sword should no longer be shown
    await expect(gmPage.getByRole("row", { name: /Iron Sword/ })).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Wyrm Scale/ })).toBeVisible();

    // Go back to page 1
    await gmPage.getByRole("button", { name: "Previous page" }).click();
    await expect(gmPage.getByRole("row", { name: /Iron Sword/ })).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Wyrm Scale/ })).toBeVisible();

    // Change sort to Updated At
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    // Should be back on page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Alphabetically: Iron Sword, Leather Shield, ...
    expect(first).toBe("Iron Sword");
    expect(second).toBe("Leather Shield");
  });

  test("sort by name descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Descending: Wyrm Scale, Venom Blade, ...
    expect(first).toBe("Wyrm Scale");
    expect(second).toBe("Venom Blade");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Click Updated At to sort ascending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Iron Sword was updated before Oak Staff (2025-01-01 vs 2025-02-01)
    expect(first).toBe("Iron Sword");
    expect(second).toBe("Oak Staff");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Click Updated At twice: ascending then descending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Wyrm Scale was updated last (2025-11-01)
    expect(first).toBe("Wyrm Scale");
    expect(second).toBe("Venom Blade");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Default: Name ascending — Iron Sword first
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Iron Sword",
    );

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Wyrm Scale",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Selection", () => {
  test("select an item from the list via edit button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    const ironSwordRow = gmPage.getByRole("row", { name: "Iron Sword" });
    await ironSwordRow.getByRole("button", { name: /Edit/ }).click();

    // Selected in list
    await expect(
      gmPage.getByRole("row", { name: "Iron Sword" }),
    ).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`item_id=${IRON_SWORD_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Items Library Tab — Unsaved Changes", () => {
  test("warn before opening a different item with unsaved changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Items&item_id=${IRON_SWORD_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );

    // Make changes
    await gmPage.getByTestId("entity-name-input").fill("Iron Sword Updated");

    // Try to select Leather Shield via edit button
    const leatherShieldRow = gmPage.getByRole("row", { name: "Leather Shield" });
    await leatherShieldRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves state
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(
      gmPage.getByRole("row", { name: "Iron Sword" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword Updated",
    );
  });

  test("discard unsaved changes and open a different item", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Items&item_id=${IRON_SWORD_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );

    await gmPage.getByTestId("entity-name-input").fill("Iron Sword Updated");
    const leatherShieldRow = gmPage.getByRole("row", { name: "Leather Shield" });
    await leatherShieldRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(
      gmPage.getByRole("row", { name: "Leather Shield" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Leather Shield",
    );
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Items Library Tab — Deletion", () => {
  test("delete an item that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByRole("row", { name: "Leather Shield" })).toBeVisible();

    // Click delete on Leather Shield
    const leatherShieldRow = gmPage.getByRole("row", { name: "Leather Shield" });
    await leatherShieldRow.getByRole("button", { name: /Delete/ }).click();

    // Confirmation dialog
    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();

    // Confirm
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Leather Shield gone
    await expect(gmPage.getByRole("row", { name: "Leather Shield" })).not.toBeVisible();

    // Workspace should remain idle
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("cancel deletion of an item", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    const leatherShieldRow = gmPage.getByRole("row", { name: "Leather Shield" });
    await leatherShieldRow.getByRole("button", { name: /Delete/ }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Cancel" }).click();

    // Leather Shield should still be visible
    await expect(gmPage.getByRole("row", { name: "Leather Shield" })).toBeVisible();
  });

  test("delete the currently open item", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Items&item_id=${IRON_SWORD_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Iron Sword",
    );

    const ironSwordRow = gmPage.getByRole("row", { name: "Iron Sword" });
    await ironSwordRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be gone from list
    await expect(gmPage.getByRole("row", { name: "Iron Sword" })).not.toBeVisible();

    // Workspace cleared
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();

    // URL should not contain item_id
    expect(gmPage.url()).not.toContain("item_id");
  });

  test("deleting the last item on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // Verify we have 2 pages
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(10);

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Only Wyrm Scale on page 2
    await expect(gmPage.getByRole("row", { name: /Wyrm Scale/ })).toBeVisible();
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(1);

    // Delete it
    const wyrmScaleRow = gmPage.getByRole("row", { name: /Wyrm Scale/ });
    await wyrmScaleRow.getByRole("button", { name: /Delete/ }).click();
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be returned to page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(gmPage.getByRole("row", { name: /Iron Sword/ })).toBeVisible();
    await expect(gmPage.getByRole("row", { name: /Wyrm Scale/ })).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
