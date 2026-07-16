import type { EffectType } from "./effect-form";
import type { RowType, TargetPolicy, TargetScope } from "./spell-form";

export const TARGET_ROW_TYPES_IN_COMBAT_ORDER: readonly RowType[] = [
  "tank",
  "melee",
  "ranged",
  "support",
];

interface TargetingRuleConfig {
  targetPolicy: TargetPolicy | "";
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}

interface TargetingRuleCopy {
  eligibleRows: string;
  selection: string;
}

const POLICY_LABELS: Record<TargetPolicy, string> = {
  highest_health: "Highest health",
  lowest_health: "Lowest health",
  highest_damage: "Highest damage",
  random: "Random selection",
  self: "Self priority",
};

export function getEffectiveAllowedRows(allowedRowTypes: RowType[]): RowType[] {
  if (allowedRowTypes.length === 0) {
    return [...TARGET_ROW_TYPES_IN_COMBAT_ORDER];
  }

  return TARGET_ROW_TYPES_IN_COMBAT_ORDER.filter((rowType) => allowedRowTypes.includes(rowType));
}

function formatRowList(rowTypes: RowType[]): string {
  const labels = rowTypes.map((rowType) => rowType.charAt(0).toUpperCase() + rowType.slice(1));

  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export interface TargetingEffectSummary {
  id: string;
  name: string;
  effectType: EffectType;
}

type TargetAllegiance = "allies" | "enemies";

const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  buff: "Buff",
  debuff: "Debuff",
  healing: "Healing",
  damage: "Damage",
};

function effectAllegiance(effectType: EffectType): TargetAllegiance {
  return effectType === "buff" || effectType === "healing" ? "allies" : "enemies";
}

function formatEffectTypeList(effectTypes: EffectType[]): string {
  const labels = effectTypes.map((effectType) => EFFECT_TYPE_LABELS[effectType]);
  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function buildTargetSideSummary(
  targetScope: TargetScope,
  linkedEffects: readonly (TargetingEffectSummary | null)[],
): string {
  if (targetScope === "self") {
    return "Target side: Caster. Self scope overrides the first effect's normal allegiance, so every linked effect applies to the caster.";
  }

  if (linkedEffects.length === 0) {
    return "Target side: Add an effect to determine whether this spell targets allies or enemies.";
  }

  const firstEffect = linkedEffects[0];
  if (!firstEffect) {
    return "Target side: Waiting for the first linked effect's details.";
  }

  const allegiance = effectAllegiance(firstEffect.effectType);
  const side =
    allegiance === "enemies"
      ? "Enemies"
      : targetScope === "others"
        ? "Allies other than the caster"
        : "Allies, including the caster";
  const base = `Target side: ${side}. The first linked effect, ${firstEffect.name} (${EFFECT_TYPE_LABELS[firstEffect.effectType]}), determines the target side for every effect in this spell.`;
  const laterEffects = linkedEffects.slice(1);

  if (laterEffects.some((effect) => effect === null)) return base;

  const oppositeTypes = Array.from(
    new Set(
      laterEffects
        .filter((effect): effect is TargetingEffectSummary => effect !== null)
        .filter((effect) => effectAllegiance(effect.effectType) !== allegiance)
        .map((effect) => effect.effectType),
    ),
  );

  if (oppositeTypes.length === 0) return base;

  return `${base} Mixed effects keep this target side; later ${formatEffectTypeList(oppositeTypes)} effects also apply to those ${allegiance}.`;
}

export function buildTargetingRuleSummary(config: TargetingRuleConfig): TargetingRuleCopy {
  const eligibleRows = getEffectiveAllowedRows(config.allowedRowTypes);
  const effectiveRowCount = Math.min(config.targetRowCount, eligibleRows.length);
  const rowNoun = effectiveRowCount === 1 ? "row" : "rows";
  const rowRule = `Hits up to ${effectiveRowCount} occupied eligible ${rowNoun} per cast.`;

  let targetRule: string;
  if (config.maxTargetsPerRow === null) {
    targetRule =
      "All living units in each selected row are targeted; position does not limit targeting.";
  } else {
    const priority = config.targetPolicy
      ? POLICY_LABELS[config.targetPolicy]
      : "The selected priority";

    if (config.targetOnlyAdjacent) {
      targetRule = `${priority} chooses the primary unit in each selected row; up to ${config.maxTargetsPerRow} units form one adjacent group around it.`;
    } else if (config.maxTargetsPerRow === 1) {
      targetRule = `${priority} chooses 1 unit in each selected row; it may occupy any position.`;
    } else {
      targetRule = `${priority} chooses up to ${config.maxTargetsPerRow} units in each selected row; they may occupy any positions.`;
    }
  }

  return {
    eligibleRows: `Eligible rows: ${formatRowList(eligibleRows)}.`,
    selection: `${rowRule} ${targetRule}`,
  };
}

export function TargetingRuleSummary(props: TargetingRuleConfig) {
  const summary = buildTargetingRuleSummary(props);

  return (
    <div
      className="targeting-rule-summary"
      data-testid="spell-targeting-summary"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="targeting-rule-summary-rows">{summary.eligibleRows}</p>
      <p>{summary.selection}</p>
    </div>
  );
}
