export type TimingType = "instant" | "interval";
export type EffectType = "buff" | "debuff" | "healing" | "damage";

export interface EffectFormValues {
  [key: string]: unknown;
  name: string;
  timingType: TimingType;
  triggerEveryActions: number | null;
  triggerCount: number | null;
  effectType: EffectType;
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

export function createDefaultEffectFormValues(): EffectFormValues {
  return {
    name: "",
    timingType: "instant",
    triggerEveryActions: null,
    triggerCount: null,
    effectType: "buff",
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

  if (normalized.timingType === "interval") {
    if (normalized.triggerEveryActions === null) {
      errors.triggerEveryActions = "Trigger every actions is required for interval timing.";
    }
    if (normalized.triggerCount === null) {
      errors.triggerCount = "Trigger count is required for interval timing.";
    }
  }

  if (effectNeedsTimingConfiguration(normalized) && normalized.timingType === "instant") {
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
] as const;

export function effectNeedsTimingConfiguration(values: EffectFormValues): boolean {
  if (values.timingType === "interval") {
    return values.triggerEveryActions === null || values.triggerCount === null;
  }

  const hasModifier =
    (values.effectType === "buff" || values.effectType === "debuff") &&
    EFFECT_STAT_FIELDS.some((field) => values[field] !== null);
  return hasModifier && values.lastsForActions === null;
}

export function hasEffectFormErrors(values: EffectFormValues): boolean {
  return Object.keys(validateEffectForm(values)).length > 0;
}

export function isIntervalFieldDisabled(values: Pick<EffectFormValues, "timingType">): boolean {
  return values.timingType === "instant";
}
