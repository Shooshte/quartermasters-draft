# Battle Targeting and Item Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy unit targeting controls with scope/priority/count/shape targeting and enforce item-defined deployment rows.

**Architecture:** The engine owns candidate generation, reach, seeded tie-breaking, and target selection. The database persists content-authoring fields and item row links; the API validates and transports them to engine inputs; the create UI edits them and prevents invalid scenario placements.

**Tech Stack:** TypeScript 6, Vitest 4, Drizzle ORM/PostgreSQL, tRPC 11 with Zod 4, React 19, TanStack Start, Playwright.

## Global Constraints

- Treat `packages/engine/features/*.feature` and `e2e/features/**/*.feature` as acceptance criteria.
- Use test-driven development: add each test, run it and observe the expected failure, then add the smallest implementation and rerun it.
- Do not add dependencies.
- Keep deterministic battle behavior: only same-distance cross-side tank/melee ties and random priority consume the seeded RNG.
- Retain generated internal-package `dist` artifacts as the import boundary; build affected packages before dependent tests.
- Use deterministic IDs in seed data.
- Finish by running `pnpm run test`, `pnpm run test:e2e`, `pnpm run lint`, and `pnpm run typecheck`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `packages/engine/src/types.ts` | New targeting unions and engine input/state contracts; item placement rows. |
| `packages/engine/src/targeting.ts` | Scope candidates, reach rules, tie breaking, priority ranking, and multi-target selection. |
| `packages/engine/src/validation.ts` | Battle-input validation for target counts and equipped-item placement intersections. |
| `packages/engine/src/state.ts` / `test-helpers.ts` | Initialize the new state fields and supply valid test defaults. |
| `packages/db/src/schema.ts` and generated `drizzle/0016_*.sql` | New enums/columns/link table and migration from legacy target fields. |
| `packages/api/src/routers/scenarioBuilder/{units,items,scenarios}.ts` | Content input, item row-link persistence, and scenario deployment validation. |
| `packages/api/src/routers/battleLab/{index,scenario-input}.ts` | Query and transform item row links and targeting fields into engine inputs. |
| `apps/web/src/components/create/{unit-form,unit-targeting-card,item-form,item-workspace-form,scenario-workspace,scenario-row-editor}.tsx` | New authoring controls and valid-row-only scenario pickers. |
| Existing engine, DB, API, web, and e2e test files | Lock the behavior at each layer. |

### Task 1: Define and test the new engine contracts

**Files:**
- Modify: `packages/engine/src/types.ts`
- Modify: `packages/engine/src/state.ts`
- Modify: `packages/engine/src/test-helpers.ts`
- Modify: `packages/engine/src/validation.ts`
- Test: `packages/engine/src/validation.test.ts`
- Test: `packages/engine/src/battle-setup.test.ts`

**Interfaces:**
- Produces `TargetScope`, `TargetPriority`, `TargetSelectionShape`, and `RowType` contracts for Tasks 2–5.
- `UnitInput` and `BattleUnitState` expose `targetScope`, `targetPriority`, `targetCount`, and `selectionShape`.
- `ItemInput` and `BattleItemState` expose `allowedRowTypes?: RowType[]`.

- [ ] **Step 1: Write failing validation tests**

```ts
it("rejects a unit with a non-positive target count", () => {
  expect(() => initializeBattleState(createBattleInput([
    createScenario("A", { tank: [createUnit("Caster", { targetCount: 0 })] }),
    createScenario("B", { tank: [createUnit("Enemy")] }),
  ]))).toThrowError("Target count must be a positive integer");
});

it("rejects a unit deployed outside an equipped item's allowed rows", () => {
  expect(() => initializeBattleState(createBattleInput([
    createScenario("A", { tank: [createUnit("Caster", {
      items: [createItem({ name: "Bow", allowedRowTypes: ["ranged"] })],
    })] }),
    createScenario("B", { tank: [createUnit("Enemy")] }),
  ]))).toThrowError("Caster cannot be deployed in tank");
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm --filter @qd/engine test -- validation.test.ts battle-setup.test.ts`

Expected: FAIL because `targetCount` and item row restrictions are not part of the engine input or validation.

- [ ] **Step 3: Add the minimal contracts and validation**

```ts
export const TARGET_SCOPES = ["self", "self_allies", "self_enemies", "allies", "enemies", "both"] as const;
export type TargetScope = (typeof TARGET_SCOPES)[number];
export const TARGET_PRIORITIES = ["highest_health", "lowest_health", "highest_damage", "support", "random"] as const;
export type TargetPriority = (typeof TARGET_PRIORITIES)[number];
export const TARGET_SELECTION_SHAPES = ["individual", "adjacent"] as const;
export type TargetSelectionShape = (typeof TARGET_SELECTION_SHAPES)[number];

// UnitInput / BattleUnitState
targetScope?: TargetScope;
targetPriority?: TargetPriority;
targetCount?: number;
selectionShape?: TargetSelectionShape;

// ItemInput / BattleItemState
allowedRowTypes?: RowType[];
```

In `createUnitState`, default to `enemies`, `highest_health`, `1`, and `individual`; copy item allowed rows in `normalizeItem`. In `validateBattleInput`, reject non-integer/non-positive `targetCount`, duplicate item rows, empty intersections among restricted items, and any assigned row absent from the item-row intersection. An unrestricted item (`undefined` or `[]`) contributes all `ROW_TYPES`.

- [ ] **Step 4: Verify the contract and validation tests pass**

Run: `pnpm --filter @qd/engine test -- validation.test.ts battle-setup.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the engine contracts**

```bash
git add packages/engine/src/{types,state,test-helpers,validation}.ts packages/engine/src/{validation,battle-setup}.test.ts
git commit -m "feat(engine): define targeting and placement contracts"
```

### Task 2: Replace target selection with scope, reach, and multiplicity rules

**Files:**
- Modify: `packages/engine/src/targeting.ts`
- Modify: `packages/engine/src/unit-targeting.test.ts`
- Modify: `packages/engine/features/unit-targeting.feature`
- Modify: `packages/engine/src/action-resolution.test.ts`

**Interfaces:**
- Consumes the Task 1 `BattleUnitState` targeting fields.
- Produces `selectTargets(state, caster, caster): BattleUnitState[]`, returning at most `caster.targetCount` living units.

- [ ] **Step 1: Write failing targeting tests and acceptance scenarios**

```ts
it.each([
  ["self", ["Knight"]],
  ["self_allies", ["Knight", "Cleric"]],
  ["self_enemies", ["Knight", "Warrior"]],
  ["allies", ["Cleric"]],
  ["enemies", ["Warrior"]],
  ["both", ["Cleric", "Warrior"]],
] as const)("builds %s candidates", (targetScope, names) => {
  const state = setupBattle();
  const caster = configure(state.scenarios[0].rows.tank[0]!, { targetScope, targetCount: 8 });
  expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual(names);
});

it("limits a melee caster to the globally nearest occupied row", () => { /* set enemy tank empty and ally melee occupied; expect ally melee */ });
it("uses the seeded RNG to choose a side for equally near rows", () => { /* same seed, identical selected side */ });
it("lets ranged and support prioritize across all rows", () => { /* highest health can choose support over a tank */ });
it("prioritizes support-row candidates", () => { /* support priority wins over stronger non-support units */ });
it("selects multiple seeded-random candidates without duplicates", () => { /* targetCount: 3 */ });
it("selects a contiguous adjacent group around the primary target", () => { /* targetCount: 3, selectionShape: adjacent */ });
```

Update the feature file to specify all six scopes, each priority, row-derived reach, seeded equal-distance ties, individual multi-target random selection, and adjacent groups. Add an action-resolution test proving activation retains the original `targetIds`, while later effects apply only to their living members and do not retarget.

- [ ] **Step 2: Verify the selection tests fail**

Run: `pnpm --filter @qd/engine test -- unit-targeting.test.ts action-resolution.test.ts`

Expected: FAIL because the current selector still reads `targetSide`, row counts, adjacency flags, and allowed target rows.

- [ ] **Step 3: Implement selection with explicit helper boundaries**

```ts
function candidateScenarios(state: BattleState, caster: BattleUnitState, scope: TargetScope): BattleScenarioState[];
function reachableCandidates(state: BattleState, caster: BattleUnitState): BattleUnitState[];
function selectNearestRow(state: BattleState, candidates: BattleUnitState[]): BattleUnitState[];
function rankCandidates(state: BattleState, units: BattleUnitState[], priority: TargetPriority): BattleUnitState[];
function selectAdjacent(rowUnits: BattleUnitState[], primary: BattleUnitState, count: number): BattleUnitState[];
```

`candidateScenarios` returns the caster side, opposing side, or both as required, and `self` returns only the caster. Filter dead units before reach decisions. For tank/melee, group candidates by `(scenarioId, rowType)`, find the smallest `compareRowOrder` value, and if multiple scenario groups remain for that row, pick one using `nextRandom(state)` before ranking. For ranged/support, do not restrict candidate rows. Rank health/damage/support with `compareTargetFallback`; shuffle/rank random candidates with one seeded draw per candidate. `individual` returns the first `targetCount`; `adjacent` picks the first ranked primary, restricts to its row and scenario, then returns the contiguous group.

Delete legacy targeting override types/state and replace any battle-lab override UI/API only if it is still exposed; no removed legacy field may be read by the engine.

- [ ] **Step 4: Verify engine behavior passes**

Run: `pnpm --filter @qd/engine test -- unit-targeting.test.ts action-resolution.test.ts && pnpm --filter @qd/engine typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the targeting engine**

```bash
git add packages/engine/src/targeting.ts packages/engine/src/unit-targeting.test.ts packages/engine/src/action-resolution.test.ts packages/engine/features/unit-targeting.feature
git commit -m "feat(engine): select targets by scope and row reach"
```

### Task 3: Migrate the persisted content schema and seed data

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/drizzle/0016_<generated-name>.sql`
- Modify: `packages/db/drizzle/meta/_journal.json`
- Create: `packages/db/drizzle/meta/0016_snapshot.json`
- Modify: `packages/db/src/unit-targeting-schema.test.ts`
- Modify: `packages/db/src/seed-data.ts`
- Modify: `packages/db/src/seed-data.test.ts`

**Interfaces:**
- Produces `target_scope`, `target_priority`, `target_selection_shape` enums; unit `target_scope`, `target_priority`, `target_count`, `selection_shape` columns; and `items_allowed_rows(item_id, row_type)`.
- Removes `target_side`, `target_policy`, `target_row_count`, `max_targets_per_row`, `target_only_adjacent`, and `units_allowed_rows`.

- [ ] **Step 1: Write failing schema and seed tests**

```ts
expect(targetScopeEnum.enumValues).toEqual(["self", "self_allies", "self_enemies", "allies", "enemies", "both"]);
expect(targetPriorityEnum.enumValues).toEqual(["highest_health", "lowest_health", "highest_damage", "support", "random"]);
expect(columns.find((column) => column.name === "target_count")?.default).toBe(1);
expect(getTableConfig(itemsAllowedRows).uniqueConstraints.map((c) => c.name)).toContain(
  "items_allowed_rows_item_id_row_type_unique",
);
expect(itemAllowedRowSeedData).toHaveLength(itemSeedData.length * 4);
```

- [ ] **Step 2: Verify the DB tests fail**

Run: `pnpm --filter @qd/db test -- unit-targeting-schema.test.ts seed-data.test.ts`

Expected: FAIL because the new schema exports, table, and deterministic seed rows do not exist.

- [ ] **Step 3: Implement schema and generate the migration**

```ts
export const targetScopeEnum = pgEnum("target_scope", ["self", "self_allies", "self_enemies", "allies", "enemies", "both"]);
export const targetPriorityEnum = pgEnum("target_priority", ["highest_health", "lowest_health", "highest_damage", "support", "random"]);
export const targetSelectionShapeEnum = pgEnum("target_selection_shape", ["individual", "adjacent"]);

export const itemsAllowedRows = pgTable("items_allowed_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  rowType: rowTypeEnum("row_type").notNull(),
}, (table) => [index("items_allowed_rows_item_id_idx").on(table.itemId), unique("items_allowed_rows_item_id_row_type_unique").on(table.itemId, table.rowType)]);
```

Give unit columns defaults `enemies`, `highest_health`, `1`, and `individual`; add a positive `target_count` check. Generate the migration with `pnpm --filter @qd/db db:generate`. Before dropping legacy columns/tables, map existing `target_side` values to the new scope (`self` → `self`; all other existing values retain ally/enemy intent), map old `target_policy = self` to `targetScope = self` plus `highest_health`, map `max_targets_per_row` to `target_count` (use `1` for null), and map `target_only_adjacent` to shape. Backfill every existing item into all four `items_allowed_rows` rows before removing the old `units_allowed_rows` table.

Replace unit seeds with the new fields and add deterministic `itemAllowedRowSeedData` IDs for all four rows per seeded item.

- [ ] **Step 4: Verify migration contracts and seed data**

Run: `pnpm --filter @qd/db test -- unit-targeting-schema.test.ts seed-data.test.ts && pnpm --filter @qd/db typecheck`

Expected: PASS.

- [ ] **Step 5: Commit persistence changes**

```bash
git add packages/db/src/{schema,unit-targeting-schema.test,seed-data,seed-data.test}.ts packages/db/drizzle
git commit -m "feat(db): persist targeting and item placement rows"
```

### Task 4: Update tRPC content APIs and scenario placement validation

**Files:**
- Modify: `packages/api/src/routers/scenarioBuilder/units.ts`
- Modify: `packages/api/src/routers/scenarioBuilder/items.ts`
- Modify: `packages/api/src/routers/scenarioBuilder/scenarios.ts`
- Modify: `packages/api/src/__tests__/scenarioBuilder/units.test.ts`
- Modify: `packages/api/src/__tests__/scenarioBuilder/items.test.ts`
- Modify: `packages/api/src/__tests__/scenarioBuilder/scenarios.test.ts`

**Interfaces:**
- Unit mutation input: `{ targetScope, targetPriority, targetCount, selectionShape, itemIds }`.
- Item mutation input: `{ allowedRowTypes: RowType[], ...existing item fields }`.
- Scenario create/update reject an assignment when the unit’s equipped items have no shared row or exclude that assignment row.

- [ ] **Step 1: Write failing router tests**

```ts
await expect(caller.scenarioBuilder.items.create({ ...itemInput, allowedRowTypes: ["ranged", "ranged"] }))
  .rejects.toMatchObject({ code: "BAD_REQUEST" });

await expect(caller.scenarioBuilder.scenarios.create({
  name: "Invalid deployment",
  rows: [{ rowType: "tank", unitIds: ["ranged-only-unit"] }, /* other fixed rows */],
})).rejects.toMatchObject({ code: "BAD_REQUEST", message: "cannot be deployed in tank" });
```

Add create/get/update assertions that item row values preserve order in API responses, unit responses contain only new targeting fields, and legal item intersections permit deployment.

- [ ] **Step 2: Verify API tests fail**

Run: `pnpm --filter @qd/api test -- scenarioBuilder/units.test.ts scenarioBuilder/items.test.ts scenarioBuilder/scenarios.test.ts`

Expected: FAIL because the routers neither accept item allowed rows nor validate assignments against them.

- [ ] **Step 3: Implement normalized inputs and shared placement lookup**

```ts
const rowTypeSchema = z.enum(["tank", "melee", "ranged", "support"]);
const targetScopeSchema = z.enum(["self", "self_allies", "self_enemies", "allies", "enemies", "both"]);
const targetPrioritySchema = z.enum(["highest_health", "lowest_health", "highest_damage", "support", "random"]);
const selectionShapeSchema = z.enum(["individual", "adjacent"]);

function allowedDeploymentRows(itemRows: RowType[][]): RowType[] {
  const restricted = itemRows.filter((rows) => rows.length > 0);
  return restricted.length === 0 ? ["tank", "melee", "ranged", "support"] :
    restricted.reduce((shared, rows) => shared.filter((row) => rows.includes(row)));
}
```

Move unit allowed-row persistence out of `units.ts`. In `items.ts`, add `itemsAllowedRows` read/write helpers and reject duplicate input values with Zod `superRefine`. In `scenarios.ts`, load all assigned units’ item links and row links in one transaction-scoped query, calculate intersections, and throw `TRPCError({ code: "BAD_REQUEST", message: `${unitName} cannot be deployed in ${rowType}.` })` before deleting/reinserting assignments. Keep unit and item updates transactional.

- [ ] **Step 4: Verify API behavior passes**

Run: `pnpm --filter @qd/api test -- scenarioBuilder/units.test.ts scenarioBuilder/items.test.ts scenarioBuilder/scenarios.test.ts && pnpm --filter @qd/api typecheck`

Expected: PASS.

- [ ] **Step 5: Commit API changes**

```bash
git add packages/api/src/routers/scenarioBuilder packages/api/src/__tests__/scenarioBuilder
git commit -m "feat(api): validate item-constrained deployment"
```

### Task 5: Transport the new content model into battle simulations

**Files:**
- Modify: `packages/api/src/routers/battleLab/index.ts`
- Modify: `packages/api/src/routers/battleLab/scenario-input.ts`
- Modify: `packages/api/src/__tests__/battleLab/load-scenario.test.ts`
- Modify: `packages/api/src/__tests__/battleLab/scenario-input.test.ts`

**Interfaces:**
- `BattleScenarioRecords` contains new unit targeting fields and `itemAllowedRows: { itemId; rowType }[]`.
- `toScenarioInput()` passes the four targeting fields and item allowed rows to `@qd/engine`.

- [ ] **Step 1: Write failing loader and transform tests**

```ts
expect(result.rows?.ranged?.[0]).toMatchObject({
  targetScope: "self_allies",
  targetPriority: "support",
  targetCount: 3,
  selectionShape: "adjacent",
  items: [{ id: mageItem.id, allowedRowTypes: ["ranged", "support"] }],
});
```

- [ ] **Step 2: Verify battle-lab mapping tests fail**

Run: `pnpm --filter @qd/api test -- battleLab/load-scenario.test.ts battleLab/scenario-input.test.ts`

Expected: FAIL because legacy targeting data and unit-row links are still selected and transformed.

- [ ] **Step 3: Implement the data mapping**

```ts
type UnitRecord = Pick<typeof units.$inferSelect, "id" | "name" | "targetScope" | "targetPriority" | "targetCount" | "selectionShape"> & Stats;
type ItemRecord = Pick<typeof items.$inferSelect, "id" | "name" | /* existing stats */>;

// When building a unit's items:
allowedRowTypes: [...(allowedRowsByItemId.get(item.id) ?? [])].sort(byCombatRowOrder),
```

Select `itemsAllowedRows` through the battle-lab loader, group them by item id, remove `unitAllowedRows` from the record contract, and pass the new unit fields verbatim. Do not reimplement placement validation here: the scenario router and engine validator own it.

- [ ] **Step 4: Verify simulation input mapping passes**

Run: `pnpm --filter @qd/db build && pnpm --filter @qd/engine build && pnpm --filter @qd/api test -- battleLab/load-scenario.test.ts battleLab/scenario-input.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit battle-lab integration**

```bash
git add packages/api/src/routers/battleLab packages/api/src/__tests__/battleLab
git commit -m "feat(api): load targeting and item placement into battles"
```

### Task 6: Replace create-workspace targeting and placement controls

**Files:**
- Modify: `apps/web/src/components/create/unit-form.ts`
- Modify: `apps/web/src/components/create/unit-targeting-card.tsx`
- Modify: `apps/web/src/components/create/unit-targeting-summary.tsx`
- Modify: `apps/web/src/components/create/item-form.ts`
- Modify: `apps/web/src/components/create/item-workspace-form.tsx`
- Modify: `apps/web/src/components/create/scenario-workspace.tsx`
- Modify: `apps/web/src/components/create/scenario-row-editor.tsx`
- Test: `apps/web/tests/unit/create/unit-form.test.ts`
- Test: `apps/web/tests/unit/create/unit-workspace-form.test.tsx`
- Test: `apps/web/tests/unit/create/item-form.test.ts`
- Test: `apps/web/tests/unit/create/item-workspace-form.test.tsx`
- Test: `apps/web/tests/unit/create/scenario-workspace.test.tsx`

**Interfaces:**
- The unit form normalizes `{ targetScope, targetPriority, targetCount, selectionShape }`.
- Item options carry `allowedRowTypes`; scenario rows receive only options valid for their `rowType`.

- [ ] **Step 1: Write failing UI/form tests**

```tsx
expect(normalizeUnitFormValues({ ...createDefaultUnitFormValues(), targetScope: "both", targetCount: 2, selectionShape: "adjacent" }))
  .toMatchObject({ targetScope: "both", targetCount: 2, selectionShape: "adjacent" });

await user.click(screen.getByTestId("item-allowed-row-ranged"));
expect(onFieldChange).toHaveBeenCalledWith("allowedRowTypes", ["ranged"]);

expect(screen.queryByTestId("scenario-row-tank-picker-option-ranged-only-unit")).not.toBeInTheDocument();
```

Also test non-positive target count validation, summary copy for each selection shape, duplicate-resistant row toggles, and an empty placement intersection that yields no eligible scenario picker option.

- [ ] **Step 2: Verify web tests fail**

Run: `pnpm --filter @qd/web test -- unit/create/unit-form.test.ts unit/create/unit-workspace-form.test.tsx unit/create/item-form.test.ts unit/create/item-workspace-form.test.tsx unit/create/scenario-workspace.test.tsx`

Expected: FAIL because the UI still displays target sides, target rows, max-per-row, and unit allowed-target rows.

- [ ] **Step 3: Implement authoring controls and option filtering**

```ts
export interface UnitFormValues {
  targetScope: TargetScope | "";
  targetPriority: TargetPriority | "";
  targetCount: number;
  selectionShape: TargetSelectionShape;
}
export interface ItemFormValues { /* existing fields */ allowedRowTypes: ScenarioRowType[]; }

function canDeployInRow(unit: UnitOption, rowType: ScenarioRowType): boolean {
  const restricted = unit.itemAllowedRowTypes.filter((rows) => rows.length > 0);
  return restricted.length === 0 || restricted.every((rows) => rows.includes(rowType));
}
```

Render scope and priority selects, a positive count input, and an individual/adjacent segmented control in `UnitTargetingCard`; remove old row/count-per-row controls. Render four `WorkspaceRowTypePill` controls under a new “Allowed deployment rows” item section. Expand the unit option data fetched by `ScenarioWorkspace` to include every linked item’s allowed rows, filter each `ScenarioRowEditor` picker with `canDeployInRow`, and retain already assigned invalid units visually with an error rather than silently removing them.

- [ ] **Step 4: Verify web behavior passes**

Run: `pnpm --filter @qd/api build && pnpm --filter @qd/web test -- unit/create/unit-form.test.ts unit/create/unit-workspace-form.test.tsx unit/create/item-form.test.ts unit/create/item-workspace-form.test.tsx unit/create/scenario-workspace.test.tsx && pnpm --filter @qd/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit create-workspace UI**

```bash
git add apps/web/src/components/create apps/web/tests/unit/create
git commit -m "feat(web): author targeting and item placement rules"
```

### Task 7: Update end-to-end acceptance coverage and run the full verification suite

**Files:**
- Modify: `e2e/features/create/unit-workspace.feature`
- Modify: `e2e/features/create/item-workspace.feature`
- Modify: `e2e/features/battle/battle-lab.feature`
- Modify: `e2e/tests/scenario-builder/unit-workspace.test.ts`
- Modify: `e2e/tests/scenario-builder/library-items-tab.test.ts`
- Modify: `e2e/tests/scenario-builder/scenario-workspace.test.ts`
- Modify: `e2e/tests/battle/battle-lab.test.ts`

**Interfaces:**
- Verifies the production UI/API contract established by Tasks 4–6.

- [ ] **Step 1: Write failing browser scenarios**

```gherkin
Scenario: A ranged-only item restricts its owner’s scenario row
  Given the item "Longbow" allows only the "ranged" row
  And unit "Archer" equips "Longbow"
  When the GM edits a scenario
  Then "Archer" is available in the "Ranged" row picker
  And "Archer" is absent from the "Tank" row picker

Scenario: An adjacent multi-target spell uses its unit targeting definition
  Given "Templar" targets enemies by highest damage with 3 adjacent targets
  When the battle resolves Templar's item activation
  Then the activation log lists 3 contiguous targets
```

- [ ] **Step 2: Verify e2e tests fail**

Run: `pnpm --filter @qd/e2e test:e2e -- scenario-builder/unit-workspace.test.ts scenario-builder/library-items-tab.test.ts scenario-builder/scenario-workspace.test.ts battle/battle-lab.test.ts`

Expected: FAIL until the UI labels, field payloads, and picker filtering reflect the new model.

- [ ] **Step 3: Implement selectors and assertions only as needed**

Use existing page-object conventions in `e2e/tests/pages/unit-workspace.page.ts`, `item-workspace.page.ts`, `scenario-workspace.page.ts`, and `battle-lab.page.ts`. Add stable `data-testid` attributes only for the new targeting inputs and item row pills. Assert exact selected names/target counts rather than CSS state.

- [ ] **Step 4: Verify focused and complete suites**

Run:

```bash
pnpm run test
pnpm run test:e2e
pnpm run lint
pnpm run typecheck
```

Expected: all commands exit `0` with no test failures or type errors.

- [ ] **Step 5: Commit acceptance tests**

```bash
git add e2e/features e2e/tests
git commit -m "test(e2e): cover targeting and item row restrictions"
```

## Plan self-review

- Spec coverage: Tasks 1–2 cover all targeting scopes, priorities, count/shape, reach, adjacency, deterministic random ties, and shared effect target groups. Tasks 3–6 cover database/API/UI contracts, item row intersections, and invalid deployment. Task 7 covers end-to-end behavior and final verification.
- Placeholder scan: no deferred work markers are present; generated migration filename is intentionally supplied by Drizzle and its command is explicit.
- Type consistency: all layers use `targetScope`, `targetPriority`, `targetCount`, `selectionShape`, and `allowedRowTypes`; old fields are removed during Tasks 2–5.
