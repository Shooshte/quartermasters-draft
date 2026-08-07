import type { TargetPriority, TargetScope, TargetSelectionShape } from "./unit-form";

interface UnitTargetingConfig {
  targetScope: TargetScope | "";
  targetPriority: TargetPriority | "";
  targetCount: number;
  selectionShape: TargetSelectionShape;
}

interface UnitTargetingCopy {
  priority: string;
  selection: string;
}

const SCOPE_LABELS: Record<TargetScope, string> = {
  self: "the caster",
  self_allies: "the caster or allies",
  self_enemies: "the caster or enemies",
  allies: "allies",
  enemies: "enemies",
  both: "allies or enemies",
};

const PRIORITY_LABELS: Record<TargetPriority, string> = {
  highest_health: "highest health",
  lowest_health: "lowest health",
  highest_damage: "highest damage",
  support: "support units",
  random: "random selection",
};

export function buildUnitTargetingSummary(config: UnitTargetingConfig): UnitTargetingCopy {
  const count = Math.max(1, config.targetCount);
  const scope = config.targetScope ? SCOPE_LABELS[config.targetScope] : "the selected scope";
  const selection =
    config.selectionShape === "adjacent"
      ? `Targets one adjacent group of up to ${count} units among ${scope}.`
      : `Targets up to ${count} ${scope} individually.`;
  const priority = config.targetPriority
    ? `Prioritizes ${PRIORITY_LABELS[config.targetPriority]}.`
    : "Select a target priority.";

  return { priority, selection };
}

export function UnitTargetingSummary(props: UnitTargetingConfig) {
  const summary = buildUnitTargetingSummary(props);

  return (
    <div
      className="targeting-rule-summary"
      data-testid="unit-targeting-summary"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="targeting-rule-summary-rows">{summary.selection}</p>
      <p className="targeting-rule-summary-side">{summary.priority}</p>
    </div>
  );
}
