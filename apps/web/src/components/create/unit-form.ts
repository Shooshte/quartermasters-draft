export type TargetScope = "self" | "self_allies" | "self_enemies" | "allies" | "enemies" | "both";
export type TargetPriority =
  | "highest_health"
  | "lowest_health"
  | "highest_damage"
  | "support"
  | "random";
export type TargetSelectionShape = "individual" | "adjacent";

const VALID_TARGET_SCOPES: readonly string[] = [
  "self",
  "self_allies",
  "self_enemies",
  "allies",
  "enemies",
  "both",
];
const VALID_TARGET_PRIORITIES: readonly string[] = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "support",
  "random",
];
const VALID_TARGET_SELECTION_SHAPES: readonly string[] = ["individual", "adjacent"];

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

export type UnitNumericField = (typeof UNIT_NUMERIC_FIELDS)[number];

type ItemStatField =
  | "meleeDmg"
  | "rangedDmg"
  | "mana"
  | "manaRegen"
  | "spellDmg"
  | "dodge"
  | "criticalChance";

export interface ItemOption {
  id: string;
  name: string;
  meleeDmg?: number;
  rangedDmg?: number;
  mana?: number;
  manaRegen?: number;
  spellDmg?: number;
  dodge?: number;
  criticalChance?: number;
}

export interface UnitStatPreview {
  finalValue: number | null;
  itemBonus: number;
}

const ITEM_STAT_FIELDS: readonly ItemStatField[] = [
  "meleeDmg",
  "rangedDmg",
  "mana",
  "manaRegen",
  "spellDmg",
  "dodge",
  "criticalChance",
];

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
  targetScope: TargetScope | "";
  targetPriority: TargetPriority | "";
  targetCount: number;
  selectionShape: TargetSelectionShape;
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
  targetScope?: string | null;
  targetPriority?: string | null;
  targetCount?: number | null;
  selectionShape?: string | null;
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
  targetScope: TargetScope;
  targetPriority: TargetPriority;
  targetCount: number;
  selectionShape: TargetSelectionShape;
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
    targetScope: "enemies",
    targetPriority: "highest_health",
    targetCount: 1,
    selectionShape: "individual",
  };
}

export function computeUnitStatPreviews(
  values: UnitFormValues,
  itemOptions: ItemOption[],
): Record<UnitNumericField, UnitStatPreview> {
  const optionsById = new Map(itemOptions.map((item) => [item.id, item]));
  const itemBonuses = Object.fromEntries(
    UNIT_NUMERIC_FIELDS.map((field) => [field, 0]),
  ) as Record<UnitNumericField, number>;

  for (const itemId of values.itemIds) {
    const item = optionsById.get(itemId);
    if (!item) continue;

    for (const field of ITEM_STAT_FIELDS) {
      const modifier = item[field];
      if (typeof modifier === "number" && Number.isFinite(modifier)) {
        itemBonuses[field] += modifier;
      }
    }
  }

  return Object.fromEntries(
    UNIT_NUMERIC_FIELDS.map((field) => {
      const baseValue = values[field].trim() === "" ? 0 : Number(values[field]);
      const finalValue = Number.isFinite(baseValue)
        ? Math.max(0, baseValue + itemBonuses[field])
        : null;
      return [field, { finalValue, itemBonus: itemBonuses[field] }];
    }),
  ) as Record<UnitNumericField, UnitStatPreview>;
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
    targetScope: (record.targetScope as TargetScope | "") ?? "enemies",
    targetPriority: (record.targetPriority as TargetPriority | "") ?? "highest_health",
    targetCount: record.targetCount ?? 1,
    selectionShape: (record.selectionShape as TargetSelectionShape) ?? "individual",
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
    targetScope: values.targetScope as TargetScope,
    targetPriority: values.targetPriority as TargetPriority,
    targetCount: values.targetCount,
    selectionShape: values.selectionShape,
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

  if (!VALID_TARGET_SCOPES.includes(values.targetScope)) {
    errors.targetScope = "Target scope is required";
  }

  if (!VALID_TARGET_PRIORITIES.includes(values.targetPriority)) {
    errors.targetPriority = "Target priority is required";
  }

  if (!Number.isInteger(values.targetCount) || values.targetCount < 1) {
    errors.targetCount = "Target count must be at least 1";
  }

  if (!VALID_TARGET_SELECTION_SHAPES.includes(values.selectionShape)) {
    errors.selectionShape = "Selection shape is required";
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
    current.targetScope !== original.targetScope ||
    current.targetPriority !== original.targetPriority ||
    current.targetCount !== original.targetCount ||
    current.selectionShape !== original.selectionShape
  ) {
    return true;
  }

  return (
    current.itemIds.length !== original.itemIds.length ||
    current.itemIds.some((id, index) => id !== original.itemIds[index])
  );
}
