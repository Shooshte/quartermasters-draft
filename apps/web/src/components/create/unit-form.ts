export interface ItemOption {
  id: string;
  name: string;
}

export const UNIT_NUMERIC_FIELDS = [
  "meleeDmg",
  "health",
  "mana",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "speed",
  "dodge",
  "criticalChance",
] as const;

export const UNIT_COMBAT_FIELDS = ["meleeDmg", "rangedDmg", "spellDmg", "criticalChance"] as const;

export const UNIT_VITAL_FIELDS = ["health", "mana", "speed", "dodge", "manaRegen"] as const;

export interface UnitFormValues {
  [key: string]: unknown;
  name: string;
  meleeDmg: string;
  health: string;
  mana: string;
  rangedDmg: string;
  manaRegen: string;
  spellDmg: string;
  speed: string;
  dodge: string;
  criticalChance: string;
  itemIds: string[];
}

type UnitRecord = {
  name?: string | null;
  meleeDmg?: number | null;
  health?: number | null;
  mana?: number | null;
  rangedDmg?: number | null;
  manaRegen?: number | null;
  spellDmg?: number | null;
  speed?: number | null;
  dodge?: number | null;
  criticalChance?: number | null;
  itemIds?: string[] | null;
};

export type UnitFieldErrors = Partial<Record<keyof UnitFormValues, string>>;

export interface NormalizedUnitInput {
  name: string;
  meleeDmg: number;
  health: number;
  mana: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  speed: number;
  dodge: number;
  criticalChance: number;
  itemIds: string[];
}

const UNIT_LABELS: Record<(typeof UNIT_NUMERIC_FIELDS)[number], string> = {
  meleeDmg: "Melee Damage",
  health: "Health",
  mana: "Mana",
  rangedDmg: "Ranged Damage",
  manaRegen: "Mana Regen",
  spellDmg: "Spell Damage",
  speed: "Speed",
  dodge: "Dodge",
  criticalChance: "Critical Chance",
};

export function getUnitFieldLabel(field: (typeof UNIT_NUMERIC_FIELDS)[number]) {
  return UNIT_LABELS[field];
}

export function createDefaultUnitFormValues(): UnitFormValues {
  return {
    name: "",
    meleeDmg: "0",
    health: "0",
    mana: "100",
    rangedDmg: "0",
    manaRegen: "0",
    spellDmg: "0",
    speed: "0",
    dodge: "0",
    criticalChance: "0",
    itemIds: [],
  };
}

function numberToFormValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }

  return String(value);
}

export function unitRecordToFormValues(record: Partial<UnitRecord>): UnitFormValues {
  return {
    name: record.name ?? "",
    meleeDmg: numberToFormValue(record.meleeDmg),
    health: numberToFormValue(record.health),
    mana: numberToFormValue(record.mana ?? 100),
    rangedDmg: numberToFormValue(record.rangedDmg),
    manaRegen: numberToFormValue(record.manaRegen),
    spellDmg: numberToFormValue(record.spellDmg),
    speed: numberToFormValue(record.speed),
    dodge: numberToFormValue(record.dodge),
    criticalChance: numberToFormValue(record.criticalChance),
    itemIds: record.itemIds ? [...record.itemIds] : [],
  };
}

function parseNumericField(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  return Number(value);
}

export function normalizeUnitFormValues(values: UnitFormValues): NormalizedUnitInput {
  return {
    name: values.name.trim(),
    meleeDmg: parseNumericField(values.meleeDmg),
    health: parseNumericField(values.health),
    mana: parseNumericField(values.mana ?? "100"),
    rangedDmg: parseNumericField(values.rangedDmg),
    manaRegen: parseNumericField(values.manaRegen),
    spellDmg: parseNumericField(values.spellDmg),
    speed: parseNumericField(values.speed),
    dodge: parseNumericField(values.dodge),
    criticalChance: parseNumericField(values.criticalChance),
    itemIds: [...values.itemIds],
  };
}

export function validateUnitForm(values: UnitFormValues): UnitFieldErrors {
  const normalized = normalizeUnitFormValues(values);
  const errors: UnitFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required";
  }

  for (const field of UNIT_NUMERIC_FIELDS) {
    if (!Number.isFinite(normalized[field])) {
      errors[field] = "Must be a valid number";
    }
  }

  if (Number.isFinite(normalized.mana) && normalized.mana < 0) {
    errors.mana = "Must be zero or greater";
  }

  return errors;
}

export function hasUnitFormErrors(values: UnitFormValues): boolean {
  return Object.keys(validateUnitForm(values)).length > 0;
}

export function isUnitFormDirty(
  formValues: UnitFormValues,
  originalData: UnitRecord | null,
): boolean {
  const current = normalizeUnitFormValues(formValues);
  const original = originalData
    ? normalizeUnitFormValues(unitRecordToFormValues(originalData))
    : normalizeUnitFormValues(createDefaultUnitFormValues());

  if (current.name !== original.name) {
    return true;
  }

  for (const field of UNIT_NUMERIC_FIELDS) {
    if (current[field] !== original[field]) {
      return true;
    }
  }

  return (
    current.itemIds.length !== original.itemIds.length ||
    current.itemIds.some((id, index) => id !== original.itemIds[index])
  );
}
