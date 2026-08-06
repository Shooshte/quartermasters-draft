/**
 * Per-entity configurations for the LibraryTabPage page object.
 */
import type { LibraryTabConfig } from "./library-tab.page";

export const EFFECTS_TAB: LibraryTabConfig = {
  tabName: "Effects",
  entityType: "effects",
  idParamName: "effect_id",
  nameInputTestId: "entity-name-input",
  idleTestId: "entity-idle",
};

export const ITEMS_TAB: LibraryTabConfig = {
  tabName: "Items",
  entityType: "items",
  idParamName: "item_id",
  nameInputTestId: "entity-name-input",
  idleTestId: "entity-idle",
};

export const UNITS_TAB: LibraryTabConfig = {
  tabName: "Units",
  entityType: "units",
  idParamName: "unit_id",
  nameInputTestId: "entity-name-input",
  idleTestId: "entity-idle",
};

export const SCENARIOS_TAB: LibraryTabConfig = {
  tabName: "Scenarios",
  entityType: "scenarios",
  idParamName: "scenario_id",
  nameInputTestId: "scenario-name-input",
  idleTestId: "scenario-idle",
};
