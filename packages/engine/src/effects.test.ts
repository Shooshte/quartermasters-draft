import { describe, expect, it } from "vitest";
import { initializeBattleState } from "./state";
import { applySpell, processOngoingEffects } from "./effects";
import { createBattleInput, createEffect, createScenario, createSpell, createStats, createUnit, effectSequence, statBuff } from "./test-helpers";

function createEffectState() {
  return initializeBattleState(
    createBattleInput([
      createScenario("alpha", {
        ranged: [createUnit("mage", { stats: createStats({ health: 200, meleeDmg: 10, rangedDmg: 15, spellDmg: 40, speed: 5, dodge: 10, criticalChance: 5, manaRegen: 3 }) })],
        support: [createUnit("cleric", { stats: createStats({ health: 150, meleeDmg: 5, rangedDmg: 5, spellDmg: 20, speed: 3, dodge: 8, criticalChance: 2, manaRegen: 5 }) })],
      }),
      createScenario("bravo", {
        tank: [createUnit("warrior", { stats: createStats({ health: 300, meleeDmg: 30, rangedDmg: 10, spellDmg: 5, speed: 4, dodge: 5, criticalChance: 8, manaRegen: 1 }) })],
      }),
    ]),
  );
}

describe("effects", () => {
  it("applies instant direct damage and healing and clamps healing to max health", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applySpell(state, mage, createSpell({
      name: "Blast",
      targetPolicy: "highest_health",
      effects: effectSequence(createEffect({ name: "Arcane Damage", effectType: "damage", timingType: "instant", directSpellDmg: 50 })),
    }));
    expect(warrior.currentHealth).toBe(250);

    mage.currentHealth = 190;
    applySpell(state, cleric, createSpell({
      name: "Heal",
      targetPolicy: "highest_health",
      effects: effectSequence(createEffect({ name: "Mend", effectType: "healing", timingType: "instant", directHealing: 30 })),
    }));
    expect(mage.currentHealth).toBe(200);
  });

  it("processes interval damage triggers and expires buff or debuff modifiers", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applySpell(state, mage, createSpell({
      name: "Burn",
      targetPolicy: "highest_health",
      effects: effectSequence(createEffect({
        name: "Burning",
        effectType: "damage",
        timingType: "interval",
        directSpellDmg: 20,
        intervalMs: 1000,
        triggerCount: 3,
      })),
    }));
    processOngoingEffects(state, 3000);
    expect(warrior.currentHealth).toBe(240);

    applySpell(state, cleric, createSpell({
      name: "Haste",
      targetPolicy: "highest_health",
      effects: effectSequence(statBuff("speed", 3, 2000)),
    }));
    expect(mage.activeEffects).toHaveLength(1);
    processOngoingEffects(state, 2000);
    expect(mage.activeEffects).toHaveLength(0);
  });

  it("supports buff and debuff stat modifiers across supported stats and stops dead-target sequences", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;
    warrior.currentHealth = 40;

    const spell = createSpell({
      name: "Combo",
      targetPolicy: "highest_health",
      effects: effectSequence(
        createEffect({ name: "One", effectType: "damage", timingType: "instant", directSpellDmg: 30 }),
        createEffect({ name: "Two", effectType: "damage", timingType: "instant", directSpellDmg: 25 }),
        createEffect({ name: "Three", effectType: "damage", timingType: "instant", directSpellDmg: 20 }),
      ),
    });

    const result = applySpell(state, mage, spell);
    expect(result.appliedEffectNames).toEqual(["One", "Two"]);
    expect(warrior.currentHealth).toBe(0);
  });

  it("applies crit and dodge modifiers to instant and interval damage effects", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("alpha", {
          ranged: [createUnit("mage", { stats: createStats({ health: 200, spellDmg: 40, criticalChance: 50 }) })],
        }),
        createScenario("bravo", {
          tank: [createUnit("warrior", { stats: createStats({ health: 300, dodge: 20 }) })],
        }),
      ]),
    );
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applySpell(state, mage, createSpell({
      name: "Blast",
      targetPolicy: "highest_health",
      effects: effectSequence(createEffect({ name: "Arcane Damage", effectType: "damage", timingType: "instant", directSpellDmg: 40 })),
    }));
    expect(warrior.currentHealth).toBe(252);

    applySpell(state, mage, createSpell({
      name: "Burn",
      targetPolicy: "highest_health",
      effects: effectSequence(createEffect({
        name: "Burning",
        effectType: "damage",
        timingType: "interval",
        directSpellDmg: 20,
        intervalMs: 1,
        triggerCount: 2,
      })),
    }));
    processOngoingEffects(state, 2);
    expect(warrior.currentHealth).toBe(204);
  });
});
