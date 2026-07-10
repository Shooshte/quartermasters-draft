import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import {
  createBattleInput,
  createItem,
  createScenario,
  createSpell,
  createStats,
  createUnit,
} from "./test-helpers";

function makeManaEngine() {
  return new BattleEngine(
    createBattleInput([
      createScenario("A", {
        melee: [
          createUnit("Warrior", {
            stats: createStats({
              health: 100,
              meleeDmg: 10,
              rangedDmg: 10,
              speed: 50,
              manaRegen: 5,
              spellDmg: 20,
            }),
          }),
        ],
      }),
      createScenario("B", {
        tank: [
          createUnit("Dummy", {
            stats: createStats({ health: 200, speed: 1 }),
          }),
        ],
      }),
    ]),
    { resolveActionsOnTick: false },
  );
}

describe("mana system", () => {
  it("regenerates mana each tick for living units with no cap", () => {
    const engine = makeManaEngine();
    engine.tick(4);
    let warrior = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(warrior.mana).toBe(20);

    const capped = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("High Regen", { stats: createStats({ manaRegen: 100, speed: 1 }) })],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 100, speed: 1 }) })],
        }),
      ]),
      { resolveActionsOnTick: false },
    );
    capped.tick(50);
    warrior = Object.values(capped.getState().scenarios[0].rows).flat()[0]!;
    expect(warrior.mana).toBe(5000);
  });

  it("does not regenerate mana for dead units", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("Dead", { stats: createStats({ health: 0, manaRegen: 5 }) })],
        }),
        createScenario("B", { tank: [createUnit("Dummy")] }),
      ]),
      { resolveActionsOnTick: false },
    );
    engine.tick(5);
    const dead = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(dead.mana).toBe(0);
  });

  it("deducts mana and health per affordable item in action order", () => {
    const fireball = createSpell({ name: "Fireball", targetPolicy: "highest_health" });
    const iceShard = createSpell({ name: "Ice Shard", targetPolicy: "highest_health" });
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [
            createUnit("Warrior", {
              stats: createStats({ health: 80, speed: 100, manaRegen: 0 }),
              startingMana: 50,
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Blood Hex",
                  activationManaCost: 20,
                  activationHealthCost: 15,
                  linkedSpells: [fireball],
                }),
                createItem({
                  name: "Ice Focus",
                  activationManaCost: 10,
                  activationHealthCost: 0,
                  linkedSpells: [iceShard],
                }),
              ],
            }),
          ],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 200, speed: 1 }) })],
        }),
      ]),
    );

    engine.tick(1);
    const after = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(after.mana).toBe(20);
    expect(after.currentHealth).toBe(65);
  });

  it("skips later items that become unaffordable after earlier deductions", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [
            createUnit("Warrior", {
              stats: createStats({ speed: 100, manaRegen: 0 }),
              startingMana: 30,
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Fireball",
                  activationManaCost: 25,
                  linkedSpells: [createSpell({ name: "Fireball", targetPolicy: "highest_health" })],
                }),
                createItem({
                  name: "Ice Shard",
                  activationManaCost: 10,
                  linkedSpells: [
                    createSpell({ name: "Ice Shard", targetPolicy: "highest_health" }),
                  ],
                }),
              ],
            }),
          ],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );

    engine.tick(1);
    const spellLogs = engine.getState().log.filter((entry) => entry.type === "spell-cast");
    expect(spellLogs).toHaveLength(1);
    expect(spellLogs[0]?.message).toContain("Fireball");
    expect(Object.values(engine.getState().scenarios[0].rows).flat()[0]?.mana).toBe(5);
  });
});
