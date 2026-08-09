# Explicit Battle Effect Log Design

## Goal

Make each stat change in the battle event ledger explicit while preserving the relationship between the item activation, the reusable effect, and its individual consequences.

The ledger must show one consequence row per affected stat, nested under the effect that caused it. A multi-stat effect must not appear as several indistinguishable applications.

## Scope

This change covers timed buff and debuff application and expiration entries produced by the battle engine, plus their presentation in the web battle ledger. It does not change effect targeting, stacking, duration, stat calculation, or battle resolution.

## Event Model

Each stat-specific `effect-apply` entry will retain its existing effect and target fields and add the information needed to describe its consequence without parsing display names:

- `stat`: the affected `StatKey`.
- `value`: the signed modifier applied to that stat. Buffs are positive; debuffs are negative after normalization.
- `expiresAtTick`: the tick on which the modifier expires.

Each matching `effect-expire` entry will carry the same stat and signed value. It will also retain the existing effect, target, and origin metadata. This makes expiration entries independently understandable after the active modifier has been removed.

These fields describe the stat-specific modifier record. They do not imply that the complete reusable effect was applied once per field.

## Ledger Hierarchy

Within an item activation turn, contiguous stat applications with the same action, effect origin, and target will render as:

```text
Acolyte · Circle of Mages / Support 1
  Acolyte Hood
    + 10 all stats, 2 ticks
      Health: +10 on Arcane Mage (until tick 6)
      Mana: +10 on Arcane Mage (until tick 6)
      Melee damage: +10 on Arcane Mage (until tick 6)
```

The complete example contains one row for every affected stat. The item heading remains the activation entry, the effect heading comes from the effect origin/name, and each child row contains the readable stat label, signed value, target, and expiry tick.

Contiguous expiration entries sharing tick, source item, source effect, and target will render as one expiration group:

```text
+ 10 all stats, 2 ticks expired on Arcane Mage
  Health: +10 expired
  Mana: +10 expired
  Melee damage: +10 expired
From Acolyte · Circle of Mages / Support 1 · Acolyte Hood
```

Single-stat effects use the same hierarchy, producing one child consequence row. Direct damage, healing, interval effects, basic attacks, deaths, fatigue, and battle-end events keep their existing presentation.

## Presentation Rules

- Stat keys use readable labels: Health, Mana, Melee damage, Ranged damage, Mana regeneration, Spell damage, Speed, Dodge, and Critical chance.
- Positive values include a leading `+`; negative values retain their minus sign.
- Application rows include the target and expiry tick.
- Expiration rows identify the expired stat modifier and retain the source caption.
- Grouping uses structured identifiers and metadata, never the effect's human-written name or message text alone.
- Event ordering remains identical to engine resolution order.

## Component Boundaries

The engine owns factual event metadata. It records the normalized value and expiry information at the point where each `ActiveEffectState` is created, and copies the stat/value metadata when that state expires.

The web ledger model owns presentation grouping. It converts the flat chronological engine log into turn groups and nested effect groups without changing event order.

The React ledger owns labels and markup. It renders item, effect, and consequence levels and formats stat names and signed numeric values. It must not infer modifier values from effect names or reconstruct them from final battle state.

## Compatibility and Error Handling

The web renderer will continue to handle log entries that do not contain the new optional modifier metadata by falling back to the existing effect application or expiration sentence. This protects display of older serialized payloads and manually constructed test fixtures.

The engine will populate complete metadata for all newly generated timed buff and debuff events. No new dependency is required.

## Tests

Engine unit tests will prove that:

- A multi-stat buff emits one application entry per stat with the correct signed value and common expiry tick.
- A debuff records its normalized negative value.
- Expiration entries retain the corresponding stat and value.

Web unit tests will prove that:

- Stat-specific applications are nested under one effect heading inside the item activation.
- Every affected stat is rendered once with a readable label, signed value, target, and expiry tick.
- Matching expiration entries are grouped under one effect expiration heading.
- Entries without modifier metadata retain the existing fallback rendering.
- Unrelated battle event ordering and grouping remain unchanged.

The repository unit and end-to-end suites must pass after implementation.
