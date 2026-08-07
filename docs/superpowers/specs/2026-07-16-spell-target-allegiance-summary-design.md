# Spell Target Allegiance Summary

## Context

The spell workspace's live targeting summary explains eligible rows, row count, targets per row, and position rules. It does not explain whether the selected units come from the caster's army or the opposing army.

The battle engine derives that allegiance from the first linked effect in sequence:

- `buff` and `healing` select allied candidates.
- `damage` and `debuff` select enemy candidates.
- Every later effect retains the original selected target IDs for targeting and activation, applies only to their living members, and never retargets even when its type normally maps to the other side.
- `targetScope: "self"` is handled before effect allegiance. The caster is the sole candidate only when the caster's current row is eligible; otherwise the spell has no target.

This behavior already exists in the engine. The change will expose it in the spell workspace without changing targeting mechanics.

## Design

Add a third, dynamic line to the existing live targeting summary. The line begins with **Target side** and updates whenever the target scope or ordered linked effects change.

### First-effect allegiance

For non-self scopes, the first linked effect determines the side:

| First effect | Target side |
| --- | --- |
| Buff or Healing | Allies |
| Damage or Debuff | Enemies |

The line names the first effect and its type so the ordering rule is explicit. Examples:

- `Target side: Allies, including the caster. The first linked effect, Barbarian Roar (Buff), determines the target side for every effect in this spell.`
- `Target side: Allies other than the caster. The first linked effect, Heal Light (Healing), determines the target side for every effect in this spell.`
- `Target side: Enemies. The first linked effect, Arcane Damage (Damage), determines the target side for every effect in this spell.`

`self_and_others` and `others` differ only for allied targeting. Both describe enemy targeting as `Enemies` because the caster is not part of the opposing army's candidate set.

### Self scope

Self scope preserves current engine behavior. It overrides the first effect's normal allegiance, but it does not bypass eligible-row filtering:

`Target side: Caster. Self scope overrides the first effect's normal allegiance; if the caster's current row is eligible, every linked effect applies to the caster.`

The caster is the only possible target when the caster's current row is eligible; when that row is ineligible, the spell has no target. Row count, per-row limit, position rule, and priority cannot add targets under Self scope.

No database constraint, API validation, form validation, or engine change will be added. In particular, self-scoped Damage and Debuff effects remain possible because they are possible today; their application remains conditional on the caster's current row being eligible.

### Mixed-effect spells

When a later linked effect maps to the opposite side from the first effect, append an explicit warning. Examples:

- Buff first, Damage later: `Mixed effects keep this target side; later Damage effects also apply to those allies.`
- Damage first, Healing later: `Mixed effects keep this target side; later Healing effects also apply to those enemies.`

When multiple opposite-side types occur, list each unique type in sequence order. Reordering effects can therefore change both the target side and the warning immediately.

For self scope, the base self-scope sentence is sufficient: it states that every linked effect applies to the caster only when the caster's current row is eligible.

### Incomplete effect data

- With no linked effects, show: `Target side: Add an effect to determine whether this spell targets allies or enemies.`
- If the form contains a linked effect ID whose option metadata is not available yet, show: `Target side: Waiting for the first linked effect's details.`

Self scope takes precedence over both incomplete states and continues to identify the caster as the sole possible candidate, subject to the eligible-row condition. For non-self scopes, the summary must not guess a side while the first effect's data is loading. If the first effect is available but a later effect is not, show the known target side and temporarily omit the mixed-effect warning.

## Component and Data Flow

`SpellWorkspaceForm` already receives every effect option with its ID, name, and type. It will resolve `formValues.effectIds` against those options in array order while preserving unresolved entries. That order is the persisted spell-effect sequence, so index zero is the engine's first effect.

The form passes the resolved ordered effects and `targetScope` through `TargetingCard` to `TargetingRuleSummary`. The summary's pure builder derives:

1. The first effect's normal side.
2. The scope-adjusted target-side sentence.
3. Any later effect types that map to the opposite side.

The existing `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` container remains unchanged, so allegiance changes are announced with the rest of the live rule summary.

## Interfaces

Only internal web types and component props change:

- Effect options use the existing four-value effect-type union instead of an unconstrained string.
- `TargetingCard` and `TargetingRuleSummary` receive ordered linked-effect metadata.
- `TargetingRuleSummary` also receives `targetScope`.

Database schema, migrations, API inputs and outputs, engine interfaces, and persisted spell form values remain unchanged.

## Acceptance Criteria

- A Buff-first or Healing-first spell identifies allies as the target side.
- `Others` scope excludes the caster from the allied description.
- A Damage-first or Debuff-first spell identifies enemies as the target side.
- `Self` scope explains that the caster is the sole candidate only when the caster's current row is eligible, otherwise the spell has no target, and other selection rules cannot add targets.
- A spell with no linked effects explains that its first effect will determine allegiance.
- A mixed spell explains that later opposite-side effects use the first effect's targets.
- Reordering a mixed spell updates the target side and mixed-effect warning immediately.
- Missing effect metadata produces neutral loading copy rather than an incorrect side.

## Testing

Follow TDD with focused unit coverage first:

- Pure summary-builder cases for Buff, Healing, Damage, Debuff, Self, no effects, and unavailable metadata.
- Mixed-effect cases in both directions, including unique later type ordering.
- Spell workspace integration coverage proving ordered effect IDs are resolved and reordering changes the displayed text.
- Updated Gherkin acceptance criteria for first-effect allegiance and mixed effects.
- Playwright coverage using existing seeded Buff and Damage effects to verify the live summary before and after reordering.

After focused tests pass, run `pnpm lint`, `pnpm run test`, and `pnpm run test:e2e` before updating the existing pull request.

## Non-goals

- Changing which units the engine targets.
- Adding a cross-table database constraint for Self scope and effect types.
- Rejecting mixed-effect spells.
- Changing spell persistence, API contracts, or effect ordering.
- Adding another warning panel or a permanent effect-type legend.
