# Task 1 — Shield State and Shield-Aware Operations

## Commit

`b33ddbcaac36f18168afe7156dd41efc86c4d85e` — `feat(engine): add shield layer state`

## Changed files

- `packages/engine/src/types.ts`
  - Added `ShieldLayer` and `BattleUnitState.shieldLayers`.
- `packages/engine/src/state.ts`
  - Initializes every battle unit with an empty shield layer list.
- `packages/engine/src/action-operations.ts`
  - Added `applyDamage`, shield grants, bypass damage, and ordered shield-aware replay.
  - Retains aggregate health resolution for targets without existing or granted shields.
- `packages/engine/src/test-helpers.ts`
  - Added deterministic `createShieldLayer` test helper.
- `packages/engine/src/action-operations.test.ts`
  - Added shield absorption, bypass, and recorded-order coverage.

## RED verification

Command:

```sh
pnpm --filter @qd/engine test -- action-operations.test.ts
```

Result: failed as intended before implementation. The two transferred `applyDamage` tests failed with `TypeError: applyDamage is not a function`. After adding the ordered replay test, it also failed with `expected 87 to be 90`, proving the old aggregate commit path allowed a late shield to be ignored rather than absorbing only later damage.

## GREEN verification

Commands and results:

```sh
pnpm --filter @qd/engine test -- action-operations.test.ts
# 16 test files passed; 168 tests passed

pnpm --filter @qd/engine typecheck
# passed

pnpm run test
# 10 Turbo tasks passed; engine 168/168, API 155/155, DB 70/70,
# shared 3/3, web 392/392, and E2E unit tests 4/4
```

`pnpm lint` was also run after formatting. Biome passed, and all packages except web typechecking passed. The remaining web fixture type error is described below.

## Self-review

- Shield layers are ordered and depleted from oldest to newest.
- Bypassing damage does not mutate shields.
- `grant-shield` copies the recorded layer and replays alongside health operations in plan order.
- A target with no initial or granted shield retains the prior aggregate health calculation.
- Shield-aware health costs are routed through the same damage helper.
- Unflagged damage operation object shape is unchanged; only bypassing damage carries `bypassesShield: true`.

## Concerns

- `pnpm lint` is not fully green because `apps/web/tests/unit/battle/battle-result.test.tsx` constructs `BattleUnitState` fixtures without the newly required `shieldLayers` field. This task was explicitly limited to engine files, so the fixture update was left for the UI task.
- `pnpm run test:e2e` built the Docker app image and started Playwright, but the execution session ended before it returned a final pass/fail summary. It left the temporary Postgres container; I stopped and removed it. Docker reported the shared `qd-e2e-net` network was still in use, so it was not forcibly removed.

## Review fix — web fixture

Updated `apps/web/tests/unit/battle/battle-result.test.tsx` with the required
empty `shieldLayers: []` fixture field. No UI column or other feature work was
included.

Commands and results:

```sh
pnpm --filter @qd/web exec vitest run tests/unit/battle/battle-result.test.tsx
# Test Files  1 passed (1); Tests  9 passed (9)

pnpm --filter @qd/web typecheck
# passed (tsc --noEmit)
```

Commit: `09e38796660749ab248a45176cdc9e110bd58afa` — `test(web): add shield layers to battle fixture`
