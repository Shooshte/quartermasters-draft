export const TABS = ["Effects", "Spells", "Items", "Units", "Scenarios"] as const;
export type TabName = (typeof TABS)[number];
export const DEFAULT_TAB: TabName = "Scenarios";

export const ENTITY_TABS = ["Effects", "Spells", "Items", "Units"] as const;
export type EntityTab = (typeof ENTITY_TABS)[number];

export const TAB_TO_ROUTER_KEY = {
  Effects: "effects",
  Spells: "spells",
  Items: "items",
  Units: "units",
  Scenarios: "scenarios",
} as const;

export const ENTITY_TYPE_TO_TAB = {
  effect: "Effects",
  spell: "Spells",
  item: "Items",
  unit: "Units",
} as const satisfies Record<string, EntityTab>;

export type EntityType = keyof typeof ENTITY_TYPE_TO_TAB;

export const TAB_TO_ENTITY_TYPE: Record<EntityTab, EntityType> = {
  Effects: "effect",
  Spells: "spell",
  Items: "item",
  Units: "unit",
};

export const TAB_TO_SINGULAR: Record<TabName, string> = {
  Effects: "Effect",
  Spells: "Spell",
  Items: "Item",
  Units: "Unit",
  Scenarios: "Scenario",
};

export const SCENARIOS_PAGE_SIZE = 10;
export type ScenarioSortBy = "name" | "updatedAt";
export type ScenarioSortDir = "asc" | "desc";

export const EFFECTS_PAGE_SIZE = 10;
export type EffectSortBy = "name" | "timingType" | "effectType";
export type EffectSortDir = "asc" | "desc";

export const SPELLS_PAGE_SIZE = 10;
export type SpellSortBy = "name" | "targetPolicy";
export type SpellSortDir = "asc" | "desc";

export const ITEMS_PAGE_SIZE = 10;
export type ItemSortBy = "name" | "updatedAt";
export type ItemSortDir = "asc" | "desc";

export const UNITS_PAGE_SIZE = 10;
export type UnitSortBy = "name" | "updatedAt";
export type UnitSortDir = "asc" | "desc";

export type WorkspaceMode = "idle" | "loading" | "create" | "edit" | "not-found";

export interface WorkspaceState {
  mode: WorkspaceMode;
  entityType: EntityType | "scenario" | null;
  entityId: string | null;
  data: { name: string; [key: string]: unknown } | null;
  formValues: { name?: string; [key: string]: unknown };
  isDirty: boolean;
}

export function createIdleWorkspace(): WorkspaceState {
  return {
    mode: "idle",
    entityType: null,
    entityId: null,
    data: null,
    formValues: {},
    isDirty: false,
  };
}

export function isValidTab(value: unknown): value is TabName {
  return typeof value === "string" && (TABS as readonly string[]).includes(value);
}

export function isEntityTab(tab: TabName): tab is EntityTab {
  return (ENTITY_TABS as readonly string[]).includes(tab);
}
