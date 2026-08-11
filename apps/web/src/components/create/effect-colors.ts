import type { EffectType } from "./effect-form";

/**
 * Maps effect type → CSS class name applied to the form container.
 * Each class sets scoped CSS custom properties for the adaptive color scheme.
 */
export function getEffectColorClass(effectType: EffectType): string {
  switch (effectType) {
    case "damage":
      return "effect-damage";
    case "healing":
      return "effect-healing";
    case "buff":
      return "effect-buff";
    case "debuff":
      return "effect-debuff";
  }
}

/** Abbreviated labels for modifier fields displayed in compact cells. */
export const COMPACT_LABELS: Record<string, string> = {
  lastsForActions: "Lasts for (affected-unit actions)",
  triggerEveryActions: "Trigger every (affected-unit actions)",
  triggerCount: "Trigger count",
  meleeDmg: "Mel",
  rangedDmg: "Rng",
  spellDmg: "Spl",
  health: "HP",
  mana: "Mana",
  dodge: "Dodge",
  criticalChance: "Crit",
  shield: "Shield",
  speed: "Speed",
  manaRegen: "Mana Regen",
  directHealing: "Heal",
  directMeleeDmg: "D.Mel",
  directRangedDmg: "D.Rng",
  directSpellDmg: "D.Spl",
};

/** Modifier field groups rendered as categorized sections. */
export const MODIFIER_GROUPS = [
  { label: "Combat Buff", fields: ["meleeDmg", "rangedDmg", "spellDmg"] as const, cols: 3 },
  {
    label: "Defense Buff",
    fields: ["health", "dodge", "criticalChance", "shield"] as const,
    cols: 4,
  },
  { label: "Utility Buff", fields: ["mana", "speed", "manaRegen"] as const, cols: 3 },
  {
    label: "One Time Effect",
    fields: ["directHealing", "directMeleeDmg", "directRangedDmg", "directSpellDmg"] as const,
    cols: 4,
  },
] as const;

/** Timing fields rendered together in the Timing section. */
export const TIMING_FIELDS = ["lastsForActions", "triggerEveryActions", "triggerCount"] as const;
