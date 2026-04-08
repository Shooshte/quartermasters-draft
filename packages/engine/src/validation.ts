import type { BattleInput } from "./types";

export function validateBattleInput(input: BattleInput): void {
  if (!Number.isFinite(input.seed)) {
    throw new Error("Battle seed must be a finite number.");
  }

  const livingUnits = input.scenarios.flatMap((scenario) =>
    Object.values(scenario.rows ?? {}).flat().filter((unit) => (unit.currentHealth ?? unit.stats.health) > 0),
  );

  if (livingUnits.length === 0) {
    throw new Error("Battle initialization requires at least one living unit.");
  }
}
