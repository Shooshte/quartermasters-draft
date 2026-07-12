# GM Battle Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GM-only Battle Lab that saves two scenario IDs and a string seed, regenerates the battle from current scenario data at a stable replay URL, and displays the result, final unit state, and complete log.

**Architecture:** `@qd/api` loads the current relational scenario graph and maps it into `@qd/engine` input. The database persists only replay definitions. `/battle` and `/replay/$id` share one React workbench; the latter resolves its saved definition on every load.

**Tech Stack:** TypeScript 6, Drizzle/PostgreSQL, tRPC v11, `@qd/engine`, TanStack Start/React 19, React Query, Vitest, Testing Library, Playwright.

## Global Constraints

- Treat `.feature` files as acceptance criteria.
- Follow red-green-refactor: add each behavior test first, confirm the expected failure, then write only enough production code to pass.
- Do not add external dependencies.
- Keep internal package exports pointed at built `dist` artifacts and keep package scripts aligned.
- Persist only replay definitions; regenerate from current scenarios on every replay load.
- Restrict the setup route, replay route, and all Battle Lab API operations to game master users.
- Completion requires `pnpm run test` and `pnpm run test:e2e` without errors.

## File Structure

- Modify `packages/engine/features/battle-setup.feature` — acceptance criteria for string and numeric seeds.
- Modify `packages/engine/src/types.ts`, `rng.ts`, `validation.ts` and their tests — canonical string-seed support.
- Modify `packages/db/src/schema.ts` — persisted replay definition.
- Create `packages/db/src/battle-replays-schema.test.ts` — schema constraints.
- Generate `packages/db/drizzle/0011_battle_replays.sql` plus Drizzle metadata — database migration.
- Create `packages/api/src/routers/battleLab/scenario-input.ts` — pure relational-record-to-engine mapper.
- Create `packages/api/src/routers/battleLab/load-scenario.ts` — database reads for the complete current scenario graph.
- Create `packages/api/src/routers/battleLab/index.ts` — GM-only scenario options, create, and get procedures.
- Create `packages/api/src/__tests__/battleLab/scenario-input.test.ts` and `battle-lab.test.ts` — mapper and router coverage.
- Modify `packages/api/src/root.ts` and `packages/api/package.json` — register router and engine dependency.
- Create `apps/web/src/components/battle/battle-workbench.tsx` — setup state, queries, mutation, and page composition.
- Create `apps/web/src/components/battle/battle-setup-form.tsx` — two searchable scenario selectors and string seed.
- Create `apps/web/src/components/battle/battle-result.tsx` — summary, final state tables, and log.
- Create `apps/web/tests/unit/battle/battle-setup-form.test.tsx`, `battle-result.test.tsx`, and `battle-workbench.test.tsx` — component behavior.
- Create `apps/web/src/routes/_authenticated/battle.tsx` and replace `replay.$id.tsx` — GM-only routes.
- Modify `apps/web/src/routes/_authenticated.tsx`, `apps/web/src/lib/route-utils.ts`, and route utility tests — navigation and dynamic-route authorization.
- Add generated changes to `apps/web/src/routeTree.gen.ts` after building the web package.
- Create `e2e/features/battle/battle-lab.feature`, `e2e/tests/pages/battle-lab.page.ts`, and `e2e/tests/battle/battle-lab.test.ts` — end-to-end acceptance coverage.
- Modify `e2e/tests/auth/role-based-access-control.test.ts`, `route-protection.test.ts`, and `e2e/tests/helpers/seed-constants.ts` — new access rules and deterministic constants.

---

### Task 1: Add canonical string seeds to the engine

**Files:**
- Modify: `packages/engine/features/battle-setup.feature`
- Modify: `packages/engine/src/types.ts`
- Modify: `packages/engine/src/rng.ts`
- Modify: `packages/engine/src/rng.test.ts`
- Modify: `packages/engine/src/validation.ts`
- Modify: `packages/engine/src/validation.test.ts`
- Modify: `packages/engine/src/test-helpers.ts`

**Interfaces:**
- Produces: `BattleInput.seed: number | string`
- Produces: `createSeededRandom(seed: number | string): () => number`
- Rule: string seeds are trimmed before hashing; blank strings are invalid.

- [ ] **Step 1: Add string-seed acceptance criteria**

Append scenarios to the seed-validation rule in `battle-setup.feature`:

```gherkin
    Scenario: A named string seed is accepted
      Given scenario "Alpha" contains one living unit
      And scenario "Bravo" contains one living unit
      When the battle is initialized with string seed "balance-pass-3"
      Then initialization should succeed

    Scenario: Surrounding whitespace in a string seed is canonicalized
      Given scenario "Alpha" contains one living unit
      And scenario "Bravo" contains one living unit
      When two battles are initialized with string seeds "balance-pass-3" and "  balance-pass-3  "
      Then both battles should produce identical logs

    Scenario: A blank string seed is rejected
      Given scenario "Alpha" contains one living unit
      And scenario "Bravo" contains one living unit
      When the battle is initialized with string seed "   "
      Then initialization should fail with an error indicating the seed must not be blank
```

- [ ] **Step 2: Write failing RNG and validation tests**

Add to `rng.test.ts`:

```ts
it("is deterministic for canonical string seeds", () => {
  const first = createSeededRandom("balance-pass-3");
  const second = createSeededRandom("  balance-pass-3  ");
  expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
});

it("produces different sequences for different string seeds", () => {
  const first = createSeededRandom("alpha");
  const second = createSeededRandom("bravo");
  expect(Array.from({ length: 10 }, first)).not.toEqual(Array.from({ length: 10 }, second));
});
```

Add to `validation.test.ts`:

```ts
it("accepts a non-blank string seed", () => {
  expect(() => validateBattleInput(createBattleInputWithSeed("balance-pass-3"))).not.toThrow();
});

it("rejects a blank string seed", () => {
  expect(() => validateBattleInput(createBattleInputWithSeed("   "))).toThrow(/must not be blank/i);
});
```

Add this typed helper to `test-helpers.ts`:

```ts
export function createBattleInputWithSeed(seed: number | string): BattleInput {
  return createBattleInput(
    [
      createScenario("A", { tank: [createUnit("A")] }),
      createScenario("B", { tank: [createUnit("B")] }),
    ],
    seed,
  );
}
```

Widen the existing `createBattleInput` helper's seed parameter to `number | string` so the test compiles without changing production types first through an unsafe cast.

- [ ] **Step 3: Run the focused engine tests and verify RED**

Run:

```bash
pnpm --filter @qd/engine test -- src/rng.test.ts src/validation.test.ts
```

Expected: FAIL because `BattleInput.seed` and `createSeededRandom` still accept only numbers and blank strings still use the finite-number error.

- [ ] **Step 4: Implement canonical string seeds**

In `types.ts`:

```ts
export type BattleSeed = number | string;

export interface BattleInput {
  scenarios: [ScenarioInput, ScenarioInput];
  seed: BattleSeed;
  targetingOverrides?: TargetingOverrideInput[];
}
```

In `rng.ts`:

```ts
import type { BattleSeed } from "./types";

function canonicalSeed(seed: BattleSeed): string {
  return typeof seed === "string" ? seed.trim() : String(seed);
}

export function createSeededRandom(seed: BattleSeed) {
  return mulberry32(fnv1a(canonicalSeed(seed)));
}
```

In `validation.ts`, replace the finite check with:

```ts
if (typeof input.seed === "number" && !Number.isFinite(input.seed)) {
  throw new Error("Battle seed must be a finite number or non-blank string.");
}
if (typeof input.seed === "string" && input.seed.trim().length === 0) {
  throw new Error("Battle seed must not be blank.");
}
```

Export `BattleSeed` from `packages/engine/src/index.ts` with the other public types.

- [ ] **Step 5: Run all engine tests and verify GREEN**

Run:

```bash
pnpm --filter @qd/engine test
```

Expected: all engine tests PASS.

- [ ] **Step 6: Commit the engine behavior**

```bash
git add packages/engine/features/battle-setup.feature packages/engine/src
git commit -m "feat(engine): support string battle seeds"
```

---

### Task 2: Persist replay definitions

**Files:**
- Test: `packages/db/src/battle-replays-schema.test.ts`
- Modify: `packages/db/src/schema.ts`
- Generate: `packages/db/drizzle/0011_battle_replays.sql`
- Generate: `packages/db/drizzle/meta/0011_snapshot.json`
- Modify: `packages/db/drizzle/meta/_journal.json`

**Interfaces:**
- Produces: exported Drizzle table `battleReplays`
- Columns: `id`, `scenarioAId`, `scenarioBId`, `seed`, `createdAt`
- Invariant: `scenarioAId <> scenarioBId`; both scenario references cascade on delete.

- [ ] **Step 1: Write a failing schema test**

Create `battle-replays-schema.test.ts`:

```ts
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("battleReplays schema", () => {
  it("stores a text seed and prevents identical scenarios", () => {
    expect(schema.battleReplays).toBeDefined();
    const config = getTableConfig(schema.battleReplays);
    expect(config.columns.find((column) => column.name === "seed")?.dataType).toBe("string");
    expect(config.checks.map((check) => check.name)).toContain(
      "battle_replays_distinct_scenarios",
    );
  });

  it("cascades deletion through both scenario references", () => {
    const config = getTableConfig(schema.battleReplays);
    expect(config.foreignKeys).toHaveLength(2);
    expect(config.foreignKeys.every((foreignKey) => foreignKey.onDelete === "cascade")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the DB test and verify RED**

Run:

```bash
pnpm --filter @qd/db test -- src/battle-replays-schema.test.ts
```

Expected: FAIL because `schema.battleReplays` is undefined.

- [ ] **Step 3: Add the Drizzle table**

Append after `scenariosRowsUnits` in `schema.ts`:

```ts
export const battleReplays = pgTable(
  "battle_replays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioAId: uuid("scenario_a_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    scenarioBId: uuid("scenario_b_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    seed: text("seed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("battle_replays_scenario_a_id_idx").on(table.scenarioAId),
    index("battle_replays_scenario_b_id_idx").on(table.scenarioBId),
    check(
      "battle_replays_distinct_scenarios",
      sql`${table.scenarioAId} <> ${table.scenarioBId}`,
    ),
  ],
);
```

- [ ] **Step 4: Generate and inspect migration artifacts**

Run:

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/quartermasters_draft \
  pnpm --filter @qd/db db:generate -- --name battle_replays
```

Expected: Drizzle creates migration `0011_battle_replays.sql`, its snapshot, and journal entry. Confirm the SQL contains both `ON DELETE cascade`, the distinct-scenarios check, and both indexes.

- [ ] **Step 5: Run DB tests and typecheck**

Run:

```bash
pnpm --filter @qd/db test
pnpm --filter @qd/db typecheck
```

Expected: both commands PASS.

- [ ] **Step 6: Commit persistence**

```bash
git add packages/db/src/schema.ts packages/db/src/battle-replays-schema.test.ts packages/db/drizzle
git commit -m "feat(db): persist battle replay definitions"
```

---

### Task 3: Map the current database graph into engine input

**Files:**
- Test: `packages/api/src/__tests__/battleLab/scenario-input.test.ts`
- Create: `packages/api/src/routers/battleLab/scenario-input.ts`
- Create: `packages/api/src/routers/battleLab/load-scenario.ts`
- Modify: `packages/api/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: current scenario, row assignment, unit, item, spell, allowed-row, and effect records.
- Produces: `toScenarioInput(records: BattleScenarioRecords): ScenarioInput`
- Produces: `loadBattleScenario(executor, scenarioId): Promise<ScenarioInput>`

- [ ] **Step 1: Add the internal engine dependency**

Add to `packages/api/package.json` dependencies:

```json
"@qd/engine": "workspace:*"
```

Run `pnpm install` to update `pnpm-lock.yaml`, then run `pnpm --filter @qd/engine build` because internal imports resolve built artifacts.

- [ ] **Step 2: Write a failing pure mapper test**

Create a fixture in `scenario-input.test.ts` with one ranged unit, two ordered items, one linked spell, allowed rows, and two ordered effects. Assert the complete engine shape:

```ts
expect(toScenarioInput(records)).toEqual({
  id: "scenario-a",
  name: "Ambush at Dawn",
  rows: {
    tank: [],
    melee: [],
    ranged: [
      {
        id: "unit-1",
        name: "Mage",
        stats: {
          health: 60,
          meleeDmg: 3,
          rangedDmg: 0,
          manaRegen: 5,
          spellDmg: 30,
          speed: 1,
          dodge: 8,
          criticalChance: 6,
        },
        items: [
          expect.objectContaining({ id: "item-early", name: "Oak Staff" }),
          expect.objectContaining({ id: "item-late", name: "Crystal" }),
        ],
      },
    ],
    support: [],
  },
});

const spell = toScenarioInput(records).rows?.ranged?.[0]?.items?.[0]?.linkedSpells?.[0];
expect(spell?.allowedRowTypes).toEqual(["ranged", "support"]);
expect(spell?.effects?.map((link) => link.sequenceOrder)).toEqual([1, 2]);
```

Also assert duplicate unit assignments create separate row entries and empty scenarios retain all four empty row arrays.

- [ ] **Step 3: Run the mapper test and verify RED**

Run:

```bash
pnpm --filter @qd/api test -- src/__tests__/battleLab/scenario-input.test.ts
```

Expected: FAIL because `scenario-input.ts` does not exist.

- [ ] **Step 4: Implement the pure mapper**

Define `BattleScenarioRecords` as six explicit record arrays: `assignments`, `unitItems`, `itemSpells`, `spellAllowedRows`, and `spellEffects`, plus the scenario identity. Use maps keyed by spell, item, and unit IDs. Sort assignment slots, item priorities, allowed rows in engine row order, and effect sequence order before constructing this shape:

```ts
export function toScenarioInput(records: BattleScenarioRecords): ScenarioInput {
  const rows: NonNullable<ScenarioInput["rows"]> = {
    tank: [],
    melee: [],
    ranged: [],
    support: [],
  };

  for (const assignment of [...records.assignments].sort((a, b) => a.slot - b.slot)) {
    rows[assignment.rowType]?.push({
      id: assignment.unit.id,
      name: assignment.unit.name,
      stats: {
        health: assignment.unit.health,
        meleeDmg: assignment.unit.meleeDmg,
        rangedDmg: assignment.unit.rangedDmg,
        manaRegen: assignment.unit.manaRegen,
        spellDmg: assignment.unit.spellDmg,
        speed: assignment.unit.speed,
        dodge: assignment.unit.dodge,
        criticalChance: assignment.unit.criticalChance,
      },
      items: buildItemsForUnit(assignment.unit.id, records),
    });
  }

  return { id: records.scenario.id, name: records.scenario.name, rows };
}
```

`buildItemsForUnit` must preserve `units_items.priority`; `buildSpellsForItem` must include targeting fields and sorted allowed rows; `buildEffectsForSpell` must map every nullable effect column and preserve `sequenceOrder`. Do not deduplicate duplicate unit or item assignments.

- [ ] **Step 5: Implement the database loader**

In `load-scenario.ts`, export:

```ts
type BattleReadExecutor = Pick<typeof db, "select">;

export async function loadBattleScenario(
  executor: BattleReadExecutor,
  scenarioId: string,
): Promise<ScenarioInput>;
```

Perform bounded selects in this order:

1. scenario identity;
2. rows joined to assignments and units, ordered by slot;
3. unit-item links joined to items, ordered by priority;
4. item-spell links joined to spells;
5. spell allowed rows;
6. spell-effect links joined to effects, ordered by sequence.

Skip `inArray` queries when the preceding ID set is empty. Throw `TRPCError({ code: "NOT_FOUND", message: "Scenario not found" })` when the identity query is empty. Pass the assembled flat records to `toScenarioInput`.

- [ ] **Step 6: Run mapper tests and API typecheck**

Run:

```bash
pnpm --filter @qd/api test -- src/__tests__/battleLab/scenario-input.test.ts
pnpm --filter @qd/api typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit mapping**

```bash
git add packages/api/package.json packages/api/src/routers/battleLab packages/api/src/__tests__/battleLab/scenario-input.test.ts pnpm-lock.yaml
git commit -m "feat(api): map scenarios into battle input"
```

---

### Task 4: Add the GM-only Battle Lab API

**Files:**
- Test: `packages/api/src/__tests__/battleLab/battle-lab.test.ts`
- Create: `packages/api/src/routers/battleLab/index.ts`
- Modify: `packages/api/src/root.ts`

**Interfaces:**
- Produces: `battleLab.scenarioOptions.query(): Promise<Array<{id: string; name: string}>>`
- Produces: `battleLab.create.mutate({scenarioAId, scenarioBId, seed}): Promise<BattleReplayOutput>`
- Produces: `battleLab.get.query({id}): Promise<BattleReplayOutput>`
- `BattleReplayOutput`: `{ replay: {id; scenarioAId; scenarioBId; seed; createdAt}; scenarios: [{id; name}, {id; name}]; result: BattleResult }`

- [ ] **Step 1: Write failing authorization and validation tests**

Follow the existing `vi.mock("@qd/db")`, `chainable`, and `describeAuthGuard` pattern. Cover every procedure with anonymous and player contexts. Add:

```ts
it("rejects identical scenarios", async () => {
  await expect(
    createCaller(gmCtx).battleLab.create({
      scenarioAId: SCENARIO_A_ID,
      scenarioBId: SCENARIO_A_ID,
      seed: "mirror",
    }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

it("rejects a blank seed", async () => {
  await expect(
    createCaller(gmCtx).battleLab.create({
      scenarioAId: SCENARIO_A_ID,
      scenarioBId: SCENARIO_B_ID,
      seed: "   ",
    }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
});
```

Mock `loadBattleScenario` and use small living-unit inputs. Assert successful `create` resolves before `mockInsert`, stores the trimmed seed, and returns the inserted UUID and result. Assert an engine validation failure never calls `mockInsert`. Assert `get` calls the loader every time by changing the loader result between two requests and checking the second output.

- [ ] **Step 2: Run the router tests and verify RED**

Run:

```bash
pnpm --filter @qd/api test -- src/__tests__/battleLab/battle-lab.test.ts
```

Expected: FAIL because the router is absent.

- [ ] **Step 3: Implement schemas and resolution helper**

In `battleLab/index.ts`:

```ts
const idInput = z.string().uuid();
const createInput = z
  .object({ scenarioAId: idInput, scenarioBId: idInput, seed: z.string().trim().min(1) })
  .refine((input) => input.scenarioAId !== input.scenarioBId, {
    message: "Choose two different scenarios.",
    path: ["scenarioBId"],
  });

async function resolveDefinition(definition: {
  scenarioAId: string;
  scenarioBId: string;
  seed: string;
}) {
  const [scenarioA, scenarioB] = await Promise.all([
    loadBattleScenario(db, definition.scenarioAId),
    loadBattleScenario(db, definition.scenarioBId),
  ]);
  try {
    return {
      scenarios: [
        { id: scenarioA.id, name: scenarioA.name ?? scenarioA.id },
        { id: scenarioB.id, name: scenarioB.name ?? scenarioB.id },
      ] as const,
      result: new BattleEngine({ scenarios: [scenarioA, scenarioB], seed: definition.seed }).resolve(),
    };
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Battle could not be resolved.",
      cause: error,
    });
  }
}
```

- [ ] **Step 4: Implement the three procedures and register the router**

`scenarioOptions` selects `id` and `name` from `scenarios`, ordered by `asc(scenarios.name)` and `asc(scenarios.id)`.

`create` canonicalizes the seed, calls `resolveDefinition`, then inserts:

```ts
const [replay] = await db
  .insert(battleReplays)
  .values({
    scenarioAId: input.scenarioAId,
    scenarioBId: input.scenarioBId,
    seed: input.seed.trim(),
  })
  .returning();
if (!replay) {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Replay was not saved." });
}
return { replay, ...resolved };
```

`get` selects the replay by UUID, throws `NOT_FOUND` when absent, and calls `resolveDefinition` without updating the row.

Register in `root.ts`:

```ts
export const appRouter = router({
  health: healthRouter,
  scenarioBuilder: scenarioBuilderRouter,
  battleLab: battleLabRouter,
});
```

- [ ] **Step 5: Run API tests, typecheck, and build**

Run:

```bash
pnpm --filter @qd/api test
pnpm --filter @qd/api typecheck
pnpm --filter @qd/api build
```

Expected: all commands PASS.

- [ ] **Step 6: Commit the Battle Lab API**

```bash
git add packages/api/src/root.ts packages/api/src/routers/battleLab/index.ts packages/api/src/__tests__/battleLab/battle-lab.test.ts
git commit -m "feat(api): add GM battle lab procedures"
```

---

### Task 5: Build the one-page workbench and result views

**Files:**
- Test: `apps/web/tests/unit/battle/battle-setup-form.test.tsx`
- Test: `apps/web/tests/unit/battle/battle-result.test.tsx`
- Test: `apps/web/tests/unit/battle/battle-workbench.test.tsx`
- Create: `apps/web/src/components/battle/battle-setup-form.tsx`
- Create: `apps/web/src/components/battle/battle-result.tsx`
- Create: `apps/web/src/components/battle/battle-workbench.tsx`

**Interfaces:**
- `BattleSetup = { scenarioAId: string; scenarioBId: string; seed: string }`
- `BattleSetupForm({ options, value, onChange, onSubmit, pending, error })`
- `BattleResultView({ scenarios, result })`
- `BattleWorkbench({ replayId?: string })`

- [ ] **Step 1: Write failing setup-form tests**

Use Testing Library and `userEvent`. Prove that `Run & save battle` is disabled for missing values, equal scenario IDs, or whitespace-only seeds, and enabled for valid data. Select through `EntityPickerPopover` using accessible combobox/listbox roles. Assert submit receives the trimmed seed and the selected IDs.

- [ ] **Step 2: Run the setup test and verify RED**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-setup-form.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement `BattleSetupForm`**

Reuse `EntityPickerPopover` for both searchable selectors. Exclude the current A selection from B's option list and vice versa. Compute validity with:

```ts
const canSubmit =
  value.scenarioAId.length > 0 &&
  value.scenarioBId.length > 0 &&
  value.scenarioAId !== value.scenarioBId &&
  value.seed.trim().length > 0 &&
  !pending;
```

Render explicit labels, a text `Input`, the API error with `role="alert"`, and a submit `Button` whose pending copy is `Resolving battle…`.

- [ ] **Step 4: Write failing result-view tests**

Build a typed fixture containing two scenarios, winner ID, elapsed ticks, final units in multiple rows, an active effect, and attack/battle-end log entries. Assert:

```ts
expect(screen.getByRole("heading", { name: "Ambush at Dawn wins" })).toBeVisible();
expect(screen.getByText("184 ticks")).toBeVisible();
expect(screen.getByRole("cell", { name: "82 / 120" })).toBeVisible();
expect(screen.getByRole("cell", { name: "Alive" })).toBeVisible();
expect(screen.getByText("Burning (2 triggers remaining)")).toBeVisible();
expect(screen.getByText("Tick 184: Battle ends: Ambush at Dawn wins")).toBeVisible();
```

Add a second test for `winnerId: null` rendering `Draw`.

- [ ] **Step 5: Run the result test and verify RED**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-result.test.tsx
```

Expected: FAIL because `BattleResultView` is absent.

- [ ] **Step 6: Implement `BattleResultView`**

Use the existing Card and Table primitives. Resolve the winner's display name from the returned scenario tuple. Flatten final units in `tank`, `melee`, `ranged`, `support` order. Render columns: Unit, Row, Slot, Health, Status, Mana, Actions, Active effects. Render every log item as a list row with separate tick/type metadata and `entry.message`; preserve the engine array order without sorting.

- [ ] **Step 7: Write failing workbench tests**

Mock `trpc.battleLab.scenarioOptions.query`, `.create.mutate`, and `.get.query`, plus `useNavigate`. Prove:

- `/battle` loads options and has no result initially;
- valid submit calls `create` and navigates to `{ to: "/replay/$id", params: { id: replay.id } }`;
- a replay ID calls `get`, populates the form, displays `Results use the latest scenario versions.`, and renders the returned result;
- API failures leave the selected values intact and render an alert;
- repeated clicks while the mutation is pending call `create` only once.

- [ ] **Step 8: Implement `BattleWorkbench`**

Use React Query with keys `['battleLab', 'scenarioOptions']` and `['battleLab', 'replay', replayId]`. Initialize local setup from the replay query once it succeeds. Use one guarded mutation callback:

```ts
const createReplay = useMutation({
  mutationFn: (input: BattleSetup) => trpc.battleLab.create.mutate(input),
  onSuccess: ({ replay }) => {
    navigate({ to: "/replay/$id", params: { id: replay.id } });
  },
});
```

Render explicit loading, not-found/API error, and result states. On replay pages, continue to show the editable setup above the result; a new submit creates a new replay.

- [ ] **Step 9: Run web component tests and typecheck**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle
pnpm --filter @qd/web typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit the workbench**

```bash
git add apps/web/src/components/battle apps/web/tests/unit/battle
git commit -m "feat(web): add battle lab workbench"
```

---

### Task 6: Add GM-only routes and navigation

**Files:**
- Modify: `apps/web/tests/unit/route-utils.test.ts`
- Modify: `apps/web/src/lib/route-utils.ts`
- Modify: `apps/web/src/routes/_authenticated.tsx`
- Create: `apps/web/src/routes/_authenticated/battle.tsx`
- Replace: `apps/web/src/routes/_authenticated/replay.$id.tsx`
- Generate: `apps/web/src/routeTree.gen.ts`

**Interfaces:**
- `canAccessRoute(UserRole.PLAYER, '/battle') === false`
- `canAccessRoute(UserRole.PLAYER, '/replay/<id>') === false`
- Both routes render `BattleWorkbench`; replay passes its route ID.

- [ ] **Step 1: Write failing route authorization tests**

Add:

```ts
it("restricts Battle Lab and dynamic replay routes to game masters", () => {
  expect(canAccessRoute(UserRole.GAME_MASTER, "/battle")).toBe(true);
  expect(canAccessRoute(UserRole.GAME_MASTER, "/replay/abc123")).toBe(true);
  expect(canAccessRoute(UserRole.PLAYER, "/battle")).toBe(false);
  expect(canAccessRoute(UserRole.PLAYER, "/replay/abc123")).toBe(false);
});
```

- [ ] **Step 2: Run the route test and verify RED**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/route-utils.test.ts
```

Expected: FAIL because Battle Lab routes are currently unrestricted.

- [ ] **Step 3: Implement prefix-aware authorization**

Change the role map to include `/battle` and `/replay`, then match either the exact path or a slash-delimited descendant:

```ts
const routeRoleMap: Record<string, UserRole> = {
  "/create": Roles.GAME_MASTER,
  "/battle": Roles.GAME_MASTER,
  "/replay": Roles.GAME_MASTER,
};

const restrictedRoute = Object.keys(routeRoleMap).find(
  (route) => pathname === route || pathname.startsWith(`${route}/`),
);
const requiredRole = restrictedRoute ? routeRoleMap[restrictedRoute] : undefined;
```

- [ ] **Step 4: Add the two guarded route files**

`battle.tsx` renders `<BattleWorkbench />`; `replay.$id.tsx` reads `Route.useParams()` and renders `<BattleWorkbench replayId={id} />`. Each `beforeLoad` redirects unauthorized roles to `/403` using the same pattern as `create.tsx`.

- [ ] **Step 5: Add GM navigation**

In `AuthenticatedLayout`, read `userRole` from the authenticated route context. For game masters render TanStack `Link`s to `/create` and `/battle` before logout. Use the existing button styling or `Button asChild` so active links remain keyboard accessible. Render no Battle Lab link for players.

- [ ] **Step 6: Generate the route tree and run web checks**

Run:

```bash
pnpm --filter @qd/web build
pnpm --filter @qd/web test
pnpm --filter @qd/web typecheck
```

Expected: route tree includes `/battle`; all commands PASS.

- [ ] **Step 7: Commit routes and navigation**

```bash
git add apps/web/src/lib/route-utils.ts apps/web/tests/unit/route-utils.test.ts apps/web/src/routes apps/web/src/routeTree.gen.ts
git commit -m "feat(web): add GM battle lab routes"
```

---

### Task 7: Add Battle Lab end-to-end acceptance coverage

**Files:**
- Create: `e2e/features/battle/battle-lab.feature`
- Create: `e2e/tests/pages/battle-lab.page.ts`
- Create: `e2e/tests/battle/battle-lab.test.ts`
- Modify: `e2e/tests/auth/role-based-access-control.test.ts`
- Modify: `e2e/tests/auth/route-protection.test.ts`
- Modify: `e2e/tests/helpers/seed-constants.ts`

**Interfaces:**
- Page object exposes `goto`, `selectScenario`, `setSeed`, `run`, `expectResult`, and `replayId`.
- Uses deterministic seeded scenario IDs already present in `seed-constants.ts`.

- [ ] **Step 1: Write the feature acceptance criteria**

Create `battle-lab.feature` with these scenarios:

```gherkin
Feature: Game master Battle Lab
  Rule: Only game masters can use saved battle replays
    Scenario: A player opens the Battle Lab
      When the player navigates to "/battle"
      Then the player should see the forbidden page

    Scenario: A player opens a replay URL
      When the player navigates to a saved replay URL
      Then the player should see the forbidden page

  Rule: A game master can run and revisit a battle
    Scenario: Run two different scenarios with a named seed
      Given both selected scenarios contain living units
      When the game master runs them with seed "balance-pass-3"
      Then the URL should contain a persisted replay ID
      And the winner or draw and elapsed ticks should be visible
      And every final unit state should be visible
      And the chronological battle log should be visible

    Scenario: Refresh a replay
      Given the game master has run a saved battle
      When the game master refreshes the replay URL
      Then the same scenario IDs and seed should remain selected
      And the regenerated result should be visible

    Scenario: Regenerate from an edited scenario
      Given the game master has run a saved battle
      When one selected scenario is renamed through the scenario builder API
      And the game master reopens the same replay URL
      Then the replay should show the new scenario name
```

- [ ] **Step 2: Write failing Playwright tests and page object**

Before the run, update Castle Siege through the existing scenario API so its tank row contains `TEMPLAR_ID`; this ensures both scenarios have living units and produces action log entries. Use the page object to choose `AMBUSH_AT_DAWN_ID`, `CASTLE_SIEGE_ID`, enter `balance-pass-3`, and run.

Assert the URL matches `/replay/[0-9a-f-]{36}`, summary and unit-state tables exist, and at least one log entry has type `attack` or `battle-end`. Capture the URL, reload, and assert seed and result. Rename Ambush at Dawn by calling `scenarioBuilder.scenarios.update` with its unchanged row assignments, revisit the captured URL, and assert the new name.

Change existing RBAC assertions so players are forbidden from `/replay/abc123`, and add `/battle` to unauthenticated protected-route coverage.

- [ ] **Step 3: Run the Battle Lab E2E test and verify RED**

Run:

```bash
pnpm --filter @qd/e2e test:e2e -- --grep "Battle Lab"
```

Expected: FAIL before the new Docker image contains the migration/API/UI or if any acceptance behavior is missing.

- [ ] **Step 4: Fix only acceptance gaps revealed by E2E**

Keep fixes scoped to the files introduced in Tasks 1–7. Do not weaken selectors or remove assertions. If the seed scenario setup reveals missing loader relationships, add a focused failing API mapper test before adjusting the loader or mapper.

- [ ] **Step 5: Run focused and full E2E suites**

Run:

```bash
pnpm --filter @qd/e2e test:e2e -- --grep "Battle Lab"
pnpm run test:e2e
```

Expected: both commands PASS.

- [ ] **Step 6: Commit acceptance coverage**

```bash
git add e2e/features/battle e2e/tests/battle e2e/tests/pages/battle-lab.page.ts e2e/tests/auth e2e/tests/helpers/seed-constants.ts
git commit -m "test(e2e): cover GM battle lab"
```

---

### Task 8: Full verification and handoff

**Files:**
- Modify only files required to fix failures caused by this feature.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–7.
- Produces: repository-wide passing quality gates and an implementation handoff.

- [ ] **Step 1: Run formatting and static checks**

Run:

```bash
pnpm format
pnpm run lint
pnpm run deps:check
pnpm run build
```

Expected: all commands exit 0. Review formatting changes and retain only feature-scoped edits.

- [ ] **Step 2: Run the required unit suite**

Run:

```bash
pnpm run test
```

Expected: all workspace unit tests PASS without errors.

- [ ] **Step 3: Run the required E2E suite**

Run:

```bash
pnpm run test:e2e
```

Expected: all Playwright tests PASS without errors.

- [ ] **Step 4: Review the final diff and working tree**

Run:

```bash
git diff --check
git status --short
git log --oneline --decorate -12
```

Expected: no whitespace errors, no unrelated files, and all task commits are present.

- [ ] **Step 5: Commit any final verification-only corrections**

If verification required scoped corrections, inspect `git status --short`, stage each corrected feature file by its exact path, and commit with `git commit -m "fix: complete battle lab verification"`. If no correction was required, do not create an empty commit.
