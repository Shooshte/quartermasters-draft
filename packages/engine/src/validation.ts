import { ROW_TYPES, type BattleInput, type RowType, type UnitInput } from "./types";

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

  const deployedUnits = input.scenarios.flatMap((scenario) =>
    ROW_TYPES.flatMap((rowType) =>
      (scenario.rows?.[rowType] ?? []).map((unit) => ({ rowType, unit })),
    ),
  );
  const units = deployedUnits.map(({ unit }) => unit);
  const invalidSelfTargeter = units.find(
    (unit) => (unit.targetSide ?? "enemies") === "enemies" && unit.targetPolicy === "self",
  );
  if (invalidSelfTargeter) {
    throw new InvalidBattleInputError(
      `Self targeting policy is invalid for the enemy target side on unit ${invalidSelfTargeter.name}.`,
    );
  }

  for (const { rowType, unit } of deployedUnits) {
    validateTargetCount(unit);
    validateItemRows(unit, rowType);
  }

  const livingUnits = units.filter((unit) => (unit.currentHealth ?? unit.stats.health) > 0);

  if (livingUnits.length === 0) {
    throw new InvalidBattleInputError("Battle initialization requires at least one living unit.");
  }
}

function validateTargetCount(unit: UnitInput): void {
  if (
    unit.targetCount !== undefined &&
    (!Number.isInteger(unit.targetCount) || unit.targetCount <= 0)
  ) {
    throw new InvalidBattleInputError("Target count must be a positive integer");
  }
}

function validateItemRows(unit: UnitInput, deployedRow: RowType): void {
  let allowedRows = new Set<RowType>(ROW_TYPES);

  for (const item of unit.items ?? []) {
    const itemRows = item.allowedRowTypes ?? [];
    if (new Set(itemRows).size !== itemRows.length) {
      throw new InvalidBattleInputError(`${item.name} has duplicate allowed row types`);
    }

    const restriction = itemRows.length === 0 ? ROW_TYPES : itemRows;
    allowedRows = new Set([...allowedRows].filter((rowType) => restriction.includes(rowType)));
  }

  if (allowedRows.size === 0) {
    throw new InvalidBattleInputError(`${unit.name} has no shared allowed item rows`);
  }

  if (!allowedRows.has(deployedRow)) {
    throw new InvalidBattleInputError(`${unit.name} cannot be deployed in ${deployedRow}`);
  }
}
