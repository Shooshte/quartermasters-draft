# Task 7 report: E2E targeting and item placement acceptance

## Status

Task 7 is implemented. The requested browser acceptance coverage now proves ranged-only item placement and an adjacent three-target highest-damage activation. Existing E2E coverage and page objects were migrated to the current targeting and item-row contracts; product behavior was not refactored.

## Implementation

- Migrated unit-workspace feature coverage and page-object selectors from the retired target-side/row model to `targetScope`, `targetPriority`, `targetCount`, and `selectionShape`.
- Added item-workspace acceptance coverage for allowed deployment rows persisting after save and reload.
- Added deterministic scenario setup for an Archer equipped with a ranged-only Longbow, then asserted that the unit is available in the Ranged picker and absent from the Tank picker.
- Added deterministic battle setup for a Templar configured for highest-damage targeting with `targetCount: 3` and `selectionShape: adjacent`, then asserted the activation records exactly the three contiguous ranged targets in order. Four equal-health candidates make the high-damage primary select a different adjacent window from the default high-health priority.
- Migrated shared E2E database setup and read assertions from the removed unit-row seed model to item allowed rows and the current targeting fields.
- Used existing stable test IDs and web-first Playwright assertions throughout; no sleeps were added.

## TDD evidence

The first two focused attempts could not reach Playwright because Docker timed out fetching registry metadata for `node:24-alpine` with `DeadlineExceeded`. The application image was then rebuilt locally from the already-present Node 24 dependency layer; the temporary Dockerfile was removed after use.

Focused command:

```text
pnpm --filter @qd/e2e test:e2e -- scenario-builder/unit-workspace.test.ts scenario-builder/library-items-tab.test.ts scenario-builder/scenario-workspace.test.ts battle/battle-lab.test.ts
```

- RED: 75 passed, 1 failed. The failure was an extra empty-state-copy assertion beyond the required picker restriction; the required assertion that Archer was absent from Tank had already passed.
- GREEN: 76 passed in 41.6s after removing that copy-level overconstraint. The exact required availability/absence assertion remained.

## Verification

- Focused E2E command above: PASS, 76/76 in 40.2s on the final reviewed fixture.
- `pnpm run test`: PASS, 10/10 Turbo tasks; web 46 files / 362 tests, API 146 tests, DB 69 tests, engine 121 tests, E2E unit 4 tests.
- `pnpm run test:e2e`: PASS, 290/290 in 1.7m.
- `pnpm run lint`: PASS; Biome checked 283 files and all 9 typecheck tasks succeeded.
- `pnpm run typecheck`: PASS, 9/9 Turbo tasks.
- `git diff --check`: PASS.

A read-only completion review found that the initial three-candidate battle fixture proved count and contiguity but could not distinguish `highest_damage` from the default priority. The final four-candidate fixture gives Samurai uniquely highest damage while all candidates have equal health, and expects slots 2–4; a default high-health regression would instead choose the slots 1–3 window. The review also aligned the placement test with the feature wording by opening an existing scenario rather than a new form.

The initial full lint run identified formatting-only violations left in four files changed by earlier tasks: `unit-targeting-summary.tsx`, `scenario-input.ts`, `0016_snapshot.json`, and `_journal.json`. Applying Biome's mechanical formatting to those files made the required full lint command pass; no behavior changed.

After the review fix, the first lint rerun identified one line-wrap-only formatter violation in `battle-lab.test.ts`; applying Biome's exact output made the final lint command pass.

## Commit

- `test(e2e): cover targeting and item row restrictions`

## Assumptions and follow-ups

- Test-only SQL uses deterministic IDs for item-row and unit-item links and restores isolation through the existing worker database reset flow.
- The host shell uses Node `v22.20.0`, while the repository requests Node `>=24 <26`; commands emitted the existing engine warning. The Dockerized application used Node 24.
- Docker registry metadata requests timed out during the first image builds. Verification completed using a locally rebuilt image based on the existing Node 24 dependency layer, and the full E2E suite passed.
