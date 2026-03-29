export interface SpellOption {
  id: string;
  name: string;
  targetPolicy?: string;
}

export const ITEM_NUMERIC_FIELDS = [
  "meleeDmg",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "dodge",
  "criticalChance",
  "activationManaCost",
  "activationHealthCost",
] as const;

export const ITEM_COMBAT_FIELDS = [
  "meleeDmg",
  "rangedDmg",
  "spellDmg",
  "criticalChance",
] as const;

export const ITEM_UTILITY_FIELDS = ["manaRegen", "dodge"] as const;
export const ITEM_ACTIVATION_FIELDS = [
  "activationManaCost",
  "activationHealthCost",
] as const;

export interface ItemFormValues {
  [key: string]: unknown;
  name: string;
  meleeDmg: string;
  rangedDmg: string;
  manaRegen: string;
  spellDmg: string;
  dodge: string;
  criticalChance: string;
  activationManaCost: string;
  activationHealthCost: string;
  spellIds: string[];
}

type ItemRecord = {
  name?: string | null;
  meleeDmg?: number | null;
  rangedDmg?: number | null;
  manaRegen?: number | null;
  spellDmg?: number | null;
  dodge?: number | null;
  criticalChance?: number | null;
  activationManaCost?: number | null;
  activationHealthCost?: number | null;
  spellIds?: string[] | null;
};

export type ItemFieldErrors = Partial<Record<keyof ItemFormValues, string>>;

export interface NormalizedItemInput {
  name: string;
  meleeDmg: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  dodge: number;
  criticalChance: number;
  activationManaCost: number;
  activationHealthCost: number;
  spellIds: string[];
}

const ITEM_LABELS: Record<(typeof ITEM_NUMERIC_FIELDS)[number], string> = {
  meleeDmg: "Melee Damage",
  rangedDmg: "Ranged Damage",
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
    manaRegen: "0",
    spellDmg: "0",
    dodge: "0",
    criticalChance: "0",
    activationManaCost: "0",
    activationHealthCost: "0",
    spellIds: [],
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
    manaRegen: numberToFormValue(record.manaRegen),
    spellDmg: numberToFormValue(record.spellDmg),
    dodge: numberToFormValue(record.dodge),
    criticalChance: numberToFormValue(record.criticalChance),
    activationManaCost: numberToFormValue(record.activationManaCost),
    activationHealthCost: numberToFormValue(record.activationHealthCost),
    spellIds: record.spellIds ? [...record.spellIds] : [],
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
    manaRegen: parseNumericField(values.manaRegen),
    spellDmg: parseNumericField(values.spellDmg),
    dodge: parseNumericField(values.dodge),
    criticalChance: parseNumericField(values.criticalChance),
    activationManaCost: parseNumericField(values.activationManaCost),
    activationHealthCost: parseNumericField(values.activationHealthCost),
    spellIds: [...new Set(values.spellIds)],
  };
}

export function validateItemForm(values: ItemFormValues): ItemFieldErrors {
  const normalized = normalizeItemFormValues(values);
  const errors: ItemFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required";
  }

  for (const field of ITEM_NUMERIC_FIELDS) {
    if (Number.isNaN(normalized[field])) {
      errors[field] = "Must be a valid number";
    }
  }

  if (
    !Number.isNaN(normalized.activationManaCost) &&
    normalized.activationManaCost < 0
  ) {
    errors.activationManaCost = "Must be zero or greater";
  }

  if (
    !Number.isNaN(normalized.activationHealthCost) &&
    normalized.activationHealthCost < 0
  ) {
    errors.activationHealthCost = "Must be zero or greater";
  }

  if (normalized.spellIds.length === 0) {
    errors.spellIds = "At least one linked spell is required";
  }

  return errors;
}

export function hasItemFormErrors(values: ItemFormValues): boolean {
  return Object.keys(validateItemForm(values)).length > 0;
}

function sortedUniqueIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

export function isItemFormDirty(
  formValues: ItemFormValues,
  originalData: ItemRecord | null,
): boolean {
  if (!originalData) {
    return false;
  }

  const current = normalizeItemFormValues(formValues);
  const original = normalizeItemFormValues(itemRecordToFormValues(originalData));

  if (current.name !== original.name) {
    return true;
  }

  for (const field of ITEM_NUMERIC_FIELDS) {
    if (current[field] !== original[field]) {
      return true;
    }
  }

  const currentSpellIds = sortedUniqueIds(current.spellIds);
  const originalSpellIds = sortedUniqueIds(original.spellIds);
  return (
    currentSpellIds.length !== originalSpellIds.length ||
    currentSpellIds.some((id, index) => id !== originalSpellIds[index])
  );
}
