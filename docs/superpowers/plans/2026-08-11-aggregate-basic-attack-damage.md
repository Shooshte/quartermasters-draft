# Aggregate Basic Attack Damage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every basic attack use the sum of effective melee, ranged, and spell damage while retaining targeting and row-distance behavior.

**Architecture:** `performBasicAttack` already obtains effective attacker stats and passes one base-damage value through row distance and combat modifiers. Replace only the row-dependent source-stat selection with an aggregate expression. Keep `computeBasicAttackDamage`, targeting, crit, and dodge unchanged.

**Tech Stack:** TypeScript, Vitest, pnpm workspace.

## Global Constraints

- Treat `packages/engine/features/*.feature` files as acceptance criteria.
- Keep targeting and the row-distance penalty unchanged.
- Do not add dependencies.
- Follow TDD: observe the new test fail before production-code changes.
- Run `pnpm run test` and `pnpm run test:e2e` before handoff.

---

### Task 1: Aggregate effective damage stats for basic attacks

**Files:**

- Modify: `packages/engine/src/action-resolution.test.ts:186-204`
- Modify: `packages/engine/src/resolution.ts:45-55`

**Interfaces:**

- Consumes: `getUnitEffectiveStats(attacker): UnitStats`, whose three damage fields include item bonuses and active modifiers.
- Produces: `performBasicAttack(...): number` whose base damage is `meleeDmg + rangedDmg + spellDmg` for every `RowType`.

- [ ] **Step 1: Write the failing behavior test and update legacy expectations**

In `packages/engine/src/action-resolution.test.ts`, replace the ranged-row test with:

```ts
  it("uses aggregate damage with row distance for basic attackers", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Archer", {
              stats: createStats({ meleeDmg: 13, rangedDmg: 7, spellDmg: 4 }),
            }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );

    const outcome = resolveUnitAction(state, state.scenarios[0].rows.ranged[0]!);

    expect(outcome.usedBasicAttack).toBe(true);
    expect(outcome.totalDamage).toBe(12);
  });
```

Update the fallback expectation from `15` to `20`: its warrior has 15 melee, 5 ranged, and 0 spell damage.

- [ ] **Step 2: Run the focused test to verify it fails**

Run `pnpm --filter @qd/engine test -- action-resolution.test.ts`.

Expected: the aggregate test fails because old code selects only `rangedDmg`, producing `4` after the 50% ranged-to-tank distance multiplier, rather than `12`.

- [ ] **Step 3: Implement the minimal production change**

In `packages/engine/src/resolution.ts`, replace:

```ts
  const baseStat =
    attacker.rowType === "tank" || attacker.rowType === "melee"
      ? attackerStats.meleeDmg
      : attackerStats.rangedDmg;
```

with:

```ts
  const baseStat = attackerStats.meleeDmg + attackerStats.rangedDmg + attackerStats.spellDmg;
```

Leave the following `computeBasicAttackDamage` call unchanged so the current row-distance multiplier still applies.

- [ ] **Step 4: Verify the focused engine test file passes**

Run `pnpm --filter @qd/engine test -- action-resolution.test.ts`.

Expected: PASS, including the aggregate test and updated fallback expectation.

- [ ] **Step 5: Verify the complete engine suite passes**

Run `pnpm --filter @qd/engine test`.

Expected: PASS with no test failures.

- [ ] **Step 6: Commit the implementation**

Run `git add packages/engine/src/action-resolution.test.ts packages/engine/src/resolution.ts && git commit -m "feat(engine): aggregate basic attack damage"`.

### Task 2: Verify and deliver the branch

**Files:**

- No source changes expected.

**Interfaces:**

- Consumes: the committed aggregate basic-attack implementation from Task 1.
- Produces: a pushed `feat/aggregate-basic-attack-damage` branch and a pull request targeting `develop`.

- [ ] **Step 1: Run required repository tests**

Run `pnpm run test` and `pnpm run test:e2e`.

Expected: both commands exit successfully.

- [ ] **Step 2: Inspect final state**

Run `git status --short`, `git log --oneline develop..HEAD`, and `git diff --check develop...HEAD`.

Expected: no uncommitted source changes, focused commit history, and no whitespace errors.

- [ ] **Step 3: Push and open a pull request**

Run `git push -u origin feat/aggregate-basic-attack-damage`, then create a GitHub pull request with base `develop`, head `feat/aggregate-basic-attack-damage`, title `feat(engine): aggregate basic attack damage`, and a summary of the aggregate damage behavior and tests run.

Expected: the branch has an upstream and GitHub returns a pull-request URL targeting `develop`.
