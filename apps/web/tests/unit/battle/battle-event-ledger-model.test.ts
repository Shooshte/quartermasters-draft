import { describe, expect, it } from "vitest";
import {
  buildBattleEventGroups,
  buildBattleLedgerItems,
} from "~/components/battle/battle-event-ledger-model";

const origin = {
  kind: "basic-attack" as const,
  actionId: "action-alpha-tank-1",
  sourceUnitId: "alpha:tank:1",
};

const attack = {
  batchNumber: 4,
  type: "attack" as const,
  attacker: "Guard",
  attackerId: "alpha:tank:1",
  target: "Guard",
  targetId: "bravo:melee:2",
  damage: 28,
  actionId: origin.actionId,
  origin,
  message: "Guard attacks Guard for 28 damage",
};

const pairedDamage = {
  batchNumber: 4,
  type: "damage" as const,
  source: "Guard",
  sourceId: "alpha:tank:1",
  target: "Guard",
  targetId: "bravo:melee:2",
  damage: 28,
  actionId: origin.actionId,
  origin,
  message: "Guard hits Guard for 28 damage",
};

const itemOrigin = {
  kind: "item-effect" as const,
  actionId: "action-alpha-support-1",
  sourceUnitId: "alpha:support:1",
  item: { id: "hood", name: "Acolyte Hood", position: 1 },
  effect: { id: "all-stats", name: "+10 all stats", position: 1 },
};

const healthApplication = {
  batchNumber: 5,
  type: "effect-apply" as const,
  target: "Arcane Mage",
  targetId: "alpha:ranged:1",
  effect: "+10 all stats",
  stat: "health",
  value: 10,
  actionsRemaining: 2,
  actionId: itemOrigin.actionId,
  origin: itemOrigin,
  message: "health modified",
};

describe("buildBattleEventGroups", () => {
  it("groups one turn and coalesces its paired basic-attack damage entry", () => {
    const groups = buildBattleEventGroups([attack, pairedDamage]);

    expect(groups).toEqual([
      {
        kind: "batch",
        key: "batch:4",
        batchNumber: 4,
        turns: [
          {
            kind: "turn",
            key: origin.actionId,
            actionId: origin.actionId,
            actorId: "alpha:tank:1",
            entries: [attack],
          },
        ],
        events: [],
      },
    ]);
  });

  it("keeps delayed effects in their later action batch", () => {
    const delayedDamage = {
      ...pairedDamage,
      batchNumber: 7,
      actionId: undefined,
      origin: {
        kind: "item-effect" as const,
        actionId: origin.actionId,
        sourceUnitId: "alpha:tank:1",
        effect: { name: "Burning", position: 1 },
      },
    };

    const groups = buildBattleEventGroups([attack, pairedDamage, delayedDamage]);

    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({
      kind: "batch",
      batchNumber: 7,
      turns: [],
      events: [{ kind: "event", entry: delayedDamage }],
    });
  });

  it("groups simultaneous actions as peer turns in one batch", () => {
    const secondOrigin = {
      kind: "basic-attack" as const,
      actionId: "action-bravo-melee-1",
      sourceUnitId: "bravo:melee:1",
    };
    const secondAttack = {
      ...attack,
      attacker: "Blade",
      attackerId: "bravo:melee:1",
      target: "Guard",
      targetId: "alpha:tank:1",
      damage: 19,
      actionId: secondOrigin.actionId,
      origin: secondOrigin,
      message: "Blade attacks Guard for 19 damage",
    };

    const groups = buildBattleEventGroups([attack, pairedDamage, secondAttack]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      kind: "batch",
      batchNumber: 4,
      turns: [
        { actionId: origin.actionId, actorId: "alpha:tank:1", entries: [attack] },
        {
          actionId: secondOrigin.actionId,
          actorId: "bravo:melee:1",
          entries: [secondAttack],
        },
      ],
      events: [],
    });
  });

  it("groups consecutive detailed expirations without a current action", () => {
    const healthExpiration = {
      ...healthApplication,
      batchNumber: 6,
      type: "effect-expire" as const,
      actionId: undefined,
      actionsRemaining: 0,
      message: "health expired",
    };
    const speedExpiration = {
      ...healthExpiration,
      stat: "speed",
      message: "speed expired",
    };

    expect(buildBattleEventGroups([healthExpiration, speedExpiration])).toEqual([
      {
        kind: "batch",
        key: "batch:6",
        batchNumber: 6,
        turns: [],
        events: [
          {
            kind: "effect",
            key: "effect-expire:6:action-alpha-support-1:alpha:support:1:hood:all-stats:alpha:ranged:1",
            eventType: "effect-expire",
            effect: "+10 all stats",
            entries: [healthExpiration, speedExpiration],
          },
        ],
      },
    ]);
  });
});

describe("buildBattleLedgerItems", () => {
  it("groups consecutive item effect applications beneath their activation", () => {
    const activation = {
      batchNumber: 5,
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
      { kind: "entry", key: "5:item-activate:0", entry: activation },
      {
        kind: "effect",
        key: "effect-apply:5:action-alpha-support-1:alpha:support:1:hood:all-stats:alpha:ranged:1",
        eventType: "effect-apply",
        effect: "+10 all stats",
        entries: [healthApplication, speedApplication],
      },
    ]);
  });

  it("groups consecutive metadata-complete effect expirations", () => {
    const healthExpiration = {
      ...healthApplication,
      batchNumber: 6,
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
        key: "effect-expire:6:action-alpha-support-1:alpha:support:1:hood:all-stats:alpha:ranged:1",
        eventType: "effect-expire",
        effect: "+10 all stats",
        entries: [healthExpiration, speedExpiration],
      },
    ]);
  });

  it("keeps effect entries without modifier values as normal entries", () => {
    const legacyEffect = { ...healthApplication, value: undefined };

    expect(buildBattleLedgerItems([legacyEffect])).toEqual([
      { kind: "entry", key: "5:effect-apply:0", entry: legacyEffect },
    ]);
  });
});
