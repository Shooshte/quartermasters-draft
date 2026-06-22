import { describe, expect, it } from "vitest";
import { resolveUnitAction } from "./resolution";
import { initializeBattleState } from "./state";
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

function makeStateWithWarrior(
  row: "tank" | "melee" | "ranged" | "support",
  items = [] as ReturnType<typeof createItem>[],
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
  it("falls back to a basic attack when no item spells are available", () => {
    const tankState = makeStateWithWarrior("tank");
    const tankWarrior = tankState.scenarios[0].rows.tank[0]!;
    const tankOutcome = resolveUnitAction(tankState, tankWarrior);

    expect(tankOutcome.usedBasicAttack).toBe(true);
    expect(tankOutcome.totalDamage).toBe(15);
  });

  it("uses ranged stat with row distance penalty for ranged-row attackers", () => {
    const rangedState = makeStateWithWarrior("ranged");
    const rangedWarrior = rangedState.scenarios[0].rows.ranged[0]!;
    const rangedOutcome = resolveUnitAction(rangedState, rangedWarrior);

    expect(rangedOutcome.usedBasicAttack).toBe(true);
    // rangedDmg=5, ranged->tank multiplier=0.5, no crit/dodge => round(5 * 0.5) = 3.
    expect(rangedOutcome.totalDamage).toBe(3);
  });

  it("applies crit and dodge modifiers multiplicatively to basic attack damage", () => {
    const critState = initializeBattleState(
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
    const critOutcome = resolveUnitAction(critState, critState.scenarios[0].rows.tank[0]!);

    // meleeDmg=20, tank->tank multiplier=1.0, crit=50%, dodge=20% => round(20 * 1.5 * 0.8) = 24.
    expect(critOutcome.totalDamage).toBe(24);
  });

  it("casts affordable item spells in priority order and skips unaffordable or stat-only items", () => {
    const state = makeStateWithWarrior("melee", [
      createItem({ name: "Steel Gauntlet" }),
      createItem({
        name: "Fire Sword",
        activationManaCost: 10,
        linkedSpells: [
          createSpell({
            name: "Flame Strike",
            targetPolicy: "highest_health",
            effects: effectSequence(
              createEffect({
                name: "Flame",
                effectType: "damage",
                timingType: "instant",
                directSpellDmg: 10,
              }),
            ),
          }),
        ],
      }),
      createItem({
        name: "Arcane Staff",
        activationManaCost: 999,
        linkedSpells: [createSpell({ name: "Arcane Blast", targetPolicy: "highest_health" })],
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 50;

    const outcome = resolveUnitAction(state, warrior);
    expect(outcome.usedBasicAttack).toBe(false);
    expect(outcome.castSpellNames).toEqual(["Flame Strike"]);
    expect(warrior.mana).toBe(40);
  });

  it("reports only the damage dealt during the current action", () => {
    const state = makeStateWithWarrior("melee", [
      createItem({
        name: "Fire Sword",
        linkedSpells: [
          createSpell({
            name: "Flame Strike",
            targetPolicy: "highest_health",
            effects: effectSequence(
              createEffect({
                name: "Flame",
                effectType: "damage",
                timingType: "instant",
                directSpellDmg: 10,
              }),
            ),
          }),
        ],
      }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    const dummy = state.scenarios[1].rows.tank[0]!;
    dummy.currentHealth = 150;

    const outcome = resolveUnitAction(state, warrior);
    expect(outcome.totalDamage).toBe(10);
    expect(dummy.currentHealth).toBe(140);
  });

  it("deducts health costs and blocks unaffordable items", () => {
    const aimedShot = createSpell({
      name: "Aimed Shot",
      targetPolicy: "highest_health",
      allowedRowTypes: ["ranged", "support"],
    });
    const flameStrike = createSpell({ name: "Flame Strike", targetPolicy: "highest_health" });
    const state = makeStateWithWarrior("melee", [
      createItem({ name: "Blood Blade", activationHealthCost: 20, linkedSpells: [flameStrike] }),
      createItem({ name: "Sniper Bow", activationManaCost: 10, linkedSpells: [aimedShot] }),
      createItem({ name: "Fire Sword", activationManaCost: 10, linkedSpells: [flameStrike] }),
    ]);
    const warrior = state.scenarios[0].rows.melee[0]!;
    warrior.mana = 10;

    const outcome = resolveUnitAction(state, warrior);
    expect(outcome.castSpellNames).toEqual(["Flame Strike", "Aimed Shot"]);
    expect(warrior.currentHealth).toBe(80);
    expect(warrior.mana).toBe(0);
  });
});
