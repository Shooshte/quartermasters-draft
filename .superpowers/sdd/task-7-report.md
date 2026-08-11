# Task 7 Report: Web Effect Authoring and Legacy Repair UX

## Status

Implemented action-based effect authoring and legacy timing repair UX. Effect forms now use `triggerEveryActions`, `triggerCount`, and `lastsForActions`; validation and repair status match the API rules; library rows and workspaces show **Timing needs configuration**; strict mutation payloads exclude API metadata; and the direct Playwright coverage exercises repair of a persisted incomplete effect.

## Files Changed

- `apps/web/src/components/create/effect-form.ts`
- `apps/web/src/components/create/effect-colors.ts`
- `apps/web/src/components/create/effect-workspace-form.tsx`
- `apps/web/src/components/create/effect-library-list.tsx`
- `apps/web/src/components/create/library-panel.tsx`
- `apps/web/src/components/create/use-create-page-state.ts`
- `apps/web/tests/unit/create/effect-form.test.ts`
- `apps/web/tests/unit/create/entity-library-list.test.tsx`
- `apps/web/tests/unit/create/entity-workspace.test.tsx`
- `apps/web/tests/unit/create/library-panel.test.tsx`
- `apps/web/tests/unit/create/use-create-page-state.test.tsx`
- `e2e/features/create/effect-workspace.feature`
- `e2e/tests/scenario-builder/effect-workspace.test.ts`
- `.superpowers/sdd/task-7-report.md`

The additional typed library fixtures and direct Playwright spec were necessary contract/acceptance fallout from the requested list status and Gherkin changes.

## TDD Evidence

### RED 1: action timing and repair behavior

Command:

```bash
pnpm --filter @qd/api build
pnpm --filter @qd/web test -- tests/unit/create/effect-form.test.ts tests/unit/create/entity-workspace.test.tsx tests/unit/create/use-create-page-state.test.tsx tests/unit/create/library-panel.test.tsx
```

Result: API build passed; web tests failed with 13 expected failures and 370 passes. Failures were the old tick-shaped defaults/validation/payload, missing action field IDs and helper text, missing workspace warning, missing list warning, and interval modifier save behavior.

### RED 2: strict API mutation payload safety

Command:

```bash
pnpm --filter @qd/web test -- tests/unit/create/effect-form.test.ts
```

Result: one expected failure because `effectRecordToFormValues` copied API-only `id`, `needsTimingConfiguration`, and `updatedAt` fields into form values.

### GREEN

Command:

```bash
pnpm --filter @qd/web test -- tests/unit/create/effect-form.test.ts tests/unit/create/entity-workspace.test.tsx tests/unit/create/use-create-page-state.test.tsx tests/unit/create/library-panel.test.tsx tests/unit/create/entity-library-list.test.tsx
```

Result: 46 test files passed, 384 tests passed.

## Verification

- `pnpm --filter @qd/api build` — passed.
- Focused web test command above — passed, 46 files / 384 tests.
- `pnpm --filter @qd/e2e test:e2e -- tests/scenario-builder/effect-workspace.test.ts` — passed, 9 tests.
- `pnpm --filter @qd/web build` — passed.
- Scoped `pnpm exec biome check ...` — passed with no fixes.
- `git diff --check` — passed.
- `pnpm --filter @qd/web typecheck` — blocked by pre-existing/in-progress Task 8 battle ledger/result migration errors only. Errors are confined to `battle-event-ledger.tsx`, `battle-result.tsx`, and `battle-result.test.tsx` references to removed tick contracts; Task 7 contributes no type errors.

## Self-Review

- Confirmed no tick-facing fields or copy remain in effect authoring, its Gherkin, or its direct Playwright spec; old names remain only in negative payload assertions.
- Confirmed instant timing clears cadence/count but retains duration.
- Confirmed instant stat buffs/debuffs require duration, while interval stat modifiers require cadence/count without duration.
- Confirmed warning copy is exact in workspaces and list rows; workspace warning uses `role="alert"`, labels remain associated with inputs, and save stays disabled while invalid.
- Confirmed action values persist through the real API and incomplete migrated timing can be repaired end to end.
- Independent code review found no remaining Critical, Important, or Minor issues after adding persisted legacy-repair Playwright coverage.

## Concerns / Follow-Up

- Global web typecheck cannot turn green until Task 8 updates the battle ledger/result presentation to the new engine contracts. Those files were explicitly excluded from Task 7 and were not edited.
