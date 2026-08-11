import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { reconcileManaForCapacityChange } from "./state";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";

function activationEffects(name: string) {
  return effectSequence(
    createEffect({
      name,
      effectType: "damage",
      timingType: "instant",
      directSpellDmg: 0,
    }),
  );
}

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
  );
}

describe("mana system", () => {
  it("caps regeneration at effective mana capacity", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("Warrior", { stats: createStats({ mana: 20, manaRegen: 100 }) })],
        }),
        createScenario("B", { tank: [createUnit("Dummy")] }),
      ]),
    );

    engine.resolveNextBatch();

    const warrior = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(warrior.mana).toBe(20);
  });

  it("regenerates mana once for each surviving ready actor before affordability", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("Caster", {
              stats: createStats({ mana: 100, manaRegen: 5, speed: 100 }),
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Expensive Focus",
                  activationManaCost: 90,
                  effects: activationEffects("Focus"),
                }),
              ],
            }),
          ],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 1_000, speed: 1 }) })],
        }),
      ]),
    );

    engine.resolveNextBatch();
    engine.resolveNextBatch();

    const caster = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(caster.mana).toBe(15);
    expect(caster.actedCount).toBe(2);
  });

  it("preserves mana deficit when capacity effects apply and expire", () => {
    const engine = makeManaEngine();
    const state = engine.getState();
    const warrior = Object.values(state.scenarios[0].rows).flat()[0]!;
    warrior.mana = 70;

    reconcileManaForCapacityChange(warrior, 100, 150);
    expect(warrior.mana).toBe(120);

    reconcileManaForCapacityChange(warrior, 150, 100);
    expect(warrior.mana).toBe(70);
  });

  it("starts living units full and does not regenerate past capacity", () => {
    const engine = makeManaEngine();
    engine.resolveNextBatch();
    const warrior = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(warrior.mana).toBe(100);

    const capped = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("High Regen", { stats: createStats({ manaRegen: 100, speed: 1 }) })],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 100, speed: 1 }) })],
        }),
      ]),
    );
    capped.resolveNextBatch();
    expect(Object.values(capped.getState().scenarios[0].rows).flat()[0]?.mana).toBe(100);
  });

  it("does not regenerate mana for dead units", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("Dead", { stats: createStats({ health: 0, manaRegen: 5 }) })],
        }),
        createScenario("B", { tank: [createUnit("Dummy")] }),
      ]),
    );
    engine.resolveNextBatch();
    const dead = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(dead.mana).toBe(100);
  });

  it("deducts mana and health per affordable item in action order", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [
            createUnit("Warrior", {
              stats: createStats({ health: 80, mana: 50, speed: 100, manaRegen: 0 }),
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Blood Hex",
                  activationManaCost: 20,
                  activationHealthCost: 15,
                  effects: activationEffects("Blood Hex Strike"),
                }),
                createItem({
                  name: "Ice Focus",
                  activationManaCost: 10,
                  activationHealthCost: 0,
                  effects: activationEffects("Ice Focus Strike"),
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

    engine.resolveNextBatch();
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
              stats: createStats({ mana: 30, speed: 100, manaRegen: 0 }),
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Fireball",
                  activationManaCost: 25,
                  effects: activationEffects("Fireball"),
                }),
                createItem({
                  name: "Ice Shard",
                  activationManaCost: 10,
                  effects: activationEffects("Ice Shard"),
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

    engine.resolveNextBatch();
    const activationLogs = engine
      .getState()
      .log.filter((entry) => entry.type === "item-activation");
    expect(activationLogs).toHaveLength(1);
    expect(activationLogs[0]?.item).toBe("Fireball");
    expect(Object.values(engine.getState().scenarios[0].rows).flat()[0]?.mana).toBe(5);
  });

  it("does not charge an effect-bearing item when unit targeting finds no targets", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [
            createUnit("Warrior", {
              stats: createStats({ health: 100, mana: 30, speed: 100, manaRegen: 0 }),
              startingActionBar: 100,
              items: [
                createItem({
                  name: "Sniper Bow",
                  activationManaCost: 25,
                  activationHealthCost: 35,
                  effects: activationEffects("Aimed Shot"),
                }),
              ],
              targetScope: "allies",
            }),
          ],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 200, speed: 1 }) })],
        }),
      ]),
    );

    engine.resolveNextBatch();

    const after = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(after.mana).toBe(30);
    expect(after.currentHealth).toBe(100);
    const activationLogs = engine
      .getState()
      .log.filter((entry) => entry.type === "item-activation");
    expect(activationLogs).toHaveLength(0);
  });
});
