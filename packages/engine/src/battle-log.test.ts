import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createSpell,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";

function createLoggedBattle() {
  const burning = createEffect({
    name: "Burning",
    effectType: "damage",
    timingType: "interval",
    intervalTicks: 3,
    triggerCount: 1,
    directSpellDmg: 10,
  });
  const fireball = createSpell({
    name: "Fireball",
    targetPolicy: "highest_health",
    effects: effectSequence(
      createEffect({
        name: "Impact",
        effectType: "damage",
        timingType: "instant",
        directSpellDmg: 20,
      }),
      burning,
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
            items: [createItem({ name: "Fire Staff", linkedSpells: [fireball] })],
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
  it("attributes immediate spell damage to its action, item, spell, and effect", () => {
    const log = createLoggedBattle().resolve().log;
    const cast = log.find((entry) => entry.type === "spell-cast");
    const damage = log.find((entry) => entry.type === "damage");

    expect(cast).toMatchObject({
      actionId: expect.any(String),
      origin: {
        kind: "spell-effect",
        item: { name: "Fire Staff", position: 1 },
        spell: { name: "Fireball", position: 1 },
      },
    });
    expect(damage).toMatchObject({
      actionId: cast && (cast as { actionId?: string }).actionId,
      origin: {
        kind: "spell-effect",
        effect: { name: "Impact", position: 1 },
      },
    });
  });

  it("keeps interval effect attribution without grouping it into the original action", () => {
    const log = createLoggedBattle().resolve().log;
    const delayedDamage = log.find(
      (entry) => entry.type === "damage" && entry.origin?.effect?.name === "Burning",
    );

    expect(delayedDamage).toMatchObject({
      actionId: undefined,
      origin: {
        kind: "spell-effect",
        item: { name: "Fire Staff", position: 1 },
        spell: { name: "Fireball", position: 1 },
        effect: { name: "Burning", position: 2 },
      },
    });
  });

  it("produces structured chronological log entries and ends with a battle outcome", () => {
    const result = createLoggedBattle().resolve();
    expect(Array.isArray(result.log)).toBe(true);
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log.some((entry) => entry.type === "attack")).toBe(true);
    expect(result.log.some((entry) => entry.type === "spell-cast")).toBe(true);
    expect(result.log.some((entry) => entry.type === "death")).toBe(true);
    expect(result.log.at(-1)?.type).toBe("battle-end");

    const ticks = result.log.map((entry) => entry.tick);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
  });

  it("is deterministic for identical inputs and seed", () => {
    const run1 = createLoggedBattle().resolve().log;
    const run2 = createLoggedBattle().resolve().log;
    expect(run1).toEqual(run2);
  });
});
