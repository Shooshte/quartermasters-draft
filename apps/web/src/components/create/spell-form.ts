export interface EffectOption {
  id: string;
  name: string;
  effectType: string;
}

export type TargetPolicy =
  | "highest_health"
  | "lowest_health"
  | "highest_damage"
  | "random"
  | "self";
export type TargetScope = "self" | "self_and_others" | "others";
export type RowType = "support" | "ranged" | "melee" | "tank";

const VALID_TARGET_POLICIES: readonly string[] = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
  "self",
];

export interface SpellFormValues {
  [key: string]: unknown;
  name: string;
  description: string;
  targetPolicy: TargetPolicy | "";
  targetScope: TargetScope;
  effectIds: string[];
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}

interface SpellRecord {
  name: string;
  description?: string | null;
  targetPolicy?: string | null;
  targetScope?: string | null;
  effectIds?: string[] | null;
  targetRowCount?: number | null;
  maxTargetsPerRow?: number | null;
  targetOnlyAdjacent?: boolean | null;
  allowedRowTypes?: RowType[] | null;
}

export type SpellFieldErrors = Partial<
  Record<
    | "name"
    | "targetPolicy"
    | "targetScope"
    | "effectIds"
    | "targetRowCount"
    | "maxTargetsPerRow"
    | "targetOnlyAdjacent",
    string
  >
>;

export function createDefaultSpellFormValues(): SpellFormValues {
  return {
    name: "",
    description: "",
    targetPolicy: "",
    targetScope: "self_and_others",
    effectIds: [],
    targetRowCount: 1,
    maxTargetsPerRow: 1,
    targetOnlyAdjacent: false,
    allowedRowTypes: [],
  };
}

export function validateSpellForm(values: SpellFormValues): SpellFieldErrors {
  const errors: SpellFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  }

  if (!VALID_TARGET_POLICIES.includes(values.targetPolicy)) {
    errors.targetPolicy = "Target policy is required";
  }

  if (values.targetPolicy === "self" && values.targetScope === "others") {
    errors.targetScope = "Self priority cannot be used when the caster is excluded";
  }

  if (values.effectIds.length === 0) {
    errors.effectIds = "At least one linked effect is required";
  }

  if (values.targetRowCount < 1 || values.targetRowCount > 4) {
    errors.targetRowCount = "Target row count must be between 1 and 4";
  }

  if (values.maxTargetsPerRow !== null && values.maxTargetsPerRow < 1) {
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

export function hasSpellFormErrors(values: SpellFormValues): boolean {
  return Object.keys(validateSpellForm(values)).length > 0;
}

export function spellRecordToFormValues(record: Partial<SpellRecord>): SpellFormValues {
  return {
    ...createDefaultSpellFormValues(),
    name: record.name ?? "",
    description: record.description ?? "",
    targetPolicy: (record.targetPolicy as TargetPolicy | "") ?? "",
    targetScope: (record.targetScope as TargetScope | null | undefined) ?? "self_and_others",
    effectIds: record.effectIds ?? [],
    targetRowCount: record.targetRowCount ?? 1,
    maxTargetsPerRow: record.maxTargetsPerRow === undefined ? 1 : record.maxTargetsPerRow,
    targetOnlyAdjacent: record.targetOnlyAdjacent ?? false,
    allowedRowTypes: record.allowedRowTypes ?? [],
  };
}

export interface NormalizedSpellInput {
  name: string;
  description: string | null;
  targetPolicy: TargetPolicy;
  targetScope: TargetScope;
  effectIds: string[];
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}

export function normalizeSpellFormValues(values: SpellFormValues): NormalizedSpellInput {
  const trimmedDesc = values.description.trim();
  return {
    name: values.name.trim(),
    description: trimmedDesc || null,
    targetPolicy: values.targetPolicy as TargetPolicy,
    targetScope: values.targetScope,
    effectIds: values.effectIds,
    targetRowCount: values.targetRowCount,
    maxTargetsPerRow: values.maxTargetsPerRow,
    targetOnlyAdjacent: values.targetOnlyAdjacent,
    allowedRowTypes: values.allowedRowTypes,
  };
}
