# Battle targeting and item placement design

## Goal

Replace the legacy, row-count-based unit targeting configuration with a concise
scope, priority, multiplicity, and shape model. Derive targeting reach from the
caster's assigned combat row. Let items constrain the rows in which their owner
can be deployed.

## Unit targeting definition

Each unit definition has the following targeting inputs:

- `targetScope`: `self`, `self_allies`, `self_enemies`, `allies`, `enemies`, or
  `both`.
- `targetPriority`: `lowest_health`, `highest_health`, `highest_damage`,
  `support`, or `random`.
- `targetCount`: a positive integer, defaulting to `1`.
- `selectionShape`: `individual` or `adjacent`, defaulting to `individual`.

`targetScope` determines the living candidate units. `self` always resolves to
the caster. For composite scopes, the caster participates normally in priority
selection. `targetPriority` ranks candidates; ties use the engine's existing
deterministic fallback order. `support` prioritizes units in the support row.
`random` uses the seeded battle RNG.

For `individual`, the engine selects the highest-ranked `targetCount` candidates.
For an individual random selection, it selects that many seeded-random
candidates. For `adjacent`, it selects the priority-selected primary target and
then a contiguous group of `targetCount` living units around that target in its
row. Adjacent selection never spans rows.

Every effect on an activated item receives the same target group selected from
its owner's targeting definition.

## Reach rules

Reach is determined by the caster's assigned scenario row:

- `tank` and `melee` casters can target only the globally nearest occupied,
  eligible row.
- `ranged` and `support` casters can target all eligible rows.

For tank and melee casters, the engine first identifies the nearest row among
the allowed target sides after scope and living-unit filtering. If eligible rows
on different sides are equally near (for example, both tank rows), it chooses
one side with the seeded battle RNG, then selects targets within that row. Empty
and dead-only rows do not count as occupied.

## Item placement restrictions

Items define `allowedRowTypes`, containing one or more of `tank`, `melee`,
`ranged`, and `support`. A unit can be deployed only into the intersection of
the allowed rows of all equipped items. An item without a restriction permits
all rows. Empty intersections are invalid.

Scenario authoring exposes only valid deployment rows and the API/engine
validation independently rejects an invalid placement.

## Data migration and interfaces

The new unit fields replace the legacy `targetSide`, `targetPolicy`,
`targetRowCount`, `maxTargetsPerRow`, `targetOnlyAdjacent`, and target-row link
configuration. Item allowed-row links replace the old unit allowed-target-row
links. Database schema, migration, API validators/loaders, engine input/state,
seed data, and authoring form interfaces will use the new model. Existing seed
items will explicitly allow every row to retain their current deployment
availability.

## Error handling and tests

Validation rejects non-positive target counts, duplicate item row values,
adjacent selection without a valid primary row, invalid deployment rows, and
equipped item sets with no shared allowed row. Errors remain explicit domain or
API validation errors.

Acceptance criteria and tests cover every scope and priority, reach by caster
row, seeded cross-side ties and random selection, individual and adjacent
multi-target selection, item-row intersections, and invalid placement. The
complete verification suite is `pnpm run test`, `pnpm run test:e2e`, lint, and
type checking.
