import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";

function createLoggedBattle() {
  const fireStaff = createItem({
    name: "Fire Staff",
    effects: effectSequence(
      createEffect({
        name: "Impact",
        effectType: "damage",
        timingType: "instant",
        directSpellDmg: 20,
      }),
      createEffect({
        name: "Burning",
        effectType: "damage",
        timingType: "interval",
        triggerEveryActions: 3,
        triggerCount: 1,
        directSpellDmg: 10,
      }),
    ),
  });

  return new BattleEngine(
    createBattleInput([
      createScenario("alpha", {
        tank: [
          createUnit("alpha-1", {
            stats: createStats({ health: 200, meleeDmg: 30, speed: 10 }),
          }),
        ],
        ranged: [
          createUnit("alpha-2", {
            stats: createStats({ health: 100, rangedDmg: 25, speed: 15, manaRegen: 5 }),
            items: [fireStaff],
          }),
        ],
      }),
      createScenario("bravo", {
        melee: [
          createUnit("bravo-1", {
            stats: createStats({ health: 150, meleeDmg: 20, speed: 12 }),
          }),
        ],
        support: [
          createUnit("bravo-2", {
            stats: createStats({ health: 40, rangedDmg: 10, spellDmg: 50, speed: 8 }),
          }),
        ],
      }),
    ]),
  );
}

describe("battle log", () => {
  it("attributes an item activation and immediate effect without a spell origin", () => {
    const log = createLoggedBattle().resolve().log;
    const activation = log.find((entry) => entry.type === "item-activation");
    const damage = log.find(
      (entry) => entry.type === "damage" && entry.origin?.effect?.name === "Impact",
    );

    expect(activation).toMatchObject({
      actionId: expect.any(String),
      item: "Fire Staff",
      effects: ["Impact", "Burning"],
      origin: {
        kind: "item-effect",
        item: { name: "Fire Staff", position: 1 },
      },
    });
    expect(activation?.origin).not.toHaveProperty("spell");
    expect(damage).toMatchObject({
      actionId: activation?.actionId,
      origin: {
        kind: "item-effect",
        item: { name: "Fire Staff", position: 1 },
        effect: { name: "Impact", position: 1 },
      },
    });
    expect(damage?.origin).not.toHaveProperty("spell");
  });

  it("keeps interval effect item/effect attribution without grouping it into the original action", () => {
    const log = createLoggedBattle().resolve().log;
    const delayedDamage = log.find(
      (entry) => entry.type === "damage" && entry.origin?.effect?.name === "Burning",
    );

    expect(delayedDamage).toMatchObject({
      actionId: undefined,
      origin: {
        kind: "item-effect",
        item: { name: "Fire Staff", position: 1 },
        effect: { name: "Burning", position: 2 },
      },
    });
    expect(delayedDamage?.origin).not.toHaveProperty("spell");
  });

  it("produces structured chronological log entries and ends with a battle outcome", () => {
    const result = createLoggedBattle().resolve();
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log.some((entry) => entry.type === "attack")).toBe(true);
    expect(result.log.some((entry) => entry.type === "item-activation")).toBe(true);
    expect(result.log.some((entry) => entry.type === "death")).toBe(true);
    expect(result.log.at(-1)?.type).toBe("battle-end");

    const batchNumbers = result.log.map((entry) => entry.batchNumber);
    expect(batchNumbers).toEqual([...batchNumbers].sort((left, right) => left - right));
  });

  it("is deterministic for identical inputs and seed", () => {
    expect(createLoggedBattle().resolve().log).toEqual(createLoggedBattle().resolve().log);
  });
});
