# Aggregate Basic Attack Damage Design

## Goal

Every basic attack derives its base damage from the acting unit's effective
`meleeDmg`, `rangedDmg`, and `spellDmg` combined, independent of the unit's
row.

## Behavior

`performBasicAttack` will calculate its base damage as the sum of all three
effective damage stats. Item bonuses and active modifiers remain included
because the calculation continues to use `getUnitEffectiveStats`.

Target selection remains unchanged. The existing row-distance multiplier,
critical-chance bonus, and defender-dodge reduction continue to apply to the
aggregate base damage in their existing order.

## Implementation

Replace the row-based choice between `meleeDmg` and `rangedDmg` in
`packages/engine/src/resolution.ts` with a local aggregate of the three damage
stats. No type, targeting, or distance-math API changes are needed.

## Tests

Add a resolution test using distinct melee, ranged, and spell values. Place the
attacker and target in rows that apply a non-100% distance multiplier, and
assert the final damage. This proves the aggregate is used regardless of the
attacker's row while preserving row-distance behavior.
