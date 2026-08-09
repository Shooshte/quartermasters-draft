# Highest-damage projected output design

## Goal

Make `highest_damage` target priority rank a unit by its projected outgoing damage per tick, rather than by the sum of its effective damage stats alone.

## Score

The score is the sum of two independently timed contributions:

1. **Action-driven output:** effective `meleeDmg + rangedDmg + spellDmg`, plus all eligible instant direct-damage item effects, multiplied by `effectiveSpeed / 100`.
2. **Interval output:** every eligible interval direct-damage item effect divided by its positive `intervalTicks` value. Interval output is not multiplied by speed because it continues on its own schedule after application.

All direct-damage fields on an effect (`directMeleeDmg`, `directRangedDmg`, and `directSpellDmg`) contribute independently when present. This calculation affects targeting score only; damage-resolution behavior remains unchanged.

## Eligibility

Only an equipped item effect that can be applied to enemies contributes direct-effect damage:

- `enemies`, `self_enemies`, and `both` target scopes are eligible.
- Effects that can target only self or allies are excluded.
- Healing and non-damage effects are excluded.
- Interval effects with zero, negative, or absent `intervalTicks` are excluded to avoid an invalid projection.

The existing current effective stats remain the source for stat damage and speed. Item bonuses and active stat modifiers therefore affect the projected score as they already affect effective stats.

## Ordering and scope

Target reachability, target scopes, selection shapes, and deterministic tie-breaking remain unchanged. Only the numeric score used by `highest_damage` changes.

## Tests

Add focused targeting tests showing that the priority:

- prefers a candidate whose instant enemy damage produces greater action-driven output;
- includes interval enemy damage as damage divided by interval;
- scales action-driven output by current effective speed, including active speed modifiers;
- excludes ally-only direct effects and invalid interval schedules; and
- retains the existing deterministic fallback for equal projected output.

## Non-goals

This change does not model mana or health activation costs, defensive stats, critical chance, dodge, row distance, target health, or target count. It does not alter damage resolution semantics.
