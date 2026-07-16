# Spell Target Allegiance Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the spell workspace's live targeting summary to explain whether the caster targets allies, enemies, or itself, including the engine's first-effect and mixed-effect rules.

**Architecture:** Keep allegiance derivation as a pure function beside the existing targeting-summary builder. `SpellWorkspaceForm` resolves ordered `effectIds` against existing effect options, preserves unavailable entries, and passes that metadata through `TargetingCard` to the live summary. Database, API, engine, and persisted form values remain unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Gherkin acceptance criteria, Biome, pnpm/Turborepo.

## Global Constraints

- Follow TDD: add behavior tests first and confirm the expected failure before production edits.
- Buff and Healing first effects map to allies; Damage and Debuff first effects map to enemies.
- The first linked effect determines allegiance for every later effect.
- `targetScope: "self"` continues to select the caster and override normal effect allegiance.
- Do not add database constraints, migrations, API validation, engine changes, dependencies, or persisted form fields.
- Preserve `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
- Keep PR #56 based on `develop` and preserve `feature/spell-targeting-rules-summary`.

---

## File Map

- `apps/web/src/components/create/targeting-rule-summary.tsx`: pure allegiance copy and the third summary line.
- `apps/web/src/components/create/targeting-card.tsx`: forwards scope and ordered effect metadata.
- `apps/web/src/components/create/spell-workspace-form.tsx`: resolves effect IDs in persisted sequence order.
- `apps/web/src/components/create/spell-form.ts`: tightens the internal effect option type.
- `apps/web/src/styles/app.css`: spaces and emphasizes the new line.
- `apps/web/tests/unit/create/targeting-rule-summary.test.tsx`: pure behavior tests.
- `apps/web/tests/unit/create/spell-workspace-form.test.tsx`: form integration and reorder tests.
- `e2e/features/create/spell-workspace.feature`: acceptance criteria.
- `e2e/tests/scenario-builder/spell-workspace.test.ts`: browser coverage.

---

### Task 1: Pure first-effect allegiance derivation

**Files:**
- Modify: `apps/web/src/components/create/targeting-rule-summary.tsx`
- Test: `apps/web/tests/unit/create/targeting-rule-summary.test.tsx`

**Interfaces:**
- Consumes: `EffectType` from `effect-form.ts` and `TargetScope` from `spell-form.ts`.
- Produces: `TargetingEffectSummary` and `buildTargetSideSummary(targetScope, linkedEffects): string`.

- [ ] **Step 1: Add failing pure-function tests**

Add `buildTargetSideSummary` and `TargetingEffectSummary` to the test imports, then add:

```tsx
function linkedEffect(
  id: string,
  name: string,
  effectType: TargetingEffectSummary["effectType"],
): TargetingEffectSummary {
  return { id, name, effectType };
}

describe("buildTargetSideSummary", () => {
  it.each([
    ["buff", "Barbarian Roar", "Buff"],
    ["healing", "Heal Light", "Healing"],
  ] as const)("maps a first %s effect to allies", (effectType, name, label) => {
    expect(
      buildTargetSideSummary("self_and_others", [linkedEffect("first", name, effectType)]),
    ).toBe(
      `Target side: Allies, including the caster. The first linked effect, ${name} (${label}), determines the target side for every effect in this spell.`,
    );
  });

  it.each([
    ["damage", "Arcane Damage", "Damage"],
    ["debuff", "Exhaust", "Debuff"],
  ] as const)("maps a first %s effect to enemies", (effectType, name, label) => {
    expect(
      buildTargetSideSummary("self_and_others", [linkedEffect("first", name, effectType)]),
    ).toBe(
      `Target side: Enemies. The first linked effect, ${name} (${label}), determines the target side for every effect in this spell.`,
    );
  });

  it("describes Others scope as allies without the caster", () => {
    expect(
      buildTargetSideSummary("others", [linkedEffect("first", "Heal Light", "healing")]),
    ).toContain("Target side: Allies other than the caster.");
  });

  it("preserves the existing Self scope override", () => {
    expect(
      buildTargetSideSummary("self", [linkedEffect("first", "Arcane Damage", "damage")]),
    ).toBe(
      "Target side: Caster. Self scope overrides the first effect's normal allegiance, so every linked effect applies to the caster.",
    );
  });

  it("prompts for the first effect when no effect is linked", () => {
    expect(buildTargetSideSummary("self_and_others", [])).toBe(
      "Target side: Add an effect to determine whether this spell targets allies or enemies.",
    );
  });

  it("waits when first-effect metadata is unavailable", () => {
    expect(buildTargetSideSummary("self_and_others", [null])).toBe(
      "Target side: Waiting for the first linked effect's details.",
    );
  });

  it("warns that enemy-side later effects still apply to allies", () => {
    expect(
      buildTargetSideSummary("self_and_others", [
        linkedEffect("buff", "Barbarian Roar", "buff"),
        linkedEffect("damage", "Arcane Damage", "damage"),
        linkedEffect("debuff", "Exhaust", "debuff"),
        linkedEffect("damage-2", "Frostbite", "damage"),
      ]),
    ).toContain(
      "Mixed effects keep this target side; later Damage and Debuff effects also apply to those allies.",
    );
  });

  it("warns that ally-side later effects still apply to enemies", () => {
    expect(
      buildTargetSideSummary("self_and_others", [
        linkedEffect("damage", "Arcane Damage", "damage"),
        linkedEffect("healing", "Heal Light", "healing"),
        linkedEffect("buff", "Barbarian Roar", "buff"),
      ]),
    ).toContain(
      "Mixed effects keep this target side; later Healing and Buff effects also apply to those enemies.",
    );
  });

  it("omits the warning while later metadata is unavailable", () => {
    const copy = buildTargetSideSummary("self_and_others", [
      linkedEffect("buff", "Barbarian Roar", "buff"),
      null,
      linkedEffect("damage", "Arcane Damage", "damage"),
    ]);

    expect(copy).toContain("Target side: Allies, including the caster.");
    expect(copy).not.toContain("Mixed effects keep this target side");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
pnpm --filter @qd/web exec vitest run tests/unit/create/targeting-rule-summary.test.tsx
```

Expected: FAIL because the new type and function are not exported.

- [ ] **Step 3: Implement the pure allegiance builder**

Update imports and add these declarations before `buildTargetingRuleSummary`:

```tsx
import type { EffectType } from "./effect-form";
import type { RowType, TargetPolicy, TargetScope } from "./spell-form";

export interface TargetingEffectSummary {
  id: string;
  name: string;
  effectType: EffectType;
}

type TargetAllegiance = "allies" | "enemies";

const EFFECT_TYPE_LABELS: Record<EffectType, string> = {
  buff: "Buff",
  debuff: "Debuff",
  healing: "Healing",
  damage: "Damage",
};

function effectAllegiance(effectType: EffectType): TargetAllegiance {
  return effectType === "buff" || effectType === "healing" ? "allies" : "enemies";
}

function formatEffectTypeList(effectTypes: EffectType[]): string {
  const labels = effectTypes.map((effectType) => EFFECT_TYPE_LABELS[effectType]);
  if (labels.length === 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function buildTargetSideSummary(
  targetScope: TargetScope,
  linkedEffects: readonly (TargetingEffectSummary | null)[],
): string {
  if (targetScope === "self") {
    return "Target side: Caster. Self scope overrides the first effect's normal allegiance, so every linked effect applies to the caster.";
  }

  if (linkedEffects.length === 0) {
    return "Target side: Add an effect to determine whether this spell targets allies or enemies.";
  }

  const firstEffect = linkedEffects[0];
  if (!firstEffect) {
    return "Target side: Waiting for the first linked effect's details.";
  }

  const allegiance = effectAllegiance(firstEffect.effectType);
  const side =
    allegiance === "enemies"
      ? "Enemies"
      : targetScope === "others"
        ? "Allies other than the caster"
        : "Allies, including the caster";
  const base = `Target side: ${side}. The first linked effect, ${firstEffect.name} (${EFFECT_TYPE_LABELS[firstEffect.effectType]}), determines the target side for every effect in this spell.`;
  const laterEffects = linkedEffects.slice(1);

  if (laterEffects.some((effect) => effect === null)) return base;

  const oppositeTypes = Array.from(
    new Set(
      laterEffects
        .filter((effect): effect is TargetingEffectSummary => effect !== null)
        .filter((effect) => effectAllegiance(effect.effectType) !== allegiance)
        .map((effect) => effect.effectType),
    ),
  );

  if (oppositeTypes.length === 0) return base;

  return `${base} Mixed effects keep this target side; later ${formatEffectTypeList(oppositeTypes)} effects also apply to those ${allegiance}.`;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: all targeting summary tests pass.

- [ ] **Step 5: Format and commit**

```bash
pnpm exec biome check apps/web/src/components/create/targeting-rule-summary.tsx apps/web/tests/unit/create/targeting-rule-summary.test.tsx
git add apps/web/src/components/create/targeting-rule-summary.tsx apps/web/tests/unit/create/targeting-rule-summary.test.tsx
git commit -m "feat(web): derive spell target allegiance"
```

Expected: Biome and the commit succeed.

---

### Task 2: Wire ordered effects into the live summary

**Files:**
- Modify: `apps/web/src/components/create/spell-form.ts`
- Modify: `apps/web/src/components/create/spell-workspace-form.tsx`
- Modify: `apps/web/src/components/create/targeting-card.tsx`
- Modify: `apps/web/src/components/create/targeting-rule-summary.tsx`
- Modify: `apps/web/src/styles/app.css`
- Test: `apps/web/tests/unit/create/targeting-rule-summary.test.tsx`
- Test: `apps/web/tests/unit/create/spell-workspace-form.test.tsx`
- Modify: `e2e/features/create/spell-workspace.feature`
- Test: `e2e/tests/scenario-builder/spell-workspace.test.ts`

**Interfaces:**
- Consumes: Task 1's `TargetingEffectSummary` and `buildTargetSideSummary`.
- Produces: `TargetingRuleSummary` with `targetScope` and ordered `linkedEffects` inside the existing live region.

- [ ] **Step 1: Add failing component and form tests**

Add `targetScope: "self_and_others"` and `linkedEffects: []` to every existing `buildTargetingRuleSummary` config, and add the same props to the existing component render. Assert:

```tsx
expect(status).toHaveTextContent(
  "Target side: Add an effect to determine whether this spell targets allies or enemies.",
);
```

In `spell-workspace-form.test.tsx`, import `EffectOption`, annotate `sampleEffectOptions` as `EffectOption[]`, and add under `Targeting section`:

```tsx
it("uses the first linked effect to describe target allegiance", () => {
  renderForm({ formValues: { effectIds: ["eff-7", "eff-1"] } });

  const summary = screen.getByTestId("spell-targeting-summary");
  expect(summary).toHaveTextContent("Target side: Allies, including the caster.");
  expect(summary).toHaveTextContent("The first linked effect, Astral Ward (Buff)");
  expect(summary).toHaveTextContent("later Damage effects also apply to those allies.");
});

it("updates target allegiance when a mixed spell is reordered", async () => {
  const onFieldChange = vi.fn();
  const { rerender, props } = renderForm({
    onFieldChange,
    formValues: { effectIds: ["eff-7", "eff-1"] },
  });

  await userEvent.click(screen.getByTestId("spell-effect-move-down-0"));
  expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1", "eff-7"]);

  rerender(
    <SpellWorkspaceForm
      {...props}
      formValues={{ ...props.formValues, effectIds: ["eff-1", "eff-7"] }}
    />,
  );

  const summary = screen.getByTestId("spell-targeting-summary");
  expect(summary).toHaveTextContent("Target side: Enemies.");
  expect(summary).toHaveTextContent("The first linked effect, Arcane Damage (Damage)");
  expect(summary).toHaveTextContent("later Buff effects also apply to those enemies.");
});

it("shows neutral copy when first-effect metadata is unavailable", () => {
  renderForm({ formValues: { effectIds: ["missing-effect"] } });

  expect(screen.getByTestId("spell-targeting-summary")).toHaveTextContent(
    "Target side: Waiting for the first linked effect's details.",
  );
});

it("shows the existing Self override for a damage effect", () => {
  renderForm({ formValues: { targetScope: "self", effectIds: ["eff-1"] } });

  expect(screen.getByTestId("spell-targeting-summary")).toHaveTextContent(
    "Target side: Caster. Self scope overrides the first effect's normal allegiance",
  );
});
```

- [ ] **Step 2: Add Gherkin and Playwright coverage before implementation**

Add this scenario after target-scope defaults:

```gherkin
  Scenario: The first effect determines the target side for a mixed spell
    When I start creating a new spell
    And I add effect "Barbarian Roar" at sequence position 1
    And I add effect "Arcane Damage" at sequence position 2
    Then the targeting summary should identify allies from the first Buff effect
    And the targeting summary should warn that the later Damage effect applies to allies
    When I move effect at position 2 up
    Then the targeting summary should identify enemies from the first Damage effect
    And the targeting summary should warn that the later Buff effect applies to enemies
```

Add under `Spell Workspace — Target Scope`:

```tsx
test("first effect controls the target side for mixed effects", async ({ gmPage }) => {
  const spell = new SpellWorkspacePage(gmPage);
  await spell.openNew();
  await spell.addEffect("Barbarian Roar");
  await spell.addEffect("Arcane Damage");

  const summary = gmPage.getByTestId("spell-targeting-summary");
  await expect(summary).toContainText("Target side: Allies, including the caster.");
  await expect(summary).toContainText("first linked effect, Barbarian Roar (Buff)");
  await expect(summary).toContainText("later Damage effects also apply to those allies.");

  await gmPage.getByTestId("spell-effect-move-up-1").click();

  await expect(summary).toContainText("Target side: Enemies.");
  await expect(summary).toContainText("first linked effect, Arcane Damage (Damage)");
  await expect(summary).toContainText("later Buff effects also apply to those enemies.");
});
```

- [ ] **Step 3: Run integration tests and verify RED**

```bash
pnpm --filter @qd/web exec vitest run tests/unit/create/targeting-rule-summary.test.tsx tests/unit/create/spell-workspace-form.test.tsx
pnpm --filter @qd/e2e test:e2e -- tests/scenario-builder/spell-workspace.test.ts
```

Expected: the new unit and browser assertions fail because target-side data is not wired into the component.

- [ ] **Step 4: Tighten the effect option type**

At the top of `spell-form.ts`:

```tsx
import type { EffectType } from "./effect-form";

export interface EffectOption {
  id: string;
  name: string;
  effectType: EffectType;
}
```

- [ ] **Step 5: Resolve effect IDs in order**

In `SpellWorkspaceForm`, after `linkedEffectOptions`:

```tsx
const effectOptionsById = new Map(effectOptions.map((effect) => [effect.id, effect]));
const orderedLinkedEffects = normalizedFormValues.effectIds.map(
  (effectId) => effectOptionsById.get(effectId) ?? null,
);
```

Pass it to the card:

```tsx
<TargetingCard
  formValues={normalizedFormValues}
  errors={errors}
  linkedEffects={orderedLinkedEffects}
  onFieldChange={onFieldChange}
/>
```

- [ ] **Step 6: Forward values through TargetingCard**

Import the effect summary type, extend the props, and destructure it:

```tsx
import {
  getEffectiveAllowedRows,
  TARGET_ROW_TYPES_IN_COMBAT_ORDER,
  type TargetingEffectSummary,
  TargetingRuleSummary,
} from "./targeting-rule-summary";

interface TargetingCardProps {
  formValues: SpellFormValues;
  errors: SpellFieldErrors;
  linkedEffects: readonly (TargetingEffectSummary | null)[];
  onFieldChange: (field: string, value: unknown) => void;
}

export function TargetingCard({
  formValues,
  errors,
  linkedEffects,
  onFieldChange,
}: TargetingCardProps) {
```

Pass the new props:

```tsx
<TargetingRuleSummary
  targetPolicy={formValues.targetPolicy}
  targetScope={formValues.targetScope}
  targetRowCount={formValues.targetRowCount}
  maxTargetsPerRow={formValues.maxTargetsPerRow}
  targetOnlyAdjacent={formValues.targetOnlyAdjacent}
  allowedRowTypes={formValues.allowedRowTypes}
  linkedEffects={linkedEffects}
/>
```

- [ ] **Step 7: Render allegiance inside the live summary**

Extend the config and copy types:

```tsx
interface TargetingRuleConfig {
  targetPolicy: TargetPolicy | "";
  targetScope: TargetScope;
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
  linkedEffects: readonly (TargetingEffectSummary | null)[];
}

interface TargetingRuleCopy {
  eligibleRows: string;
  selection: string;
  targetSide: string;
}
```

Add to the builder result and JSX:

```tsx
return {
  eligibleRows: `Eligible rows: ${formatRowList(eligibleRows)}.`,
  selection: `${rowRule} ${targetRule}`,
  targetSide: buildTargetSideSummary(config.targetScope, config.linkedEffects),
};
```

```tsx
<p className="targeting-rule-summary-rows">{summary.eligibleRows}</p>
<p>{summary.selection}</p>
<p className="targeting-rule-summary-side">{summary.targetSide}</p>
```

- [ ] **Step 8: Style the third line**

Add beside current targeting summary styles:

```css
.targeting-rule-summary .targeting-rule-summary-side {
  margin-top: 5px;
  color: oklch(0.84 0.13 78);
}
```

- [ ] **Step 9: Run focused verification**

```bash
pnpm --filter @qd/web exec vitest run tests/unit/create/targeting-rule-summary.test.tsx tests/unit/create/spell-workspace-form.test.tsx
pnpm --filter @qd/web typecheck
pnpm exec biome check apps/web/src/components/create/spell-form.ts apps/web/src/components/create/spell-workspace-form.tsx apps/web/src/components/create/targeting-card.tsx apps/web/src/components/create/targeting-rule-summary.tsx apps/web/src/styles/app.css apps/web/tests/unit/create/targeting-rule-summary.test.tsx apps/web/tests/unit/create/spell-workspace-form.test.tsx e2e/features/create/spell-workspace.feature e2e/tests/scenario-builder/spell-workspace.test.ts
pnpm --filter @qd/e2e test:e2e -- tests/scenario-builder/spell-workspace.test.ts
```

Expected: every command passes and the targeted Playwright file includes the mixed-effect scenario.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/create/spell-form.ts apps/web/src/components/create/spell-workspace-form.tsx apps/web/src/components/create/targeting-card.tsx apps/web/src/components/create/targeting-rule-summary.tsx apps/web/src/styles/app.css apps/web/tests/unit/create/targeting-rule-summary.test.tsx apps/web/tests/unit/create/spell-workspace-form.test.tsx e2e/features/create/spell-workspace.feature e2e/tests/scenario-builder/spell-workspace.test.ts
git commit -m "feat(web): explain spell target allegiance"
```

Expected: only the listed implementation and test files are committed.

---

### Task 3: Full verification and PR update

**Files:**
- Review: `origin/develop...HEAD`
- External update: GitHub PR `#56`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: a verified pushed branch and updated PR description.

- [ ] **Step 1: Run all gates**

```bash
pnpm lint
pnpm exec turbo run test --force
pnpm run test
pnpm run test:e2e
```

Expected: lint/typecheck passes, all Turbo unit tasks pass without cache, the exact unit command succeeds, and Playwright reports 335 passing tests with zero failures.

- [ ] **Step 2: Review scope**

```bash
git diff --check origin/develop...HEAD
git diff --stat origin/develop...HEAD
git diff --name-status origin/develop...HEAD
git status --short
```

Expected: no whitespace errors, only the targeting feature and approved enhancement are present, and the worktree is clean.

- [ ] **Step 3: Push**

```bash
git push
```

Expected: `origin/feature/spell-targeting-rules-summary` advances without history rewriting.

- [ ] **Step 4: Update PR body**

```bash
gh pr edit 56 --body '## Summary

- Removes the fixed-slot targeting preview.
- Adds a live rules summary for eligible rows, rows hit per cast, targets per row, position rules, and target allegiance.
- Explains that the first linked effect controls ally/enemy targeting and warns when later mixed effects keep that target side.
- Adds explicit segmented controls for row count and position rules, plus visibly selected and constrained eligible-row controls.
- Preserves existing database, API, engine, and persisted spell form interfaces; no Self-scope constraint is added.
- Updates unit tests, Gherkin acceptance criteria, Playwright coverage, and responsive styling.

## Verification

- Focused web unit tests
- pnpm lint
- pnpm exec turbo run test --force
- pnpm run test
- pnpm run test:e2e

All verification commands passed. The full Playwright suite completed with 335 passing tests.'
```

Expected: PR base/title stay unchanged and its body describes the enhancement.

- [ ] **Step 5: Confirm delivery**

```bash
gh pr view 56 --json number,url,title,state,baseRefName,headRefName --jq '[.number, .state, .baseRefName, .headRefName, .title, .url] | @tsv'
git status --short
```

Expected: PR 56 is open from the feature branch into `develop`, and the branch is clean and preserved.
