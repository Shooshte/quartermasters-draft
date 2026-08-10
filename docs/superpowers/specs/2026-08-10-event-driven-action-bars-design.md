# Event-Driven Action Bars Design

## Goal

Remove ticks from battle rules and player-facing concepts. Action bars become the only scheduler, and ongoing effects advance on the affected unit's actions. Battles remain deterministic, support simultaneous actions, and terminate through action-based fatigue.

This is an intentional balance change, not a compatibility-preserving refactor.

## Terminology

- **Action opportunity:** a living unit reaches an action bar of 100 and enters a ready batch.
- **Action batch:** all units that reach 100 at the same action-bar moment.
- **Resolved action:** a normal item activation or basic attack submitted by a unit that survives the batch's pre-action effects.
- **Action count:** the total number of resolved actions across both armies.
- **Batch count:** the number of simultaneous action batches processed.

## Event-Driven Scheduler

Battle state starts with `actionCount = 0` and `batchCount = 0`. Each scheduling step:

1. Clamp every living unit's effective scheduling speed to at least 1.
2. For each living unit, calculate the progress required to fill its bar:

   `progressToReady = (100 - actionBar) / effectiveSchedulingSpeed`

3. Select the smallest non-negative progress value.
4. Advance every living unit's bar by `effectiveSchedulingSpeed * progressToReady`.
5. Place every unit that reached 100 at that moment into one action batch.
6. Resolve the batch simultaneously as described below.
7. Reset every batch participant's action bar to 0 and recalculate effective speeds before scheduling the next batch.

Floating-point comparisons use a shared engine tolerance so mathematically equal readiness moments form one batch. The minimum scheduling speed of 1 prevents permanent freezes and guarantees that action-based fatigue can eventually terminate a battle.

The existing deterministic order—effective speed, scenario order, row order, then slot—is retained only for seeded randomness, stable identifiers, and log presentation. It must not make simultaneous battle results sequential.

## Simultaneous Batch Resolution

Each batch has three phases.

### 1. Pre-action effects

Existing periodic damage and healing due for the ready units trigger from a common batch-start snapshot. Their results are aggregated and committed simultaneously. A unit killed during this phase does not submit a normal action.

### 2. Action calculation

Every surviving participant regenerates mana once, capped by its effective mana capacity. Item affordability, targeting, and action outcomes are then calculated from the same post-effect snapshot.

An actor's equipped items and their effects retain their saved internal sequence. However, no actor can observe health, mana, modifiers, targets, or deaths produced by another actor in the same batch. Effects created during the batch do not affect any action in that batch.

### 3. Commit

All action outcomes are committed together. Damage, healing, and health costs affecting the same unit are aggregated before health is clamped against the unit's resulting effective maximum. New effects become active for future batches. Death and victory checks run only after the simultaneous commit.

A unit alive during action calculation completes its action even if another action in the batch deals lethal damage to it. Mutual kills can therefore produce a draw. For deterministic output, logs may be ordered, but log order cannot affect state.

## Effect Timing

Tick-based fields are replaced with:

- `triggerEveryActions`: trigger after every X action opportunities of the affected unit.
- `triggerCount`: maximum number of interval triggers.
- `lastsForActions`: keep a buff or debuff active through the affected unit's next X resolved actions.

Effect counters begin with the target's next action opportunity. Applying an effect never immediately advances its counter, including when the target is participating in the same batch.

An interval counter advances once whenever its affected unit enters a ready batch. A stat-bearing instant buff or debuff must define `lastsForActions`; there is no implicit permanent or zero-duration modifier.

Periodic damage and healing trigger in the pre-action phase. For example:

```ts
{
  triggerEveryActions: 2,
  triggerCount: 3,
}
```

This triggers before the affected unit's 2nd, 4th, and 6th upcoming actions. A lethal trigger prevents the corresponding normal action.

A modifier with `lastsForActions: 3` affects the target's next three resolved actions and expires after the third action's batch. Its scheduling impact remains active while filling the bar for that third action. Effects applied during that batch begin counting from the target's following action.

This redesign changes scheduling only; it does not add new effect payload combinations. Existing supported damage, healing, buff, and debuff payload behavior remains otherwise unchanged.

## Mana Regeneration

Mana regeneration no longer occurs globally. Each ready unit that survives pre-action effects regenerates once immediately before item affordability is evaluated. Units outside the batch do not regenerate.

Consequently, faster units regenerate mana more frequently in battle order, while every unit receives the same number of regeneration applications per completed action.

## Action-Based Fatigue

The fatigue threshold is 500 total resolved actions.

- Actions 1 through 500 add no fatigue.
- Action 501 contributes 1 fatigue damage to every unit alive after the action phase.
- Action 502 contributes 2, action 503 contributes 3, and so on.
- If several action ordinals occur in one simultaneous batch, their fatigue contributions are summed and applied once to all survivors after the action commit.

For example, a batch containing actions 501 and 502 applies 3 fatigue damage simultaneously. Fatigue can eliminate both armies and produce a draw. Fatigue deaths and the final result are evaluated after this simultaneous fatigue commit.

## Engine Contract

Public state and result terminology changes as follows:

| Current | Replacement |
| --- | --- |
| `tick` | `actionCount` plus `batchCount` |
| `ticksElapsed` | `actionsResolved` |
| `fatigueTickThreshold` | `fatigueActionThreshold` |
| `intervalTicks` | `triggerEveryActions` |
| `durationTicks` | `lastsForActions` |
| `expiresAtTick` | target-relative `actionsRemaining` |

`BattleEngine.tick(count)` is removed. `BattleEngine.resolveNextBatch()` processes one complete simultaneous batch, and `BattleEngine.resolve()` continues processing batches until the battle finishes.

Action and effect identifiers use batch and unit action counters rather than ticks. Logs record `batchNumber` and action identifiers. Player-facing messages do not mention ticks.

The `highest_damage` targeting heuristic continues to include action frequency by using effective speed for action damage. Its interval contribution uses `triggerEveryActions` in place of tick intervals. It remains an estimate rather than a simulation of target-specific effect timing.

## Persistence and Migration

Database, API, and form fields use `triggerEveryActions` and `lastsForActions`, including corresponding snake-case database columns and constraints.

Existing tick values are not converted because no exact target-independent conversion exists. The migration clears legacy timed values and leaves affected user-created effects in an explicit **Timing needs configuration** state. Such effects remain editable but cannot be used in battle until valid action timing is saved.

Seeded effects receive manually selected action-based values. Instant effects without duration-based behavior remain usable without reconfiguration.

Validation requires positive integers for configured action timing. Interval effects require both `triggerEveryActions` and `triggerCount`. Stat-bearing instant buffs and debuffs require `lastsForActions`. A record missing its timing requirement is the explicit **Timing needs configuration** state. Invalid or unconfigured timed effects fail while assembling battle input; they are never silently skipped or assigned guessed defaults.

## User Interface

- Effect forms label the fields **Trigger every (affected-unit actions)**, **Trigger count**, and **Lasts for (affected-unit actions)**.
- Helper text explains that timing advances only when the affected unit gets an action opportunity.
- Legacy effects needing updates are visibly marked and guided to their timing fields.
- Battle results display resolved actions rather than elapsed ticks.
- The event ledger groups entries by simultaneous action batch and does not imply that display order was execution order.
- Effect summaries use relative wording such as “2 actions remaining,” never an absolute expiry tick.

## Behavior Changes

This design intentionally changes:

- action timing from discrete tick accumulation to continuous event-driven readiness;
- overflow behavior, because normal scheduling advances exactly to 100 before resetting;
- same-moment actions from sequential mutation to snapshot-based simultaneous commit;
- interval effects and modifier duration from global time to affected-unit actions;
- mana regeneration from global ticks to the acting unit's action opportunity;
- zero speed from a permanent stop to a minimum scheduling speed of 1;
- fatigue from tick 100 onward to escalating damage after 500 resolved actions;
- highest-damage projections, battle logs, result metadata, API fields, database fields, forms, seeds, and acceptance criteria that currently reference ticks.

## Verification

Tests must cover:

- action-bar readiness and relative action frequency without tick loops;
- minimum scheduling speed and termination when displayed effective speed reaches zero;
- floating-point readiness ties and deterministic batch membership;
- snapshot-based targeting and simultaneous damage, healing, buffs, debuffs, and costs;
- a unit completing its same-batch action despite receiving lethal action damage;
- pre-action periodic damage preventing a normal action;
- mutual action deaths and mutual fatigue deaths producing draws;
- effects triggering every X affected-unit actions and expiring after X covered actions;
- effects applied during a batch beginning with the target's next action;
- mana regeneration and item affordability at action start;
- batches that cross action 500 and correctly aggregate fatigue contributions;
- deterministic state and logs for identical seeded inputs;
- explicit rejection of unconfigured migrated effects;
- database constraints, API mapping, form validation, result display, and event-ledger wording;
- updated engine `.feature` files and end-to-end acceptance criteria with no player-facing tick concepts.

The repository definition of done remains unchanged: unit and end-to-end test suites must pass.
