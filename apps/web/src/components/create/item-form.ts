import type { EffectType } from "./effect-form";
import type { ScenarioRowType } from "./scenario-form";

export interface EffectOption {
  id: string;
  name: string;
  effectType: EffectType;
}

export const ITEM_NUMERIC_FIELDS = [
  "meleeDmg",
  "rangedDmg",
  "mana",
  "manaRegen",
  "spellDmg",
  "dodge",
  "criticalChance",
  "activationManaCost",
  "activationHealthCost",
] as const;

export const ITEM_COMBAT_FIELDS = ["meleeDmg", "rangedDmg", "spellDmg", "criticalChance"] as const;

export const ITEM_UTILITY_FIELDS = ["mana", "manaRegen", "dodge"] as const;
export const ITEM_ACTIVATION_FIELDS = ["activationManaCost", "activationHealthCost"] as const;

export interface ItemFormValues {
  [key: string]: unknown;
  name: string;
  meleeDmg: string;
  rangedDmg: string;
  mana: string;
  manaRegen: string;
  spellDmg: string;
  dodge: string;
  criticalChance: string;
  activationManaCost: string;
  activationHealthCost: string;
  effectIds: string[];
  allowedRowTypes: ScenarioRowType[];
}

type ItemRecord = {
  name?: string | null;
  meleeDmg?: number | null;
  rangedDmg?: number | null;
  mana?: number | null;
  manaRegen?: number | null;
  spellDmg?: number | null;
  dodge?: number | null;
  criticalChance?: number | null;
  activationManaCost?: number | null;
  activationHealthCost?: number | null;
  effectIds?: string[] | null;
  allowedRowTypes?: ScenarioRowType[] | null;
};

export type ItemFieldErrors = Partial<Record<keyof ItemFormValues, string>>;

export interface NormalizedItemInput {
  name: string;
  meleeDmg: number;
  rangedDmg: number;
  mana: number;
  manaRegen: number;
  spellDmg: number;
  dodge: number;
  criticalChance: number;
  activationManaCost: number;
  activationHealthCost: number;
  effectIds: string[];
  allowedRowTypes: ScenarioRowType[];
}

const ITEM_LABELS: Record<(typeof ITEM_NUMERIC_FIELDS)[number], string> = {
  meleeDmg: "Melee Damage",
  rangedDmg: "Ranged Damage",
  mana: "Mana",
  manaRegen: "Mana Regen",
  spellDmg: "Spell Damage",
  dodge: "Dodge",
  criticalChance: "Critical Chance",
  activationManaCost: "Mana Cost",
  activationHealthCost: "Health Cost",
};

export function getItemFieldLabel(field: (typeof ITEM_NUMERIC_FIELDS)[number]) {
  return ITEM_LABELS[field];
}

export function createDefaultItemFormValues(): ItemFormValues {
  return {
    name: "",
    meleeDmg: "0",
    rangedDmg: "0",
    mana: "0",
    manaRegen: "0",
    spellDmg: "0",
    dodge: "0",
    criticalChance: "0",
    activationManaCost: "0",
    activationHealthCost: "0",
    effectIds: [],
    allowedRowTypes: [],
  };
}

function numberToFormValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }

  return String(value);
}

export function itemRecordToFormValues(record: Partial<ItemRecord>): ItemFormValues {
  return {
    name: record.name ?? "",
    meleeDmg: numberToFormValue(record.meleeDmg),
    rangedDmg: numberToFormValue(record.rangedDmg),
    mana: numberToFormValue(record.mana),
    manaRegen: numberToFormValue(record.manaRegen),
    spellDmg: numberToFormValue(record.spellDmg),
    dodge: numberToFormValue(record.dodge),
    criticalChance: numberToFormValue(record.criticalChance),
    activationManaCost: numberToFormValue(record.activationManaCost),
    activationHealthCost: numberToFormValue(record.activationHealthCost),
    effectIds: record.effectIds ? [...record.effectIds] : [],
    allowedRowTypes: record.allowedRowTypes ? [...new Set(record.allowedRowTypes)] : [],
  };
}

function parseNumericField(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return Number(value);
}

export function normalizeItemFormValues(values: ItemFormValues): NormalizedItemInput {
  return {
    name: values.name.trim(),
    meleeDmg: parseNumericField(values.meleeDmg),
    rangedDmg: parseNumericField(values.rangedDmg),
    mana: parseNumericField(values.mana ?? "0"),
    manaRegen: parseNumericField(values.manaRegen),
    spellDmg: parseNumericField(values.spellDmg),
    dodge: parseNumericField(values.dodge),
    criticalChance: parseNumericField(values.criticalChance),
    activationManaCost: parseNumericField(values.activationManaCost),
    activationHealthCost: parseNumericField(values.activationHealthCost),
    effectIds: [...values.effectIds],
    allowedRowTypes: [...new Set(values.allowedRowTypes)],
  };
}

export function validateItemForm(values: ItemFormValues): ItemFieldErrors {
  const normalized = normalizeItemFormValues(values);
  const errors: ItemFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required";
  }

  for (const field of ITEM_NUMERIC_FIELDS) {
    if (!Number.isFinite(normalized[field])) {
      errors[field] = "Must be a valid number";
    }
  }

  if (new Set(values.allowedRowTypes).size !== values.allowedRowTypes.length) {
    errors.allowedRowTypes = "Allowed deployment rows must not contain duplicates";
  }

  if (!Number.isNaN(normalized.activationManaCost) && normalized.activationManaCost < 0) {
    errors.activationManaCost = "Must be zero or greater";
  }

  if (!Number.isNaN(normalized.activationHealthCost) && normalized.activationHealthCost < 0) {
    errors.activationHealthCost = "Must be zero or greater";
  }

  return errors;
}

export function hasItemFormErrors(values: ItemFormValues): boolean {
  return Object.keys(validateItemForm(values)).length > 0;
}

export function isItemFormDirty(
  formValues: ItemFormValues,
  originalData: ItemRecord | null,
): boolean {
  const current = normalizeItemFormValues(formValues);
  const original = originalData
    ? normalizeItemFormValues(itemRecordToFormValues(originalData))
    : normalizeItemFormValues(createDefaultItemFormValues());

  if (current.name !== original.name) {
    return true;
  }

  for (const field of ITEM_NUMERIC_FIELDS) {
    if (current[field] !== original[field]) {
      return true;
    }
  }

  const currentAllowedRows = [...current.allowedRowTypes].sort();
  const originalAllowedRows = [...original.allowedRowTypes].sort();
  if (
    currentAllowedRows.length !== originalAllowedRows.length ||
    currentAllowedRows.some((rowType, index) => rowType !== originalAllowedRows[index])
  ) {
    return true;
  }

  return (
    current.effectIds.length !== original.effectIds.length ||
    current.effectIds.some((id, index) => id !== original.effectIds[index])
  );
}
