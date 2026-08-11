import { getUnitEffectiveStats } from "./math";
import { allUnits, asInternalState, cloneState, findUnitById } from "./state";
import type {
  ActiveEffectState,
  BattleLogEntry,
  BattleState,
  BattleUnitState,
  ShieldLayer,
} from "./types";

export type ActionOperation =
  | { kind: "damage"; targetId: string; amount: number; bypassesShield?: true }
  | { kind: "healing"; targetId: string; amount: number }
  | { kind: "health-cost"; targetId: string; amount: number }
  | { kind: "mana-cost"; targetId: string; amount: number }
  | { kind: "add-effect"; targetId: string; effect: ActiveEffectState }
  | { kind: "grant-shield"; targetId: string; layer: ShieldLayer };

export type PlannedAction = {
  actorId: string;
  actionId: string;
  operations: ActionOperation[];
  log: BattleLogEntry[];
};

type ActionPlanningState = BattleState & {
  __actionOperations?: ActionOperation[];
};

type OperationTotals = {
  damage: number;
  healing: number;
  healthCost: number;
  manaCost: number;
};

export function clonePlanningState(
  snapshot: BattleState,
  random: () => number,
  allocateEffectId: () => string,
): BattleState {
  const planningState = cloneState(snapshot);
  const internal = asInternalState(planningState);
  internal.__rng = random;
  internal.__effectCounter = 0;
  internal.__scenarioOrder = planningState.scenarios.map((scenario) => scenario.id);
  internal.__allocateEffectId = allocateEffectId;
  (planningState as ActionPlanningState).__actionOperations = [];
  return planningState;
}

export function recordActionOperation(state: BattleState, operation: ActionOperation): void {
  const operations = (state as ActionPlanningState).__actionOperations;
  if (operations) {
    operations.push(structuredClone(operation));
  }
}

export function getRecordedActionOperations(state: BattleState): ActionOperation[] {
  return structuredClone((state as ActionPlanningState).__actionOperations ?? []);
}

function zeroTotals(): OperationTotals {
  return { damage: 0, healing: 0, healthCost: 0, manaCost: 0 };
}

export function applyDamage(unit: BattleUnitState, amount: number, bypassesShield = false): number {
  let remainingDamage = amount;
  if (!bypassesShield) {
    for (const layer of unit.shieldLayers) {
      const absorbed = Math.min(layer.remaining, remainingDamage);
      layer.remaining -= absorbed;
      remainingDamage -= absorbed;
      if (remainingDamage === 0) break;
    }
    unit.shieldLayers = unit.shieldLayers.filter((layer) => layer.remaining > 0);
  }
  const healthDamage = Math.min(unit.currentHealth, remainingDamage);
  unit.currentHealth -= healthDamage;
  return healthDamage;
}

function hasShieldResolution(
  target: BattleUnitState,
  operations: readonly ActionOperation[],
): boolean {
  return (
    target.shieldLayers.length > 0 ||
    operations.some((operation) => operation.kind === "grant-shield")
  );
}

function applyShieldAwareOperations(
  target: BattleUnitState,
  operations: readonly ActionOperation[],
  maximumHealth: number,
): void {
  for (const operation of operations) {
    switch (operation.kind) {
      case "damage":
        applyDamage(target, operation.amount, operation.bypassesShield === true);
        break;
      case "healing":
        target.currentHealth = Math.min(maximumHealth, target.currentHealth + operation.amount);
        break;
      case "health-cost":
        applyDamage(target, operation.amount);
        break;
      case "grant-shield":
        target.shieldLayers.push(structuredClone(operation.layer));
        break;
      case "add-effect":
      case "mana-cost":
        break;
    }
  }
}

export function commitPlannedActions(
  state: BattleState,
  plans: readonly PlannedAction[],
  batchNumber: number,
): string[] {
  const targetIds = new Set(
    plans.flatMap((plan) => plan.operations.map((operation) => operation.targetId)),
  );
  const targets = new Map(
    [...targetIds].map((targetId) => {
      const target = findUnitById(state, targetId);
      if (!target) {
        throw new Error(`Action operation target ${targetId} was not found in battle state.`);
      }
      return [targetId, target] as const;
    }),
  );
  const wasAlive = new Map(
    [...targets].map(([targetId, target]) => [targetId, target.currentHealth > 0]),
  );
  const oldManaMaximums = new Map(
    [...targets].map(([targetId, target]) => [targetId, getUnitEffectiveStats(target).mana]),
  );

  for (const plan of plans) {
    for (const operation of plan.operations) {
      if (operation.kind === "add-effect") {
        const target = targets.get(operation.targetId);
        if (!target) {
          throw new Error(`Action operation target ${operation.targetId} was not validated.`);
        }
        target.activeEffects.push(structuredClone(operation.effect));
      }
    }
  }

  const totals = new Map<string, OperationTotals>();
  const operationsByTarget = new Map<string, ActionOperation[]>();
  for (const plan of plans) {
    for (const operation of plan.operations) {
      const targetOperations = operationsByTarget.get(operation.targetId) ?? [];
      targetOperations.push(operation);
      operationsByTarget.set(operation.targetId, targetOperations);
      if (operation.kind === "add-effect") continue;
      const targetTotals = totals.get(operation.targetId) ?? zeroTotals();
      switch (operation.kind) {
        case "damage":
          targetTotals.damage += operation.amount;
          break;
        case "healing":
          targetTotals.healing += operation.amount;
          break;
        case "health-cost":
          targetTotals.healthCost += operation.amount;
          break;
        case "mana-cost":
          targetTotals.manaCost += operation.amount;
          break;
        case "grant-shield":
          break;
      }
      totals.set(operation.targetId, targetTotals);
    }
  }

  for (const [targetId, target] of targets) {
    const targetTotals = totals.get(targetId) ?? zeroTotals();
    const operations = operationsByTarget.get(targetId) ?? [];
    const updatedStats = getUnitEffectiveStats(target);
    if (hasShieldResolution(target, operations)) {
      applyShieldAwareOperations(target, operations, updatedStats.health);
    } else {
      target.currentHealth = Math.max(
        0,
        Math.min(
          updatedStats.health,
          target.currentHealth +
            targetTotals.healing -
            targetTotals.damage -
            targetTotals.healthCost,
        ),
      );
    }
    const oldMaximumMana = oldManaMaximums.get(targetId);
    if (oldMaximumMana === undefined) {
      throw new Error(`Mana capacity for action operation target ${targetId} was not recorded.`);
    }
    target.mana = Math.max(
      0,
      Math.min(
        updatedStats.mana,
        target.mana + updatedStats.mana - oldMaximumMana - targetTotals.manaCost,
      ),
    );
  }

  for (const plan of plans) {
    state.log.push(...structuredClone(plan.log));
  }
  for (const unit of allUnits(state)) {
    if (wasAlive.get(unit.instanceId) && unit.currentHealth === 0) {
      state.log.push({
        batchNumber,
        type: "death",
        unit: unit.name,
        unitId: unit.instanceId,
        message: `${unit.name} dies`,
      });
    }
  }

  return plans.map((plan) => plan.actorId);
}
