import { createSeededRandom } from "./rng";
import { ROW_ORDER } from "./rows";
import type {
  BattleInput,
  BattleItemState,
  BattleOptions,
  BattleScenarioState,
  BattleState,
  BattleUnitState,
  ItemInput,
  RowType,
  ScenarioInput,
  StatKey,
  UnitInput,
  UnitStats,
} from "./types";
import { validateBattleInput } from "./validation";

type InternalBattleState = BattleState & {
  __rng: () => number;
  __effectCounter: number;
  __resolveActionsOnTick: boolean;
  __scenarioOrder: string[];
};

function zeroStats(): UnitStats {
  return {
    health: 0,
    mana: 0,
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    speed: 0,
    dodge: 0,
    criticalChance: 0,
  };
}

function normalizeItem(item: ItemInput): BattleItemState {
  return {
    id: item.id,
    name: item.name,
    mana: item.mana ?? 0,
    meleeDmg: item.meleeDmg ?? 0,
    rangedDmg: item.rangedDmg ?? 0,
    manaRegen: item.manaRegen ?? 0,
    spellDmg: item.spellDmg ?? 0,
    dodge: item.dodge ?? 0,
    criticalChance: item.criticalChance ?? 0,
    activationManaCost: item.activationManaCost ?? 0,
    activationHealthCost: item.activationHealthCost ?? 0,
    allowedRowTypes: item.allowedRowTypes ? [...item.allowedRowTypes] : undefined,
    effects: [...(item.effects ?? [])].sort(
      (left, right) => left.sequenceOrder - right.sequenceOrder,
    ),
  };
}

function itemBonusStats(items: BattleItemState[]): UnitStats {
  const totals = zeroStats();
  for (const item of items) {
    totals.mana += item.mana;
    totals.meleeDmg += item.meleeDmg;
    totals.rangedDmg += item.rangedDmg;
    totals.manaRegen += item.manaRegen;
    totals.spellDmg += item.spellDmg;
    totals.dodge += item.dodge;
    totals.criticalChance += item.criticalChance;
  }
  return totals;
}

function createUnitState(
  scenarioId: string,
  rowType: RowType,
  slot: number,
  unit: UnitInput,
): BattleUnitState {
  const items = (unit.items ?? []).map(normalizeItem);
  const bonuses = itemBonusStats(items);
  return {
    instanceId: `${scenarioId}:${rowType}:${slot}`,
    templateId: unit.id,
    scenarioId,
    rowType,
    slot,
    name: unit.name,
    baseStats: { ...unit.stats },
    itemBonusStats: bonuses,
    currentHealth: unit.currentHealth ?? unit.stats.health,
    mana: Math.max(0, unit.stats.mana + bonuses.mana),
    actionBar: unit.startingActionBar ?? 0,
    items,
    targetScope: unit.targetScope ?? "enemies",
    targetPriority: unit.targetPriority ?? "highest_health",
    targetCount: unit.targetCount ?? 1,
    selectionShape: unit.selectionShape ?? "individual",
    activeEffects: [],
    actedCount: 0,
  };
}

function createScenarioState(scenario: ScenarioInput): BattleScenarioState {
  const rows = {
    tank: [],
    melee: [],
    ranged: [],
    support: [],
  } as BattleScenarioState["rows"];

  for (const rowType of ROW_ORDER) {
    const rowUnits = scenario.rows?.[rowType] ?? [];
    rows[rowType] = rowUnits.map((unit, index) =>
      createUnitState(scenario.id, rowType, index + 1, unit),
    );
  }

  return {
    id: scenario.id,
    name: scenario.name,
    rows,
  };
}

export function initializeBattleState(
  input: BattleInput,
  options: BattleOptions = {},
): BattleState {
  validateBattleInput(input);

  const state: InternalBattleState = {
    tick: 0,
    status: "active",
    winnerId: null,
    scenarios: input.scenarios.map(createScenarioState) as BattleState["scenarios"],
    log: [],
    fatigueTickThreshold: options.fatigueTickThreshold ?? 100,
    fatigueDamageStart: options.fatigueDamageStart ?? 1,
    __rng: createSeededRandom(input.seed),
    __effectCounter: 0,
    __resolveActionsOnTick: options.resolveActionsOnTick ?? true,
    __scenarioOrder: input.scenarios.map((scenario) => scenario.id),
  };

  return state;
}

export function asInternalState(state: BattleState): InternalBattleState {
  return state as InternalBattleState;
}

export function getResolveActionsOnTick(state: BattleState): boolean {
  return asInternalState(state).__resolveActionsOnTick;
}

export function nextRandom(state: BattleState): number {
  return asInternalState(state).__rng();
}

export function nextEffectId(state: BattleState): string {
  const internal = asInternalState(state);
  internal.__effectCounter += 1;
  return `active-effect-${internal.__effectCounter}`;
}

export function allUnits(state: BattleState): BattleUnitState[] {
  return state.scenarios.flatMap((scenario) =>
    ROW_ORDER.flatMap((rowType) => scenario.rows[rowType]),
  );
}

export function findScenario(state: BattleState, scenarioId: string) {
  return state.scenarios.find((scenario) => scenario.id === scenarioId);
}

export function findUnitById(state: BattleState, unitId: string): BattleUnitState | undefined {
  return allUnits(state).find((unit) => unit.instanceId === unitId);
}

export function livingUnitsForScenario(state: BattleState, scenarioId: string): BattleUnitState[] {
  return allUnits(state).filter((unit) => unit.scenarioId === scenarioId && unit.currentHealth > 0);
}

export function opposingScenarioId(state: BattleState, scenarioId: string): string {
  const other = state.scenarios.find((scenario) => scenario.id !== scenarioId);
  if (!other) {
    throw new Error(`No opposing scenario for ${scenarioId}`);
  }
  return other.id;
}

export function cloneState(state: BattleState): BattleState {
  return structuredClone({
    tick: state.tick,
    status: state.status,
    winnerId: state.winnerId,
    scenarios: state.scenarios,
    log: state.log,
    fatigueTickThreshold: state.fatigueTickThreshold,
    fatigueDamageStart: state.fatigueDamageStart,
  } satisfies BattleState);
}

export function getScenarioOrderIndex(state: BattleState, scenarioId: string): number {
  return asInternalState(state).__scenarioOrder.indexOf(scenarioId);
}

export function isUnitAlive(unit: BattleUnitState): boolean {
  return unit.currentHealth > 0;
}

export function clampHealth(unit: BattleUnitState, maxHealth: number): void {
  if (unit.currentHealth < 0) {
    unit.currentHealth = 0;
  }
  if (unit.currentHealth > maxHealth) {
    unit.currentHealth = maxHealth;
  }
}

export function reconcileManaForCapacityChange(
  unit: BattleUnitState,
  oldMaximum: number,
  newMaximum: number,
): void {
  unit.mana = Math.min(newMaximum, Math.max(0, unit.mana + newMaximum - oldMaximum));
}

export function createActiveModifier(statKey: StatKey, value: number) {
  return { statKey, value };
}
