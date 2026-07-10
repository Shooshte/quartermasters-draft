import { trpc } from "~/lib/trpc";
import { createDefaultEffectFormValues, effectRecordToFormValues } from "./effect-form";
import { createDefaultItemFormValues, isItemFormDirty, itemRecordToFormValues } from "./item-form";
import {
  createDefaultScenarioFormValues,
  isScenarioFormDirty,
  scenarioRecordToFormValues,
} from "./scenario-form";
import { createDefaultSpellFormValues, spellRecordToFormValues } from "./spell-form";
import type { EntityType, TabName, WorkspaceState } from "./types";
import { createDefaultUnitFormValues, isUnitFormDirty, unitRecordToFormValues } from "./unit-form";

export type WorkspaceConfigType = EntityType | "scenario";
export type WorkspaceSearchParam = "effect_id" | "spell_id" | "item_id" | "unit_id" | "scenario_id";

export interface WorkspaceRecord {
  id?: string;
  name: string;
  [key: string]: unknown;
}

export interface WorkspaceEntityConfig {
  entityType: WorkspaceConfigType;
  tab: TabName;
  searchParam: WorkspaceSearchParam;
  queryKey(id: string): readonly unknown[];
  load(id: string): Promise<WorkspaceRecord>;
  createDefaultValues(): WorkspaceState["formValues"];
  recordToFormValues(record: WorkspaceRecord): WorkspaceState["formValues"];
  isDirty(form: WorkspaceState["formValues"], original: WorkspaceRecord | null): boolean;
}

function normalize(value: unknown) {
  return value === null || value === undefined ? "" : value;
}

function isShallowFormDirty(
  form: WorkspaceState["formValues"],
  original: WorkspaceRecord | null,
): boolean {
  return Object.keys(form).some((key) => {
    const current = form[key];
    const initial = original?.[key] ?? "";
    if (Array.isArray(current) && Array.isArray(initial)) {
      return (
        current.length !== initial.length ||
        current.some((value, index) => value !== initial[index])
      );
    }
    return normalize(current) !== normalize(initial);
  });
}

export const workspaceEntityConfigs = {
  effect: {
    entityType: "effect",
    tab: "Effects",
    searchParam: "effect_id",
    queryKey: (id) => ["scenarioBuilder", "effects", "get", id],
    load: (id) => trpc.scenarioBuilder.effects.get.query({ id }),
    createDefaultValues: createDefaultEffectFormValues,
    recordToFormValues: effectRecordToFormValues,
    isDirty: isShallowFormDirty,
  },
  spell: {
    entityType: "spell",
    tab: "Spells",
    searchParam: "spell_id",
    queryKey: (id) => ["scenarioBuilder", "spells", "get", id],
    load: (id) => trpc.scenarioBuilder.spells.get.query({ id }),
    createDefaultValues: createDefaultSpellFormValues,
    recordToFormValues: spellRecordToFormValues,
    isDirty: isShallowFormDirty,
  },
  item: {
    entityType: "item",
    tab: "Items",
    searchParam: "item_id",
    queryKey: (id) => ["scenarioBuilder", "items", "get", id],
    load: (id) => trpc.scenarioBuilder.items.get.query({ id }),
    createDefaultValues: createDefaultItemFormValues,
    recordToFormValues: itemRecordToFormValues,
    isDirty: isItemFormDirty,
  },
  unit: {
    entityType: "unit",
    tab: "Units",
    searchParam: "unit_id",
    queryKey: (id) => ["scenarioBuilder", "units", "get", id],
    load: (id) => trpc.scenarioBuilder.units.get.query({ id }),
    createDefaultValues: createDefaultUnitFormValues,
    recordToFormValues: unitRecordToFormValues,
    isDirty: isUnitFormDirty,
  },
  scenario: {
    entityType: "scenario",
    tab: "Scenarios",
    searchParam: "scenario_id",
    queryKey: (id) => ["scenarioBuilder", "scenarios", "get", id],
    load: (id) => trpc.scenarioBuilder.scenarios.get.query({ id }),
    createDefaultValues: createDefaultScenarioFormValues,
    recordToFormValues: scenarioRecordToFormValues,
    isDirty: isScenarioFormDirty,
  },
} as const satisfies Record<WorkspaceConfigType, WorkspaceEntityConfig>;

export function getWorkspaceEntityConfig(entityType: WorkspaceConfigType): WorkspaceEntityConfig {
  return workspaceEntityConfigs[entityType];
}
