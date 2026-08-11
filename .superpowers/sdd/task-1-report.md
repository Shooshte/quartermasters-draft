# Task 1 report: Aggregate effective damage stats for basic attacks

## Changed files

- `packages/engine/src/resolution.ts`: `performBasicAttack` now uses the effective melee, ranged, and spell damage sum as its base damage for every attacker row. The existing target selection, row-distance calculation, critical-hit, and dodge paths are unchanged.
- `packages/engine/src/action-resolution.test.ts`: added the aggregate ranged-row regression case and updated all stale basic-attack damage/health expectations.
- `packages/engine/src/win-conditions.test.ts`: updated outcome expectations affected by the increased aggregate basic-attack damage.

## Test results

- Focused command: `pnpm --filter @qd/engine test -- action-resolution.test.ts` — PASS, 16 test files and 165 tests passed.
- Complete engine suite: `pnpm --filter @qd/engine test` — PASS, 16 test files and 165 tests passed.
- `git diff --check` — PASS.

## TDD RED/GREEN evidence

- RED: after replacing the ranged-row test and changing the fallback expectation, the focused command failed as intended: 2 tests failed, including aggregate damage received as 4 instead of 12 and fallback damage received as 15 instead of 20.
- GREEN: after changing the production base damage to `meleeDmg + rangedDmg + spellDmg` and updating affected legacy expectations, the focused command passed with 165/165 tests.
- Final GREEN: the complete engine suite passed with 165/165 tests.

## Self-review findings

- The production diff is minimal and limited to the requested base-stat calculation.
- The aggregate test uses distinct melee, ranged, and spell values and verifies the existing ranged-to-tank row-distance result.
- Target selection and row-distance logic remain untouched.
- Item-effect behavior and expectations remain untouched.
- No formatting errors were reported by `git diff --check`.

## Concerns

- No functional concerns.
- pnpm emits an existing warning that the `pnpm` field in `package.json` is no longer read; it did not affect test results.
