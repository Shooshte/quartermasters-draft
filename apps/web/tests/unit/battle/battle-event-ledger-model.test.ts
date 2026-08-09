import { describe, expect, it } from "vitest";
import {
  buildBattleEventGroups,
  buildBattleLedgerItems,
} from "~/components/battle/battle-event-ledger-model";

const origin = {
  kind: "basic-attack" as const,
  actionId: "11:alpha:tank:1:1",
  sourceUnitId: "alpha:tank:1",
};

const attack = {
  tick: 11,
  type: "attack" as const,
  attacker: "Guard",
  attackerId: "alpha:tank:1",
  target: "Guard",
  targetId: "bravo:melee:2",
  damage: 28,
  actionId: origin.actionId,
  origin,
  message: "Tick 11: Guard attacks Guard for 28 damage",
};

const pairedDamage = {
  tick: 11,
  type: "damage" as const,
  source: "Guard",
  sourceId: "alpha:tank:1",
  target: "Guard",
  targetId: "bravo:melee:2",
  damage: 28,
  actionId: origin.actionId,
  origin,
  message: "Tick 11: Guard hits Guard for 28 damage",
};

const itemOrigin = {
  kind: "item-effect" as const,
  actionId: "12:alpha:support:1:1",
  sourceUnitId: "alpha:support:1",
  item: { id: "hood", name: "Acolyte Hood", position: 1 },
  effect: { id: "all-stats", name: "+10 all stats", position: 1 },
};

const healthApplication = {
  tick: 12,
  type: "effect-apply" as const,
  target: "Arcane Mage",
  targetId: "alpha:ranged:1",
  effect: "+10 all stats",
  stat: "health",
  value: 10,
  expiresAtTick: 14,
  actionId: itemOrigin.actionId,
  origin: itemOrigin,
  message: "health modified",
};

describe("buildBattleEventGroups", () => {
  it("groups one turn and coalesces its paired basic-attack damage entry", () => {
    const groups = buildBattleEventGroups([attack, pairedDamage]);

    expect(groups).toEqual([
      {
        kind: "turn",
        key: origin.actionId,
        actionId: origin.actionId,
        actorId: "alpha:tank:1",
        entries: [attack],
      },
    ]);
  });

  it("keeps delayed effects standalone in chronological order", () => {
    const delayedDamage = {
      ...pairedDamage,
      tick: 18,
      actionId: undefined,
      origin: {
        kind: "item-effect" as const,
        actionId: "11:alpha:tank:1:1",
        sourceUnitId: "alpha:tank:1",
        effect: { name: "Burning", position: 1 },
      },
    };

    const groups = buildBattleEventGroups([attack, pairedDamage, delayedDamage]);

    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({ kind: "event", entry: delayedDamage });
  });
});

describe("buildBattleLedgerItems", () => {
  it("groups consecutive item effect applications beneath their activation", () => {
    const activation = {
      tick: 12,
      type: "item-activate" as const,
      actionId: itemOrigin.actionId,
      origin: itemOrigin,
      message: "Acolyte Hood activated",
    };
    const speedApplication = {
      ...healthApplication,
      stat: "speed",
      message: "speed modified",
    };

    expect(buildBattleLedgerItems([activation, healthApplication, speedApplication])).toEqual([
      { kind: "entry", key: "12:item-activate:0", entry: activation },
      {
        kind: "effect",
        key: "effect-apply:12:12:alpha:support:1:1:alpha:support:1:hood:all-stats:alpha:ranged:1",
        eventType: "effect-apply",
        effect: "+10 all stats",
        entries: [healthApplication, speedApplication],
      },
    ]);
  });

  it("groups consecutive metadata-complete effect expirations", () => {
    const healthExpiration = {
      ...healthApplication,
      tick: 14,
      type: "effect-expire" as const,
      message: "health expired",
    };
    const speedExpiration = {
      ...healthExpiration,
      stat: "speed",
      message: "speed expired",
    };

    expect(buildBattleLedgerItems([healthExpiration, speedExpiration])).toEqual([
      {
        kind: "effect",
        key: "effect-expire:14:12:alpha:support:1:1:alpha:support:1:hood:all-stats:alpha:ranged:1",
        eventType: "effect-expire",
        effect: "+10 all stats",
        entries: [healthExpiration, speedExpiration],
      },
    ]);
  });

  it("keeps effect entries without modifier values as normal entries", () => {
    const legacyEffect = { ...healthApplication, value: undefined };

    expect(buildBattleLedgerItems([legacyEffect])).toEqual([
      { kind: "entry", key: "12:effect-apply:0", entry: legacyEffect },
    ]);
  });
});
