# Task 1: Pure Event-Driven Scheduler Report

## Implementation

- Added `packages/engine/src/action-scheduler.ts` with:
  - `READY_EPSILON = 1e-9`.
  - `getSchedulingSpeed`, which floors effective speed at `1`.
  - `advanceToNextReadyBatch`, which finds the earliest readiness moment, advances only living action bars proportionally and caps them at `100`, then returns the ready cohort.
- Scheduler ordering for an exact readiness tie is deterministic ascending `instanceId` order.
- The scheduler does not resolve actions, alter battle ticks, logs, health, mana, or acted counts; it only writes living units' `actionBar` values.
- Rewrote `packages/engine/features/action-bar.feature` from tick accumulation to the approved event-driven scenarios. It documents that legacy scenario/row/slot ordering applies to seeded RNG consumption and logs, while scheduler ties use instance IDs.

## Tests Added

`packages/engine/src/action-scheduler.test.ts` covers:

1. Proportional advancement to the fastest next-ready unit.
2. Grouping of equal readiness moments.
3. Exact-tie ordering by ascending instance ID, independent of input scenario order.
4. Minimum scheduling speed for zero effective speed.
5. Scheduler isolation: dead bars and non-action-bar state remain unchanged.

## TDD Evidence

### RED

Command:

```sh
pnpm --filter @qd/engine test -- src/action-scheduler.test.ts
```

Result: exited `1`. Vitest reported `Cannot find module './action-scheduler'` from `src/action-scheduler.test.ts`; the suite had `0` collected tests because the new production module did not exist. Existing engine suites remained green (`14` files, `138` tests).

### GREEN

The initial implementation exposed a test-only `structuredClone` problem because battle state contains its internal RNG function. The test was corrected to snapshot only the observable non-action-bar fields it asserts; production scheduler behavior was unchanged.

Command:

```sh
pnpm --filter @qd/engine test -- src/action-scheduler.test.ts
```

Result: exited `0`; Vitest reported `15` files and `143` tests passing. (The package's Vitest invocation runs the complete engine suite even when the supplied path follows `--`.)

## Verification

```sh
pnpm --filter @qd/engine test
```

Result: exited `0`; `15` test files and `143` tests passed.

```sh
pnpm --filter @qd/engine typecheck
```

Result: exited `0` (`tsc --noEmit`).

`git diff --check` exited `0` before the typecheck.

## Self-Review

- Checked the implementation against every task requirement: fastest next-ready cohort, proportional advancement/cap, effective-speed floor, epsilon readiness check, deterministic tie order, and no action processing.
- Kept scope to the scheduler module, scheduler tests, and the requested acceptance feature.
- The return ordering intentionally follows the parent task's binding requirement for ascending IDs rather than the old speed/scenario/row/slot action-resolution ordering.

## Concerns / Follow-ups

- Every pnpm invocation prints an existing configuration warning: `package.json`'s `pnpm.onlyBuiltDependencies` and `pnpm.overrides` are no longer read by this pnpm version. It did not affect command exit status and is outside this task's scope.
- Scheduler integration into `BattleEngine`, action resolution, timing reconfiguration, and end-to-end coverage are intentionally deferred to later tasks.
