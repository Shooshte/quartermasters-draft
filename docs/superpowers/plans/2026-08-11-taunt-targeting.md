# Taunt Targeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let GMs configure persistent or affected-unit-action-timed taunts that force legal targets to prioritize the latest taunting source.

**Architecture:** Add a boolean `isTaunt` capability to reusable effect templates and carry it through persistence, API mapping, and the GM form. The engine turns instant taunts into active effects; target selection promotes the newest reachable living taunt source only after normal candidate and row-reach filtering. Timed taunts share the existing `actionsRemaining` expiry mechanism, while persistent taunts omit it.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL migrations, tRPC/Zod, React, Vitest, Playwright.

## Global Constraints

- Preserve target scope, living-target, selection-shape, and row-distance rules.
- Do not add dependencies.
- Test behavior before implementation, observe each new test fail, then add the minimum production change.
- Keep existing four effect categories; taunt is an orthogonal effect capability.
- Persistent taunts use `timingType: "instant"` with `lastsForActions: null`; timed taunts use instant timing with a positive `lastsForActions`.

---

### Task 1: Persist and configure the taunt capability

**Files:**
- Modify: `packages/db/src/schema.ts`, `packages/db/src/effect-timing-schema.test.ts`
- Create: `packages/db/drizzle/0018_add_effect_taunt.sql`, `packages/db/drizzle/meta/0018_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`, `packages/api/src/routers/scenarioBuilder/effects.ts`, `packages/api/src/__tests__/scenarioBuilder/effects.test.ts`, `packages/api/src/routers/battleLab/load-scenario.ts`, `packages/api/src/routers/battleLab/scenario-input.ts`, `packages/api/src/__tests__/battleLab/load-scenario.test.ts`
- Modify: `apps/web/src/components/create/effect-form.ts`, `apps/web/src/components/create/effect-workspace-form.tsx`, `apps/web/tests/unit/create/effect-form.test.ts`

**Interfaces:**
- Produces `isTaunt: boolean` on stored effect records and `EffectTemplateInput` payloads.
- GMs can set `isTaunt`; instant taunts may omit a duration and timed instant taunts require a positive duration.

- [ ] **Step 1: Write failing persistence, API, and form tests**

Add tests that assert the schema exposes a non-null `is_taunt` column with a `false` default; the effects router accepts, returns, and normalizes `isTaunt`; the battle scenario loader maps it into engine input; and the form defaults it to false, preserves it, and requires `lastsForActions` only when an instant taunt is configured as timed.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `pnpm --filter @qd/db test -- effect-timing-schema.test.ts && pnpm --filter @qd/api test -- effects.test.ts load-scenario.test.ts && pnpm --filter @qd/web test -- effect-form.test.ts`

Expected: FAIL because `isTaunt` is not defined in the schema/input/form models.

- [ ] **Step 3: Implement storage, transport, and form support**

Add `isTaunt` as `boolean("is_taunt").notNull().default(false)` plus the additive migration and generated snapshot/journal record. Thread the field through Zod input, repository selects, battle input mapping, React form state, normalization, validation, and a labeled checkbox in the effect workspace. Update timing applicability so an instant taunt accepts either no duration (persistent) or a positive duration (timed).

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `pnpm --filter @qd/db test -- effect-timing-schema.test.ts && pnpm --filter @qd/api test -- effects.test.ts load-scenario.test.ts && pnpm --filter @qd/web test -- effect-form.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add packages/db packages/api apps/web && git commit -m "feat: configure taunt effects"`

### Task 2: Apply persistent and timed taunts in the engine

**Files:**
- Modify: `packages/engine/src/types.ts`, `packages/engine/src/test-helpers.ts`, `packages/engine/src/effects.ts`, `packages/engine/src/effects.test.ts`, `packages/engine/src/validation.ts`, `packages/engine/src/validation.test.ts`

**Interfaces:**
- `EffectTemplateInput` has `isTaunt?: boolean`.
- `ActiveEffectState` has `isTaunt?: boolean` and uses `actionsRemaining` only for a timed taunt.
- An instant taunt creates exactly one active taunt status, regardless of stat modifiers.

- [ ] **Step 1: Write failing engine tests**

Add tests showing an instant persistent taunt adds an active status without `actionsRemaining`, an instant timed taunt adds one with the configured duration, and a timed taunt expires after its affected unit’s configured action opportunities. Add validation tests that reject interval taunts and non-positive timed-taunt durations.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `pnpm --filter @qd/engine test -- effects.test.ts validation.test.ts`

Expected: FAIL because taunt effects do not create an active status or receive taunt-specific timing validation.

- [ ] **Step 3: Implement taunt lifecycle support**

Extend effect types and helpers with `isTaunt`. In instant effect application, create one status effect for a taunt, using the caster source fields and omitting `actionsRemaining` for persistence. For a duration, reuse `completeResolvedActionEffects`. Reject interval taunts in battle input validation to avoid unsupported interval semantics.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `pnpm --filter @qd/engine test -- effects.test.ts validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add packages/engine && git commit -m "feat: apply taunt statuses"`

### Task 3: Prioritize legal taunt sources during targeting

**Files:**
- Modify: `packages/engine/src/targeting.ts`, `packages/engine/src/unit-targeting.test.ts`, `packages/engine/features/unit-targeting.feature`

**Interfaces:**
- `selectTargets(state, caster, targeting)` returns the latest active taunt source as primary only if it occurs in `reachableCandidates`.

- [ ] **Step 1: Write failing targeting tests**

Add tests for persistent taunt priority over `lowest_health`, newest taunt winning when two are active, fallback to normal priority when the newest taunter is dead or outside scope, timed-taunt fallback after expiry, and a melee/tank caster that cannot target a taunter behind a nearer occupied row. Include an adjacent-selection test centered on a legal taunter.

- [ ] **Step 2: Run focused test to verify it fails**

Run: `pnpm --filter @qd/engine test -- unit-targeting.test.ts`

Expected: FAIL because target ranking currently ignores active taunt status.

- [ ] **Step 3: Implement legal taunt promotion**

After `reachableCandidates` but before `rankCandidates`, inspect the caster’s active effects from newest to oldest, resolve each source ID, and return the source only when it is among the reachable candidates. Otherwise retain the existing priority ranking and selection-shape behavior unchanged.

- [ ] **Step 4: Run focused test to verify it passes**

Run: `pnpm --filter @qd/engine test -- unit-targeting.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add packages/engine && git commit -m "feat: prioritize legal taunt sources"`

### Task 4: Verify the full stack and deliver the branch

**Files:**
- Modify: `packages/engine/features/effects.feature` if acceptance criteria need an explicit taunt scenario.

- [ ] **Step 1: Add the taunt acceptance scenarios**

Document persistent, timed, newest-wins, and row-reach behavior in the relevant engine feature files.

- [ ] **Step 2: Run quality checks**

Run: `pnpm lint && pnpm typecheck && pnpm run test && pnpm run test:e2e`

Expected: all commands pass.

- [ ] **Step 3: Review the diff**

Run: `git diff develop...HEAD --check && git status --short`

Expected: no whitespace errors and only intended changes.

- [ ] **Step 4: Commit final documentation**

Run: `git add packages/engine/features && git commit -m "docs: specify taunt targeting behavior"`

- [ ] **Step 5: Push and open the pull request**

Run: `git push -u origin feat/taunt-targeting && gh pr create --base develop --head feat/taunt-targeting --title "feat: add taunt targeting" --body "## Summary\n- configure persistent and timed taunt effects\n- prioritize the newest legal taunt source\n- preserve row targeting limits\n\n## Verification\n- pnpm lint\n- pnpm typecheck\n- pnpm run test\n- pnpm run test:e2e"`

Expected: remote branch and pull request targeting `develop` are created.
