import type { BattleInput } from "./types";

export class InvalidBattleInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBattleInputError";
  }
}

export type InvalidBattleStateCode = "CASTER_SCENARIO_NOT_FOUND" | "OPPOSING_SCENARIO_NOT_FOUND";

export class InvalidBattleStateError extends Error {
  readonly code: InvalidBattleStateCode;

  constructor(code: InvalidBattleStateCode, message: string) {
    super(message);
    this.name = "InvalidBattleStateError";
    this.code = code;
  }
}

export function validateBattleInput(input: BattleInput): void {
  if (typeof input.seed !== "number" && typeof input.seed !== "string") {
    throw new InvalidBattleInputError("Battle seed must be a finite number or non-blank string.");
  }
  if (typeof input.seed === "number" && !Number.isFinite(input.seed)) {
    throw new InvalidBattleInputError("Battle seed must be a finite number or non-blank string.");
  }
  if (typeof input.seed === "string" && input.seed.trim().length === 0) {
    throw new InvalidBattleInputError("Battle seed must not be blank.");
  }

  const units = input.scenarios.flatMap((scenario) => Object.values(scenario.rows ?? {}).flat());
  const invalidSelfTargeter = units.find(
    (unit) => (unit.targetSide ?? "enemies") === "enemies" && unit.targetPolicy === "self",
  );
  if (invalidSelfTargeter) {
    throw new InvalidBattleInputError(
      `Self targeting policy is invalid for the enemy target side on unit ${invalidSelfTargeter.name}.`,
    );
  }

  const livingUnits = units.filter((unit) => (unit.currentHealth ?? unit.stats.health) > 0);

  if (livingUnits.length === 0) {
    throw new InvalidBattleInputError("Battle initialization requires at least one living unit.");
  }
}
