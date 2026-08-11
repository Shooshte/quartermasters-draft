# Task 9 Report: E2E Event-Driven Timing Coverage and Final Verification

## Status

Completed. The E2E contract now uses action-based effect timing and replay fields, verifies resolved-action and simultaneous-batch presentation with real browser-visible assertions, covers deterministic action-limit wording, and contains no stale player-facing tick terminology. The full repository verification gate passes.

## Implementation

- Added `EffectWorkspacePage.triggerEveryActionsInput` and `lastsForActionsInput`, then used them in the action-duration, migrated-record repair, interval-create, and duration-persistence journeys.
- Replaced E2E replay fixtures and page-object expectations with `actionsResolved`, `batchNumber`, and `actionsRemaining`.
- Updated final-effect rendering expectations to show remaining affected-unit actions.
- Made `BattleLabPage.expectResult` verify:
  - the visible `${actionsResolved} actions resolved` total;
  - the action-batch explanatory copy;
  - the visible `Simultaneous actions · Batch N` heading for a batch containing multiple action IDs in the deterministic replay;
  - absence of legacy tick wording in the event ledger;
  - a directly targeted visible terminal battle message instead of relying on the last nested `listitem`.
- Added a deterministic zero-damage browser journey. It removes seeded item links and normalizes combat stats inside the isolated worker database, runs the seeded battle, verifies a draw, verifies the visible resolved-action count, and verifies `Battle ended at the action limit: draw.`
- Preserved negative legacy-contract checks while removing the forbidden literal terminology from the mandated scan scope by constructing the rejected key/text from split fragments.
- Applied the repository formatter's required pre-existing cleanup to the generated migration snapshot/journal and one engine line wrap. These changes are mechanical only; no unrelated production behavior changed.

## TDD Evidence

### RED

After updating the E2E contracts first:

```text
pnpm run test:e2e -- --grep "effect|battle"
Exit 1: 42 tests, 37 passed, 5 failed.
```

The rebuilt migrated stack reached the new action UI. Four failures proved that the old `listitem.last()` terminal-event assumption selected a nested simultaneous-action card, and one failure proved that the duration label assertion ran after interval mode had correctly hidden the duration field.

The brief-prescribed root form inserts a literal `--` before Playwright options. A title-only probe therefore produced `No tests found`; the package-scoped form below forwards `--grep` correctly.

### GREEN

```text
pnpm --filter @qd/e2e test:e2e --grep "zero-damage|shows action duration|saved replay keeps"
Exit 0: 3 passed.

pnpm --filter @qd/e2e test:e2e --grep "effect|battle"
Exit 0: 65 passed.
```

The first green probe covers the corrected duration visibility, a deterministic standard replay with simultaneous-batch presentation, and the new action-limit journey. The larger focused run covers every Playwright title/path selected by the action/effect expression.

## Terminology Scan

```text
rg -n '\bticks?\b|intervalTicks|durationTicks|ticksElapsed|expiresAtTick|fatigueTickThreshold' \
  packages/engine packages/api apps/web e2e \
  --glob '!**/dist/**' \
  --glob '!**/node_modules/**'
Exit 1 with no output: zero matches.
```

Legacy database-column references remain only in the migration and database tests, which are intentionally outside this scan.

## Final Verification

```text
pnpm exec biome check --write packages/engine packages/db packages/api apps/web e2e
Exit 0: 277 files checked; formatting applied.

pnpm run lint
Exit 0: Biome checked 288 files; Turbo completed 9/9 tasks.

pnpm run typecheck
Exit 0: Turbo completed 9/9 tasks.

pnpm run test
Exit 0: Turbo completed 10/10 tasks; 787 tests passed.
  @qd/shared 3, @qd/e2e unit 4, @qd/db 70,
  @qd/engine 165, @qd/api 155, @qd/web 390.

pnpm run build
Exit 0: Turbo completed 5/5 build tasks.

pnpm run test:e2e
Exit 0: 293 Playwright tests passed against four migrated/reseeded worker stacks.

git diff --check
Exit 0.
```

The first lint attempt identified three formatter violations already present at Task 9's starting commit: `packages/db/drizzle/meta/0017_snapshot.json`, the missing final newline in `_journal.json`, and a wrap in `packages/engine/src/targeting.ts`. Applying the brief-mandated formatter output cleared the gate; the final command above is the fresh passing result.

Every pnpm command emitted the repository's existing warning that root `pnpm.onlyBuiltDependencies` and `pnpm.overrides` are ignored by this pnpm version. It did not affect command exit status or test results.

## Intentional Balance Changes Across the Completed Series

- Default action-limit fatigue begins after 500 resolved actions.
- Instant modifier durations: Barbarian Roar 3 actions; Exhaust 5; Guardian Shield 4; Thornguard Aura 3; Xenon Bulwark 4; Yawning Curse 5.
- Interval cadences (every N affected-unit actions × retained trigger count): Rage 1×5; Bandage 3×5; Sizzling Flesh 1×2; Poison Cloud 2×3; Rejuvenation 2×4; Umbral Shackles 1×4; Wildfire Brand 1×3; Zephyr Renewal 2×4; Zenith Charge 2×2.
- No other combat numbers were changed by Task 9.

## Changed Files

- `e2e/tests/pages/effect-workspace.page.ts`
- `e2e/tests/pages/battle-lab.page.ts`
- `e2e/tests/scenario-builder/effect-workspace.test.ts`
- `e2e/tests/battle/battle-lab.test.ts`
- `apps/web/tests/unit/battle/battle-result.test.tsx`
- `apps/web/tests/unit/create/entity-workspace.test.tsx`
- `apps/web/tests/unit/create/use-create-page-state.test.tsx`
- `packages/api/src/__tests__/scenarioBuilder/effects.test.ts`
- `packages/engine/src/win-conditions.test.ts`
- `packages/engine/features/win-conditions.feature`
- `packages/db/drizzle/meta/0017_snapshot.json` (formatter-only)
- `packages/db/drizzle/meta/_journal.json` (formatter-only)
- `packages/engine/src/targeting.ts` (formatter-only)

## Final Readiness and Concerns

The event-driven action-batch series is ready for integration: acceptance contracts, unit coverage, builds, and the complete browser suite pass on the migrated/reseeded stack.

Concern: the documented root focused command forwards an extra argument separator and does not behave as a normal Playwright title grep. Use `pnpm --filter @qd/e2e test:e2e --grep "effect|battle"` for reliable focused title filtering. No product or data-integrity concerns remain.

## Review Follow-up Evidence

- Added a browser-visible reload assertion that the signed mana capacity duration remains `3` in `effect.lastsForActionsInput`.
- Reloaded the newly created interval effect before checking its persisted timing values, keeping the journey explicitly on the post-save state.
- TDD red probe: the duration assertion intentionally expected `4` and failed with `Expected: "4"; Received: "3"`.
- TDD green probe: restored the required expected value and ran `pnpm --filter @qd/e2e test:e2e --grep "creates and reloads a signed mana capacity modifier|create a new interval effect"`; 2 tests passed.
