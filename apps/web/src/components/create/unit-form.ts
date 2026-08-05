export interface ItemOption {
  id: string;
  name: string;
}

export type TargetSide = "allies" | "enemies" | "self";
export type TargetPolicy =
  | "highest_health"
  | "lowest_health"
  | "highest_damage"
  | "random"
  | "self";
export type RowType = "support" | "ranged" | "melee" | "tank";

const VALID_TARGET_SIDES: readonly string[] = ["allies", "enemies", "self"];
const VALID_TARGET_POLICIES: readonly string[] = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
  "self",
];

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
  targetSide: TargetSide | "";
  targetPolicy: TargetPolicy | "";
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
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
  targetSide?: string | null;
  targetPolicy?: string | null;
  targetRowCount?: number | null;
  maxTargetsPerRow?: number | null;
  targetOnlyAdjacent?: boolean | null;
  allowedRowTypes?: RowType[] | null;
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
  targetSide: TargetSide;
  targetPolicy: TargetPolicy;
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
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
    targetSide: "enemies",
    targetPolicy: "highest_health",
    targetRowCount: 1,
    maxTargetsPerRow: 1,
    targetOnlyAdjacent: false,
    allowedRowTypes: [],
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
    targetSide: (record.targetSide as TargetSide | "") ?? "enemies",
    targetPolicy: (record.targetPolicy as TargetPolicy | "") ?? "highest_health",
    targetRowCount: record.targetRowCount ?? 1,
    maxTargetsPerRow: record.maxTargetsPerRow === undefined ? 1 : record.maxTargetsPerRow,
    targetOnlyAdjacent: record.targetOnlyAdjacent ?? false,
    allowedRowTypes: record.allowedRowTypes ? [...record.allowedRowTypes] : [],
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
    targetSide: values.targetSide as TargetSide,
    targetPolicy: values.targetPolicy as TargetPolicy,
    targetRowCount: values.targetRowCount,
    maxTargetsPerRow: values.maxTargetsPerRow,
    targetOnlyAdjacent: values.targetOnlyAdjacent,
    allowedRowTypes: [...values.allowedRowTypes],
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

  if (!VALID_TARGET_SIDES.includes(values.targetSide)) {
    errors.targetSide = "Target side is required";
  }

  if (!VALID_TARGET_POLICIES.includes(values.targetPolicy)) {
    errors.targetPolicy = "Target policy is required";
  }

  if (values.targetPolicy === "self" && values.targetSide === "enemies") {
    errors.targetSide = "Self priority cannot be used when targeting enemies";
  }

  if (
    !Number.isInteger(values.targetRowCount) ||
    values.targetRowCount < 1 ||
    values.targetRowCount > 4
  ) {
    errors.targetRowCount = "Target row count must be between 1 and 4";
  }

  if (
    values.maxTargetsPerRow !== null &&
    (!Number.isInteger(values.maxTargetsPerRow) || values.maxTargetsPerRow < 1)
  ) {
    errors.maxTargetsPerRow = "Max targets per row must be at least 1";
  }

  if (values.targetOnlyAdjacent && values.maxTargetsPerRow === null) {
    errors.targetOnlyAdjacent = "Adjacent targeting requires a limited number of targets per row";
  } else if (
    values.targetOnlyAdjacent &&
    values.maxTargetsPerRow !== null &&
    values.maxTargetsPerRow < 2
  ) {
    errors.targetOnlyAdjacent = "Adjacent targeting requires at least 2 targets per row";
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

  if (
    current.targetSide !== original.targetSide ||
    current.targetPolicy !== original.targetPolicy ||
    current.targetRowCount !== original.targetRowCount ||
    current.maxTargetsPerRow !== original.maxTargetsPerRow ||
    current.targetOnlyAdjacent !== original.targetOnlyAdjacent
  ) {
    return true;
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
    current.itemIds.length !== original.itemIds.length ||
    current.itemIds.some((id, index) => id !== original.itemIds[index])
  );
}
