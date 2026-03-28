export interface EffectOption {
  id: string;
  name: string;
  effectType: string;
}

export type TargetPolicy = "highest_health" | "lowest_health" | "highest_damage" | "random";

const VALID_TARGET_POLICIES: readonly string[] = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
];

export interface SpellFormValues {
  [key: string]: unknown;
  name: string;
  description: string;
  targetPolicy: TargetPolicy | "";
  effectIds: string[];
}

export type SpellFieldErrors = Partial<Record<"name" | "targetPolicy" | "effectIds", string>>;

export function createDefaultSpellFormValues(): SpellFormValues {
  return {
    name: "",
    description: "",
    targetPolicy: "",
    effectIds: [],
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

  if (values.effectIds.length === 0) {
    errors.effectIds = "At least one linked effect is required";
  }

  return errors;
}

export function hasSpellFormErrors(values: SpellFormValues): boolean {
  return Object.keys(validateSpellForm(values)).length > 0;
}

export interface NormalizedSpellInput {
  name: string;
  description: string | null;
  targetPolicy: TargetPolicy;
  effectIds: string[];
}

export function normalizeSpellFormValues(values: SpellFormValues): NormalizedSpellInput {
  const trimmedDesc = values.description.trim();
  return {
    name: values.name.trim(),
    description: trimmedDesc || null,
    targetPolicy: values.targetPolicy as TargetPolicy,
    effectIds: values.effectIds,
  };
}
