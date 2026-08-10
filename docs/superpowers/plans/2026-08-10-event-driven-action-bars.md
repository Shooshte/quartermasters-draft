# Event-Driven Action Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tick-driven battle simulation with event-driven action bars, simultaneous ready-unit batches, affected-unit action timing for effects, and fatigue after 500 resolved actions.

**Architecture:** A pure scheduler advances all living bars directly to the next readiness moment. Ready units enter a three-phase batch: simultaneous pre-action effects, isolated action planning from one shared snapshot, and an aggregated commit. Persistence, APIs, forms, logs, and result views expose action-based names only; legacy timed effects remain editable but cannot enter battle until reconfigured.

**Tech Stack:** TypeScript 6, Vitest 4, Drizzle ORM/PostgreSQL, tRPC 11 with Zod 4, React 19, TanStack Start, Playwright, pnpm 10.

## Global Constraints

- Treat `packages/engine/features/*.feature` and `e2e/features/**/*.feature` as acceptance criteria.
- Follow test-driven development: add each test first, run it and observe the expected failure, then implement the smallest passing change.
- Add no dependencies.
- Clamp scheduling speed to a minimum of exactly `1`; do not rewrite the displayed effective stat.
- Put every unit reaching action bar `100` at the same readiness moment into one simultaneous batch.
- Calculate every normal action in a batch from the same post-pre-effect snapshot; display/log ordering must not affect state.
- Advance interval and duration counters only from the affected unit's action lifecycle.
- Use `triggerEveryActions` and `lastsForActions`; do not add compatibility aliases.
- Apply no fatigue for actions 1–500. Action 501 contributes 1 damage, action 502 contributes 2, and simultaneous contributions are summed before one commit.
- Do not convert persisted timing values. Invalid legacy records report **Timing needs configuration** and are rejected from battle explicitly.
- Preserve seeded determinism and deterministic seed IDs.
- Build internal dependencies before dependent package tests because packages export `dist` artifacts.
- Finish with `pnpm run test`, `pnpm run test:e2e`, `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` passing.

## File Structure

- `packages/engine/src/action-scheduler.ts`: minimum-progress calculation and ready-batch membership.
- `packages/engine/src/action-operations.ts`: raw action operations, private planning application, and simultaneous commit.
- `packages/engine/src/effects.ts`: affected-unit counters, simultaneous pre-action triggers, and post-action expiry.
- `packages/engine/src/resolution.ts`: plan one actor's action without mutating shared battle state.
- `packages/engine/src/battle-engine.ts`: batch orchestration, action counts, fatigue, and victory.
- `packages/engine/src/{types,state,logging,validation,targeting}.ts`: action-based contracts and validation.
- `packages/db/src/{schema,seed-data}.ts` and `packages/db/drizzle/0017_event_driven_effect_timing.sql`: persistence and migration.
- `packages/api/src/routers/{scenarioBuilder,battleLab}`: action timing CRUD and battle mapping.
- `apps/web/src/components/create`: effect timing authoring and repair warnings.
- `apps/web/src/components/battle`: batch-grouped ledger and action-based result language.
- Existing feature, unit, integration, and E2E tests: acceptance coverage at every layer.

---

### Task 1: Add the Pure Event-Driven Scheduler

**Files:**
- Create: `packages/engine/src/action-scheduler.ts`
- Create: `packages/engine/src/action-scheduler.test.ts`
- Modify: `packages/engine/features/action-bar.feature`

**Interfaces:**
- Produces `READY_EPSILON = 1e-9`.
- Produces `getSchedulingSpeed(unit: BattleUnitState): number`.
- Produces `advanceToNextReadyBatch(state: BattleState): BattleUnitState[]`; it mutates living bars only.

- [ ] **Step 1: Rewrite the action-bar acceptance criteria**

Replace tick accumulation scenarios with:

```gherkin
Feature: Event-driven ATB action scheduling
  Scenario: All living bars advance proportionally to the next ready unit
    Given "Quick Fox" has speed 60 and action bar 0
    And "Slow Turtle" has speed 30 and action bar 0
    When the next ready batch is scheduled
    Then "Quick Fox" has action bar 100
    And "Slow Turtle" has action bar 50
    And the ready batch contains only "Quick Fox"

  Scenario: Equal readiness moments form one batch
    Given "Fast" has speed 20 and action bar 0
    And "Head Start" has speed 10 and action bar 50
    When the next ready batch is scheduled
    Then the ready batch contains "Fast" and "Head Start"

  Scenario: Zero effective speed schedules at the minimum speed
    Given "Frozen" has effective speed 0
    When the next ready batch is scheduled
    Then "Frozen" uses scheduling speed 1
```

Retain deterministic speed/scenario/row/slot ordering, but state that it orders seeded RNG consumption and logs only.

- [ ] **Step 2: Write failing scheduler tests**

Create `action-scheduler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { advanceToNextReadyBatch, getSchedulingSpeed } from "./action-scheduler";
import { initializeBattleState } from "./state";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

function schedulerState() {
  return initializeBattleState(createBattleInput([
    createScenario("A", { melee: [
      createUnit("Quick Fox", { stats: createStats({ speed: 60 }) }),
      createUnit("Slow Turtle", { stats: createStats({ speed: 30 }) }),
    ] }),
    createScenario("B", { tank: [createUnit("Dummy", { stats: createStats({ speed: 1 }) })] }),
  ]));
}

describe("event-driven action scheduler", () => {
  it("advances every living bar only far enough for the next unit", () => {
    const state = schedulerState();
    expect(advanceToNextReadyBatch(state).map((unit) => unit.name)).toEqual(["Quick Fox"]);
    expect(state.scenarios[0].rows.melee.map((unit) => unit.actionBar)).toEqual([100, 50]);
  });

  it("groups equal readiness moments", () => {
    const state = schedulerState();
    const [fast, headStart] = state.scenarios[0].rows.melee;
    fast!.baseStats.speed = 20;
    headStart!.baseStats.speed = 10;
    headStart!.actionBar = 50;
    expect(advanceToNextReadyBatch(state).map((unit) => unit.name)).toEqual([
      "Quick Fox", "Slow Turtle",
    ]);
  });

  it("uses one as minimum scheduling speed", () => {
    const state = schedulerState();
    const frozen = state.scenarios[0].rows.melee[0]!;
    frozen.baseStats.speed = 0;
    expect(getSchedulingSpeed(frozen)).toBe(1);
  });
});
```

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @qd/engine test -- src/action-scheduler.test.ts`

Expected: FAIL because `action-scheduler.ts` does not exist.

- [ ] **Step 4: Implement the scheduler**

```ts
import { getUnitEffectiveStats } from "./math";
import { compareUnitOrder } from "./rows";
import { allUnits, getScenarioOrderIndex } from "./state";
import type { BattleState, BattleUnitState } from "./types";

export const READY_EPSILON = 1e-9;

export function getSchedulingSpeed(unit: BattleUnitState): number {
  return Math.max(1, getUnitEffectiveStats(unit).speed);
}

export function advanceToNextReadyBatch(state: BattleState): BattleUnitState[] {
  const living = allUnits(state).filter((unit) => unit.currentHealth > 0);
  const progress = Math.min(
    ...living.map((unit) => Math.max(0, 100 - unit.actionBar) / getSchedulingSpeed(unit)),
  );
  for (const unit of living) {
    unit.actionBar = Math.min(100, unit.actionBar + getSchedulingSpeed(unit) * progress);
  }
  return living
    .filter((unit) => unit.actionBar >= 100 - READY_EPSILON)
    .sort((left, right) =>
      getSchedulingSpeed(right) - getSchedulingSpeed(left) ||
      getScenarioOrderIndex(state, left.scenarioId) - getScenarioOrderIndex(state, right.scenarioId) ||
      compareUnitOrder(left, right),
    );
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --filter @qd/engine test -- src/action-scheduler.test.ts`

Expected: 3 tests pass.

```bash
git add packages/engine/src/action-scheduler.ts packages/engine/src/action-scheduler.test.ts packages/engine/features/action-bar.feature
git commit -m "feat(engine): schedule event-driven action batches"
```

---

### Task 2: Replace Tick-Based Effect Lifecycles

**Files:**
- Modify: `packages/engine/src/types.ts`
- Modify: `packages/engine/src/effects.ts`
- Modify: `packages/engine/src/logging.ts`
- Modify: `packages/engine/src/targeting.ts`
- Modify: `packages/engine/src/test-helpers.ts`
- Modify: `packages/engine/src/effects.test.ts`
- Modify: `packages/engine/src/battle-log.test.ts`
- Modify: `packages/engine/src/unit-targeting.test.ts`
- Modify: `packages/engine/features/effects.feature`
- Modify: `packages/engine/features/battle-log.feature`

**Interfaces:**
- `EffectTemplateInput`: `triggerEveryActions`, `triggerCount`, and `lastsForActions`.
- `ActiveEffectState`: `actionsUntilTrigger`, `remainingTriggers`, `triggerEveryActions`, and `actionsRemaining`.
- Produces `processPreActionEffects(state, readyUnitIds, batchNumber): Set<string>`.
- Produces `completeResolvedActionEffects(state, actorIds, eligibleEffectIds, batchNumber): void`; only modifiers present before action commit are eligible.
- Log entries use `batchNumber`; modifier logs use `actionsRemaining`.

- [ ] **Step 1: Rewrite effect acceptance scenarios**

```gherkin
Scenario: An interval effect follows the affected unit's actions
  Given Poison triggers every 2 affected-unit actions for 3 triggers
  When the affected unit reaches its 2nd, 4th, and 6th action opportunities
  Then Poison triggers before each corresponding normal action

Scenario: A modifier covers the target's next actions
  Given Haste lasts for 3 affected-unit actions
  Then Haste modifies scheduling and outcomes for those 3 actions
  And Haste expires after the 3rd resolved action

Scenario: Application does not consume an action
  Given Haste is applied while its target is in the same action batch
  Then Haste begins counting from the target's next action opportunity
```

Change battle-log acceptance criteria from non-decreasing ticks to non-decreasing `batchNumber` and relative `actionsRemaining`.

- [ ] **Step 2: Write failing lifecycle tests**

```ts
it("triggers on the affected unit's second opportunity", () => {
  const state = createEffectState();
  const mage = state.scenarios[0].rows.ranged[0]!;
  const warrior = state.scenarios[1].rows.tank[0]!;
  applyItemEffects(state, mage, createItem({
    name: "Burn",
    effects: effectSequence(createEffect({
      name: "Burning",
      effectType: "damage",
      timingType: "interval",
      directSpellDmg: 20,
      triggerEveryActions: 2,
      triggerCount: 2,
    })),
  }), 1);
  processPreActionEffects(state, [warrior.instanceId], 2);
  expect(warrior.currentHealth).toBe(300);
  processPreActionEffects(state, [warrior.instanceId], 3);
  expect(warrior.currentHealth).toBe(280);
});

it("expires a modifier after its final covered action", () => {
  const state = createEffectState();
  const mage = state.scenarios[0].rows.ranged[0]!;
  mage.activeEffects.push({
    id: "haste", name: "Haste", sourceUnitId: "source", sourceScenarioId: "alpha",
    targetUnitId: mage.instanceId, effectType: "buff", timingType: "instant",
    statKey: "speed", value: 3, actionsRemaining: 2,
  });
  completeResolvedActionEffects(state, [mage.instanceId], new Set(["haste"]), 2);
  expect(getUnitEffectiveStats(mage).speed).toBe(8);
  completeResolvedActionEffects(state, [mage.instanceId], new Set(["haste"]), 3);
  expect(getUnitEffectiveStats(mage).speed).toBe(5);
});
```

Add a third test proving an effect applied in batch 4 retains its full counter until the target's next opportunity.

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @qd/engine test -- src/effects.test.ts src/battle-log.test.ts`

Expected: FAIL because action timing fields and lifecycle functions do not exist.

- [ ] **Step 4: Replace contracts and logs**

```ts
// EffectTemplateInput timing
triggerEveryActions?: number | null;
triggerCount?: number | null;
lastsForActions?: number | null;

// ActiveEffectState timing
remainingTriggers?: number;
actionsUntilTrigger?: number;
triggerEveryActions?: number;
actionsRemaining?: number;

// BaseLogEntry ordering
batchNumber: number;
```

Remove `intervalTicks`, `durationTicks`, `nextTriggerTick`, `intervalTicks`, `expiresAtTick`, and log message prefixes of `Tick N:`. Do not retain aliases.

- [ ] **Step 5: Implement affected-unit counters**

Initialize interval state with:

```ts
remainingTriggers: effect.triggerCount ?? 0,
actionsUntilTrigger: effect.triggerEveryActions ?? 0,
triggerEveryActions: effect.triggerEveryActions ?? 0,
```

Initialize stat modifiers with:

```ts
actionsRemaining: effect.lastsForActions ?? 0,
```

`processPreActionEffects` reads one snapshot for supplied ready IDs, decrements each interval counter once, aggregates due healing and damage per target, clamps once, updates/removes counters, logs after commit, and returns surviving ready IDs. `completeResolvedActionEffects` decrements only supplied actors' modifiers whose IDs occur in `eligibleEffectIds`; it expires them after the final covered action. This prevents a modifier created during the current batch from consuming that batch.

Rename `projectedDamagePerTick` to `projectedDamageRate`; use:

```ts
intervalDamage += intervalDirectDamage(effect) / (effect.triggerEveryActions ?? 1);
```

- [ ] **Step 6: Update engine fixtures and verify GREEN**

Replace all engine test timing fields with the approved names and assertions. Run:

```bash
pnpm --filter @qd/engine test -- src/effects.test.ts src/battle-log.test.ts src/unit-targeting.test.ts
```

Expected: selected tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src packages/engine/features/effects.feature packages/engine/features/battle-log.feature
git commit -m "feat(engine): time effects by affected unit actions"
```

---

### Task 3: Plan and Commit Simultaneous Actions

**Files:**
- Create: `packages/engine/src/action-operations.ts`
- Create: `packages/engine/src/action-operations.test.ts`
- Modify: `packages/engine/src/resolution.ts`
- Modify: `packages/engine/src/effects.ts`
- Modify: `packages/engine/src/state.ts`
- Modify: `packages/engine/src/action-resolution.test.ts`
- Modify: `packages/engine/features/action-resolution.feature`

**Interfaces:**
- Produces `ActionOperation`, a union for raw damage, healing, health cost, mana cost, and active-effect addition.
- Produces `PlannedAction = { actorId, actionId, operations, log }`.
- Produces `clonePlanningState(snapshot, random, allocateEffectId): BattleState`.
- Produces `planUnitAction(snapshot, actorId, batchNumber, random, allocateEffectId): PlannedAction`.
- Produces `commitPlannedActions(state, plans, batchNumber): string[]` returning committed actor IDs.

- [ ] **Step 1: Add simultaneous acceptance scenarios**

```gherkin
Rule: Units ready at the same moment resolve from one snapshot

Scenario: Simultaneous lethal attacks produce a draw
  Given two units reach action bar 100 together
  And each can kill the other
  When their action batch resolves
  Then both actions are logged
  And both units die
  And the battle is a draw

Scenario: Same-batch targeting does not observe another action
  Given two ready attackers prioritize highest health
  When both calculate actions from the same snapshot
  Then both may select the same initially-highest-health target

Scenario: A new modifier does not change another action in its application batch
  Given one ready unit applies a defense buff to an ally
  And an enemy attacks that ally in the same batch
  Then the attack uses the ally's pre-batch defense
```

- [ ] **Step 2: Write failing operation tests**

Create these test-local helpers with the existing factories:

```ts
function operationState(leftHealth: number, rightHealth: number) {
  return initializeBattleState(createBattleInput([
    createScenario("A", {
      tank: [createUnit("Left", { stats: createStats({ health: leftHealth, speed: 100 }) })],
    }),
    createScenario("B", {
      tank: [createUnit("Right", { stats: createStats({ health: rightHealth, speed: 100 }) })],
    }),
  ]));
}

function planned(actorId: string, operation: ActionOperation): PlannedAction {
  return { actorId, actionId: `1:${actorId}:1`, operations: [operation], log: [] };
}
```

Then assert raw aggregation:

```ts
it("aggregates healing and damage before clamping", () => {
  const state = operationState(100, 100);
  const target = state.scenarios[1].rows.tank[0]!;
  target.currentHealth = 90;
  commitPlannedActions(state, [
    planned("healer", { kind: "healing", targetId: target.instanceId, amount: 20 }),
    planned("attacker", { kind: "damage", targetId: target.instanceId, amount: 50 }),
  ], 1);
  expect(target.currentHealth).toBe(60);
});

it("commits both lethal same-batch actions", () => {
  const state = operationState(10, 10);
  const left = state.scenarios[0].rows.tank[0]!;
  const right = state.scenarios[1].rows.tank[0]!;
  commitPlannedActions(state, [
    planned(left.instanceId, { kind: "damage", targetId: right.instanceId, amount: 10 }),
    planned(right.instanceId, { kind: "damage", targetId: left.instanceId, amount: 10 }),
  ], 1);
  expect([left.currentHealth, right.currentHealth]).toEqual([0, 0]);
});
```

- [ ] **Step 3: Verify RED**

Run: `pnpm --filter @qd/engine test -- src/action-operations.test.ts src/action-resolution.test.ts`

Expected: FAIL because operation planning and simultaneous commit do not exist.

- [ ] **Step 4: Define operations and commit rules**

```ts
export type ActionOperation =
  | { kind: "damage"; targetId: string; amount: number }
  | { kind: "healing"; targetId: string; amount: number }
  | { kind: "health-cost"; targetId: string; amount: number }
  | { kind: "mana-cost"; targetId: string; amount: number }
  | { kind: "add-effect"; targetId: string; effect: ActiveEffectState };

export type PlannedAction = {
  actorId: string;
  actionId: string;
  operations: ActionOperation[];
  log: BattleLogEntry[];
};
```

`commitPlannedActions` adds new active effects before deriving resulting capacities; sums raw healing, damage, and costs per target; preserves mana deficit once across all capacity changes; clamps health once; appends plan logs in stable plan order; and generates death logs only after the aggregate commit. It never suppresses a plan because another plan is lethal.

- [ ] **Step 5: Refactor action resolution into isolated planning**

Use this exact signature:

```ts
export function planUnitAction(
  snapshot: BattleState,
  actorId: string,
  batchNumber: number,
  random: () => number,
  allocateEffectId: () => string,
): PlannedAction;
```

Implement `clonePlanningState` by structured-cloning the public snapshot, installing `random` as its internal `__rng`, and installing `allocateEffectId` as an optional internal effect-ID delegate. Update `nextEffectId` to call that delegate when present and otherwise retain its existing counter behavior.

The private planning state begins from `clonePlanningState(snapshot, random, allocateEffectId)`. Every mutation records a raw operation and applies it privately so later effects in the same actor's item sequence see earlier effects. Action IDs are:

```ts
const actionId = `${batchNumber}:${unit.instanceId}:${unit.actedCount + 1}`;
```

Remove death generation from basic attacks and instant effects; the aggregate commit owns death determination.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
pnpm --filter @qd/engine test -- src/action-operations.test.ts src/action-resolution.test.ts
```

Expected: selected tests pass, including mutual lethality and common-snapshot targeting.

```bash
git add packages/engine/src/action-operations.ts packages/engine/src/action-operations.test.ts packages/engine/src/resolution.ts packages/engine/src/effects.ts packages/engine/src/state.ts packages/engine/src/action-resolution.test.ts packages/engine/features/action-resolution.feature
git commit -m "feat(engine): commit ready actions simultaneously"
```

---

### Task 4: Switch BattleEngine to Action Batches and Action Fatigue

**Files:**
- Modify: `packages/engine/src/battle-engine.ts`
- Modify: `packages/engine/src/types.ts`
- Modify: `packages/engine/src/state.ts`
- Modify: `packages/engine/src/logging.ts`
- Modify: `packages/engine/src/validation.ts`
- Modify: `packages/engine/src/index.ts`
- Modify: `packages/engine/src/battle-engine.test.ts`
- Modify: `packages/engine/src/action-bar.test.ts`
- Modify: `packages/engine/src/mana-system.test.ts`
- Modify: `packages/engine/src/win-conditions.test.ts`
- Modify: `packages/engine/src/battle-setup.test.ts`
- Modify: `packages/engine/features/battle-setup.feature`
- Modify: `packages/engine/features/mana-system.feature`
- Modify: `packages/engine/features/win-conditions.feature`

**Interfaces:**
- `BattleState`: `actionCount`, `batchCount`, `fatigueActionThreshold`, and `fatigueDamageStart`.
- `BattleResult`: `actionsResolved`, `finalState`, `log`, and `winnerId`.
- `BattleOptions`: `fatigueActionThreshold?` and `fatigueDamageStart?`.
- Produces `BattleEngine.resolveNextBatch(): BattleState` and retains `resolve(): BattleResult`.
- Produces local `regenerateReadyMana(state, readyIds): void` and `applyActionFatigue(state, resolvedInBatch, batchNumber): void` helpers.
- Removes `tick(count)`, `ticksElapsed`, and `resolveActionsOnTick`.

- [ ] **Step 1: Write failing orchestration tests**

Add these test helpers:

```ts
function pairedInput(health: number, damage: number) {
  return createBattleInput([
    createScenario("A", {
      tank: [createUnit("A", { stats: createStats({ health, meleeDmg: damage, speed: 100 }) })],
    }),
    createScenario("B", {
      tank: [createUnit("B", { stats: createStats({ health, meleeDmg: damage, speed: 100 }) })],
    }),
  ]);
}

function fatigueDamage(log: BattleLogEntry[]): number {
  return log
    .filter((entry) => entry.type === "fatigue")
    .reduce((sum, entry) => sum + entry.damage, 0) / 2;
}
```

Then add:

```ts
it("resolves every unit ready at the same moment", () => {
  const engine = new BattleEngine(pairedInput(10, 10));
  const state = engine.resolveNextBatch();
  expect(state.batchCount).toBe(1);
  expect(state.actionCount).toBe(2);
  expect(allUnits(state).map((unit) => unit.actedCount)).toEqual([1, 1]);
});

it("starts fatigue after the action threshold", () => {
  const engine = new BattleEngine(pairedInput(100, 0), {
    fatigueActionThreshold: 2,
    fatigueDamageStart: 1,
  });
  expect(fatigueDamage(engine.resolveNextBatch().log)).toBe(0);
  const next = engine.resolveNextBatch();
  expect(next.actionCount).toBe(4);
  expect(fatigueDamage(next.log)).toBe(3);
});
```

The helper divides the two per-unit fatigue entries back to per-unit damage. The second two-action batch contains ordinals 3 and 4, contributing 1 + 2 with threshold 2.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qd/engine test -- src/battle-engine.test.ts src/win-conditions.test.ts src/mana-system.test.ts`

Expected: FAIL because the action-batch API and fatigue do not exist.

- [ ] **Step 3: Replace public contracts and timing validation**

```ts
export interface BattleOptions {
  fatigueActionThreshold?: number;
  fatigueDamageStart?: number;
}

export interface BattleState {
  actionCount: number;
  batchCount: number;
  status: "active" | "finished";
  winnerId: string | null;
  scenarios: [BattleScenarioState, BattleScenarioState];
  log: BattleLogEntry[];
  fatigueActionThreshold: number;
  fatigueDamageStart: number;
}

export interface BattleResult {
  winnerId: string | null;
  actionsResolved: number;
  finalState: BattleState;
  log: BattleLogEntry[];
}
```

Initialize threshold 500 and both counters 0. Remove `__resolveActionsOnTick`. Validation rejects interval effects missing `triggerEveryActions` or `triggerCount`, and stat-bearing instant buffs/debuffs missing `lastsForActions`, with:

```ts
throw new InvalidBattleInputError(`Effect "${effect.name ?? "Effect"}" timing needs configuration.`);
```

Replace `ActionContext.tick` with `ActionContext.batchNumber`. No public or internal engine context retains a generic tick counter.

- [ ] **Step 4: Implement one batch loop**

Implement `resolveNextBatch` in this order:

```ts
if (this.state.status === "finished") return this.getState();
const ready = advanceToNextReadyBatch(this.state);
this.state.batchCount += 1;
const batchNumber = this.state.batchCount;
const survivors = processPreActionEffects(
  this.state,
  ready.map((unit) => unit.instanceId),
  batchNumber,
);
regenerateReadyMana(this.state, survivors);
const eligibleModifierIds = new Set(
  allUnits(this.state)
    .flatMap((unit) => unit.activeEffects)
    .filter((effect) => effect.actionsRemaining !== undefined)
    .map((effect) => effect.id),
);
const snapshot = cloneState(this.state);
const sharedRandom = () => nextRandom(this.state);
const sharedEffectId = () => nextEffectId(this.state);
const plans = ready
  .filter((unit) => survivors.has(unit.instanceId))
  .map((unit) => planUnitAction(snapshot, unit.instanceId, batchNumber, sharedRandom, sharedEffectId));
const actedIds = commitPlannedActions(this.state, plans, batchNumber);
for (const actorId of actedIds) findUnitById(this.state, actorId)!.actedCount += 1;
this.state.actionCount += actedIds.length;
completeResolvedActionEffects(this.state, actedIds, eligibleModifierIds, batchNumber);
for (const unit of ready) unit.actionBar = 0;
applyActionFatigue(this.state, actedIds.length, batchNumber);
maybeFinishBattle(this.state);
return this.getState();
```

`resolve()` repeatedly calls `resolveNextBatch()` and returns `actionsResolved: state.actionCount`.

Calculate fatigue with:

```ts
function fatigueForOrdinal(ordinal: number, threshold: number, start: number): number {
  return ordinal <= threshold ? 0 : start + ordinal - threshold - 1;
}
```

Sum every ordinal in the completed batch and apply the total once to all action-phase survivors.

- [ ] **Step 5: Update engine tests and acceptance files**

Remove `engine.tick`, `state.tick`, `ticksElapsed`, tick messages, and `resolveActionsOnTick`. Use `resolveNextBatch` for one event and `resolve()` for complete battles. Update assertions to `batchNumber`, `actionCount`, and `actionsResolved`.

Specify mana regeneration once for each surviving ready actor before affordability. Specify same-batch lethal actions completing, mutual kills drawing, and default fatigue after 500 resolved actions.

Add an integration test with two zero-speed, zero-damage units and a low `fatigueActionThreshold`; `resolve()` must finish as a draw. Add another test where a due periodic effect kills a ready unit; its normal action and `actionCount` increment must both be absent.

- [ ] **Step 6: Verify the whole engine and commit**

```bash
pnpm --filter @qd/engine test
pnpm --filter @qd/engine typecheck
pnpm --filter @qd/engine build
```

Expected: all engine tests pass, TypeScript reports no errors, and `dist` builds.

```bash
git add packages/engine
git commit -m "feat(engine): resolve battles in simultaneous action batches"
```

---

### Task 5: Migrate Effect Timing Persistence and Seeds

**Files:**
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/effect-timing-schema.test.ts`
- Modify: `packages/db/src/migration-chain.test.ts`
- Modify: `packages/db/src/seed-data.ts`
- Modify: `packages/db/src/seed-data.test.ts`
- Create: `packages/db/drizzle/0017_event_driven_effect_timing.sql`
- Create: `packages/db/drizzle/meta/0017_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`

**Interfaces:**
- `effects.triggerEveryActions` maps to `trigger_every_actions`.
- `effects.lastsForActions` maps to `lasts_for_actions`.
- Legacy values become `NULL`; incomplete records remain stored for repair.
- Positive-value DB checks remain; API/engine validation owns completeness.

- [ ] **Step 1: Write failing schema and migration tests**

```ts
it("stores affected-unit action timing", () => {
  const config = getTableConfig(effects);
  const columns = config.columns.map((column) => column.name);
  expect(columns).toContain("trigger_every_actions");
  expect(columns).toContain("lasts_for_actions");
  expect(columns).not.toContain("interval_ticks");
  expect(columns).not.toContain("duration_ticks");
  expect(config.checks.map((check) => check.name)).toEqual(
    expect.arrayContaining(["trigger_every_actions_positive", "lasts_for_actions_positive"]),
  );
});
```

Add a migration-chain test reading `0017_event_driven_effect_timing.sql` and asserting it renames both columns and contains both clearing updates. Update seed tests so every interval has both trigger fields and every stat-bearing instant buff/debuff has `lastsForActions`.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @qd/db test -- src/effect-timing-schema.test.ts src/migration-chain.test.ts src/seed-data.test.ts`

Expected: FAIL because the schema and seeds still use tick fields.

- [ ] **Step 3: Rename schema fields and rebalance seeds**

```ts
triggerEveryActions: integer("trigger_every_actions"),
lastsForActions: integer("lasts_for_actions"),
```

Replace positivity check names accordingly. Remove `interval_fields_required` and `instant_fields_forbidden` DB checks so repairable legacy records can remain incomplete.

Use these seed values:

| Effect | New timing |
| --- | --- |
| Barbarian Roar | `lastsForActions: 3` |
| Rage | `triggerEveryActions: 1` |
| Exhaust | `lastsForActions: 5` |
| Bandage | `triggerEveryActions: 3` |
| Sizzling Flesh | `triggerEveryActions: 1` |
| Guardian Shield | `lastsForActions: 4` |
| Poison Cloud | `triggerEveryActions: 2` |
| Rejuvenation | `triggerEveryActions: 2` |
| Thornguard Aura | `lastsForActions: 3` |
| Umbral Shackles | `triggerEveryActions: 1` |
| Wildfire Brand | `triggerEveryActions: 1` |
| Xenon Bulwark | `lastsForActions: 4` |
| Yawning Curse | `lastsForActions: 5` |
| Zephyr Renewal | `triggerEveryActions: 2` |
| Zenith Charge | `triggerEveryActions: 2` |

Retain each interval effect's existing `triggerCount`.

- [ ] **Step 4: Generate and inspect migration 0017**

Run:

```bash
pnpm --filter @qd/db db:generate --name event_driven_effect_timing
```

Ensure generated SQL drops old timing constraints, renames columns, and adds positive checks. Insert these exact statements before new checks:

```sql
UPDATE "effects" SET "trigger_every_actions" = NULL;
UPDATE "effects" SET "lasts_for_actions" = NULL;
```

Do not add a completeness constraint.

- [ ] **Step 5: Verify GREEN and commit**

```bash
pnpm --filter @qd/db test
pnpm --filter @qd/db typecheck
pnpm --filter @qd/db build
```

Expected: all DB tests pass and the package builds.

```bash
git add packages/db/src packages/db/drizzle
git commit -m "feat(db): persist action-based effect timing"
```

---

### Task 6: Update tRPC Effect and Battle Contracts

**Files:**
- Modify: `packages/api/src/routers/scenarioBuilder/effects.ts`
- Modify: `packages/api/src/routers/battleLab/load-scenario.ts`
- Modify: `packages/api/src/routers/battleLab/scenario-input.ts`
- Modify: `packages/api/src/__tests__/scenarioBuilder/effects.test.ts`
- Modify: `packages/api/src/__tests__/battleLab/load-scenario.test.ts`
- Modify: `packages/api/src/__tests__/battleLab/scenario-input.test.ts`
- Modify: `packages/api/src/__tests__/battleLab/battle-lab.test.ts`

**Interfaces:**
- Effect mutations accept `triggerEveryActions`, `triggerCount`, and `lastsForActions`.
- Effect list/get/create/update results include `needsTimingConfiguration: boolean`.
- Battle creation rejects linked unconfigured timing as `BAD_REQUEST`.
- Battle results expose `actionsResolved`, `actionCount`, `batchCount`, and `batchNumber`.

- [ ] **Step 1: Write failing API tests**

Replace tick payload fields in API fixtures and add:

```ts
it("marks legacy interval timing for configuration", async () => {
  mockSelectRows([{ ...effectRow, timingType: "interval", triggerEveryActions: null, triggerCount: null }]);
  const result = await createCaller(gmCtx).scenarioBuilder.effects.list(defaultListInput);
  expect(result.items[0]?.needsTimingConfiguration).toBe(true);
});

it("requires lastsForActions for a stat-bearing modifier", async () => {
  await expect(createCaller(gmCtx).scenarioBuilder.effects.create({
    ...validEffectInput,
    timingType: "instant",
    effectType: "buff",
    meleeDmg: 5,
    lastsForActions: null,
  })).rejects.toMatchObject({ code: "BAD_REQUEST" });
});
```

In scenario mapping fixtures use `triggerEveryActions: 2` and `lastsForActions: 3`. In battle-lab tests assert `actionsResolved` and add a linked incomplete effect that fails before replay insertion.

- [ ] **Step 2: Build dependencies and verify RED**

```bash
pnpm --filter @qd/engine build
pnpm --filter @qd/db build
pnpm --filter @qd/api test -- src/__tests__/scenarioBuilder/effects.test.ts src/__tests__/battleLab/scenario-input.test.ts src/__tests__/battleLab/battle-lab.test.ts
```

Expected: FAIL because API schemas still expose tick fields.

- [ ] **Step 3: Implement timing validation and repair status**

```ts
const EFFECT_STAT_FIELDS = [
  "health", "mana", "meleeDmg", "rangedDmg", "manaRegen",
  "spellDmg", "speed", "dodge", "criticalChance",
] as const;

function needsTimingConfiguration(input: z.infer<typeof effectInputBaseSchema>): boolean {
  if (input.timingType === "interval") {
    return input.triggerEveryActions === null || input.triggerCount === null;
  }
  const hasModifier =
    (input.effectType === "buff" || input.effectType === "debuff") &&
    EFFECT_STAT_FIELDS.some((field) => input[field] !== null);
  return hasModifier && input.lastsForActions === null;
}
```

`validateTimingFields` uses field paths and exact messages:

```ts
"Trigger every actions is required for interval timing."
"Trigger count is required for interval timing."
"Lasts for actions is required for stat buffs and debuffs."
```

Mutations reject incomplete timing. List/get/create/update results derive `needsTimingConfiguration` without changing stored rows.

- [ ] **Step 4: Update battle loading and mapping**

Select and map `effects.triggerEveryActions` and `effects.lastsForActions` through `BattleScenarioRecords` into `EffectTemplateInput`. Do not filter invalid effects: allow engine validation to produce `Effect "<name>" timing needs configuration.`, which the battle router exposes as `BAD_REQUEST` without saving a replay.

- [ ] **Step 5: Verify GREEN and commit**

```bash
pnpm --filter @qd/api test
pnpm --filter @qd/api typecheck
pnpm --filter @qd/api build
```

Expected: all API tests pass and exported types contain no tick timing fields.

```bash
git add packages/api/src
git commit -m "feat(api): expose action-based battle timing"
```

---

### Task 7: Update Effect Authoring and Legacy Repair UI

**Files:**
- Modify: `apps/web/src/components/create/effect-form.ts`
- Modify: `apps/web/src/components/create/effect-colors.ts`
- Modify: `apps/web/src/components/create/effect-workspace-form.tsx`
- Modify: `apps/web/src/components/create/effect-library-list.tsx`
- Modify: `apps/web/src/components/create/use-create-page-state.ts`
- Modify: `apps/web/tests/unit/create/effect-form.test.ts`
- Modify: `apps/web/tests/unit/create/entity-workspace.test.tsx`
- Modify: `apps/web/tests/unit/create/use-create-page-state.test.tsx`
- Modify: `e2e/features/create/effect-workspace.feature`

**Interfaces:**
- `EffectFormValues` uses `triggerEveryActions` and `lastsForActions`.
- Produces `effectNeedsTimingConfiguration(values): boolean` with API-equivalent rules.
- Input test IDs are `effect-triggerEveryActions-input` and `effect-lastsForActions-input`.
- Legacy list rows and workspaces show exact copy **Timing needs configuration**.

- [ ] **Step 1: Rewrite authoring acceptance criteria and unit tests**

```gherkin
Scenario: Configure an interval by affected-unit actions
  When I create an interval effect named "Battle Rhythm"
  And I set Trigger every affected-unit actions to 2
  And I set Trigger count to 3
  Then the saved effect retains those action timing values

Scenario: A legacy timed effect requires configuration
  Given an effect has incomplete migrated timing
  When I open that effect
  Then I see "Timing needs configuration"
  And saving is blocked until valid action timing is entered
```

Update `effect-form.test.ts`:

```ts
it("requires action timing for an interval", () => {
  const errors = validateEffectForm({
    ...createDefaultEffectFormValues(), name: "Poison", timingType: "interval",
  });
  expect(errors.triggerEveryActions).toContain("required");
  expect(errors.triggerCount).toContain("required");
});

it("requires duration for a stat-bearing instant buff", () => {
  const errors = validateEffectForm({
    ...createDefaultEffectFormValues(), name: "Haste", timingType: "instant",
    effectType: "buff", speed: 2,
  });
  expect(errors.lastsForActions).toContain("required");
});
```

- [ ] **Step 2: Build API and verify RED**

```bash
pnpm --filter @qd/api build
pnpm --filter @qd/web test -- tests/unit/create/effect-form.test.ts tests/unit/create/entity-workspace.test.tsx tests/unit/create/use-create-page-state.test.tsx
```

Expected: FAIL because form fields and labels still use ticks.

- [ ] **Step 3: Replace fields, labels, and validation**

```ts
export const TIMING_FIELDS = ["lastsForActions", "triggerEveryActions", "triggerCount"] as const;

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
  speed: "Speed",
  manaRegen: "Mana Regen",
  directHealing: "Heal",
  directMeleeDmg: "D.Mel",
  directRangedDmg: "D.Rng",
  directSpellDmg: "D.Spl",
};
```

Normalize instant timing by clearing `triggerEveryActions` and `triggerCount`, while retaining `lastsForActions`. Add the complete local repair predicate:

```ts
const EFFECT_STAT_FIELDS = [
  "health", "mana", "meleeDmg", "rangedDmg", "manaRegen",
  "spellDmg", "speed", "dodge", "criticalChance",
] as const;

export function effectNeedsTimingConfiguration(values: EffectFormValues): boolean {
  if (values.timingType === "interval") {
    return values.triggerEveryActions === null || values.triggerCount === null;
  }
  const hasModifier =
    (values.effectType === "buff" || values.effectType === "debuff") &&
    EFFECT_STAT_FIELDS.some((field) => values[field] !== null);
  return hasModifier && values.lastsForActions === null;
}
```

Use this predicate in validation and warning rendering. Under the timing fields render:

```tsx
<p className="text-xs text-muted-foreground">
  Timing advances only when the affected unit gets an action opportunity.
</p>
```

If timing is incomplete, render **Timing needs configuration** and keep save disabled until validation passes.

- [ ] **Step 4: Mark incomplete effects in the library**

Extend list item typing with `needsTimingConfiguration: boolean`; append this label in the Name cell when true:

```tsx
<span className="text-amber-300">Timing needs configuration</span>
```

Update all query-cache and workspace fixtures to use the action field names.

- [ ] **Step 5: Verify GREEN and commit**

```bash
pnpm --filter @qd/web test -- tests/unit/create/effect-form.test.ts tests/unit/create/entity-workspace.test.tsx tests/unit/create/use-create-page-state.test.tsx
pnpm --filter @qd/web typecheck
```

Expected: selected tests pass and TypeScript reports no errors.

```bash
git add apps/web/src/components/create apps/web/tests/unit/create e2e/features/create/effect-workspace.feature
git commit -m "feat(web): author effects with action timing"
```

---

### Task 8: Render Action Batches and Action-Based Results

**Files:**
- Modify: `apps/web/src/components/battle/battle-event-ledger-model.ts`
- Modify: `apps/web/src/components/battle/battle-event-ledger.tsx`
- Modify: `apps/web/src/components/battle/battle-result.tsx`
- Modify: `apps/web/tests/unit/battle/battle-event-ledger-model.test.ts`
- Modify: `apps/web/tests/unit/battle/battle-result.test.tsx`
- Modify: `apps/web/tests/unit/battle/battle-workbench.test.tsx`
- Modify: `e2e/features/battle/battle-lab.feature`

**Interfaces:**
- `LedgerLogEntry` requires `batchNumber` instead of `tick`.
- `BattleEventGroup` adds a batch group containing `batchNumber`, turns, and unattributed events.
- Modifier rendering consumes `actionsRemaining`.
- Result header displays `${result.actionsResolved} actions resolved`.

- [ ] **Step 1: Rewrite battle UI criteria and tests**

Require winner/draw, resolved actions, and simultaneous batch grouping in `battle-lab.feature`. Add model fixtures with two action IDs sharing `batchNumber: 4`; assert one batch contains both turns.

Update rendered assertions:

```ts
expect(screen.getByText("184 actions resolved")).toBeVisible();
expect(screen.getByText(/2 actions remaining/)).toBeVisible();
expect(screen.queryByText(/tick/i)).not.toBeInTheDocument();
expect(screen.getByText("Simultaneous actions · Batch 4")).toBeVisible();
```

- [ ] **Step 2: Build dependencies and verify RED**

```bash
pnpm --filter @qd/api build
pnpm --filter @qd/web test -- tests/unit/battle/battle-event-ledger-model.test.ts tests/unit/battle/battle-result.test.tsx tests/unit/battle/battle-workbench.test.tsx
```

Expected: FAIL because ledger and result components still consume ticks.

- [ ] **Step 3: Group logs by simultaneous batch**

Change event keys to use `entry.batchNumber`. First group consecutive entries by `batchNumber`; inside each batch retain current `actionId` grouping. Render multi-turn batches with:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  Simultaneous actions · Batch {group.batchNumber}
</p>
```

Retain actor-focused rendering for a one-turn batch. Change the ledger description to **Grouped by simultaneous action batch. Display order does not determine outcomes.**

- [ ] **Step 4: Replace result and effect copy**

Use `result.actionsResolved` in the result card. Display modifiers as:

```ts
`${effect.name} (${effect.actionsRemaining} actions remaining)`
```

Remove every `until tick`, `elapsed ticks`, and tick-number fallback from battle components and fixtures.

- [ ] **Step 5: Verify GREEN and commit**

```bash
pnpm --filter @qd/web test -- tests/unit/battle
pnpm --filter @qd/web typecheck
```

Expected: battle component tests pass and no tick contract remains in web battle code.

```bash
git add apps/web/src/components/battle apps/web/tests/unit/battle e2e/features/battle/battle-lab.feature
git commit -m "feat(web): present simultaneous action batches"
```

---

### Task 9: Update E2E Coverage and Verify the Repository

**Files:**
- Modify: `e2e/tests/pages/effect-workspace.page.ts`
- Modify: `e2e/tests/pages/battle-lab.page.ts`
- Modify: `e2e/tests/scenario-builder/effect-workspace.test.ts`
- Modify: `e2e/tests/battle/battle-lab.test.ts`

**Interfaces:**
- Effect page helpers use `effect-triggerEveryActions-input` and `effect-lastsForActions-input`.
- Replay fixtures use `actionsResolved`, `batchNumber`, and `actionsRemaining`.
- No player-facing page contains tick terminology.

- [ ] **Step 1: Update E2E page objects and tests**

```ts
get triggerEveryActionsInput() {
  return this.page.getByTestId("effect-triggerEveryActions-input");
}

get lastsForActionsInput() {
  return this.page.getByTestId("effect-lastsForActions-input");
}
```

Replace replay fixture fields with:

```ts
actionsResolved: number;
batchNumber: number;
actionsRemaining?: number;
```

In `BattleLabPage.expectResult`, expect `${actionsResolved} actions resolved`, assert no `/tick/i` text in the ledger, and verify a multi-action batch heading for the deterministic seeded fixture.

- [ ] **Step 2: Run focused E2E and verify the old stack fails**

Run: `pnpm run test:e2e -- --grep "effect|battle"`

Expected before the rebuilt stack and migration: FAIL on old selectors or replay contracts.

- [ ] **Step 3: Remove remaining tick contracts**

```bash
rg -n '\bticks?\b|intervalTicks|durationTicks|ticksElapsed|expiresAtTick|fatigueTickThreshold' \
  packages/engine packages/api apps/web e2e \
  --glob '!**/dist/**' \
  --glob '!**/node_modules/**'
```

Expected: no matches. Legacy-column references are confined to the DB migration and DB tests, outside this scan. Replace every match; add no aliases.

- [ ] **Step 4: Format and run repository verification**

```bash
pnpm exec biome check --write packages/engine packages/db packages/api apps/web e2e
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
```

Expected: every command exits 0 with no errors; all Playwright tests pass against the migrated and reseeded Docker stack.

- [ ] **Step 5: Commit final coverage**

```bash
git add e2e apps packages
git commit -m "test: cover event-driven battle timing"
```

- [ ] **Step 6: Record final evidence**

```bash
git status --short
git log -9 --oneline
```

Expected: clean worktree and one reviewable commit per task. Report exact test counts and the intentional balance changes in the final handoff.
