# Interval direct-damage resolution design

## Goal

Make interval effects resolve every configured direct-damage source (`directMeleeDmg`, `directRangedDmg`, and `directSpellDmg`) so battle damage matches `highest_damage` projection.

## Design

Each populated direct-damage field on a non-healing interval effect queues an independent active interval effect. All queued entries retain the same source, target, schedule, trigger count, and origin; each stores only its own direct-damage amount.

When an interval becomes due, every queued entry resolves as a separate damage hit and log entry. Critical chance and dodge apply independently to each hit, including their existing rounding behavior. Healing intervals continue to queue and resolve healing only.

The existing direct-damage projection already sums the three fields. With this change, the projection and runtime resolution use the same set of interval damage sources.

## Tests

Add engine-effect regressions proving that:

- melee-only and ranged-only interval damage trigger correctly;
- an interval with multiple direct-damage fields produces separate damage log entries and the expected total health loss; and
- spell-only intervals and healing intervals retain their existing behavior.

## Non-goals

This does not change instant-effect resolution, target selection, interval scheduling, modifier math, or item activation costs.
