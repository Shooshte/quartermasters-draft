import { describe, expect, it } from "vitest";
import { resolveUnitAction } from "./resolution";
import { initializeBattleState } from "./state";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";

function damageEffect(name: string, damage = 10) {
  return createEffect({
    name,
    effectType: "damage",
    timingType: "instant",
    directSpellDmg: damage,
  });
}

function makeStateWithWarrior(
  row: "tank" | "melee" | "ranged" | "support",
  items = [] as ReturnType<typeof createItem>[],
  unitOverrides: Partial<ReturnType<typeof createUnit>> = {},
) {
  return initializeBattleState(
    createBattleInput([
      createScenario("Alpha", {
        [row]: [
          createUnit("Warrior", {
            stats: createStats({
              health: 100,
              meleeDmg: 15,
              rangedDmg: 5,
              speed: 1,
              manaRegen: 2,
              spellDmg: 0,
            }),
            items,
            ...unitOverrides,
          }),
        ],
      }),
      createScenario("Bravo", {
        tank: [
          createUnit("Dummy", {
            stats: createStats({ health: 200, speed: 1 }),
          }),
        ],
      }),
    ]),
  );
}

describe("action resolution", () => {
  it("falls back to a basic attack when no effect-bearing items are available", () => {
    const state = makeStateWithWarrior("tank", [createItem({ name: "Steel Gauntlet" })]);
    const warrior = state.scenarios[0].rows.tank[0]!;

    expect(resolveUnitAction(state, warrior)).toEqual({
      usedBasicAttack: true,
      totalDamage: 15,
      activatedItemNames: [],
    });
    expect(state.log.some((entry) => entry.type === "item-activation")).toBe(false);
  });

  it("uses ranged damage with row distance for ranged-row basic attackers", () => {
    const state = makeStateWithWarrior("ranged");
    const outcome = resolveUnitAction(state, state.scenarios[0].rows.ranged[0]!);

    expect(outcome.usedBasicAttack).toBe(true);
    expect(outcome.totalDamage).toBe(3);
  });

  it("applies crit and dodge modifiers multiplicatively to basic attack damage", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          tank: [
            createUnit("Critter", { stats: createStats({ meleeDmg: 20, criticalChance: 50 }) }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Dodger", { stats: createStats({ health: 200, dodge: 20 }) })],
        }),
      ]),
    );

    expect(resolveUnitAction(state, state.scenarios[0].rows.tank[0]!).totalDamage).toBe(24);
  });

  it("pays exactly once and selects one target set for multiple ordered item effects", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          melee: [
            createUnit("Warrior", {
              stats: createStats({ health: 100, mana: 50 }),
              targetPolicy: "random",
              items: [
                createItem({
                  name: "Runed Blade",
                  activationManaCost: 10,
                  activationHealthCost: 15,
                  effects: effectSequence(damageEffect("Burn"), damageEffect("Weaken")),
                }),
              ],
            }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Dummy A", { stats: createStats({ health: 200 }) })],
          melee: [createUnit("Dummy B", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );
    const warrior = state.scenarios[0].rows.melee[0]!;

    const outcome = resolveUnitAction(state, warrior);
    const damageEntries = state.log.filter(
      (entry) => entry.type === "damage" && entry.origin?.kind === "item-effect",
    );

    expect(outcome).toMatchObject({
      usedBasicAttack: false,
      totalDamage: 20,
      activatedItemNames: ["Runed Blade"],
    });
    expect(warrior.mana).toBe(40);
    expect(warrior.currentHealth).toBe(85);
    expect(damageEntries.map((entry) => entry.origin?.effect?.name)).toEqual(["Burn", "Weaken"]);
    expect(
      new Set(
        damageEntries.map((entry) => (entry.type === "damage" ? entry.targetId : "unexpected")),
      ).size,
    ).toBe(1);
    expect(state.log.filter((entry) => entry.type === "item-activation")).toHaveLength(1);
  });

  it("activates affordable items in priority order and skips later unaffordable items", () => {
    const state = makeStateWithWarrior("melee", [
      createItem({ name: "Steel Gauntlet" }),
      createItem({
        name: "Fire Sword",
        activationManaCost: 30,
        effects: effectSequence(damageEffect("Flame Strike")),
      }),
      createItem({
        name: "Ice Dagger",
        activationManaCost: 25,
        effects: effectSequence(damageEffect("Frost Bite")),
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 50;

    const outcome = resolveUnitAction(state, warrior);

    expect(outcome.activatedItemNames).toEqual(["Fire Sword"]);
    expect(warrior.mana).toBe(20);
  });

  it("skips an item with no valid unit-selected targets without consuming costs", () => {
    const state = makeStateWithWarrior(
      "melee",
      [
        createItem({
          name: "Sniper Bow",
          activationManaCost: 10,
          activationHealthCost: 20,
          effects: effectSequence(damageEffect("Aimed Shot")),
        }),
      ],
      { allowedRowTypes: ["ranged"] },
    );
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 50;

    expect(resolveUnitAction(state, warrior)).toEqual({
      usedBasicAttack: true,
      totalDamage: 11,
      activatedItemNames: [],
    });
    expect(warrior.mana).toBe(50);
    expect(warrior.currentHealth).toBe(100);
    expect(state.log.some((entry) => entry.type === "item-activation")).toBe(false);
  });

  it("stops an ordered effect sequence after its final selected target dies", () => {
    const state = makeStateWithWarrior("melee", [
      createItem({
        name: "Finisher",
        activationManaCost: 10,
        effects: effectSequence(damageEffect("Alpha Blast", 200), damageEffect("Beta Follow-up")),
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 50;

    const outcome = resolveUnitAction(state, warrior);
    const effectNames = state.log
      .filter((entry) => entry.type === "damage" && entry.origin?.kind === "item-effect")
      .map((entry) => entry.origin?.effect?.name);

    expect(outcome.activatedItemNames).toEqual(["Finisher"]);
    expect(outcome.totalDamage).toBe(200);
    expect(warrior.mana).toBe(40);
    expect(effectNames).toEqual(["Alpha Blast"]);
  });

  it("reports only damage dealt during the current action", () => {
    const state = makeStateWithWarrior("melee", [
      createItem({
        name: "Fire Sword",
        effects: effectSequence(damageEffect("Flame Strike")),
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    state.scenarios[1].rows.tank[0]!.currentHealth = 150;

    expect(resolveUnitAction(state, warrior).totalDamage).toBe(10);
    expect(state.scenarios[1].rows.tank[0]!.currentHealth).toBe(140);
  });

  it("deducts health costs and blocks items that become unaffordable", () => {
    const effect = damageEffect("Strike");
    const state = makeStateWithWarrior("melee", [
      createItem({
        name: "Blood Blade",
        activationHealthCost: 20,
        effects: effectSequence(effect),
      }),
      createItem({
        name: "Fire Sword",
        activationManaCost: 10,
        effects: effectSequence(effect),
      }),
      createItem({
        name: "Ice Sword",
        activationManaCost: 10,
        effects: effectSequence(effect),
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 10;

    const outcome = resolveUnitAction(state, warrior);

    expect(outcome.activatedItemNames).toEqual(["Blood Blade", "Fire Sword"]);
    expect(warrior.currentHealth).toBe(80);
    expect(warrior.mana).toBe(0);
  });
});
