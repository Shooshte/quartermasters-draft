import {
  type BattleInput,
  type EffectTemplateInput,
  ROW_TYPES,
  type RowType,
  STAT_KEYS,
  TARGET_PRIORITIES,
  TARGET_SCOPES,
  TARGET_SELECTION_SHAPES,
  type UnitInput,
} from "./types";

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
  for (const { rowType, unit } of deployedUnits) {
    validateTargetingConfiguration(unit);
    validateTargetCount(unit);
    validateItemRows(unit, rowType);
    validateEffectTiming(unit);
  }

  const livingUnits = deployedUnits
    .map(({ unit }) => unit)
    .filter((unit) => (unit.currentHealth ?? unit.stats.health) > 0);

  if (livingUnits.length === 0) {
    throw new InvalidBattleInputError("Battle initialization requires at least one living unit.");
  }
}

function validateEffectTiming(unit: UnitInput): void {
  for (const { effect } of (unit.items ?? []).flatMap((item) => item.effects ?? [])) {
    validateEffectShieldLifecycle(effect);

    if (effect.isTaunt && effect.timingType === "interval") {
      throw new InvalidBattleInputError(
        `Taunt effect "${effect.name ?? "Effect"}" must use instant timing.`,
      );
    }
    if (
      effect.isTaunt &&
      effect.timingType === "instant" &&
      effect.lastsForActions != null &&
      (!Number.isInteger(effect.lastsForActions) || effect.lastsForActions <= 0)
    ) {
      throw new InvalidBattleInputError(
        `Taunt effect "${effect.name ?? "Effect"}" must have a positive duration.`,
      );
    }

    const intervalTimingMissing =
      effect.timingType === "interval" &&
      (effect.triggerEveryActions == null || effect.triggerCount == null);
    const hasStatModifier = STAT_KEYS.some((statKey) => effect[statKey] != null);
    const hasShield = typeof effect.shield === "number" && effect.shield > 0;
    const actionDurationMissing =
      !effect.isTaunt &&
      effect.timingType === "instant" &&
      (effect.effectType === "buff" || effect.effectType === "debuff") &&
      (hasStatModifier || hasShield) &&
      effect.lastsForActions == null;

    if (intervalTimingMissing || actionDurationMissing) {
      throw new InvalidBattleInputError(
        `Effect "${effect.name ?? "Effect"}" timing needs configuration.`,
      );
    }
  }
}

export function validateEffectShieldLifecycle(effect: EffectTemplateInput): void {
  const hasPositiveShield = typeof effect.shield === "number" && effect.shield > 0;
  const hasSupportedLifecycle =
    effect.timingType === "instant" &&
    (effect.effectType === "buff" || effect.effectType === "debuff");

  if (hasPositiveShield && !hasSupportedLifecycle) {
    throw new InvalidBattleInputError(
      `Effect "${effect.name ?? "Effect"}" shield is only supported for instant buffs and debuffs.`,
    );
  }
}

function validateTargetingConfiguration(unit: UnitInput): void {
  if (
    unit.targetScope !== undefined &&
    !TARGET_SCOPES.some((targetScope) => targetScope === unit.targetScope)
  ) {
    throw new InvalidBattleInputError(
      `Invalid target scope "${String(unit.targetScope)}" for ${unit.name}.`,
    );
  }
  if (
    unit.targetPriority !== undefined &&
    !TARGET_PRIORITIES.some((targetPriority) => targetPriority === unit.targetPriority)
  ) {
    throw new InvalidBattleInputError(
      `Invalid target priority "${String(unit.targetPriority)}" for ${unit.name}.`,
    );
  }
  if (
    unit.selectionShape !== undefined &&
    !TARGET_SELECTION_SHAPES.some((selectionShape) => selectionShape === unit.selectionShape)
  ) {
    throw new InvalidBattleInputError(
      `Invalid selection shape "${String(unit.selectionShape)}" for ${unit.name}.`,
    );
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
