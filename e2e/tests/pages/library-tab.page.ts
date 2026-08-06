/**
 * Page Object Model for library tab interactions on the /create page.
 *
 * All four library tabs (Effects, Items, Units, Scenarios) share
 * identical UI interaction patterns for pagination, sorting, selection,
 * unsaved changes, and deletion. This page object encapsulates those shared
 * interactions, parameterized by a LibraryTabConfig.
 */
import { expect, type Locator, type Page } from "@playwright/test";

export interface LibraryTabConfig {
  /** Tab label displayed in the UI (e.g. "Effects", "Scenarios") */
  tabName: string;
  /** tRPC entity namespace (e.g. "effects", "scenarios") */
  entityType: string;
  /** URL search param name for the entity ID (e.g. "effect_id", "scenario_id") */
  idParamName: string;
  /** Test ID for the entity name input (e.g. "entity-name-input" or "scenario-name-input") */
  nameInputTestId: string;
  /** Test ID for the idle/empty workspace state (e.g. "entity-idle" or "scenario-idle") */
  idleTestId: string;
}

export class LibraryTabPage {
  readonly page: Page;
  readonly config: LibraryTabConfig;

  constructor(page: Page, config: LibraryTabConfig) {
    this.page = page;
    this.config = config;
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  /** Navigate to /create and click the tab */
  async navigateToTab(): Promise<void> {
    await this.page.goto("/create");
    await this.page.getByRole("tab", { name: this.config.tabName }).click();
    await this.waitForActiveTab();
  }

  /** Navigate to /create with a specific entity loaded via URL param */
  async navigateWithEntity(entityId: string): Promise<void> {
    await this.page.goto(
      `/create?tab=${this.config.tabName}&${this.config.idParamName}=${entityId}`,
    );
    await this.waitForActiveTab();
  }

  /** Wait for the configured tab and its panel to be active */
  async waitForActiveTab(): Promise<void> {
    await expect(this.page.getByRole("tab", { name: this.config.tabName })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const panel = this.page.getByRole("tabpanel", { name: this.config.tabName });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Loading...")).not.toBeVisible({ timeout: 15_000 });
  }

  /** Run an action that should refetch the active library list and wait for the response */
  async waitForListRefetch(action: () => Promise<void>): Promise<void> {
    const procedureName = `scenarioBuilder.${this.config.entityType}.list`;
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes(procedureName) && response.ok(),
      { timeout: 15_000 },
    );

    await action();
    await responsePromise;
    await this.waitForActiveTab();
  }

  // ─── Row Access ──────────────────────────────────────────────────────────

  /** Get a specific row by entity name */
  getRow(name: string): Locator {
    return this.page.getByRole("row", { name });
  }

  /** Get all selectable rows (tr[aria-selected]) */
  get rows(): Locator {
    return this.page.locator("tr[aria-selected]");
  }

  /** Get the empty list state element */
  get emptyList(): Locator {
    return this.page.getByTestId("empty-list");
  }

  // ─── Pagination ──────────────────────────────────────────────────────────

  /** Next page button locator */
  get nextPageButton(): Locator {
    return this.page.getByRole("button", { name: "Next page" });
  }

  /** Previous page button locator */
  get prevPageButton(): Locator {
    return this.page.getByRole("button", { name: "Previous page" });
  }

  /** Click the "Next page" button */
  async clickNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  /** Click the "Previous page" button */
  async clickPrevPage(): Promise<void> {
    await this.prevPageButton.click();
  }

  // ─── Sorting ─────────────────────────────────────────────────────────────

  /** Click a sort column header button */
  async clickSortColumn(columnName: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(columnName) }).click();
  }

  // ─── Linkage Filtering ───────────────────────────────────────────────────

  /** Show all entities in the explorer */
  async showAllEntities(): Promise<void> {
    await this.waitForActiveTab();
    await this.page.getByRole("button", { name: "All", exact: true }).click();
    await this.waitForActiveTab();
  }

  /** Show entities linked anywhere in the explorer */
  async filterToLinkedEntities(): Promise<void> {
    await this.waitForActiveTab();
    await this.waitForListRefetch(() =>
      this.page.getByRole("button", { name: "Linked", exact: true }).click(),
    );
  }

  /** Show entities not linked anywhere in the explorer */
  async filterToUnlinkedEntities(): Promise<void> {
    await this.waitForActiveTab();
    await this.waitForListRefetch(() =>
      this.page.getByRole("button", { name: "Unlinked", exact: true }).click(),
    );
  }

  /** Show entities linked to a selected scenario */
  async filterToScenario(scenarioName: string): Promise<void> {
    await this.waitForActiveTab();
    await this.waitForListRefetch(async () => {
      await this.page.getByLabel("Filter by scenario").selectOption({ label: scenarioName });
    });
  }

  // ─── Selection ───────────────────────────────────────────────────────────

  /** Click the edit button on a row to select/load the entity */
  async editEntity(entityName: string): Promise<void> {
    const row = this.getRow(entityName);
    await row.getByRole("button", { name: /Edit/ }).click();
  }

  // ─── Workspace Locators ──────────────────────────────────────────────────

  /** The name input in the workspace */
  get nameInput(): Locator {
    return this.page.getByTestId(this.config.nameInputTestId);
  }

  /** The idle/empty workspace state */
  get idleState(): Locator {
    return this.page.getByTestId(this.config.idleTestId);
  }

  // ─── Unsaved Changes Dialog ──────────────────────────────────────────────

  /** The unsaved changes dialog locator */
  get unsavedChangesDialog(): Locator {
    return this.page.getByTestId("unsaved-changes-dialog");
  }

  /** Click Cancel in the unsaved changes dialog */
  async cancelUnsavedChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  /** Click Discard in the unsaved changes dialog */
  async discardUnsavedChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Discard" }).click();
    await expect(this.unsavedChangesDialog).not.toBeVisible();
  }

  // ─── Deletion ────────────────────────────────────────────────────────────

  /** Click the delete button on a row */
  async clickDeleteOnRow(entityName: string): Promise<void> {
    const row = this.getRow(entityName);
    await row.getByRole("button", { name: /Delete/ }).click();
  }

  /** The delete confirmation dialog locator */
  get deleteConfirmDialog(): Locator {
    return this.page.getByTestId("delete-confirm-dialog");
  }

  /** Confirm deletion in the dialog */
  async confirmDeletion(): Promise<void> {
    await this.page.getByRole("button", { name: "Delete" }).click();
  }

  /** Cancel deletion in the dialog */
  async cancelDeletion(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }
}
