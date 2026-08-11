# Shield Mechanic Design

## Goal

Add consumable shield layers to battles. Damage consumes shields before health unless the originating effect explicitly bypasses shields; healing never restores shields.

## Scope

Effect templates gain two persisted properties:

- `shield`: nullable numeric amount granted to every selected target.
- `bypassesShield`: boolean, defaulting to `false`, which applies that effect's direct and interval damage to health without consuming shield layers.

The effect editor exposes these values, battle scenario loading carries them into engine inputs, and the battle result displays each unit's remaining total shield.

## Battle Model

Each `BattleUnitState` owns an ordered collection of shield layers. A layer has an ID, a remaining numeric amount, and an optional owning active-effect ID.

- An instant effect with `shield: N` adds a non-expiring layer with `N` remaining.
- An instant buff or debuff with `shield: N` and `lastsForActions` adds a layer linked to the active effect created for that shield. When that active effect expires, its remaining layer is removed.
- Separate shield applications create separate layers. Shieldable damage consumes layers from oldest application to newest, then subtracts only any remainder from health.
- Damage from an effect with `bypassesShield: true` skips all layers and directly reduces health.
- Basic attacks, fatigue, and activation health costs remain shieldable. Damage effects without `bypassesShield` are shieldable by default.
- Healing changes only `currentHealth`, capped by effective maximum health; it never changes shield layers.
- Unit liveness and battle victory conditions continue to depend only on `currentHealth > 0`. Remaining shields never keep a unit with zero health alive.

## Damage Resolution

A single shield-aware damage resolution path will replace direct health subtraction at all engine damage sites. It must support both immediate effect resolution and recorded operations committed from concurrently planned actions, preserving existing no-shield battle semantics.

Recorded damage operations carry an optional bypass marker only when bypassing is requested, retaining the existing operation shape for normal damage tests and callers. Shield grants are likewise represented in the action operation flow so effect order is retained when a planned action both grants shields and deals damage.

## Persistence and UI

The database migration adds nullable `shield` and non-null `bypasses_shield` columns to `effects`; existing templates become shieldless and non-bypassing. Drizzle schema, scenario-builder input validation, API selections/mappers, effect form values, and battle scenario conversion all include the fields.

The effect workspace shows Shield beside other effect values and a Bypasses shield control. Duration validation requires `lastsForActions` for an instant buff/debuff that grants shield, matching timed stat modifiers.

The battle result unit table includes a Shield column displaying the sum of all remaining layers.

## Verification

Test coverage will establish:

- an instant shield absorbs damage before health;
- healing does not replenish shields;
- shield layers are consumed in application order;
- a timed shield layer is removed when its effect expires;
- bypassing direct and interval damage leaves shields unchanged while reducing health;
- a unit dies when health reaches zero even if shield remains;
- ordinary basic attacks, fatigue, and unflagged effects remain shieldable;
- effect persistence, API scenario loading, form validation, and rendered battle results include the new fields.

All existing no-shield tests must remain unchanged in outcome.
