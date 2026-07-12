import type {
  EffectSortBy,
  ItemSortBy,
  ScenarioSortBy,
  SpellSortBy,
  TabName,
  UnitSortBy,
  WorkspaceState,
} from "./types";

export interface SaveController {
  save(): Promise<void>;
  isSaving: boolean;
  error: string | null;
}

export interface ListController<TItem, TSortBy extends string> {
  items: TItem[];
  page: number;
  totalPages: number;
  sortBy: TSortBy;
  sortDir: "asc" | "desc";
  setPage(page: number): void;
  setSort(sortBy: TSortBy, sortDir: "asc" | "desc"): void;
}

export interface DeletionController {
  isOpen: boolean;
  target: { id: string; name: string } | null;
  error: string | null;
  request(id: string, name: string): void;
  confirm(): void;
  cancel(): void;
}

export interface DomainController<TItem, TSortBy extends string> {
  list: ListController<TItem, TSortBy>;
  deletion: DeletionController;
}

export interface GroupedCreatePageState {
  workspaces: {
    entity: WorkspaceState;
    scenario: WorkspaceState;
    updateEntityField(field: string, value: unknown): void;
    updateScenarioField(field: string, value: unknown): void;
  };
  domains: {
    effects: DomainController<
      { id: string; name: string; timingType: string; effectType: string; updatedAt: Date },
      EffectSortBy
    >;
    spells: DomainController<
      { id: string; name: string; targetPolicy: string; updatedAt: Date },
      SpellSortBy
    >;
    items: DomainController<{ id: string; name: string; updatedAt: Date }, ItemSortBy>;
    units: DomainController<{ id: string; name: string; updatedAt: Date }, UnitSortBy>;
    scenarios: DomainController<
      { id: string; name: string; updatedAt: Date; createdAt: Date },
      ScenarioSortBy
    >;
  };
  navigation: {
    perTabSelection: Record<TabName, string | null>;
    selectRecord(tab: TabName, id: string): void;
    createNew(tab: TabName): void;
    discard: {
      isOpen: boolean;
      confirm(): void;
      cancel(): void;
    };
  };
  entitySave: SaveController;
  scenarioSave: SaveController;
  options: {
    effects: { id: string; name: string; effectType: string }[];
    spells: { id: string; name: string; targetPolicy?: string }[];
    items: { id: string; name: string }[];
    scenarioUnits: { id: string; name: string }[];
    scenarioFilters: { id: string; name: string }[];
  };
}
