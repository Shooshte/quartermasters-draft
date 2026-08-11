# Whole-branch final fix report

## Status and implementation commit

- Status: all Important whole-branch review findings fixed and verified.
- Implementation commit: `cffcab1e7e9d8d97462e658df0c08f5052434448` (`fix: harden shield effect resolution`).
- Branch: `feat/shield-mechanic`.

## Findings resolved

1. Engine timing validation considered only `STAT_KEYS`, so an instant buff/debuff with a positive shield and no `lastsForActions` could enter a battle even though the API and form required timing configuration. Engine validation now treats a positive shield as duration-bearing, and the fatigue shield fixture now supplies a valid duration.
2. Effect authoring and API schemas accepted negative shield and direct damage/healing values. Both layers now reject negative or non-finite values while retaining zero. Engine health arithmetic also normalizes untrusted damage, healing, and shield amounts so negative/non-finite input cannot replenish shields, invert damage into healing, reduce health through negative healing, add invalid shield layers, or move healing results outside `[0, maximumHealth]`. The protection applies to instant effects, interval effects, recorded operations, and direct `EffectTemplateInput` callers.
3. Planned actions and interval events switched to ordered health replay whenever a target already had a shield, even when every damage event bypassed that shield. Healing-before-bypass-damage therefore clamped sequentially and produced a different result from the existing simultaneous aggregate model. Both paths now use ordered replay only when a positive shield grant or shieldable damage can change shield state; healing plus bypass-only damage aggregates and clamps once in either order. Existing ordered tests continue to cover shield grants and shield-consuming damage.

## Files changed

- `packages/engine/src/validation.ts` — requires action duration for positive instant buff/debuff shields.
- `packages/engine/src/validation.test.ts` — adds the missing positive-shield validation case.
- `packages/engine/src/battle-engine.test.ts` — gives the fatigue shield fixture a valid action duration.
- `packages/engine/src/action-operations.ts` — normalizes health amounts, centralizes bounded healing, rejects invalid shield grants, and narrows ordered replay to actual shield-changing operations.
- `packages/engine/src/action-operations.test.ts` — covers negative damage/grants and planned-action bypass aggregation in both orders.
- `packages/engine/src/effects.ts` — normalizes instant/interval effect amounts and preserves aggregate interval semantics when existing shields are untouched.
- `packages/engine/src/effects.test.ts` — covers defensive instant/interval effect handling and interval bypass aggregation in both orders.
- `packages/api/src/routers/scenarioBuilder/effects.ts` — uses finite non-negative schemas for shield and direct damage/healing fields.
- `packages/api/src/__tests__/scenarioBuilder/effects.test.ts` — covers rejection of all negative fields and acceptance of zero values.
- `apps/web/src/components/create/effect-form.ts` — validates authored shield and direct damage/healing amounts as finite and non-negative.
- `apps/web/tests/unit/create/effect-form.test.ts` — covers negative rejection and zero acceptance.

## TDD evidence

### RED

`pnpm --filter @qd/engine test -- src/validation.test.ts src/action-operations.test.ts src/effects.test.ts`

- Exit 1.
- 8 intended failures and 181 passes.
- Failures reproduced the missing shield duration validation, negative damage increasing shields/health, negative recorded shield grants, negative instant/interval healing and damage, and order-dependent planned/interval bypass aggregation.

`pnpm --filter @qd/api test -- src/__tests__/scenarioBuilder/effects.test.ts`

- Exit 1.
- 5 intended failures and 160 passes.
- All five negative shield/direct amount inputs reached the mutation instead of returning `BAD_REQUEST`.

`pnpm --filter @qd/web exec vitest run tests/unit/create/effect-form.test.ts`

- Exit 1.
- 5 intended failures and 16 passes.
- Every negative shield/direct amount lacked a field validation error.

### GREEN

`pnpm --filter @qd/engine test -- src/validation.test.ts src/action-operations.test.ts src/effects.test.ts`

- Exit 0: 16 files, 189 tests passed.

`pnpm --filter @qd/api test -- src/__tests__/scenarioBuilder/effects.test.ts`

- Exit 0: 10 files, 165 tests passed.

`pnpm --filter @qd/web exec vitest run tests/unit/create/effect-form.test.ts`

- Exit 0: 1 file, 21 tests passed.

## Full verification

- `pnpm run lint` — exit 0 after applying the repository formatter; Biome checked 289 files and Turbo completed 9/9 typecheck/build tasks. The first run reported formatting-only differences in four touched engine files, which were formatted before this clean rerun.
- `pnpm run typecheck` — exit 0; Turbo completed 9/9 tasks.
- `pnpm run test` — exit 0; Turbo completed 10/10 tasks. Engine 189/189, API 165/165, web 401/401, DB 70/70, shared 3/3, and E2E utility tests 4/4 passed.
- `pnpm run test:e2e` — exit 0; production image built, all 295 Playwright tests passed in 1.6 minutes, and Docker teardown removed the Postgres container and test network.
- `git diff --check` — exit 0 before the implementation commit.

## Concerns

- No functional concerns remain.
- Verification output contains pre-existing pnpm configuration deprecation warnings, npm environment/config warnings, Playwright `NO_COLOR` warnings, and routine PostgreSQL truncate-cascade notices. None caused a failure.
