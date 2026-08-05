# Item Effects and Unit Targeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove spells by linking ordered reusable effects directly to items and putting explicit targeting on units.

**Architecture:** `units` own explicit target-side and target-selection rules through a new `units_allowed_rows` relation. `items` own ordered, duplicate-capable effect links through `items_effects`; item activation selects targets once with the acting unit configuration, pays its cost once, and executes those effects in order. The migration backfills item effects deterministically, removes spell persistence, then each boundary—engine, API, builder, and E2E—is changed to the new vocabulary.

**Tech Stack:** PostgreSQL and Drizzle ORM migrations, tRPC v11 and Zod, TypeScript, React 19/TanStack Start, Vitest, Playwright.

## Global Constraints

- Follow the approved design in `docs/superpowers/specs/2026-08-05-item-effects-unit-targeting-design.md`.
- Treat `.feature` files as acceptance criteria and update them before the implementation that satisfies them.
- Use test-driven development: add a focused failing test, run it, then implement the minimum change and rerun it.
- Do not add dependencies.
- Effects remain reusable; `items_effects` preserves duplicates and per-item sequence order.
- Stat-only items remain valid and are skipped during activation resolution.
- Unit targeting defaults are `enemies`, `highest_health`, one row, one target per row, non-adjacent, and all rows eligible.
- Preserve deterministic IDs in all replacement seed data.
- Keep all changes scoped to this migration and its necessary UI cleanup.

---

## File Structure

| Area | Files | Responsibility |
| --- | --- | --- |
| Database | `packages/db/src/schema.ts`, `packages/db/drizzle/0015_item_effects_unit_targeting.sql`, `packages/db/drizzle/meta/0015_snapshot.json`, `packages/db/src/unit-targeting-schema.test.ts` | Replace spell persistence with item effects and unit targeting; migrate existing rows. |
| Seed and test database | `packages/db/src/seed-data.ts`, `packages/db/src/seed-data.test.ts`, `packages/db/src/seed.ts`, `e2e/tests/helpers/{worker-db,seed-constants}.ts` | Seed the replacement graph with deterministic IDs and reset it for tests. |
| Engine | `packages/engine/src/{types,targeting,effects,resolution,logging}.ts` and their tests/features | Resolve item effects with unit targeting and item-only attribution. |
| Battle API | `packages/api/src/routers/battleLab/{load-scenario,scenario-input}.ts` and tests | Load direct item effects and unit targeting into engine inputs. |
| Builder API | `packages/api/src/routers/scenarioBuilder/{index,items,units,effects}.ts` and tests | Remove spell procedures; expose ordered effect IDs on items and targeting on units. |
| Builder UI | `apps/web/src/components/create/**` | Remove every spell UI path; add item-effect and unit-targeting editing. |
| Acceptance tests | `e2e/features/**`, `e2e/tests/**`, `apps/web/tests/unit/create/**` | Rewrite removed spell scenarios and cover the replacement interactions. |

### Task 1: Replace the Gherkin acceptance contract

**Files:**
- Delete: `e2e/features/create/spell-workspace.feature`
- Delete: `e2e/features/create/library-spells-tab.feature`
- Modify: `e2e/features/create/item-workspace.feature`
- Modify: `e2e/features/create/unit-workspace.feature`
- Modify: `e2e/features/create/effect-workspace.feature`
- Modify: `packages/engine/features/{effects,spell-targeting,action-resolution,mana-system,battle-log}.feature`

**Consumes:** Approved design and existing acceptance scenarios.

**Produces:** Item-effect and unit-targeting behavior that every later unit and E2E test implements.

- [ ] **Step 1: Write the replacement scenarios before changing product code**

  Replace spell language with item activation. Add item scenarios that link, search, reorder, edit, remove, and duplicate effects; retain a stat-only item scenario. Add unit scenarios for explicit `allies`, `enemies`, and `self` target side, every target policy, row controls, defaults, validation, and summary text that never infers side from effects. Change effect deletion to reject only item-linked effects.

  In engine features, replace a spell fixture with an item fixture such as:

  ```gherkin
  Given "Warrior" has an item "Fire Sword" costing 10 mana with effects "Flame Strike" then "Burn"
  And "Warrior" targets enemies using "highest_health"
  When "Warrior" acts
  Then "Warrior" activates item "Fire Sword"
  And "Warrior" mana is reduced by 10
  And the effects apply in the listed order
  ```

- [ ] **Step 2: Make the breaking changes explicit in the new stories**

  Delete every spell-library/workspace scenario. Replace “first effect determines target side” with a scenario proving a damage effect applies to an ally when the unit target side is `allies`, and a healing effect applies to an enemy when it is `enemies`. Replace the old “multiple spells on an item” cost behavior with one ordered effect sequence and one cost payment.

- [ ] **Step 3: Review the feature diff**

  Run: `git diff --check -- e2e/features packages/engine/features`

  Expected: no whitespace errors and no remaining scenario that requires a spell entity.

- [ ] **Step 4: Commit the acceptance-contract change**

  ```bash
  git add e2e/features packages/engine/features
  git commit -m "test: replace spell acceptance criteria"
  ```

### Task 2: Add red database-schema tests and migrate persistence

**Files:**
- Create: `packages/db/src/unit-targeting-schema.test.ts`
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/spell-targeting-schema.test.ts`
- Create: `packages/db/drizzle/0015_item_effects_unit_targeting.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Create: `packages/db/drizzle/meta/0015_snapshot.json`

**Consumes:** Task 1’s unit defaults and direct item-effect relationship.

**Produces:** `itemsEffects`, `unitsAllowedRows`, `targetSideEnum`, and unit targeting columns; no exported spell schema tables.

- [ ] **Step 1: Write failing table-configuration tests**

  Replace `spell-targeting-schema.test.ts` with assertions for the new unit configuration and add table assertions for `itemsEffects`:

  ```ts
  expect(targetSideEnum.enumValues).toEqual(["allies", "enemies", "self"]);
  expect(getTableConfig(units).columns.find((c) => c.name === "target_side")?.default).toBe("enemies");
  expect(getTableConfig(itemsEffects).checks.map((c) => c.name)).toContain("items_effects_sequence_order_positive");
  expect(getTableConfig(itemsEffects).uniqueConstraints.map((c) => c.name)).toContain(
    "items_effects_item_id_sequence_order_unique",
  );
  ```

- [ ] **Step 2: Run the database schema tests and confirm failure**

  Run: `pnpm --filter @qd/db test -- unit-targeting-schema.test.ts`

  Expected: FAIL because `targetSideEnum`, `itemsEffects`, and unit targeting columns do not exist.

- [ ] **Step 3: Implement the schema and generated migration**

  In `schema.ts`, remove `spells`, `spellsEffects`, `spellsAllowedRows`, and `itemsSpells`. Define:

  ```ts
  export const targetSideEnum = pgEnum("target_side", ["allies", "enemies", "self"]);

  export const itemsEffects = pgTable("items_effects", {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    effectTemplateId: uuid("effect_template_id").notNull().references(() => effects.id),
    sequenceOrder: integer("sequence_order").notNull(),
  }, (table) => [/* both indexes, positive check, unique(itemId, sequenceOrder) */]);
  ```

  Add unit columns `targetSide`, `targetPolicy`, `targetRowCount`, `maxTargetsPerRow`, and `targetOnlyAdjacent`, with the defaults in Global Constraints and checks equivalent to the former spell targeting constraints. Create `unitsAllowedRows` with unique `(unitId, rowType)`.

  Generate the migration with `pnpm --filter @qd/db db:generate --name item_effects_unit_targeting`, which must create `0015_item_effects_unit_targeting.sql` and `0015_snapshot.json`. Edit the generated SQL to: create and populate `items_effects` from `items_spells JOIN spells_effects` ordered by `item_id`, `spell_id`, and former `sequence_order`; issue `RAISE NOTICE` diagnostics for multi-spell items and units whose equipped source spells disagree; add default targeting columns and allowed-row table; then drop old spell triggers/functions/tables in dependency-safe order.

- [ ] **Step 4: Verify the focused tests and apply migration to an empty database**

  Run: `pnpm --filter @qd/db test -- unit-targeting-schema.test.ts`

  Expected: PASS.

  Run: `pnpm db:migrate`

  Expected: migration applies without foreign-key or constraint errors.

- [ ] **Step 5: Commit the persistence migration**

  ```bash
  git add packages/db/src/schema.ts packages/db/src/*targeting-schema.test.ts packages/db/drizzle
  git commit -m "feat(db): link effects to items and targeting to units"
  ```

### Task 3: Replace spell seed data and database reset fixtures

**Files:**
- Modify: `packages/db/src/{seed-data,seed-data.test,seed}.ts`
- Modify: `e2e/tests/helpers/{worker-db,seed-constants,trpc-api,workspace-helpers}.ts`

**Consumes:** Task 2 schema exports.

**Produces:** Deterministic `itemsEffectsSeedData` and unit targeting seed fields; no spell fixtures or entity types.

- [ ] **Step 1: Write failing seed assertions**

  Replace spell-seed assertions with item-effect and unit-targeting checks:

  ```ts
  expect(itemsEffectsSeedData.every((link) => link.sequenceOrder > 0)).toBe(true);
  expect(new Set(itemsEffectsSeedData.map((link) => `${link.itemId}:${link.sequenceOrder}`)).size)
    .toBe(itemsEffectsSeedData.length);
  expect(unitSeedData.every((unit) => unit.targetSide === "enemies")).toBe(true);
  ```

- [ ] **Step 2: Run the focused seed test to verify failure**

  Run: `pnpm --filter @qd/db test -- seed-data.test.ts`

  Expected: FAIL because spell seed exports no longer match the schema and item-effect fixtures are absent.

- [ ] **Step 3: Implement deterministic replacement fixtures**

  Remove `spellSeedData`, `spellsEffectsSeedData`, `spellsAllowedRowsSeedData`, and `itemsSpellsSeedData`. Create `itemsEffectsSeedData` with deterministic UUIDs, effect IDs, and sequence order. Give each seeded unit the new target defaults (and selected non-default fixtures needed by targeting E2E tests). Update the seed insertion order and worker cleanup/insertion order to `effects`, `items`, `itemsEffects`, `units`, `unitsAllowedRows`, and their existing scenario relations. Narrow E2E helper unions to `effects | items | units | scenarios`.

- [ ] **Step 4: Run seed and database tests**

  Run: `pnpm --filter @qd/db test -- seed-data.test.ts`

  Expected: PASS.

  Run: `pnpm db:seed`

  Expected: seed completes with no reference to spell tables.

- [ ] **Step 5: Commit seed changes**

  ```bash
  git add packages/db/src e2e/tests/helpers
  git commit -m "test: seed direct item effects"
  ```

### Task 4: Refactor engine types, selection, resolution, and logs

**Files:**
- Modify: `packages/engine/src/{types,targeting,effects,resolution,logging,state}.ts`
- Modify: `packages/engine/src/{spell-targeting,effects,action-resolution,battle-log,mana-system}.test.ts`

**Consumes:** Unit targeting and item-effect semantics from Tasks 1–3.

**Produces:** Item activation with a unit targeting input and item-only battle attribution.

- [ ] **Step 1: Add failing engine tests for the new public contracts**

  Replace spell factories with item factories and add tests that prove: an item pays exactly once for multiple ordered effects; a unit target side, not effect category, chooses candidates; `self` selects only the caster when eligible; stat-only items are skipped; and the emitted activation log has an item origin without `origin.spell`.

  ```ts
  const item: ItemInput = {
    name: "Runed Blade",
    activationManaCost: 10,
    effects: [{ sequenceOrder: 1, effect: burn }, { sequenceOrder: 2, effect: weaken }],
  };
  const unit: UnitInput = { /* stats */, targetSide: "enemies", targetPolicy: "highest_health" };
  ```

- [ ] **Step 2: Run focused engine tests and confirm failure**

  Run: `pnpm --filter @qd/engine test -- action-resolution.test.ts spell-targeting.test.ts effects.test.ts battle-log.test.ts`

  Expected: FAIL because engine input and log types still require spells.

- [ ] **Step 3: Implement the renamed contracts and resolution path**

  Replace `SpellInput` with an item effect sequence owned by `ItemInput`/`BattleItemState`; add `targetSide`, policy, row count, per-row count, adjacency, and allowed rows to `UnitInput`/`BattleUnitState`. Change `selectTargets(state, caster, targeting)` to use the unit configuration and remove first-effect allegiance inference. Rename `applySpell*` helpers and `spell-cast` entries to item-activation equivalents; make `BattleLogOrigin` contain the source item and effect only. In `resolution.ts`, resolve at most one target set and one affordability deduction per effect-bearing item, then apply its effects in order.

- [ ] **Step 4: Run engine tests and typecheck**

  Run: `pnpm --filter @qd/engine test`

  Expected: PASS.

  Run: `pnpm --filter @qd/engine typecheck`

  Expected: PASS.

- [ ] **Step 5: Commit engine refactor**

  ```bash
  git add packages/engine
  git commit -m "feat(engine): activate item effects with unit targeting"
  ```

### Task 5: Load the new model into Battle Lab and update event presentation

**Files:**
- Modify: `packages/api/src/routers/battleLab/{load-scenario,scenario-input}.ts`
- Modify: `packages/api/src/routers/battleLab/*.test.ts`
- Modify: `apps/web/src/components/battle/{battle-event-ledger,battle-event-ledger-model}.tsx`
- Modify: `apps/web/tests/unit/battle/*.test.tsx`

**Consumes:** Task 4 engine interfaces and Task 2 database relations.

**Produces:** Battle Lab sends item effects and unit targeting to the engine and displays item-only sources.

- [ ] **Step 1: Write failing loader and ledger tests**

  Assert that a loaded unit includes its persisted targeting and each loaded item has ordered effects. Update ledger assertions to expect `Oak Staff`, not `Oak Staff › Fireball`, for an activation source.

- [ ] **Step 2: Run focused tests and confirm failure**

  Run: `pnpm --filter @qd/api test -- battleLab && pnpm --filter @qd/web test -- battle-event-ledger`

  Expected: FAIL due to `spells` joins and spell-origin display assumptions.

- [ ] **Step 3: Implement direct joins and item-only rendering**

  Replace spell joins with `itemsEffects -> effects`, ordered by `itemsEffects.sequenceOrder`; load `unitsAllowedRows`; map both into the new engine types. In the ledger, return `origin.item?.name` from `sourceLabel` and render the renamed item-activation log type.

- [ ] **Step 4: Run focused tests**

  Run: `pnpm --filter @qd/api test -- battleLab && pnpm --filter @qd/web test -- battle-event-ledger`

  Expected: PASS.

- [ ] **Step 5: Commit Battle Lab changes**

  ```bash
  git add packages/api/src/routers/battleLab apps/web/src/components/battle apps/web/tests/unit/battle
  git commit -m "feat(battle): load and attribute item effects"
  ```

### Task 6: Replace scenario-builder spell API with item effects and unit targeting

**Files:**
- Delete: `packages/api/src/routers/scenarioBuilder/spells.ts`
- Delete: `packages/api/src/__tests__/scenarioBuilder/spells.test.ts`
- Modify: `packages/api/src/routers/scenarioBuilder/{index,items,units,effects}.ts`
- Modify: `packages/api/src/__tests__/scenarioBuilder/{items,units,effects}.test.ts`

**Consumes:** Task 2 schema and Task 4 engine-independent input semantics.

**Produces:** Item `effectIds` in preserved order, unit targeting CRUD, and item dependency errors on effect deletion.

- [ ] **Step 1: Write failing API tests**

  Add tests for `items.create/update/get` preserving `effectIds` including duplicates and order; `units.create/update/get` persisting all targeting fields and rejecting invalid adjacent/self combinations; and `effects.delete` returning `CONFLICT` with “Cannot delete effect while it is linked to one or more items.”

  ```ts
  await caller.scenarioBuilder.items.create({ ...itemInput, effectIds: [effectA.id, effectA.id] });
  expect((await caller.scenarioBuilder.items.get({ id })).effectIds).toEqual([effectA.id, effectA.id]);
  ```

- [ ] **Step 2: Run focused API tests and confirm failure**

  Run: `pnpm --filter @qd/api test -- items.test.ts units.test.ts effects.test.ts`

  Expected: FAIL because item input exposes `spellIds`, units have no targeting input, and effect deletion checks spell links.

- [ ] **Step 3: Implement router changes**

  In `items.ts`, replace the unordered set normalization with ordered `effectIds`, implement rows as `{ itemId, effectTemplateId, sequenceOrder: index + 1 }`, and return them ordered by sequence. In `units.ts`, share the targeting Zod refinements formerly in `spells.ts`, write/read `unitsAllowedRows`, and return `allowedRowTypes`. In `effects.ts`, join `itemsEffects` for linkage filters and deletion conflicts. Remove the spell router export from `index.ts` and all spell imports.

- [ ] **Step 4: Run the API suite and typecheck**

  Run: `pnpm --filter @qd/api test`

  Expected: PASS.

  Run: `pnpm --filter @qd/api typecheck`

  Expected: PASS.

- [ ] **Step 5: Commit builder API changes**

  ```bash
  git add packages/api/src/routers/scenarioBuilder packages/api/src/__tests__/scenarioBuilder
  git commit -m "feat(api): manage item effects and unit targeting"
  ```

### Task 7: Move builder forms from spells to items and units

**Files:**
- Delete: `apps/web/src/components/create/spell-form.ts`
- Delete: `apps/web/src/components/create/spell-workspace-form.tsx`
- Delete: `apps/web/src/components/create/spell-library-list.tsx`
- Delete: `apps/web/src/components/create/targeting-card.tsx`
- Delete: `apps/web/src/components/create/targeting-rule-summary.tsx`
- Delete: `apps/web/src/components/create/hooks/use-spell-list.ts`
- Delete: `apps/web/src/components/create/hooks/use-delete-spell-dialog.ts`
- Modify: `apps/web/src/components/create/{item-form,item-workspace-form,unit-form,unit-workspace-form,entity-workspace,types}.ts*`
- Create: `apps/web/src/components/create/unit-targeting-card.tsx`
- Create: `apps/web/src/components/create/unit-targeting-summary.tsx`
- Modify: `apps/web/tests/unit/create/{item-form,item-workspace-form,unit-form,unit-workspace-form,fixtures}.test.ts*`

**Consumes:** Task 6 API input/output contracts.

**Produces:** Ordered effect picker on items and explicit targeting UI on units with no spell components.

- [ ] **Step 1: Write failing form and component tests**

  Replace item tests that assert set-like `spellIds` with order-sensitive `effectIds`, duplicate effect support, and dirty-state reordering. Add unit-form tests for default values, target-side required validation, `self` policy invalid for `enemies`, and adjacency constraints. Add render tests that assert item picker labels/test IDs use “effect” and that the unit targeting card never renders first-effect allegiance copy.

- [ ] **Step 2: Run focused web tests and confirm failure**

  Run: `pnpm --filter @qd/web test -- item-form.test.ts item-workspace-form.test.tsx unit-form.test.ts unit-workspace-form.test.tsx`

  Expected: FAIL because current forms expose spell links and spell-owned targeting.

- [ ] **Step 3: Implement item-effect and unit-targeting components**

  Rename item form fields and options to `effectIds`/`EffectOption`; preserve the array exactly rather than de-duplicating or sorting it. Configure `LinkedEntitySection` with sequence and reordering enabled, `allowDuplicates`, “Linked Effects”, and `item-effect-*` test IDs. Move targeting types/defaults/validation into `unit-form.ts`; implement `UnitTargetingCard` and summary with an explicit side selector and the existing row controls, renamed `unit-target-*`. Do not pass linked effects into the summary.

- [ ] **Step 4: Run focused web tests**

  Run: `pnpm --filter @qd/web test -- item-form.test.ts item-workspace-form.test.tsx unit-form.test.ts unit-workspace-form.test.tsx`

  Expected: PASS.

- [ ] **Step 5: Commit form changes**

  ```bash
  git add apps/web/src/components/create apps/web/tests/unit/create
  git commit -m "feat(web): edit item effects and unit targeting"
  ```

### Task 8: Remove all spell routes, state, library UI, and styling

**Files:**
- Modify: `apps/web/src/components/create/{create-page,library-panel,entity-workspace,use-create-page-state}.tsx`
- Modify: `apps/web/src/components/create/hooks/use-workspace-loader.ts`
- Modify: `apps/web/src/styles/app.css`
- Modify: `apps/web/tests/unit/create/{create-page,entity-workspace,library-panel,use-create-page-state}.test.ts*`
- Delete: `apps/web/tests/unit/create/spell-form.test.ts`
- Delete: `apps/web/tests/unit/create/spell-workspace-form.test.tsx`

**Consumes:** Tasks 6–7.

**Produces:** A four-entity builder with no spell tab, URL parameter, query, cache key, selection, deletion dialog, or CSS selector.

- [ ] **Step 1: Write failing cleanup tests**

  Assert that `TABS` is exactly `Effects, Items, Units, Scenarios`; `/create?spell_id=…` does not issue a spell query or create a spell workspace; item-to-effect and unit-to-item edit navigation use `effect_id`/`item_id`; and library rendering has no Spells branch.

- [ ] **Step 2: Run cleanup tests and confirm failure**

  Run: `pnpm --filter @qd/web test -- create-page entity-workspace library-panel use-create-page-state`

  Expected: FAIL because the spell tab and URL/state paths remain.

- [ ] **Step 3: Remove spell-specific integration code**

  Remove `Spells` from tabs/entity metadata, selection types, and sidebar/libraries. Delete spell creation/save/delete branches, options queries, invalidation keys, and `spell_id` parsing/detection/navigation in the workspace loader. Replace item callbacks with effect editing and ensure unit form receives no spell options. Delete `.spell-*` and spell-targeting CSS only after the replacement unit-targeting selectors are in use. Search for remaining source references with:

  ```bash
  rg -n -i '\\bspell(s)?\\b|spell_' apps/web/src apps/web/tests
  ```

  Expected after intentional historical documentation exclusions: no results.

- [ ] **Step 4: Run web tests and typecheck**

  Run: `pnpm --filter @qd/web test`

  Expected: PASS.

  Run: `pnpm --filter @qd/web typecheck`

  Expected: PASS.

- [ ] **Step 5: Commit UI cleanup**

  ```bash
  git add apps/web/src apps/web/tests
  git commit -m "refactor(web): remove spell builder UI"
  ```

### Task 9: Rewrite Playwright infrastructure and end-to-end coverage

**Files:**
- Delete: `e2e/tests/pages/spell-workspace.page.ts`
- Delete: `e2e/tests/scenario-builder/{spell-workspace,library-spells-tab}.test.ts`
- Modify: `e2e/tests/pages/{item-workspace,unit-workspace,library-tab,battle-lab}.page.ts`
- Modify: `e2e/tests/pages/library-tab-configs.ts`
- Modify: `e2e/tests/scenario-builder/{item-workspace,unit-workspace,effect-workspace,library-effects-tab,library-items-tab}.test.ts`
- Modify: `e2e/tests/helpers/{workspace-helpers,trpc-api,worker-db,seed-constants}.ts`

**Consumes:** Tasks 1–8.

**Produces:** Browser tests for the four-tab builder and the item-effect/unit-targeting flow.

- [ ] **Step 1: Rewrite page-object calls in failing E2E tests**

  Rename `linkSpell`, `removeSpell`, and `editSpell` to effect operations on `ItemWorkspacePage`; expose item effect rows, reorder controls, and `item-effect-*` locators. Add `UnitWorkspacePage` methods for target side, policy, row count, per-row mode, adjacency, and allowed rows. Remove the Spells library configuration and require only four configured tabs.

- [ ] **Step 2: Run targeted E2E tests to verify failure**

  Run: `pnpm --filter @qd/e2e test:e2e -- --grep "Item workspace|Unit workspace|Effects library"`

  Expected: FAIL until UI test IDs and data seeding match the new model.

- [ ] **Step 3: Implement scenario assertions and battle attribution updates**

  Update item scenarios to verify ordered persistence, duplicate effects, effect-editor navigation, removal, and stat-only behavior. Update unit scenarios to save/reload explicit targeting and show the unit summary. Update effect deletion to show a linked-item error. In Battle Lab assertions, require an item source without a spell segment and verify one activation/cost for multi-effect items.

- [ ] **Step 4: Run targeted and full E2E suites**

  Run: `pnpm --filter @qd/e2e test:e2e -- --grep "Item workspace|Unit workspace|Effects library|Battle Lab"`

  Expected: PASS.

  Run: `pnpm run test:e2e`

  Expected: PASS.

- [ ] **Step 5: Commit E2E coverage**

  ```bash
  git add e2e
  git commit -m "test(e2e): cover item effects and unit targeting"
  ```

### Task 10: Run regression verification and prove spell removal

**Files:**
- Modify only if verification exposes a scoped defect in a prior task.

**Consumes:** Completed Tasks 1–9.

**Produces:** Verified repository with no product spell dependency.

- [ ] **Step 1: Run repository-wide spell-reference audit**

  Run:

  ```bash
  rg -n -i '\\bspell(s)?\\b|spell_' packages apps e2e --glob '!packages/db/drizzle/**'
  ```

  Expected: no results.

- [ ] **Step 2: Run all required checks**

  Run: `pnpm run test`

  Expected: PASS.

  Run: `pnpm run test:e2e`

  Expected: PASS.

  Run: `pnpm run lint && pnpm run build`

  Expected: PASS.

- [ ] **Step 3: Inspect the migration on a clean and migrated database**

  Run: `pnpm db:migrate && pnpm db:seed`

  Expected: succeeds against an empty schema and produces unit targeting plus direct item-effect rows.

  Run the migration once against a copy containing pre-0015 data; capture its notices and verify every legacy `items_spells -> spells_effects` link has a matching `items_effects` row in deterministic order.

- [ ] **Step 4: Commit any scoped verification fixes**

  ```bash
  git add packages apps e2e
  git commit -m "fix: verify item effects migration"
  ```

  Only create this commit if a verification step required a source change.
