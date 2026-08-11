# Taunt Targeting Design

## Goal

Allow an effect to taunt an affected unit so its future target selection prioritizes the unit that applied the taunt, without bypassing normal target legality.

## Effect model

- A GM configures an effect as a taunt.
- Applying it creates an active effect on the affected unit that records the applying unit through the existing effect source fields.
- A taunt with no duration is persistent. A taunt with `lastsForActions` follows the existing affected-unit action expiry lifecycle.
- Multiple taunts may be active. The most recently applied legal taunt takes precedence.

## Target selection

1. Build normal target candidates from scope and living status.
2. Apply normal row reachability. Tank and melee units remain limited to the nearest eligible occupied row; ranged and support units retain their existing reach.
3. Among taunt effects on the acting unit, inspect newest first. If its source unit is a reachable legal candidate, select it as the primary target.
4. If no taunt source is legal, use the unit's configured target priority and existing deterministic fallback behavior.
5. Adjacent selection remains centered on the taunt-selected primary unit and stays within that unit's row.

## Testing

Unit tests will cover persistent taunts, timed expiry, newest-taunt precedence, fallback after a taunter is dead or unreachable, and front-line row limits that prevent an otherwise active taunt from overriding reachability.

## Scope

The engine effect types, targeting logic, GM effect form, persistence validation/schema, and associated unit/API/UI tests are in scope. No changes are made to unrelated combat priorities or row rules.
