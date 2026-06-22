/**
 * Shared workspace helper functions for e2e tests.
 * Encapsulates common interaction patterns used across workspace test files.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Navigate to /create, switch to the given tab, and click the "New {entity}" button.
 *
 * @example openNewEntity(page, "Items", "New Item")
 */
export async function openNewEntity(
  page: Page,
  tabName: string,
  buttonName: string,
): Promise<void> {
  await page.goto("/create");
  await page.getByRole("tab", { name: tabName }).click();
  await page.getByRole("button", { name: buttonName }).click();
}

// ─── Save ────────────────────────────────────────────────────────────────────

/**
 * Click the save button and wait for the corresponding tRPC mutation response.
 *
 * @param entityType - The tRPC entity namespace (e.g. "items", "units")
 * @param mutation - "create" or "update"
 * @param opts.saveButtonTestId - Override save button test ID (default: "entity-save-button")
 */
export async function saveEntityAndWait(
  page: Page,
  entityType: "effects" | "spells" | "items" | "units" | "scenarios",
  mutation: "create" | "update",
  opts?: { saveButtonTestId?: string },
): Promise<void> {
  const buttonTestId = opts?.saveButtonTestId ?? "entity-save-button";
  const saveButton = page.getByTestId(buttonTestId);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(`/api/trpc/scenarioBuilder.${entityType}.${mutation}`) &&
        response.request().method() === "POST" &&
        response.ok(),
    ),
    saveButton.click(),
  ]);
  await expect(saveButton).toBeEnabled();
}

// ─── Stats ───────────────────────────────────────────────────────────────────

/**
 * Assert that all stat input fields match the expected values.
 *
 * @param prefix - Test ID prefix ("item" or "unit")
 * @param values - Map of stat field name → expected string value
 *
 * @example expectAllStats(page, "item", { meleeDmg: "0", rangedDmg: "5.5" })
 */
export async function expectAllStats(
  page: Page,
  prefix: string,
  values: Record<string, string>,
): Promise<void> {
  for (const [field, value] of Object.entries(values)) {
    await expect(page.getByTestId(`${prefix}-${field}-input`)).toHaveValue(value);
  }
}

// ─── Entity Pickers ──────────────────────────────────────────────────────────

/**
 * Add a linked entity via the picker popover (used for spell→effect, item→spell, unit→item links).
 *
 * @param pickerTestId    - Test ID of the picker trigger (e.g. "item-spell-picker")
 * @param searchTestId    - Test ID of the search input (e.g. "item-spell-picker-search")
 * @param addButtonTestId - Test ID of the add button (e.g. "item-add-spell-button")
 * @param entityName      - Display name of the entity to select
 * @param search          - Optional search text (defaults to entityName)
 */
export async function addLinkedEntity(
  page: Page,
  pickerTestId: string,
  searchTestId: string,
  addButtonTestId: string,
  entityName: string,
  search?: string,
): Promise<void> {
  await page.getByTestId(pickerTestId).click();
  await page.getByTestId(searchTestId).fill(search ?? entityName);
  await expect(page.getByRole("option", { name: entityName })).toBeVisible();
  await page.getByRole("option", { name: entityName }).click();
  await page.getByTestId(addButtonTestId).click();
}
