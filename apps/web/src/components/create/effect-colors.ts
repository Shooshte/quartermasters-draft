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
  durationMs: "Duration (ms)",
  intervalMs: "Interval (ms)",
  triggerCount: "Triggers",
  meleeDmg: "Mel",
  rangedDmg: "Rng",
  spellDmg: "Spl",
  health: "HP",
  dodge: "Dodge",
  criticalChance: "Crit",
  speed: "Speed",
  manaRegen: "Mana",
  directHealing: "D.Heal",
  directMeleeDmg: "D.Mel",
  directRangedDmg: "D.Rng",
  directSpellDmg: "D.Spl",
};

/** Modifier field groups rendered as categorized sections. */
export const MODIFIER_GROUPS = [
  { label: "Combat Buff", fields: ["meleeDmg", "rangedDmg", "spellDmg"] as const, cols: 3 },
  { label: "Defense Buff", fields: ["health", "dodge", "criticalChance"] as const, cols: 3 },
  { label: "Utility Buff", fields: ["speed", "manaRegen"] as const, cols: 2 },
  { label: "One Time Effect", fields: ["directHealing", "directMeleeDmg", "directRangedDmg", "directSpellDmg"] as const, cols: 4 },
] as const;

/** Timing fields rendered together in the Timing section. */
export const TIMING_FIELDS = ["durationMs", "intervalMs", "triggerCount"] as const;
