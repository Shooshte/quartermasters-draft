# Item Effects and Unit Targeting Design

## Goal

Simplify combat content so items own reusable, ordered effects and units own
all targeting behavior. Remove spells from the database, APIs, builder, engine
inputs, battle logs, tests, and seed data.

## Ownership Model

The combat model becomes:

```
Unit (targeting) -> Item (stats, activation costs, ordered effects) -> Effect (template)
```

- A unit owns one targeting configuration that applies to every item it
  activates.
- An item remains reusable and may be linked to zero or more effects.
- Effects remain reusable templates. An item may link the same effect more
  than once; link order determines execution order.
- An item with no linked effects is stat-only and is skipped during action
  resolution.
- An item with linked effects selects targets once, pays its activation mana
  and health costs once after a valid target is found, then applies its effects
  in sequence.

## Unit Targeting

Move the following spell configuration to `units` and expose it in the unit
workspace:

- `targetSide`: `allies`, `enemies`, or `self`.
- `targetPolicy`: `highest_health`, `lowest_health`, `highest_damage`,
  `random`, or `self`.
- `targetRowCount`: integer from 1 through 4, default 1.
- `maxTargetsPerRow`: positive integer or `null` for a whole row, default 1.
- `targetOnlyAdjacent`: boolean, default false.
- `allowedRowTypes`: zero or more supported row types; an empty set means all
  rows are eligible.

`self` target side selects only the caster when its row is eligible. `self`
target policy remains invalid when `targetSide` is `enemies`. Effect category
does not determine target side: every effect from an activated item applies to
the targets selected by the unit configuration.

## Persistence and Migration

Replace `spells_effects` and `items_spells` with `items_effects`:

- `item_id` references `items` with cascade deletion.
- `effect_template_id` references `effects` with delete restriction.
- `sequence_order` is positive and unique per item.
- Index both foreign keys.

Drop the spell table, allowed-row table, obsolete constraint triggers, and
spell join tables after backfilling `items_effects`. Backfill every existing
item by flattening its linked spells in deterministic `spell_id` order and
each former spell's `sequence_order`; preserve repeated effect links.

Existing spell targeting cannot be safely migrated to a shared unit because a
unit can equip items derived from differently configured spells. New unit
targeting fields therefore receive explicit schema defaults: `enemies`,
`highest_health`, one row, one target per row, non-adjacent, and all rows
eligible. The migration must report items that were linked to multiple spells
and units that equip items derived from different targeting configurations so
operators can review behavior changes.

## API and Engine

- Remove `scenarioBuilder.spells`; expand `scenarioBuilder.items` to manage
  ordered `effectIds` and expand `scenarioBuilder.units` to manage targeting.
- Rename engine `SpellInput`, `linkedSpells`, spell resolution helpers, and
  spell-cast events to item-effect equivalents. Selection receives unit
  targeting rather than an item-owned or spell-owned configuration.
- Keep effect-level origin data, but attribute activations and ledger entries
  to the item alone.
- Preserve item priority order, affordability checks, skipped stat-only items,
  basic-attack fallback, deterministic random targeting, and stopping a
  sequence when a target dies.

## UI Cleanup

- Remove the Spells tab, spell library, spell workspace, spell-specific URL
  parameters, loader/detection paths, hooks, deletion dialog, page objects,
  test fixtures, and CSS.
- Add ordered effect linking, effect search, editing navigation, reorder,
  removal, and duplicate-effect support to the item workspace.
- Add the targeting card, summary, defaults, validation, and row controls to
  the unit workspace. Rename copy from spell-specific language to item
  activation and unit targeting.
- Change effect dependency errors and linked-entity navigation to refer to
  items. Change battle-ledger source display from `Item > Spell` to `Item`.

## Acceptance-Criteria Changes

- Delete `e2e/features/create/spell-workspace.feature` and
  `e2e/features/create/library-spells-tab.feature`.
- Rewrite item workspace scenarios around ordered linked effects instead of
  unordered linked spells; retain optional links for stat-only items.
- Move spell-targeting workspace scenarios to the unit workspace, adding
  explicit target-side coverage and removing first-effect target-side
  inference.
- Update effect deletion scenarios from spell dependencies to item
  dependencies.
- Rewrite engine effects, targeting, action-resolution, mana, and battle-log
  stories to describe item activation and its effects rather than spell casts.
- Update API, web, engine, database, seed, unit, and E2E tests to use the new
  vocabulary and public interfaces.

## Constraints

- Follow the repository's test-driven-development requirement.
- Do not add dependencies.
- Keep effects reusable and item links ordered and duplicate-capable.
- Keep changes scoped to the spell-removal migration and necessary UI cleanup.
