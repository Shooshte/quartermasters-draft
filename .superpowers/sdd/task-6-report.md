# Task 6 report: create-workspace targeting and item placement

## Status

Task 6 is implemented. The create workspace now authors the migrated unit targeting contract and item placement rules, and scenario row pickers enforce the intersection of equipped-item placement restrictions. Task 7 E2E work was not implemented.

## Implementation

- Replaced the legacy unit controls and payload fields with `targetScope`, `targetPriority`, `targetCount`, and `selectionShape`.
- Added target-scope and priority selects, positive integer target-count validation/input, individual/adjacent controls, and summary copy for both shapes.
- Added `allowedRowTypes` to item defaults, record/form normalization, dirty checking, validation, save payloads, and four deployment-row pills. Empty selection remains unrestricted and toggles canonicalize duplicates.
- Enriched scenario unit options from each unit's ordered linked item IDs and each item's allowed rows.
- Added `canDeployInRow`, which ignores unrestricted items and requires every restricted item to include the scenario row.
- Filtered every row picker to eligible units, including empty-intersection behavior.
- Kept existing invalid assignments visible and added an inline row-placement error.
- Invalidated enriched scenario unit options after item create/update/delete so placement edits cannot leave row eligibility stale.
- Migrated remaining web fixtures/assertions that referenced the retired targeting contract.

## TDD evidence

Initial prescribed RED command:

```text
pnpm --filter @qd/web test -- unit/create/unit-form.test.ts unit/create/unit-workspace-form.test.tsx unit/create/item-form.test.ts unit/create/item-workspace-form.test.tsx unit/create/scenario-workspace.test.tsx
```

Vitest treated the arguments after `--` as a separator and ran the complete web suite. Exit 1: 29 intended failures showed the missing targeting fields/controls/summaries, item row fields/pills, scenario filtering, empty intersections, and invalid-placement feedback.

Scenario option enrichment was also regression-checked by temporarily removing the item row arrays: the focused test failed with `itemAllowedRowTypes: []`, then passed after restoration.

Review cache-fix RED/GREEN:

```text
pnpm exec vitest run tests/unit/create/use-create-page-state.test.tsx -t "invalidates all item queries"
```

RED: 2 failures because item save/delete only invalidated item queries. GREEN: 2 passed after invalidating the enriched scenario-unit option key.

## Verification

- `pnpm --filter @qd/api build`: PASS.
- Prescribed web test command: PASS, 46 files / 359 tests.
- `pnpm --filter @qd/web typecheck`: PASS.
- Scoped Biome check: PASS, 18 changed files.
- `git diff --check`: PASS.
- `pnpm run test`: PASS, 10/10 Turbo tasks; web 359/359. Nine unchanged package tasks were cache replays and the changed web task ran uncached.

## Review

The delegated review found no critical issues. Its stale-eligibility finding was fixed and re-reviewed; final verdict was Ready. The reviewer also noted the client enrichment performs `1 + N + M` detail requests. The parent explicitly kept a new set-based API outside the approved Task 6 boundary, so this is a non-blocking performance follow-up.

## Commit

- `31ebff8 feat(web): author targeting and item placement rules`

## Concerns and follow-ups

- A future API task should expose a set-based scenario placement-options query to replace per-unit and per-item detail requests.
- The active shell uses Node `v22.20.0`, while the repository requests Node `>=24 <26`; every required command passed with the existing engine warning.
- Docker/Playwright E2E was not run or modified; it is reserved for Task 7.

## Post-review fixes

- Scenario row pickers now clear a selected unit when refreshed options remove its eligibility. The Add button and add handler both re-check current eligible options so a stale ID cannot create an assignment.
- Self-target summaries now always read `Targets the caster.` and intentionally ignore target count and selection shape.
- TDD RED: `pnpm --filter @qd/web test -- apps/web/tests/unit/create/scenario-workspace.test.tsx apps/web/tests/unit/create/unit-workspace-form.test.tsx` failed with the stale Add button enabled and the old self individual/adjacent copy.
- GREEN: the same focused command passed with 46 files / 362 tests. It emitted the existing Node v22 versus required Node >=24 engine warning.

## API validation and mapping addendum

### Files changed

- `packages/api/src/routers/scenarioBuilder/effects.ts`
- `packages/api/src/routers/battleLab/load-scenario.ts`
- `packages/api/src/routers/battleLab/scenario-input.ts`
- `packages/api/src/__tests__/scenarioBuilder/effects.test.ts`
- `packages/api/src/__tests__/battleLab/load-scenario.test.ts`
- `packages/api/src/__tests__/battleLab/scenario-input.test.ts`
- `packages/api/src/__tests__/battleLab/battle-lab.test.ts`

### TDD RED/GREEN

After replacing API fixtures with action timing fields and adding status, validation, mapping, alias-rejection, and battle-result coverage, focused API tests failed with seven intended assertions. They identified legacy tick fields, missing `needsTimingConfiguration`, unmapped scenario timing, and an obsolete result assertion. The green implementation accepts only `triggerEveryActions`, `triggerCount`, and `lastsForActions`; derives repair status on list/get/create/update output; maps action timing into the engine; and lets engine validation return `BAD_REQUEST` before replay insertion.

### Verification and review

- `pnpm --filter @qd/engine build` — passed
- `pnpm --filter @qd/db build` — passed
- Focused API tests and `pnpm --filter @qd/api test` — 152 passed
- `pnpm --filter @qd/api typecheck` and `pnpm --filter @qd/api build` — passed
- `pnpm run test` — 10 Turbo tasks passed
- `pnpm run test:e2e` — passed
- Scoped Biome check and `git diff --check` — passed
- No API production code retains tick timing fields; legacy aliases are strictly rejected. No concerns identified.
