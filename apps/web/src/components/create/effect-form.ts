export type TimingType = "instant" | "interval";
export type EffectType = "buff" | "debuff" | "healing" | "damage";

export interface EffectFormValues {
  [key: string]: unknown;
  name: string;
  timingType: TimingType;
  triggerEveryActions: number | null;
  triggerCount: number | null;
  effectType: EffectType;
  isTaunt: boolean;
  lastsForActions: number | null;
  meleeDmg: number | null;
  health: number | null;
  mana: number | null;
  rangedDmg: number | null;
  manaRegen: number | null;
  spellDmg: number | null;
  speed: number | null;
  dodge: number | null;
  criticalChance: number | null;
  shield: number | null;
  bypassesShield: boolean;
  directHealing: number | null;
  directMeleeDmg: number | null;
  directRangedDmg: number | null;
  directSpellDmg: number | null;
}

export type EffectFieldErrors = Partial<Record<keyof EffectFormValues, string>>;

type EffectRecord = {
  name: string;
  timingType: TimingType;
  triggerEveryActions: number | null;
  triggerCount: number | null;
  effectType: EffectType;
  isTaunt: boolean;
  lastsForActions: number | null;
  meleeDmg: number | null;
  health: number | null;
  mana: number | null;
  rangedDmg: number | null;
  manaRegen: number | null;
  spellDmg: number | null;
  speed: number | null;
  dodge: number | null;
  criticalChance: number | null;
  shield: number | null;
  bypassesShield: boolean;
  directHealing: number | null;
  directMeleeDmg: number | null;
  directRangedDmg: number | null;
  directSpellDmg: number | null;
};

export const EFFECT_NUMERIC_FIELDS = [
  "triggerEveryActions",
  "triggerCount",
  "lastsForActions",
  "meleeDmg",
  "health",
  "mana",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "speed",
  "dodge",
  "criticalChance",
  "shield",
  "directHealing",
  "directMeleeDmg",
  "directRangedDmg",
  "directSpellDmg",
] as const satisfies readonly (keyof EffectFormValues)[];

const POSITIVE_INTEGER_FIELDS = [
  "triggerEveryActions",
  "triggerCount",
  "lastsForActions",
] as const satisfies readonly (keyof EffectFormValues)[];

const NON_NEGATIVE_AMOUNT_FIELDS = [
  "shield",
  "directHealing",
  "directMeleeDmg",
  "directRangedDmg",
  "directSpellDmg",
] as const satisfies readonly (keyof EffectFormValues)[];

export function createDefaultEffectFormValues(): EffectFormValues {
  return {
    name: "",
    timingType: "instant",
    triggerEveryActions: null,
    triggerCount: null,
    effectType: "buff",
    isTaunt: false,
    lastsForActions: null,
    meleeDmg: null,
    health: null,
    mana: null,
    rangedDmg: null,
    manaRegen: null,
    spellDmg: null,
    speed: null,
    dodge: null,
    criticalChance: null,
    shield: null,
    bypassesShield: false,
    directHealing: null,
    directMeleeDmg: null,
    directRangedDmg: null,
    directSpellDmg: null,
  };
}

export function effectRecordToFormValues(record: Partial<EffectRecord>): EffectFormValues {
  const values = createDefaultEffectFormValues();
  for (const field of EFFECT_NUMERIC_FIELDS) {
    values[field] = record[field] ?? null;
  }
  values.name = record.name ?? "";
  values.timingType = record.timingType ?? "instant";
  values.effectType = record.effectType ?? "buff";
  values.isTaunt = record.isTaunt ?? false;
  values.bypassesShield = record.bypassesShield ?? false;
  return values;
}

export function normalizeEffectFormValues(values: EffectFormValues): EffectFormValues {
  const normalized = {
    ...values,
    name: values.name.trim(),
  };
  if (normalized.timingType === "instant") {
    normalized.triggerEveryActions = null;
    normalized.triggerCount = null;
  }
  if (!isActionDurationApplicable(normalized)) {
    normalized.lastsForActions = null;
  }
  return normalized;
}

export function validateEffectForm(values: EffectFormValues): EffectFieldErrors {
  const normalized = normalizeEffectFormValues(values);
  const errors: EffectFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required.";
  }

  for (const field of POSITIVE_INTEGER_FIELDS) {
    const value = normalized[field];
    if (value === null) continue;
    if (!Number.isInteger(value) || value <= 0) {
      errors[field] = "Must be a positive integer.";
    }
  }

  for (const field of NON_NEGATIVE_AMOUNT_FIELDS) {
    const value = normalized[field];
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      errors[field] = "Must be zero or greater.";
    }
  }

  if (normalized.timingType === "interval") {
    if (normalized.isTaunt) {
      errors.timingType = "Taunt effects must use instant timing.";
    }
    if (normalized.triggerEveryActions === null) {
      errors.triggerEveryActions = "Trigger every actions is required for interval timing.";
    }
    if (normalized.triggerCount === null) {
      errors.triggerCount = "Trigger count is required for interval timing.";
    }
  }

  if (requiresActionDuration(normalized) && normalized.lastsForActions === null) {
    errors.lastsForActions = "Lasts for actions is required for stat buffs and debuffs.";
  }

  return errors;
}

const EFFECT_STAT_FIELDS = [
  "health",
  "mana",
  "meleeDmg",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "speed",
  "dodge",
  "criticalChance",
  "shield",
] as const;

export function effectNeedsTimingConfiguration(values: EffectFormValues): boolean {
  if (values.timingType === "interval") {
    return values.triggerEveryActions === null || values.triggerCount === null;
  }
  return requiresActionDuration(values) && values.lastsForActions === null;
}

export function isActionDurationApplicable(values: EffectFormValues): boolean {
  return values.timingType === "instant" && (values.isTaunt || requiresActionDuration(values));
}

function requiresActionDuration(values: EffectFormValues): boolean {
  const hasDurationBearingStat = EFFECT_STAT_FIELDS.some((field) =>
    field === "shield"
      ? typeof values[field] === "number" && values[field] > 0
      : values[field] !== null,
  );
  return (
    !values.isTaunt &&
    values.timingType === "instant" &&
    (values.effectType === "buff" || values.effectType === "debuff") &&
    hasDurationBearingStat
  );
}

export function hasEffectFormErrors(values: EffectFormValues): boolean {
  return Object.keys(validateEffectForm(values)).length > 0;
}

export function isIntervalFieldDisabled(values: Pick<EffectFormValues, "timingType">): boolean {
  return values.timingType === "instant";
}
