# Spell Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a spell workspace form in the entity workspace so game masters can create, edit, and manage spells with linked effects.

**Architecture:** Two-phase approach — first rename existing `eff-*` CSS classes to shared `ws-*` namespace (pure rename, no visual change), then build the spell form on top of the shared classes. The spell form follows the same component/validation/normalization pattern as the existing effect workspace.

**Tech Stack:** React 19, TanStack Start, tRPC v11, Tailwind v4, Vitest, Playwright

---

### Task 1: Rename CSS classes `eff-*` → `ws-*` in `app.css`

**Files:**
- Modify: `apps/web/src/styles/app.css:209-381`

This is a mechanical find-and-replace of all `eff-` prefixed class names and `--eff-` CSS custom properties to `ws-` / `--ws-`. The `.effect-damage`, `.effect-healing`, `.effect-buff`, `.effect-debuff` class names stay the same — only the variables they set change from `--eff-*` to `--ws-*`.

- [ ] **Step 1: Rename all `eff-` class names and `--eff-` variables to `ws-` / `--ws-`**

In `apps/web/src/styles/app.css`, perform these replacements throughout the file:

| Find | Replace |
|------|---------|
| `--eff-color` | `--ws-color` |
| `--eff-dim` | `--ws-dim` |
| `--eff-subtle` | `--ws-subtle` |
| `--eff-border` | `--ws-border` |
| `.eff-section-header` | `.ws-section-header` |
| `.eff-cell-neutral` | `.ws-cell-neutral` |
| `.eff-cell-label` | `.ws-cell-label` |
| `.eff-cell-input` | `.ws-cell-input` |
| `.eff-cell` | `.ws-cell` |
| `.eff-name-input` | `.ws-name-input` |
| `.eff-chip-type` | `.ws-chip-type` |
| `.eff-chip-timing` | `.ws-chip-timing` |
| `.eff-chip-select` | `.ws-chip-select` |
| `.eff-chip-arrow` | `.ws-chip-arrow` |
| `.eff-chip` | `.ws-chip` |

**Order matters** — replace longer names first (e.g. `.eff-cell-neutral` before `.eff-cell`, `.eff-chip-type` before `.eff-chip`) to avoid partial matches.

Also update the comment at line 209 from `/* ── Effect editor: adaptive effect-type color system ── */` to `/* ── Workspace: shared entity editor styles ── */` and the comment at line 211 from `.eff-cell and .eff-chip-type` to `.ws-cell and .ws-chip-type`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/styles/app.css
git commit -m "refactor: rename eff-* CSS classes to ws-* shared workspace namespace"
```

---

### Task 2: Update `effect-workspace-form.tsx` to use `ws-*` classes

**Files:**
- Modify: `apps/web/src/components/create/effect-workspace-form.tsx`

- [ ] **Step 1: Replace all `eff-` class name references with `ws-`**

In `apps/web/src/components/create/effect-workspace-form.tsx`, replace every CSS class reference:

| Find | Replace |
|------|---------|
| `eff-cell ` | `ws-cell ` |
| `eff-cell-neutral` | `ws-cell-neutral` |
| `eff-cell-label` | `ws-cell-label` |
| `eff-cell-input` | `ws-cell-input` |
| `eff-name-input` | `ws-name-input` |
| `eff-section-header` | `ws-section-header` |
| `eff-chip eff-chip-type` | `ws-chip ws-chip-type` |
| `eff-chip eff-chip-timing` | `ws-chip ws-chip-timing` |
| `eff-chip-select` | `ws-chip-select` |
| `eff-chip-arrow` | `ws-chip-arrow` |

These appear at lines 44, 45, 51, 86, 87, 93, 152, 153, 159, 171, 178, 187, 189, 198, 204, 210, 238.

- [ ] **Step 2: Verify existing tests pass**

Run: `cd apps/web && pnpm vitest run`

Expected: All existing effect-form tests pass (the CSS class rename doesn't break logic).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/create/effect-workspace-form.tsx
git commit -m "refactor: update effect workspace form to ws-* class names"
```

---

### Task 3: Update `effect-colors.ts` (if needed)

**Files:**
- Modify: `apps/web/src/components/create/effect-colors.ts`

- [ ] **Step 1: Check for `eff-` references**

Read `apps/web/src/components/create/effect-colors.ts`. The `getEffectColorClass()` function returns `effect-damage`, `effect-healing`, etc. — these are **not** renamed (they're effect-type color providers, not workspace layout classes). No change needed unless there are `eff-` references elsewhere in the file.

If there are no `eff-` references, skip to commit. If there are, replace them with `ws-`.

- [ ] **Step 2: Commit (if changes made)**

```bash
git add apps/web/src/components/create/effect-colors.ts
git commit -m "refactor: update effect-colors to ws-* references"
```

---

### Task 4: Add spell-specific CSS (badge classes)

**Files:**
- Modify: `apps/web/src/styles/app.css` (append after existing workspace styles)

- [ ] **Step 1: Add spell effect badge classes**

Append these classes at the end of `apps/web/src/styles/app.css`, after the existing workspace styles (after the `.ws-chip-arrow` rule):

```css
/* ── Spell workspace: effect-type badges ── */

.spell-effect-badge {
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
}
.spell-effect-badge-damage {
  background: oklch(0.65 0.2 25 / 12%);
  color: oklch(0.65 0.2 25);
  border: 1px solid oklch(0.65 0.2 25 / 18%);
}
.spell-effect-badge-healing {
  background: oklch(0.65 0.17 145 / 12%);
  color: oklch(0.65 0.17 145);
  border: 1px solid oklch(0.65 0.17 145 / 18%);
}
.spell-effect-badge-buff {
  background: oklch(0.65 0.14 240 / 12%);
  color: oklch(0.65 0.14 240);
  border: 1px solid oklch(0.65 0.14 240 / 18%);
}
.spell-effect-badge-debuff {
  background: oklch(0.60 0.18 310 / 12%);
  color: oklch(0.60 0.18 310);
  border: 1px solid oklch(0.60 0.18 310 / 18%);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/styles/app.css
git commit -m "feat: add spell effect badge CSS classes"
```

---

### Task 5: Create `spell-form.ts` — types, validation, normalization

**Files:**
- Create: `apps/web/src/components/create/spell-form.ts`
- Test: `apps/web/tests/unit/create/spell-form.test.ts`

- [ ] **Step 1: Write failing tests for spell form validation and normalization**

Create `apps/web/tests/unit/create/spell-form.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createDefaultSpellFormValues,
  validateSpellForm,
  hasSpellFormErrors,
  normalizeSpellFormValues,
} from "~/components/create/spell-form";

describe("spell-form", () => {
  it("provides defaults for a new spell", () => {
    const defaults = createDefaultSpellFormValues();
    expect(defaults).toEqual({
      name: "",
      description: "",
      targetPolicy: "",
      effectIds: [],
    });
  });

  it("returns error when name is empty", () => {
    const errors = validateSpellForm(createDefaultSpellFormValues());
    expect(errors.name).toBe("Name is required");
  });

  it("returns error when name is only whitespace", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "   ",
    });
    expect(errors.name).toBe("Name is required");
  });

  it("returns error when targetPolicy is empty", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
    });
    expect(errors.targetPolicy).toBe("Target policy is required");
  });

  it("returns no errors for valid form", () => {
    const errors = validateSpellForm({
      name: "Fireball",
      description: "",
      targetPolicy: "highest_health",
      effectIds: [],
    });
    expect(errors).toEqual({});
  });

  it("hasSpellFormErrors returns true when errors exist", () => {
    expect(hasSpellFormErrors(createDefaultSpellFormValues())).toBe(true);
  });

  it("hasSpellFormErrors returns false when form is valid", () => {
    expect(
      hasSpellFormErrors({
        name: "Fireball",
        description: "",
        targetPolicy: "highest_health",
        effectIds: [],
      }),
    ).toBe(false);
  });

  it("normalizes name by trimming whitespace", () => {
    const result = normalizeSpellFormValues({
      name: "  Fireball  ",
      description: "test",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.name).toBe("Fireball");
  });

  it("normalizes empty description to null", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBeNull();
  });

  it("normalizes whitespace-only description to null", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "   ",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBeNull();
  });

  it("normalizes non-empty description by trimming", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "  A blazing sphere  ",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBe("A blazing sphere");
  });

  it("passes through targetPolicy and effectIds unchanged", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "",
      targetPolicy: "highest_health",
      effectIds: ["id-1", "id-2"],
    });
    expect(result.targetPolicy).toBe("highest_health");
    expect(result.effectIds).toEqual(["id-1", "id-2"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run tests/unit/create/spell-form.test.ts`

Expected: FAIL — module `~/components/create/spell-form` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/components/create/spell-form.ts`:

```typescript
export type TargetPolicy = "highest_health" | "lowest_health" | "highest_damage" | "random";

const VALID_TARGET_POLICIES: readonly string[] = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
];

export interface SpellFormValues {
  [key: string]: unknown;
  name: string;
  description: string;
  targetPolicy: TargetPolicy | "";
  effectIds: string[];
}

export type SpellFieldErrors = Partial<Record<"name" | "targetPolicy", string>>;

export function createDefaultSpellFormValues(): SpellFormValues {
  return {
    name: "",
    description: "",
    targetPolicy: "",
    effectIds: [],
  };
}

export function validateSpellForm(values: SpellFormValues): SpellFieldErrors {
  const errors: SpellFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  }

  if (!VALID_TARGET_POLICIES.includes(values.targetPolicy)) {
    errors.targetPolicy = "Target policy is required";
  }

  return errors;
}

export function hasSpellFormErrors(values: SpellFormValues): boolean {
  return Object.keys(validateSpellForm(values)).length > 0;
}

export interface NormalizedSpellInput {
  name: string;
  description: string | null;
  targetPolicy: TargetPolicy;
  effectIds: string[];
}

export function normalizeSpellFormValues(values: SpellFormValues): NormalizedSpellInput {
  const trimmedDesc = values.description.trim();
  return {
    name: values.name.trim(),
    description: trimmedDesc || null,
    targetPolicy: values.targetPolicy as TargetPolicy,
    effectIds: values.effectIds,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run tests/unit/create/spell-form.test.ts`

Expected: All 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/create/spell-form.ts apps/web/tests/unit/create/spell-form.test.ts
git commit -m "feat: add spell form validation, normalization, and types"
```

---

### Task 6: Create `spell-workspace-form.tsx` — the form component

**Files:**
- Create: `apps/web/src/components/create/spell-workspace-form.tsx`

This component renders the spell form: name cell, description cell, target selection chip, spell effects list with picker, and save button.

- [ ] **Step 1: Create the spell workspace form component**

Create `apps/web/src/components/create/spell-workspace-form.tsx`:

```tsx
import { useRef, type MouseEvent, type RefObject } from "react";

import { Button } from "~/components/ui/button";
import {
  hasSpellFormErrors,
  validateSpellForm,
  type SpellFormValues,
} from "./spell-form";

interface EffectOption {
  id: string;
  name: string;
  effectType: string;
}

interface SpellWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: SpellFormValues;
  effectOptions: EffectOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function getEffectBadgeClass(effectType: string): string {
  switch (effectType) {
    case "damage":
      return "spell-effect-badge spell-effect-badge-damage";
    case "healing":
      return "spell-effect-badge spell-effect-badge-healing";
    case "buff":
      return "spell-effect-badge spell-effect-badge-buff";
    case "debuff":
      return "spell-effect-badge spell-effect-badge-debuff";
    default:
      return "spell-effect-badge";
  }
}

export function SpellWorkspaceForm({
  mode,
  formValues,
  effectOptions,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: SpellWorkspaceFormProps) {
  const targetPolicySelectRef = useRef<HTMLSelectElement>(null);
  const effectPickerRef = useRef<HTMLSelectElement>(null);
  const errors = validateSpellForm(formValues);
  const saveLabel = mode === "create" ? "Create Spell" : "Save Changes";

  const handleChipMouseDown =
    (selectRef: RefObject<HTMLSelectElement | null>) =>
    (event: MouseEvent<HTMLLabelElement>) => {
      if (event.target instanceof HTMLSelectElement) {
        return;
      }

      event.preventDefault();

      const select = selectRef.current;

      if (!select) {
        return;
      }

      select.focus();
      try {
        select.showPicker?.();
      } catch {
        // Focus remains on the native select, so keyboard interaction still works.
      }
    };

  const handleAddEffect = () => {
    const select = effectPickerRef.current;
    if (!select || !select.value) return;

    const newEffectIds = [...formValues.effectIds, select.value];
    onFieldChange("effectIds", newEffectIds);
    select.value = "";
  };

  const handleRemoveEffect = (index: number) => {
    const newEffectIds = formValues.effectIds.filter((_, i) => i !== index);
    onFieldChange("effectIds", newEffectIds);
  };

  const handleMoveEffect = (index: number, direction: "up" | "down") => {
    const newEffectIds = [...formValues.effectIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEffectIds.length) return;
    [newEffectIds[index], newEffectIds[targetIndex]] = [
      newEffectIds[targetIndex],
      newEffectIds[index],
    ];
    onFieldChange("effectIds", newEffectIds);
  };

  // Build a lookup map for effect details
  const effectMap = new Map(effectOptions.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-4" data-testid="spell-form-fields">
      {/* Name cell */}
      <div className="ws-cell-neutral">
        <label htmlFor="entity-name" className="ws-cell-label">
          Name
        </label>
        <input
          id="entity-name"
          data-testid="entity-name-input"
          className="ws-cell-input ws-name-input"
          value={formValues.name}
          placeholder="—"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Description cell */}
      <div className="ws-cell-neutral">
        <label htmlFor="spell-description" className="ws-cell-label">
          Description{" "}
          <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>
            (optional)
          </span>
        </label>
        <textarea
          id="spell-description"
          data-testid="spell-description-input"
          className="ws-cell-input"
          style={{ minHeight: 48, resize: "vertical", lineHeight: 1.5 }}
          value={formValues.description}
          placeholder="—"
          onChange={(e) => onFieldChange("description", e.target.value)}
        />
      </div>

      {/* Target Selection section */}
      <div>
        <div className="ws-section-header">Target Selection</div>
        <div className="flex gap-2 items-center flex-wrap">
          <label
            className="ws-chip"
            style={{
              background: "oklch(0.78 0.15 75 / 12%)",
              color: "oklch(0.78 0.15 75)",
              border: "1px solid oklch(0.78 0.15 75 / 18%)",
            }}
            data-testid="spell-target-policy-chip"
            onMouseDown={handleChipMouseDown(targetPolicySelectRef)}
          >
            <select
              ref={targetPolicySelectRef}
              data-testid="spell-target-policy-select"
              className="ws-chip-select"
              value={formValues.targetPolicy}
              onChange={(e) => onFieldChange("targetPolicy", e.target.value)}
            >
              <option value="" disabled>
                select…
              </option>
              <option value="highest_health">highest_health</option>
              <option value="lowest_health">lowest_health</option>
              <option value="highest_damage">highest_damage</option>
              <option value="random">random</option>
            </select>
            <span className="ws-chip-arrow">▼</span>
          </label>
        </div>
        {errors.targetPolicy && (
          <p className="text-sm text-destructive mt-1">{errors.targetPolicy}</p>
        )}
      </div>

      {/* Spell Effects section */}
      <div>
        <div className="ws-section-header">Spell Effects</div>

        {/* Effect picker */}
        <div className="flex gap-2 items-center mb-2.5">
          <select
            ref={effectPickerRef}
            data-testid="spell-effect-picker"
            className="ws-cell-input"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid oklch(0.91 0.03 70 / 12%)",
              borderRadius: 6,
              padding: "7px 10px",
              cursor: "pointer",
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Search effects…
            </option>
            {effectOptions.map((effect) => (
              <option key={effect.id} value={effect.id}>
                {effect.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            data-testid="spell-add-effect-button"
            onClick={handleAddEffect}
          >
            + Add
          </Button>
        </div>

        {/* Effect list */}
        <div className="flex flex-col gap-1">
          {formValues.effectIds.map((effectId, index) => {
            const effect = effectMap.get(effectId);
            const isFirst = index === 0;
            const isLast = index === formValues.effectIds.length - 1;

            return (
              <div
                key={`${effectId}-${index}`}
                className="flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid oklch(0.91 0.03 70 / 12%)",
                  borderRadius: 6,
                  padding: "6px 8px",
                }}
                data-testid={`spell-effect-row-${index}`}
              >
                {/* Sequence badge */}
                <span
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 12,
                    color: "oklch(0.78 0.15 75)",
                    background: "oklch(0.78 0.15 75 / 10%)",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>

                {/* Effect name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {effect?.name ?? effectId}
                </span>

                {/* Type badge */}
                {effect && (
                  <span className={getEffectBadgeClass(effect.effectType)}>
                    {effect.effectType}
                  </span>
                )}

                {/* Controls */}
                <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
                  <button
                    data-testid={`spell-effect-move-up-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    style={{ width: 24, height: 24, fontSize: 12, opacity: isFirst ? 0.2 : 1 }}
                    disabled={isFirst}
                    onClick={() => handleMoveEffect(index, "up")}
                  >
                    ↑
                  </button>
                  <button
                    data-testid={`spell-effect-move-down-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    style={{ width: 24, height: 24, fontSize: 12, opacity: isLast ? 0.2 : 1 }}
                    disabled={isLast}
                    onClick={() => handleMoveEffect(index, "down")}
                  >
                    ↓
                  </button>
                  <button
                    data-testid={`spell-effect-remove-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    style={{ width: 24, height: 24, fontSize: 12 }}
                    onClick={() => handleRemoveEffect(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          onClick={onSave}
          disabled={isSaving || hasSpellFormErrors(formValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/create/spell-workspace-form.tsx
git commit -m "feat: add spell workspace form component"
```

---

### Task 7: Wire spell form into entity workspace

**Files:**
- Modify: `apps/web/src/components/create/entity-workspace.tsx`

- [ ] **Step 1: Add spell branch to entity workspace**

Replace the contents of `apps/web/src/components/create/entity-workspace.tsx`:

```tsx
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { capitalize } from "~/lib/string-utils";
import type { EffectFormValues } from "./effect-form";
import type { SpellFormValues } from "./spell-form";
import type { WorkspaceState } from "./types";
import { EffectWorkspaceForm } from "./effect-workspace-form";
import { SpellWorkspaceForm } from "./spell-workspace-form";

interface EffectOption {
  id: string;
  name: string;
  effectType: string;
}

interface EntityWorkspaceProps {
  workspace: WorkspaceState;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
  effectOptions?: EffectOption[];
}

export function EntityWorkspace({ workspace, onFieldChange, onSave, isSaving, saveError, effectOptions = [] }: EntityWorkspaceProps) {
  const { mode, entityType, formValues } = workspace;
  const isTransitioning = mode === "loading" && workspace.data !== null;

  return (
    <div data-testid="entity-workspace" className="flex flex-1 flex-col overflow-auto min-h-0">
      <div data-testid="entity-workspace-header" className="bg-accent text-primary font-display tracking-wide py-2 px-4 border-b border-border">
        {mode === "idle" && "Entity"}
        {mode === "loading" && !workspace.data && "Entity"}
        {mode === "loading" && workspace.data && `${capitalize(entityType ?? "")}: ${formValues.name ?? ""}`}
        {mode === "not-found" && "Entity"}
        {mode === "create" && `New ${capitalize(entityType ?? "")}`}
        {mode === "edit" && `${capitalize(entityType ?? "")}: ${formValues.name ?? ""}`}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {mode === "idle" && (
          <p className="text-sm text-muted-foreground" data-testid="entity-idle">
            Select an entity from the library
          </p>
        )}

        {mode === "loading" && !workspace.data && (
          <p className="text-sm text-muted-foreground" data-testid="entity-loading">
            Loading…
          </p>
        )}

        {mode === "not-found" && (
          <p className="text-sm text-destructive" data-testid="entity-not-found">
            Entity not found
          </p>
        )}

        {(mode === "create" || mode === "edit" || isTransitioning) && (
          <div className={`flex flex-col gap-4 ${isTransitioning ? "opacity-60 pointer-events-none" : ""}`} data-testid="entity-form">
            {entityType === "effect" ? (
              <EffectWorkspaceForm
                mode={mode}
                formValues={formValues as EffectFormValues}
                onFieldChange={onFieldChange}
                onSave={onSave}
                isSaving={isSaving}
                saveError={saveError}
              />
            ) : entityType === "spell" ? (
              <SpellWorkspaceForm
                mode={mode}
                formValues={formValues as SpellFormValues}
                effectOptions={effectOptions}
                onFieldChange={onFieldChange}
                onSave={onSave}
                isSaving={isSaving}
                saveError={saveError}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="entity-name">Name</Label>
                <Input
                  id="entity-name"
                  data-testid="entity-name-input"
                  value={formValues.name ?? ""}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/create/entity-workspace.tsx
git commit -m "feat: wire spell workspace form into entity workspace"
```

---

### Task 8: Update workspace loader to populate spell form values

**Files:**
- Modify: `apps/web/src/components/create/hooks/use-workspace-loader.ts`

There are three places that set spell form values with `{ name: entityData.name }`. All three need to include the full spell fields.

- [ ] **Step 1: Add import for `createDefaultSpellFormValues`**

At the top of `apps/web/src/components/create/hooks/use-workspace-loader.ts`, add the import:

```typescript
import { createDefaultSpellFormValues } from "../spell-form";
```

- [ ] **Step 2: Update the entity_id detector (line 114)**

Change line 114 from:

```typescript
formValues: found.type === "effect" ? effectRecordToFormValues(entityData) : { name: entityData.name },
```

to:

```typescript
formValues: found.type === "effect"
  ? effectRecordToFormValues(entityData)
  : found.type === "spell"
    ? {
        ...createDefaultSpellFormValues(),
        name: entityData.name,
        description: (entityData.description as string) ?? "",
        targetPolicy: (entityData.targetPolicy as string) ?? "",
        effectIds: (entityData.effectIds as string[]) ?? [],
      }
    : { name: entityData.name },
```

- [ ] **Step 3: Update the spell_id loader (line 232)**

Change line 232 from:

```typescript
formValues: { name: entityData.name },
```

to:

```typescript
formValues: {
  ...createDefaultSpellFormValues(),
  name: entityData.name,
  description: (entityData.description as string) ?? "",
  targetPolicy: (entityData.targetPolicy as string) ?? "",
  effectIds: (entityData.effectIds as string[]) ?? [],
},
```

- [ ] **Step 4: Update the `loadEntity` function (line 436)**

Change line 436 from:

```typescript
formValues: entityType === "effect" ? effectRecordToFormValues(entityData) : { name: entityData.name },
```

to:

```typescript
formValues: entityType === "effect"
  ? effectRecordToFormValues(entityData)
  : entityType === "spell"
    ? {
        ...createDefaultSpellFormValues(),
        name: entityData.name,
        description: (entityData.description as string) ?? "",
        targetPolicy: (entityData.targetPolicy as string) ?? "",
        effectIds: (entityData.effectIds as string[]) ?? [],
      }
    : { name: entityData.name },
```

- [ ] **Step 5: Update `executePendingAction` for create-new spell defaults (line 559)**

Change line 559 from:

```typescript
formValues: entityType === "effect" ? createDefaultEffectFormValues() : { name: "" },
```

to:

```typescript
formValues: entityType === "effect"
  ? createDefaultEffectFormValues()
  : entityType === "spell"
    ? createDefaultSpellFormValues()
    : { name: "" },
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/create/hooks/use-workspace-loader.ts
git commit -m "feat: populate full spell form values in workspace loader"
```

---

### Task 9: Add spell save/update to `saveEntity()`

**Files:**
- Modify: `apps/web/src/components/create/use-create-page-state.ts`

- [ ] **Step 1: Add spell form imports**

Add to the imports at the top of `apps/web/src/components/create/use-create-page-state.ts`:

```typescript
import { normalizeSpellFormValues, validateSpellForm, type SpellFormValues } from "./spell-form";
```

- [ ] **Step 2: Add spell handling to `saveEntity` callback**

Replace the `saveEntity` callback (lines 309-366) with the version below. The effect path is unchanged; a new spell path is added after it.

```typescript
const saveEntity = useCallback(async () => {
  if (entityWorkspace.entityType === "effect") {
    const formValues = effectRecordToFormValues(entityWorkspace.formValues);
    const normalized = normalizeEffectFormValues(formValues);
    if (Object.keys(validateEffectForm(normalized)).length > 0) return;

    try {
      setIsEntitySaving(true);
      setEntitySaveError(null);

      if (entityWorkspace.mode === "create") {
        const created = await trpc.scenarioBuilder.effects.create.mutate(normalized);
        setEntityWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: created.id,
          data: created,
          formValues: effectRecordToFormValues(created),
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, Effects: created.id }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.entity_id;
            delete next.effect_id;
            next.effect_id = created.id;
            return next;
          },
          replace: true,
        });
      } else if (entityWorkspace.mode === "edit" && entityWorkspace.entityId) {
        const updated = await trpc.scenarioBuilder.effects.update.mutate({
          id: entityWorkspace.entityId,
          ...normalized,
        });
        setEntityWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: updated.id,
          data: updated,
          formValues: effectRecordToFormValues(updated),
          isDirty: false,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "effects", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "effects", "get"] }),
      ]);
    } catch (error) {
      setEntitySaveError(error instanceof Error ? error.message : "Failed to save effect. Please try again.");
    } finally {
      setIsEntitySaving(false);
    }
  } else if (entityWorkspace.entityType === "spell") {
    const spellValues = entityWorkspace.formValues as SpellFormValues;
    if (Object.keys(validateSpellForm(spellValues)).length > 0) return;
    const normalized = normalizeSpellFormValues(spellValues);

    try {
      setIsEntitySaving(true);
      setEntitySaveError(null);

      if (entityWorkspace.mode === "create") {
        const created = await trpc.scenarioBuilder.spells.create.mutate(normalized);
        const createdData = created as { id: string; name: string; [key: string]: unknown };
        setEntityWorkspace({
          mode: "edit",
          entityType: "spell",
          entityId: createdData.id,
          data: createdData,
          formValues: {
            name: createdData.name,
            description: (createdData.description as string) ?? "",
            targetPolicy: (createdData.targetPolicy as string) ?? "",
            effectIds: (createdData.effectIds as string[]) ?? [],
          },
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, Spells: createdData.id }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.entity_id;
            delete next.spell_id;
            next.spell_id = createdData.id;
            return next;
          },
          replace: true,
        });
      } else if (entityWorkspace.mode === "edit" && entityWorkspace.entityId) {
        const updated = await trpc.scenarioBuilder.spells.update.mutate({
          id: entityWorkspace.entityId,
          ...normalized,
        });
        const updatedData = updated as { id: string; name: string; [key: string]: unknown };
        setEntityWorkspace({
          mode: "edit",
          entityType: "spell",
          entityId: updatedData.id,
          data: updatedData,
          formValues: {
            name: updatedData.name,
            description: (updatedData.description as string) ?? "",
            targetPolicy: (updatedData.targetPolicy as string) ?? "",
            effectIds: (updatedData.effectIds as string[]) ?? [],
          },
          isDirty: false,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "spells", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "spells", "get"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save spell. Please try again.";
      if (message.includes("already exists")) {
        setEntitySaveError("A spell with this name already exists");
      } else {
        setEntitySaveError(message);
      }
    } finally {
      setIsEntitySaving(false);
    }
  }
}, [entityWorkspace, navigate, queryClient, setEntityWorkspace, setPerTabSelection, skipEntityResetRef]);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/create/use-create-page-state.ts
git commit -m "feat: add spell create/update to saveEntity"
```

---

### Task 10: Pass effect options through from create page

**Files:**
- Modify: `apps/web/src/components/create/create-page.tsx`
- Modify: `apps/web/src/components/create/use-create-page-state.ts` (add effect options query)

The spell form needs a list of all effects (id, name, effectType) for the picker dropdown. Add a query to the create page state and pass it through.

- [ ] **Step 1: Add effect options query to `useCreatePageState`**

In `apps/web/src/components/create/use-create-page-state.ts`, add a query right after the `useWorkspaceLoader` call (around line 170):

```typescript
// Effect options for spell effect picker
const effectOptionsQuery = useQuery({
  queryKey: ["scenarioBuilder", "effects", "list", { limit: 500, page: 1, sortBy: "name", sortDir: "asc" }],
  queryFn: () => trpc.scenarioBuilder.effects.list.query({ limit: 500, page: 1, sortBy: "name", sortDir: "asc" }),
  enabled: entityWorkspace.entityType === "spell",
});
```

Add the import for `useQuery` — it's already imported at line 2 of the file from `@tanstack/react-query` (used in the workspace loader), but `useCreatePageState` doesn't import it directly yet. Add it:

```typescript
import { useQuery, useQueryClient } from "@tanstack/react-query";
```

(Replace the existing `import { useQueryClient } from "@tanstack/react-query";`)

Add to the return value:

```typescript
effectOptions: (effectOptionsQuery.data?.items ?? []).map((e: { id: string; name: string; effectType: string }) => ({
  id: e.id,
  name: e.name,
  effectType: e.effectType,
})),
```

Also add `effectOptions` to the `CreatePageState` interface:

```typescript
effectOptions: { id: string; name: string; effectType: string }[];
```

- [ ] **Step 2: Pass `effectOptions` to `EntityWorkspace` in `create-page.tsx`**

In `apps/web/src/components/create/create-page.tsx`, add `effectOptions` to the `EntityWorkspace` props:

Change:
```tsx
<EntityWorkspace
  workspace={state.entityWorkspace}
  onFieldChange={state.updateEntityField}
  onSave={state.saveEntity}
  isSaving={state.isEntitySaving}
  saveError={state.entitySaveError}
/>
```

to:

```tsx
<EntityWorkspace
  workspace={state.entityWorkspace}
  onFieldChange={state.updateEntityField}
  onSave={state.saveEntity}
  isSaving={state.isEntitySaving}
  saveError={state.entitySaveError}
  effectOptions={state.effectOptions}
/>
```

- [ ] **Step 3: Verify the build succeeds**

Run: `cd apps/web && pnpm tsc --noEmit`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/create/create-page.tsx apps/web/src/components/create/use-create-page-state.ts
git commit -m "feat: fetch and pass effect options for spell effect picker"
```

---

### Task 11: Run all unit tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `cd apps/web && pnpm vitest run`

Expected: All tests pass, including existing effect-form tests and the new spell-form tests.

- [ ] **Step 2: Fix any failures, then commit fixes if needed**

---

### Task 12: Run full build verification

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

Run: `pnpm run build`

Expected: Build succeeds without errors.

- [ ] **Step 2: Fix any issues, commit fixes if needed**
