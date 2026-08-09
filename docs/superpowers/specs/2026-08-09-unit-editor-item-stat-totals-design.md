# Unit Editor Item Stat Totals Design

## Goal

Show game masters the final stats a unit will have after its linked items are equipped, without changing the existing base-stat editing or save behavior.

## User experience

Each numeric stat field in the unit workspace keeps its current editable base value. A persistent read-only line beneath the field displays `Final <value>`.

When linked items make a non-zero contribution, the line also displays the aggregate contribution as `(+<value> items)` or `(-<value> items)`. When the contribution is zero, only the final value is shown. This keeps the stat grid stable whether or not the unit has linked items.

The display updates immediately when the GM:

- edits a base stat;
- adds or removes a linked item;
- links the same item more than once; or
- reorders linked items.

Reordering does not change the total, but the displayed value is recalculated from the current ordered item ID list. Duplicate links contribute once per occurrence, matching the battle engine.

## Stat calculation

The preview follows the existing battle-engine semantics:

1. Parse the unit's current base stat.
2. Sum the corresponding stat from every linked item, including duplicate item IDs.
3. Add the aggregate item contribution to the base value.
4. Clamp the final value at zero.

Items currently contribute to Mana, Melee Damage, Ranged Damage, Mana Regen, Spell Damage, Dodge, and Critical Chance. Items do not currently define Health or Speed, so those final values equal their unit base values.

The contribution label reports the raw aggregate item contribution. For example, a base value of `2` and item contribution of `-5` displays `Final 0 (-5 items)`.

If the base field does not contain a finite number, the preview displays `Final —`. Existing form validation and save blocking remain responsible for explaining and preventing invalid input.

## Data flow and component boundaries

The item list response used to populate the unit's item picker will include the seven item stat fields needed by the preview. Extending this existing response avoids issuing one request per item.

The web `ItemOption` type will carry the same stat values. The create-page state passes those options through the existing `EntityWorkspace` and `UnitWorkspaceForm` path.

A small pure unit-form helper will:

- resolve linked item IDs against the available item options;
- sum bonuses once per linked-ID occurrence; and
- return each final stat and aggregate item contribution.

`UnitWorkspaceForm` will use that result when rendering both Combat Stats and Vital Stats. The presentation belongs to the unit workspace; the shared numeric input does not need a new global behavior.

Unknown linked item IDs contribute zero until their option data is available. The existing item-options loading state prevents this from being treated as an error, and saved links are not modified.

## Error handling and compatibility

- Missing item stat values are treated as zero for compatibility with incomplete test fixtures and older data shapes.
- Non-finite unit input produces `Final —` and does not attempt to display a misleading total.
- No database schema, unit mutation payload, or save behavior changes.
- No new dependency is required.

## Acceptance criteria

- Every Combat and Vital stat field shows a persistent final value.
- A linked item's positive or negative stat contribution is reflected in the corresponding final value and contribution label.
- Multiple linked items stack additively.
- Duplicate item links stack once per occurrence.
- Final values never display below zero.
- Stats that items cannot modify still show their base value as the final value.
- Adding or removing an item updates the preview without saving the unit.
- Invalid base input displays `Final —` and retains the existing validation error.

## Testing

Following test-driven development:

1. Add unit tests for the pure calculation helper covering positive and negative contributions, clamping, duplicate links, missing options, unchanged Health and Speed, and invalid base input.
2. Add component tests proving that inline final values and optional item-contribution labels render under the appropriate stat inputs.
3. Extend API item-list tests to cover the stat fields required by unit options.
4. Add an E2E feature scenario and Playwright assertion showing that linking an item updates the unit's final stats before save.
5. Run the focused tests during red-green cycles, then run `pnpm run test` and `pnpm run test:e2e` for completion verification.

## Out of scope

- Item-by-item bonus breakdowns.
- Persisting calculated final stats.
- Including temporary battle effects in the editor preview.
- Changing item ordering, activation, or unit save semantics.
