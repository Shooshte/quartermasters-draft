# Spell Workspace Design

## Overview

Add a dedicated spell workspace form to the entity workspace on the `/create` page. The spell form allows game masters to create and edit spells — including name, description, target policy, and an ordered list of linked effects — without leaving the builder workflow.

This feature has two parts:

1. **CSS abstraction** — rename the existing `eff-*` CSS classes to a shared `ws-*` (workspace) namespace so that all entity workspaces (effects, spells, items, units) can use the same base styles. Update the effect workspace form to consume the new class names.
2. **Spell workspace form** — build the spell-specific form using the shared `ws-*` classes, plus a small number of spell-only additions.

**Acceptance criteria**: all scenarios in `e2e/features/create/spell-workspace.feature`.

**Visual reference**: `.superpowers/brainstorm/56768-1774721585/content/spell-workspace-full-v3.html`

## Data Model (existing — no changes)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | text | yes | Unique across spells |
| `description` | text | no | Empty string → null on save |
| `targetPolicy` | enum | yes | `highest_health`, `lowest_health`, `highest_damage`, `random` |
| `effectIds` | UUID[] | no | Ordered array; index + 1 = `sequenceOrder` |

The `spells` and `spellsEffects` tables already exist. The tRPC router (`scenarioBuilder.spells`) already supports `list`, `get`, `create`, `update`, and `delete`. No backend changes are needed.

## Part 1: Shared Workspace CSS Abstraction

### Rename Map

All existing `eff-*` classes in `app.css` are renamed to `ws-*`. The effect workspace form (`effect-workspace-form.tsx`) and its related files are updated to use the new names. No visual change — purely a rename.

| Old class | New class | Purpose |
|-----------|-----------|---------|
| `eff-cell` | `ws-cell` | Colored cell (inherits `--ws-color` vars) |
| `eff-cell-neutral` | `ws-cell-neutral` | Neutral gray cell (name, timing, text fields) |
| `eff-cell-label` | `ws-cell-label` | Uppercase label inside cells |
| `eff-cell-input` | `ws-cell-input` | Transparent input inside cells |
| `eff-name-input` | `ws-name-input` | Larger font variant for name fields |
| `eff-section-header` | `ws-section-header` | Section divider with trailing hairline |
| `eff-chip` | `ws-chip` | Inline pill selector base |
| `eff-chip-type` | `ws-chip-type` | Colored chip variant (inherits `--ws-color`) |
| `eff-chip-timing` | `ws-chip-timing` | Neutral chip variant |
| `eff-chip-select` | `ws-chip-select` | Hidden select inside chip |
| `eff-chip-arrow` | `ws-chip-arrow` | Dropdown arrow inside chip |

### CSS Custom Property Rename

The scoped color variables also move to the `ws-` namespace:

| Old variable | New variable |
|-------------|-------------|
| `--eff-color` | `--ws-color` |
| `--eff-dim` | `--ws-dim` |
| `--eff-subtle` | `--ws-subtle` |
| `--eff-border` | `--ws-border` |

The `.effect-damage`, `.effect-healing`, `.effect-buff`, `.effect-debuff` classes keep their names — they are effect-type-specific color providers that set the `--ws-*` variables. Their internal variable references change from `--eff-*` to `--ws-*`.

### Files Changed by Rename

| File | Change |
|------|--------|
| `apps/web/src/styles/app.css` | Rename all `eff-*` → `ws-*` classes and `--eff-*` → `--ws-*` variables |
| `apps/web/src/components/create/effect-workspace-form.tsx` | Update all class name references |
| `apps/web/src/components/create/effect-colors.ts` | Update any class name references if present |

### Verification

After the rename, all existing effect workspace unit tests and E2E tests must still pass — no visual or behavioral change.

## Part 2: Spell Workspace Form

### Form Layout

Top-to-bottom order inside the entity workspace body (16px padding, 16px gap between sections):

#### 1. Name Cell

- Uses shared `ws-cell-neutral`.
- Label: "NAME" via `ws-cell-label`.
- Input: 16px Crimson Pro via `ws-cell-input ws-name-input`.
- Required — validation error shown below input if empty after trim.
- `data-testid="entity-name-input"`.

#### 2. Description Cell

- Uses shared `ws-cell-neutral` with a `<textarea>` instead of `<input>`.
- Label: "DESCRIPTION (optional)" via `ws-cell-label` — the "(optional)" portion in lowercase, reduced opacity (0.5), normal letter-spacing.
- Textarea: 14px Crimson Pro, `min-height: 48px`, vertically resizable. Uses `ws-cell-input` base styling adapted for textarea.
- Empty/whitespace → stored as `null`.
- `data-testid="spell-description-input"`.

#### 3. Target Selection Section

- Section divider: `ws-section-header` — "TARGET SELECTION" with trailing hairline.
- Below the divider: a single chip selector.
- Chip styling: `ws-chip` base + golden tint (`oklch(0.78 0.15 75)` background at 12%, border at 18%, text at full). No `ws-chip-type` needed since spells don't have a type-based color system — the gold tint is applied directly.
- Contains a hidden `<select>` via `ws-chip-select` with 4 options: `highest_health`, `lowest_health`, `highest_damage`, `random`.
- Dropdown arrow: `ws-chip-arrow` (`▼` at 8px, 50% opacity).
- Uses `showPicker()` on chip click (same handler pattern as `EffectWorkspaceForm`).
- Required — save blocked if no value selected.
- `data-testid="spell-target-policy-chip"` on the chip label, `data-testid="spell-target-policy-select"` on the select.

#### 4. Spell Effects Section

- Section divider: `ws-section-header` — "SPELL EFFECTS" with trailing hairline.

**Effect picker row** (flex, 8px gap, margin-bottom 10px):

- Dropdown (`<select>` initially; can upgrade to combobox later).
  - Styled with inline/local styles matching the workspace aesthetic: dark bg, subtle border, 6px radius, 7px 10px padding, Crimson Pro 14px.
  - Placeholder option: "Search effects…" (disabled).
  - Options populated from the full effects list (fetched via `trpc.scenarioBuilder.effects.list` with high limit).
  - `data-testid="spell-effect-picker"`.
- "+ Add" button: ghost style (transparent bg, border, muted text). On hover: border and text turn gold.
  - Clicking adds the selected effect to the end of the list.
  - `data-testid="spell-add-effect-button"`.

**Spell effect list** (flex column, 4px gap):

Each linked effect renders as a row:

| Element | Spec |
|---------|------|
| Sequence badge | 24×24px circle, Cinzel 12px, gold text on 10% gold bg. Auto-numbered from 1. |
| Effect name | Flex-grow, 15px Crimson Pro, ellipsis overflow. |
| Type badge | Colored pill reusing the effect-type color system. Cinzel 10px uppercase, 2px 8px padding, 3px radius. |
| ↑ button | Swaps with previous. Disabled (20% opacity) on first item. `data-testid="spell-effect-move-up-{index}"`. |
| ↓ button | Swaps with next. Disabled on last item. `data-testid="spell-effect-move-down-{index}"`. |
| ✕ button | Removes effect. Destructive hover color. `data-testid="spell-effect-remove-{index}"`. |

- Duplicate effects at different positions are allowed (per feature file scenario).
- Reordering and removal are local state changes — not persisted until save.
- Empty list: no special empty state needed; the picker row is always visible.

#### 5. Save Area

- Flex, `justify-end`, 4px top padding.
- Button text: "Create Spell" in create mode, "Save Changes" in edit mode.
- Disabled when: `isSaving`, or name is empty, or target policy is not set.
- `data-testid="entity-save-button"`.
- Error text below/beside button: 13px, destructive color. `data-testid="entity-save-error"`.

### Spell-Specific CSS

New classes to add in `app.css` under a `/* ── Spell workspace ── */` section:

- `.spell-effect-badge` — base badge: Cinzel 10px uppercase, 2px 8px padding, 3px border-radius, flex-shrink 0.
- `.spell-effect-badge-damage` — red tint (`oklch(0.65 0.2 25)` at 12% bg, 18% border, full text).
- `.spell-effect-badge-healing` — green tint (`oklch(0.65 0.17 145)`).
- `.spell-effect-badge-buff` — blue tint (`oklch(0.65 0.14 240)`).
- `.spell-effect-badge-debuff` — purple tint (`oklch(0.60 0.18 310)`).

These follow the same color pattern as the `.effect-{type}` classes but are applied as static badges (not scoped variable providers).

### Form State

New type `SpellFormValues`:

```typescript
interface SpellFormValues {
  name: string;
  description: string;
  targetPolicy: "highest_health" | "lowest_health" | "highest_damage" | "random" | "";
  effectIds: string[];
}
```

Default (create mode): `{ name: "", description: "", targetPolicy: "", effectIds: [] }`.

### Validation (`validateSpellForm`)

| Field | Rule | Error message |
|-------|------|---------------|
| `name` | Non-empty after trim | "Name is required" |
| `targetPolicy` | Must be one of the 4 enum values | "Target policy is required" |

Returns an errors object keyed by field name (same pattern as `validateEffectForm`).

### Normalization (`normalizeSpellInput`)

Before sending to tRPC:
- `name`: trimmed.
- `description`: trimmed; empty string → `null`.
- `targetPolicy`: passed as-is.
- `effectIds`: passed as-is (array of UUID strings).

The existing tRPC router already does server-side normalization, but client-side normalization keeps the form consistent.

## Integration Points

### Entity Workspace (`entity-workspace.tsx`)

Add a branch for `entityType === "spell"` that renders `SpellWorkspaceForm` (mirroring the `entityType === "effect"` branch for `EffectWorkspaceForm`).

### Workspace Loader (`use-workspace-loader.ts`)

Update the spell loading path (around line 232) to populate all spell form fields:

```typescript
formValues: {
  name: entityData.name,
  description: entityData.description ?? "",
  targetPolicy: entityData.targetPolicy,
  effectIds: entityData.effectIds ?? [],
}
```

### Create Page State (`use-create-page-state.ts`)

Add spell handling to `saveEntity()` (currently only handles effects):

- **Create**: call `trpc.scenarioBuilder.spells.create.mutate(normalized)`.
- **Update**: call `trpc.scenarioBuilder.spells.update.mutate({ id, ...normalized })`.
- On success: switch to edit mode, update URL with `spell_id`, invalidate spell list + get queries.
- On 409 conflict: set `entitySaveError` to "A spell with this name already exists".

### Effect List for Picker

The spell form needs a full list of available effects (names + IDs + types) for the picker dropdown. Fetch via `trpc.scenarioBuilder.effects.list` with a high page size. This can be a separate query triggered when the spell form mounts in create or edit mode.

## Workspace Header

Follows existing `entity-workspace.tsx` header logic:
- Idle: "Entity"
- Create: "New Spell"
- Edit: "Spell: {name}"
- Loading: "Entity" (or transitioning with name)
- Not found: "Entity"

No changes needed — the existing header logic already handles this via `capitalize(entityType)`.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/create/spell-workspace-form.tsx` | Spell form component |
| `apps/web/src/components/create/spell-form.ts` | Validation, normalization, types |

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/styles/app.css` | Rename `eff-*` → `ws-*`; add spell-specific badge classes |
| `apps/web/src/components/create/effect-workspace-form.tsx` | Update class names from `eff-*` → `ws-*` |
| `apps/web/src/components/create/effect-colors.ts` | Update class name references if present |
| `apps/web/src/components/create/entity-workspace.tsx` | Add `entityType === "spell"` branch |
| `apps/web/src/components/create/hooks/use-workspace-loader.ts` | Populate full spell form values on load |
| `apps/web/src/components/create/use-create-page-state.ts` | Add spell save/update to `saveEntity()` |
| `apps/web/src/components/create/types.ts` | Add `SpellFormValues` type (if not using spell-form.ts) |

## Testing

### Unit Tests (Vitest)

- `spell-form.test.ts`: validation returns correct errors for empty name, missing target policy; normalization trims and nullifies correctly.
- `spell-workspace-form.test.tsx`: renders all fields; chip opens picker; add/remove/reorder effects; save button disabled states; error display.

### E2E Tests (Playwright)

All 11 scenarios from `spell-workspace.feature`. The step definitions will need to interact with:
- `entity-name-input` for name
- `spell-description-input` for description
- `spell-target-policy-select` for target policy
- `spell-effect-picker` + `spell-add-effect-button` for adding effects
- `spell-effect-move-up-*` / `spell-effect-move-down-*` / `spell-effect-remove-*` for reorder/remove
- `entity-save-button` for saving
- `entity-save-error` for duplicate name errors

## Out of Scope

- Drag-and-drop reordering (↑/↓ buttons are sufficient for now)
- Combobox/autocomplete for effect picker (plain `<select>` first; upgrade later if the effect list grows large)
- Spell deletion from the workspace (already handled via the library list delete button)
- Unsaved changes warning for spells (follow-up — the dialog infrastructure exists but isn't wired for spells yet)
