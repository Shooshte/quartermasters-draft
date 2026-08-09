# Explicit Battle Effect Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render each timed buff or debuff as one named effect with one explicit, stat-specific consequence row per modifier.

**Architecture:** The engine will put normalized modifier facts on every stat-effect log entry. The pure web ledger model will group consecutive entries by structured item/effect/target identity, and the React ledger will render the resulting item → effect → consequence hierarchy while retaining fallback copy for incomplete legacy entries.

**Tech Stack:** TypeScript 6, Vitest 4, React 19, Testing Library, TanStack Start, pnpm 10

## Global Constraints

- Do not change effect targeting, stacking, duration, stat calculation, or battle resolution.
- Preserve engine resolution order in the displayed ledger.
- Use structured identifiers and metadata for grouping; do not parse effect names or messages.
- Keep legacy/incomplete effect entries readable through the existing flat-sentence fallback.
- Add no dependencies.
- Follow red-green-refactor for every behavior change.
- `pnpm run test` and `pnpm run test:e2e` must pass without errors.

## File Structure

- `packages/engine/src/types.ts`: typed modifier metadata on effect application and expiration log entries.
- `packages/engine/src/logging.ts`: construction of structured effect log entries.
- `packages/engine/src/effects.ts`: pass the exact normalized active modifier into application and expiration logging.
- `packages/engine/src/effects.test.ts`: engine-level proof of application and expiration metadata.
- `apps/web/src/components/battle/battle-event-ledger-model.ts`: pure grouping of flat effect entries into nested display groups.
- `apps/web/tests/unit/battle/battle-event-ledger-model.test.ts`: grouping identity, ordering, and fallback coverage.
- `apps/web/src/components/battle/battle-event-ledger.tsx`: readable labels, signed values, and nested rendering.
- `apps/web/tests/unit/battle/battle-result.test.tsx`: rendered application, expiration, and legacy fallback behavior.

---

### Task 1: Record Exact Modifier Consequences in Engine Events

**Files:**
- Modify: `packages/engine/src/types.ts:256-273`
- Modify: `packages/engine/src/logging.ts:17-60`
- Modify: `packages/engine/src/effects.ts:146-174, 352-440`
- Test: `packages/engine/src/effects.test.ts`

**Interfaces:**
- Produces: `EffectApplyLogEntry` fields `stat: StatKey`, `value: number`, and `expiresAtTick: number`.
- Produces: optional `EffectExpireLogEntry` fields `stat?: StatKey`, `value?: number`, and `expiresAtTick?: number`; stat-modifier expirations always populate them, while interval-source cleanup may omit them.
- Produces: `logEffectApplied(..., modifier: { stat: StatKey; value: number; expiresAtTick: number }, ...)` and `logEffectExpired(..., modifier?: { stat: StatKey; value: number; expiresAtTick: number }, ...)`.
- Consumes: the already-normalized `ActiveEffectState.value`, not the raw effect-template value.

- [ ] **Step 1: Write the failing engine metadata test**

Add a test to `effects.test.ts` that creates a two-stat debuff, inspects its application events, advances exactly two ticks, and inspects its expiration events:

```ts
it("records each normalized stat consequence when a modifier applies and expires", () => {
  const state = createEffectState();
  const cleric = state.scenarios[0].rows.support[0]!;

  applyItemEffects(
    state,
    cleric,
    createItem({
      name: "Withering Bell",
      effects: effectSequence(
        createEffect({
          name: "Withering",
          effectType: "debuff",
          timingType: "instant",
          meleeDmg: 10,
          speed: -3,
          durationTicks: 2,
        }),
      ),
    }),
  );

  expect(
    state.log
      .filter((entry) => entry.type === "effect-apply")
      .map(({ stat, value, expiresAtTick }) => ({ stat, value, expiresAtTick })),
  ).toEqual([
    { stat: "meleeDmg", value: -10, expiresAtTick: 2 },
    { stat: "speed", value: -3, expiresAtTick: 2 },
  ]);

  processOngoingEffects(state, 2);

  expect(
    state.log
      .filter((entry) => entry.type === "effect-expire")
      .map(({ stat, value, expiresAtTick }) => ({ stat, value, expiresAtTick })),
  ).toEqual([
    { stat: "meleeDmg", value: -10, expiresAtTick: 2 },
    { stat: "speed", value: -3, expiresAtTick: 2 },
  ]);
});
```

- [ ] **Step 2: Run the focused engine test and verify RED**

Run:

```bash
pnpm --filter @qd/engine test -- src/effects.test.ts
```

Expected: FAIL because application entries do not have `value` or `expiresAtTick`, and expiration entries do not have stat-specific metadata.

- [ ] **Step 3: Extend the event types**

Import `StatKey` within `types.ts` through the existing local declaration and update the interfaces:

```ts
export interface EffectApplyLogEntry extends BaseLogEntry {
  type: "effect-apply";
  target: string;
  targetId: string;
  effect: string;
  stat: StatKey;
  value: number;
  expiresAtTick: number;
}

export interface EffectExpireLogEntry extends BaseLogEntry {
  type: "effect-expire";
  target: string;
  targetId: string;
  effect: string;
  stat?: StatKey;
  value?: number;
  expiresAtTick?: number;
}
```

- [ ] **Step 4: Populate application and expiration metadata**

In `logging.ts`, introduce the local data shape and use it in both helpers:

```ts
type EffectLogModifier = {
  stat: StatKey;
  value: number;
  expiresAtTick: number;
};
```

Change `logEffectApplied` to accept `modifier: EffectLogModifier`, assign all three fields to the entry, and use `modifier.stat` in the diagnostic message. Change `logEffectExpired` to accept `modifier: EffectLogModifier | undefined` before `origin` and spread the fields only when the modifier exists:

```ts
...(modifier
  ? {
      stat: modifier.stat,
      value: modifier.value,
      expiresAtTick: modifier.expiresAtTick,
    }
  : {}),
```

In `effects.ts`, pass the just-created active modifier to `logEffectApplied`:

```ts
logEffectApplied(
  state,
  tick,
  target,
  effect.name ?? "Effect",
  {
    stat: activeEffect.statKey!,
    value: activeEffect.value,
    expiresAtTick: activeEffect.expiresAtTick!,
  },
  origin.actionId,
  origin,
);
```

At timed stat expiration, pass the expiring record to `logEffectExpired`:

```ts
logEffectExpired(
  state,
  currentTick,
  unit,
  effect.name,
  effect.statKey && effect.expiresAtTick != null
    ? {
        stat: effect.statKey,
        value: effect.value,
        expiresAtTick: effect.expiresAtTick,
      }
    : undefined,
  effect.origin,
);
```

Update the interval-source-missing call to pass `undefined` for the modifier argument. Do not change active-effect creation or effective-stat calculation.

- [ ] **Step 5: Run engine tests and typecheck and verify GREEN**

Run:

```bash
pnpm --filter @qd/engine test -- src/effects.test.ts src/battle-log.test.ts
pnpm --filter @qd/engine typecheck
```

Expected: all selected tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit engine event metadata**

```bash
git add packages/engine/src/types.ts packages/engine/src/logging.ts packages/engine/src/effects.ts packages/engine/src/effects.test.ts
git commit -m "feat(engine): describe stat effect consequences"
```

---

### Task 2: Group Modifier Entries Under Their Effect

**Files:**
- Modify: `apps/web/src/components/battle/battle-event-ledger-model.ts`
- Test: `apps/web/tests/unit/battle/battle-event-ledger-model.test.ts`

**Interfaces:**
- Consumes: `LedgerLogEntry.stat`, `value`, `expiresAtTick`, `targetId`, and structured `origin.item` / `origin.effect` references.
- Produces: `BattleLedgerItem<T>`, either `{ kind: "entry"; key: string; entry: T }` or `{ kind: "effect"; key: string; eventType: "effect-apply" | "effect-expire"; effect: string; entries: T[] }`.
- Produces: `buildBattleLedgerItems<T extends LedgerLogEntry>(entries: readonly T[]): BattleLedgerItem<T>[]`, a pure consecutive-entry grouper that does not yet change `buildBattleEventGroups` or its React consumer.

- [ ] **Step 1: Write failing grouping tests**

Extend `LedgerLogEntry` test fixtures with this structured item origin:

```ts
const itemOrigin = {
  kind: "item-effect" as const,
  actionId: "12:alpha:support:1:1",
  sourceUnitId: "alpha:support:1",
  item: { id: "hood", name: "Acolyte Hood", position: 1 },
  effect: { id: "all-stats", name: "+10 all stats", position: 1 },
};

const healthApplication = {
  tick: 12,
  type: "effect-apply" as const,
  target: "Arcane Mage",
  targetId: "alpha:ranged:1",
  effect: "+10 all stats",
  stat: "health",
  value: 10,
  expiresAtTick: 14,
  actionId: itemOrigin.actionId,
  origin: itemOrigin,
  message: "health modified",
};
```

Add one test calling `buildBattleLedgerItems` with an item activation followed by two applications and asserting the result contains one normal activation item followed by one `kind: "effect"` item containing `health` and `speed` in order. Add a second test calling the helper with two metadata-complete expiration entries and asserting they form one effect item. Add a third test asserting an effect entry without `value` remains a normal entry so the renderer can use legacy fallback copy.

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-event-ledger-model.test.ts
```

Expected: FAIL because `buildBattleLedgerItems` and the effect item type do not exist.

- [ ] **Step 3: Add typed nested ledger items**

Expand `LedgerLogEntry` with optional modifier fields and full origin references:

```ts
export type LedgerLogEntry = {
  tick: number;
  type: string;
  message: string;
  actionId?: string;
  origin?: {
    kind?: string;
    actionId?: string;
    sourceUnitId?: string;
    item?: { id?: string; name: string; position: number };
    effect?: { id?: string; name: string; position: number };
  };
  target?: string;
  targetId?: string;
  stat?: string;
  value?: number;
  expiresAtTick?: number;
  attackerId?: string;
  casterId?: string;
  sourceId?: string;
  damage?: number;
};
```

Add and export `BattleLedgerItem<T>`. Do not change `BattleEventGroup<T>` in this task; keeping the helper additive allows the model to compile and be reviewed independently before React integration.

- [ ] **Step 4: Implement structured consecutive grouping**

Add a metadata guard that requires effect type, target ID, origin effect, stat, numeric value, and an expiry tick for applications:

```ts
function isDetailedModifierEntry(entry: LedgerLogEntry) {
  return (
    (entry.type === "effect-apply" || entry.type === "effect-expire") &&
    Boolean(entry.targetId && entry.origin?.effect && entry.stat) &&
    typeof entry.value === "number" &&
    (entry.type === "effect-expire" || typeof entry.expiresAtTick === "number")
  );
}
```

Build the grouping identity from structured fields:

```ts
function modifierGroupKey(entry: LedgerLogEntry) {
  return [
    entry.type,
    entry.tick,
    entry.actionId ?? entry.origin?.actionId ?? "",
    entry.origin?.sourceUnitId ?? "",
    entry.origin?.item?.id ?? entry.origin?.item?.position ?? "",
    entry.origin?.effect?.id ?? entry.origin?.effect?.position ?? "",
    entry.targetId ?? "",
  ].join(":");
}
```

Implement `buildBattleLedgerItems` as a single pass. Append a detailed modifier to the immediately preceding effect item only when the structured key matches; otherwise create a new effect item. Wrap every non-detailed entry in a normal entry item. This helper does not suppress paired basic damage because `buildBattleEventGroups` remains responsible for that existing behavior.

- [ ] **Step 5: Run model tests and web typecheck and verify GREEN**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-event-ledger-model.test.ts
pnpm --filter @qd/web typecheck
```

Expected: model tests and TypeScript pass with no diagnostics; the helper is additive and the existing component remains compatible.

- [ ] **Step 6: Commit the grouping primitive**

```bash
git add apps/web/src/components/battle/battle-event-ledger-model.ts apps/web/tests/unit/battle/battle-event-ledger-model.test.ts
git commit -m "feat(web): group battle modifiers by effect"
```

---

### Task 3: Render Effect Headings and Explicit Consequence Rows

**Files:**
- Modify: `apps/web/src/components/battle/battle-event-ledger.tsx`
- Modify: `apps/web/src/components/battle/battle-event-ledger-model.ts`
- Test: `apps/web/tests/unit/battle/battle-result.test.tsx`
- Test: `apps/web/tests/unit/battle/battle-event-ledger-model.test.ts`

**Interfaces:**
- Consumes: `BattleLedgerItem<BattleLogEntry>` and `buildBattleLedgerItems` from Task 2.
- Consumes: engine modifier fields from Task 1.
- Produces: `displayStat(stat)` for the nine engine stat keys and `displaySignedValue(value)`.
- Produces: an effect block whose heading names the effect and whose child rows state the readable stat, signed modifier, target, and expiry consequence.
- Produces: a new top-level `BattleEventGroup` effect variant for consecutive detailed expirations; turn groups retain their raw `entries` and group them for display through `buildBattleLedgerItems`.

- [ ] **Step 1: Write failing rendered application and expiration tests**

In `battle-result.test.tsx`, construct one item activation followed by health and speed application entries using the same origin, plus two expiration entries at tick 13. Render the result and assert these exact visible strings:

```ts
expect(within(events).getByText("+10 all stats, 2 ticks", { exact: true })).toBeVisible();
expect(
  within(events).getByText(
    "Health: +10 on Iron Guard · The Iron Line / Melee 1 (until tick 13).",
  ),
).toBeVisible();
expect(
  within(events).getByText(
    "Speed: +10 on Iron Guard · The Iron Line / Melee 1 (until tick 13).",
  ),
).toBeVisible();
expect(
  within(events).getByText("+10 all stats, 2 ticks expired on Iron Guard · The Iron Line / Melee 1."),
).toBeVisible();
expect(within(events).getByText("Health: +10 expired.")).toBeVisible();
expect(within(events).getByText("Speed: +10 expired.")).toBeVisible();
```

Assert the application consequence rows share the effect heading's containing effect block. Also add a legacy fixture with an `effect-apply` entry lacking `value` and assert the existing `Effect applied to Target.` sentence remains visible.

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-result.test.tsx
```

Expected: FAIL because the component repeats flat effect sentences and does not render stat consequences.

- [ ] **Step 3: Add readable stat and signed-value formatters**

In `battle-event-ledger.tsx`, add the complete label map:

```ts
const statLabels: Record<string, string> = {
  health: "Health",
  mana: "Mana",
  meleeDmg: "Melee damage",
  rangedDmg: "Ranged damage",
  manaRegen: "Mana regeneration",
  spellDmg: "Spell damage",
  speed: "Speed",
  dodge: "Dodge",
  criticalChance: "Critical chance",
};

function displayStat(stat: string) {
  return statLabels[stat] ?? stat;
}

function displaySignedValue(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
```

- [ ] **Step 4: Render nested effect groups**

Add an `EffectDescription` component receiving one `BattleLedgerItem` narrowed to `kind: "effect"`. For applications, render the effect name as the heading and one indented child `div` per entry:

```tsx
<p className="font-medium text-foreground">{group.effect}</p>
<div className="mt-1 space-y-1 border-l border-primary/30 pl-3">
  {group.entries.map((entry) => (
    <p key={entryKey(entry)}>
      {displayStat(entry.stat!)}: {displaySignedValue(entry.value!)} on{" "}
      {unitLabel(unitIds, entry.targetId, entry.target ?? "Unknown target")}
      {entry.expiresAtTick != null ? ` (until tick ${entry.expiresAtTick})` : ""}.
    </p>
  ))}
</div>
```

For expirations, make the heading `${effect} expired on ${target}.`, render child rows as `${stat}: ${signedValue} expired.`, and call `SourceCaption` with the first entry after the effect block.

In `buildBattleEventGroups`, add a top-level `kind: "effect"` variant with the same effect fields as `BattleLedgerItem`. For detailed modifier entries without a current action, merge only with the immediately preceding matching top-level effect group. Keep turn `entries` unchanged; in the React turn branch call `buildBattleLedgerItems(group.entries)` and render those nested items. Leave the existing `effect-apply` and `effect-expire` cases in `EventDescription` as legacy fallback behavior.

- [ ] **Step 5: Run focused web tests and verify GREEN**

Run:

```bash
pnpm --filter @qd/web test -- tests/unit/battle/battle-event-ledger-model.test.ts tests/unit/battle/battle-result.test.tsx
pnpm --filter @qd/web typecheck
```

Expected: both focused suites and TypeScript pass with no errors or warnings.

- [ ] **Step 6: Commit the explicit ledger presentation**

```bash
git add apps/web/src/components/battle/battle-event-ledger-model.ts apps/web/src/components/battle/battle-event-ledger.tsx apps/web/tests/unit/battle/battle-event-ledger-model.test.ts apps/web/tests/unit/battle/battle-result.test.tsx
git commit -m "feat(web): nest explicit stat effect consequences"
```

---

### Task 4: Verify the Complete Behavior

**Files:**
- Modify only if verification exposes a regression in a file already listed above.

**Interfaces:**
- Consumes: the engine log schema, grouping model, and rendered ledger completed in Tasks 1–3.
- Produces: passing repository checks and manual confirmation on the reported replay.

- [ ] **Step 1: Run formatting and static checks**

Run:

```bash
pnpm exec biome check packages/engine/src/types.ts packages/engine/src/logging.ts packages/engine/src/effects.ts packages/engine/src/effects.test.ts apps/web/src/components/battle/battle-event-ledger-model.ts apps/web/src/components/battle/battle-event-ledger.tsx apps/web/tests/unit/battle/battle-event-ledger-model.test.ts apps/web/tests/unit/battle/battle-result.test.tsx
pnpm run typecheck
```

Expected: both commands exit successfully with no diagnostics.

- [ ] **Step 2: Run all unit tests**

Run:

```bash
pnpm run test
```

Expected: every Turborepo unit-test task passes.

- [ ] **Step 3: Run all end-to-end tests**

Run:

```bash
pnpm run test:e2e
```

Expected: Docker-backed Playwright suite passes without errors.

- [ ] **Step 4: Inspect the reported replay in the collaborative browser**

Log in as the provided GM test account and open:

```text
http://localhost:3000/replay/4a193ff8-7899-449e-9d7e-182e6921a654
```

Confirm that one Acolyte Hood activation shows one `+ 10 all stats, 2 ticks` effect heading with seven child rows—Health, Mana, Melee damage, Ranged damage, Mana regeneration, Spell damage, and Speed—and that the old seven identical application sentences are absent.

- [ ] **Step 5: Commit any verification-only correction**

Only when Step 1–4 required an in-scope correction:

```bash
git add packages/engine/src/types.ts packages/engine/src/logging.ts packages/engine/src/effects.ts packages/engine/src/effects.test.ts apps/web/src/components/battle/battle-event-ledger-model.ts apps/web/src/components/battle/battle-event-ledger.tsx apps/web/tests/unit/battle/battle-event-ledger-model.test.ts apps/web/tests/unit/battle/battle-result.test.tsx
git commit -m "fix: finalize explicit battle effect ledger"
```

If verification required no correction, do not create an empty commit.
