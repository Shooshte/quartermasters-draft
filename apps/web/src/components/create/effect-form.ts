export type TimingType = "instant" | "interval";
export type EffectType = "buff" | "debuff" | "healing" | "damage";

export interface EffectFormValues {
  [key: string]: unknown;
  name: string;
  timingType: TimingType;
  intervalMs: number | null;
  triggerCount: number | null;
  effectType: EffectType;
  durationMs: number | null;
  meleeDmg: number | null;
  health: number | null;
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
  intervalMs: number | null;
  triggerCount: number | null;
  effectType: EffectType;
  durationMs: number | null;
  meleeDmg: number | null;
  health: number | null;
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
  "intervalMs",
  "triggerCount",
  "durationMs",
  "meleeDmg",
  "health",
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

const POSITIVE_INTEGER_FIELDS = ["intervalMs", "triggerCount", "durationMs"] as const satisfies readonly (keyof EffectFormValues)[];

export function createDefaultEffectFormValues(): EffectFormValues {
  return {
    name: "",
    timingType: "instant",
    intervalMs: null,
    triggerCount: null,
    effectType: "buff",
    durationMs: null,
    meleeDmg: null,
    health: null,
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
  return {
    ...createDefaultEffectFormValues(),
    ...record,
    name: record.name ?? "",
    timingType: record.timingType ?? "instant",
    effectType: record.effectType ?? "buff",
  };
}

export function normalizeEffectFormValues(values: EffectFormValues): EffectFormValues {
  const normalized = {
    ...values,
    name: values.name.trim(),
  };
  if (normalized.timingType === "instant") {
    normalized.intervalMs = null;
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
    if (normalized.intervalMs === null) {
      errors.intervalMs = "Interval ms is required for interval timing.";
    }
    if (normalized.triggerCount === null) {
      errors.triggerCount = "Trigger count is required for interval timing.";
    }
  }

  return errors;
}

export function hasEffectFormErrors(values: EffectFormValues): boolean {
  return Object.keys(validateEffectForm(values)).length > 0;
}

export function isIntervalFieldDisabled(values: Pick<EffectFormValues, "timingType">): boolean {
  return values.timingType === "instant";
}
