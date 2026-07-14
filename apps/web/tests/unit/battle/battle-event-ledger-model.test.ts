import { describe, expect, it } from "vitest";
import { buildBattleEventGroups } from "~/components/battle/battle-event-ledger-model";

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
        kind: "spell-effect" as const,
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
