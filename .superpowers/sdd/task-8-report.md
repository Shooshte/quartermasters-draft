# Task 8 Report: Web Battle Batches and Action-Based Results

## Status

Implemented the Task 8 battle-result presentation. The result header now reports resolved actions, active modifiers report actions remaining, and the event ledger groups consecutive log entries by action batch. Simultaneous actors are rendered as unordered peer turns within the ordered batch ledger so visual order does not imply resolution order. Single-turn batches retain the existing actor-focused presentation.

## Files Changed

- `apps/web/src/components/battle/battle-event-ledger-model.ts`
- `apps/web/src/components/battle/battle-event-ledger.tsx`
- `apps/web/src/components/battle/battle-result.tsx`
- `apps/web/tests/unit/battle/battle-event-ledger-model.test.ts`
- `apps/web/tests/unit/battle/battle-result.test.tsx`
- `apps/web/tests/unit/battle/battle-workbench.test.tsx`
- `e2e/features/battle/battle-lab.feature`
- `.superpowers/sdd/task-8-report.md`

## Implementation

- Replaced `LedgerLogEntry.tick` with required `batchNumber` and replaced absolute modifier expiry metadata with `actionsRemaining`.
- Changed `BattleEventGroup` into a top-level batch model containing `batchNumber`, attributed turns, and unattributed events.
- Grouped consecutive entries by batch first, then grouped attributed entries by `actionId` inside each batch while retaining paired-basic-damage coalescing.
- Kept batch order in the outer `<ol>` and used an accessibly named `<ul>` for simultaneous peer actions.
- Added the exact multi-turn heading `Simultaneous actions · Batch N` and the explanatory copy `Grouped by simultaneous action batch. Display order does not determine outcomes.`
- Preserved actor-focused rendering for batches with one attributed turn.
- Rendered result totals as `${actionsResolved} actions resolved` and modifier duration as `${actionsRemaining} actions remaining`.
- Preserved action-limit termination wording from structured battle-end messages.
- Removed player-facing tick copy and tick-shaped fixtures from the Task 8 battle component scope.

## TDD Evidence

### Initial RED

After rewriting the Task 8 unit fixtures and acceptance criteria, the prescribed command was run against the old implementation:

```bash
pnpm --filter @qd/api build
pnpm --filter @qd/web test -- tests/unit/battle/battle-event-ledger-model.test.ts tests/unit/battle/battle-result.test.tsx tests/unit/battle/battle-workbench.test.tsx
```

The API build passed. The web command exited `1` with 10 expected failures and 380 passes across 46 files. Failures showed that the model returned top-level turns/events instead of batches, keys still used the removed tick field, detailed modifiers did not recognize `actionsRemaining`, the header still rendered ticks, and no simultaneous batch heading existed.

### Action-limit RED

A draw fixture with `Battle ends at the action limit: draw` was added before the battle-end renderer changed. The test failed because the ledger rendered `Battle ended: draw.`. After the implementation, the action-limit wording assertion passed.

### GREEN

The focused Task 8 command passed after implementation. Because the existing package script forwards arguments after a separator, Vitest ran the complete web suite:

```text
Test Files  46 passed (46)
Tests       390 passed (390)
```

## Fresh Final Verification

The following chained verification command exited `0`:

```bash
pnpm --filter @qd/api build
pnpm --filter @qd/web test -- tests/unit/battle
pnpm --filter @qd/web typecheck
pnpm --filter @qd/web build
pnpm exec biome check apps/web/src/components/battle/battle-event-ledger-model.ts apps/web/src/components/battle/battle-event-ledger.tsx apps/web/src/components/battle/battle-result.tsx apps/web/tests/unit/battle/battle-event-ledger-model.test.ts apps/web/tests/unit/battle/battle-result.test.tsx apps/web/tests/unit/battle/battle-workbench.test.tsx
git diff --check
```

Evidence:

- API build: passed.
- Web tests: 46 files and 390 tests passed.
- Web TypeScript check: passed.
- Web production build: passed, including client, SSR, and Nitro output.
- Scoped Biome check: 6 files checked with no fixes required.
- `git diff --check`: passed.
- Residual-language audit found no tick contract in `apps/web/src/components/battle`; the only Task 8 test references are negative assertions proving tick text is absent.

Every pnpm command emitted the repository's existing warning that the root `pnpm` field is ignored by the installed pnpm version. It did not affect exit status.

## Self-Review

- Confirmed two action IDs sharing `batchNumber: 4` produce one batch with two peer turns.
- Confirmed later unattributed effects remain in their later batch and detailed expirations still coalesce.
- Confirmed outer batches remain ordered while simultaneous turns use a named unordered list with two accessible list items.
- Confirmed single-turn batches do not gain unnecessary batch chrome and retain the actor label/details convention.
- Confirmed the result card, active effects, modifier details, battle-end copy, and battle fixtures contain no player-facing tick wording.
- Confirmed effect rows retain unique React keys for multi-stat expirations.
- Confirmed only Task 8-owned source, unit-test, and feature files changed, plus this required report.

Independent code review found no Critical or Important Task 8 issues and rated the task ready. Its only minor recommendation was eventually replacing existing `as unknown as ReplayOutput["result"]` test-fixture casts with typed factories.

## Concerns and Follow-Up

- The Playwright page object and battle spec still use the old response shape. Those files are explicitly owned by Task 9, and the parent instruction prohibited editing that final E2E task here. Task 9 must replace their tick fields and add the deterministic browser assertion for the simultaneous-batch heading before repository-level completion.
- Full Docker-backed E2E was not run because its contract migration is Task 9 work; Task 8 verification covered the complete web unit suite, typecheck, and production build.
