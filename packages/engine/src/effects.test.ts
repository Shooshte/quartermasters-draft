import { describe, expect, it } from "vitest";
import { applyItemEffects, processOngoingEffects } from "./effects";
import { getUnitEffectiveStats } from "./math";
import { initializeBattleState } from "./state";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
  statBuff,
} from "./test-helpers";

function createEffectState() {
  return initializeBattleState(
    createBattleInput([
      createScenario("alpha", {
        ranged: [
          createUnit("mage", {
            stats: createStats({
              health: 200,
              meleeDmg: 10,
              rangedDmg: 15,
              spellDmg: 40,
              speed: 5,
              dodge: 10,
              criticalChance: 5,
              manaRegen: 3,
            }),
          }),
        ],
        support: [
          createUnit("cleric", {
            targetScope: "allies",
            stats: createStats({
              health: 150,
              meleeDmg: 5,
              rangedDmg: 5,
              spellDmg: 20,
              speed: 3,
              dodge: 8,
              criticalChance: 2,
              manaRegen: 5,
            }),
          }),
        ],
      }),
      createScenario("bravo", {
        tank: [
          createUnit("warrior", {
            stats: createStats({
              health: 300,
              meleeDmg: 30,
              rangedDmg: 10,
              spellDmg: 5,
              speed: 4,
              dodge: 5,
              criticalChance: 8,
              manaRegen: 1,
            }),
          }),
        ],
      }),
    ]),
  );
}

describe("effects", () => {
  it("records each normalized stat consequence when a modifier applies and expires", () => {
    const state = createEffectState();
    const cleric = state.scenarios[0].rows.support[0]!;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Withering Bell",
        effects: effectSequence(
          createEffect({
            name: "Withering",
            effectType: "debuff",
            timingType: "instant",
            meleeDmg: 10,
            speed: -3,
            durationTicks: 2,
          }),
        ),
      }),
    );

    expect(
      state.log
        .filter((entry) => entry.type === "effect-apply")
        .map(({ stat, value, expiresAtTick }) => ({ stat, value, expiresAtTick })),
    ).toEqual([
      { stat: "meleeDmg", value: -10, expiresAtTick: 2 },
      { stat: "speed", value: -3, expiresAtTick: 2 },
    ]);

    processOngoingEffects(state, 2);

    expect(
      state.log
        .filter((entry) => entry.type === "effect-expire")
        .map(({ stat, value, expiresAtTick }) => ({ stat, value, expiresAtTick })),
    ).toEqual([
      { stat: "meleeDmg", value: -10, expiresAtTick: 2 },
      { stat: "speed", value: -3, expiresAtTick: 2 },
    ]);
  });

  it("preserves mana deficit when a capacity buff applies and expires", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    mage.mana = 70;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Arcane Well",
        effects: effectSequence(
          createEffect({
            name: "Expanded Mind",
            effectType: "buff",
            timingType: "instant",
            mana: 50,
            durationTicks: 2,
          }),
        ),
      }),
    );

    expect(mage.mana).toBe(120);
    processOngoingEffects(state, 2);
    expect(mage.mana).toBe(70);
  });

  it("preserves spent mana when a negative capacity modifier applies and expires", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    mage.mana = 70;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Mana Seal",
        effects: effectSequence(
          createEffect({
            name: "Restricted Mind",
            effectType: "buff",
            timingType: "instant",
            mana: -50,
            durationTicks: 2,
          }),
        ),
      }),
    );

    expect(getUnitEffectiveStats(mage).mana).toBe(50);
    expect(mage.mana).toBe(20);
    processOngoingEffects(state, 2);
    expect(getUnitEffectiveStats(mage).mana).toBe(100);
    expect(mage.mana).toBe(70);
  });

  it("floors capacity at zero and reconciles simultaneous expirations once", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    mage.mana = 10;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Unstable Reservoir",
        effects: effectSequence(
          createEffect({
            name: "Expanded Mind",
            effectType: "buff",
            timingType: "instant",
            mana: 50,
            durationTicks: 2,
          }),
          createEffect({
            name: "Mana Collapse",
            effectType: "buff",
            timingType: "instant",
            mana: -120,
            durationTicks: 2,
          }),
        ),
      }),
    );

    expect(getUnitEffectiveStats(mage).mana).toBe(30);
    expect(mage.mana).toBe(0);
    processOngoingEffects(state, 2);
    expect(getUnitEffectiveStats(mage).mana).toBe(100);
    expect(mage.mana).toBe(70);
  });

  it("applies instant direct damage and healing and clamps healing to max health", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Blast",
        effects: effectSequence(
          createEffect({
            name: "Arcane Damage",
            effectType: "damage",
            timingType: "instant",
            directSpellDmg: 50,
          }),
        ),
      }),
    );
    expect(warrior.currentHealth).toBe(250);

    mage.currentHealth = 190;
    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Heal",
        effects: effectSequence(
          createEffect({
            name: "Mend",
            effectType: "healing",
            timingType: "instant",
            directHealing: 30,
          }),
        ),
      }),
    );
    expect(mage.currentHealth).toBe(200);
  });

  it("processes interval damage triggers and expires buff or debuff modifiers", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const cleric = state.scenarios[0].rows.support[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Burn",
        effects: effectSequence(
          createEffect({
            name: "Burning",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 20,
            intervalTicks: 1000,
            triggerCount: 3,
          }),
        ),
      }),
    );
    processOngoingEffects(state, 3000);
    // interval 20 dmg * 3 triggers, crit=5%, dodge=5% => round(20 * 1.05 * 0.95) = 20 per trigger, so 300 - 60 = 240.
    expect(warrior.currentHealth).toBe(240);

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Haste",
        effects: effectSequence(statBuff("speed", 3, 2000)),
      }),
    );
    expect(mage.activeEffects).toHaveLength(1);
    processOngoingEffects(state, 2000);
    expect(mage.activeEffects).toHaveLength(0);
  });

  it("resolves each direct interval damage source as a separate hit in field order", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Triad",
        effects: effectSequence(
          createEffect({
            name: "Triad",
            effectType: "damage",
            timingType: "interval",
            directMeleeDmg: 10,
            directRangedDmg: 20,
            directSpellDmg: 30,
            intervalTicks: 1,
            triggerCount: 1,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(warrior.currentHealth).toBe(240);
    const damages = state.log
      .filter((entry) => entry.type === "damage")
      .filter((entry) => entry.origin?.effect?.name === "Triad")
      .map((entry) => entry.damage);
    expect(damages).toEqual([10, 20, 30]);
  });

  it("queues melee-only interval damage without requiring a spell value", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Melee Pulse",
        effects: effectSequence(
          createEffect({
            name: "Melee Pulse",
            effectType: "damage",
            timingType: "interval",
            directMeleeDmg: 10,
            intervalTicks: 1,
            triggerCount: 1,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(warrior.currentHealth).toBe(290);
    expect(
      state.log
        .filter((entry) => entry.type === "damage")
        .filter((entry) => entry.origin?.effect?.name === "Melee Pulse")
        .map((entry) => entry.damage),
    ).toEqual([10]);
  });

  it("queues ranged-only interval damage without requiring other direct damage values", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Ranged Pulse",
        effects: effectSequence(
          createEffect({
            name: "Ranged Pulse",
            effectType: "damage",
            timingType: "interval",
            directRangedDmg: 15,
            intervalTicks: 1,
            triggerCount: 1,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(warrior.currentHealth).toBe(285);
    expect(
      state.log
        .filter((entry) => entry.type === "damage")
        .filter((entry) => entry.origin?.effect?.name === "Ranged Pulse")
        .map((entry) => entry.damage),
    ).toEqual([15]);
  });

  it("queues a healing interval as one healing entry even with direct damage fields", () => {
    const state = createEffectState();
    const cleric = state.scenarios[0].rows.support[0]!;
    const mage = state.scenarios[0].rows.ranged[0]!;
    mage.currentHealth = 100;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Restorative Triad",
        effects: effectSequence(
          createEffect({
            name: "Restorative Triad",
            effectType: "healing",
            timingType: "interval",
            directMeleeDmg: 10,
            directRangedDmg: 20,
            directSpellDmg: 30,
            intervalTicks: 1,
            triggerCount: 1,
          }),
        ),
      }),
    );

    expect(mage.activeEffects).toHaveLength(1);
    processOngoingEffects(state, 1);

    expect(mage.currentHealth).toBe(130);
    expect(
      state.log
        .filter((entry) => entry.type === "heal")
        .filter((entry) => entry.origin?.effect?.name === "Restorative Triad")
        .map((entry) => entry.amount),
    ).toEqual([30]);
  });

  it("does not queue a healing interval when it has no healing value", () => {
    const state = createEffectState();
    const cleric = state.scenarios[0].rows.support[0]!;

    applyItemEffects(
      state,
      cleric,
      createItem({
        name: "Empty Restoration",
        effects: effectSequence(
          createEffect({
            name: "Empty Restoration",
            effectType: "healing",
            timingType: "interval",
            intervalTicks: 1,
            triggerCount: 1,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(
      state.scenarios
        .flatMap((scenario) => Object.values(scenario.rows).flat())
        .flatMap((unit) => unit.activeEffects),
    ).toHaveLength(0);
    expect(state.log.filter((entry) => entry.type === "heal")).toHaveLength(0);
  });

  it("waits intervalTicks before the first trigger and between subsequent triggers", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Delayed Burn",
        effects: effectSequence(
          createEffect({
            name: "Delayed Burning",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 20,
            intervalTicks: 2,
            triggerCount: 2,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);
    expect(warrior.currentHealth).toBe(300);
    processOngoingEffects(state, 1);
    expect(warrior.currentHealth).toBe(280);
    processOngoingEffects(state, 1);
    expect(warrior.currentHealth).toBe(280);
    processOngoingEffects(state, 1);
    expect(warrior.currentHealth).toBe(260);
  });

  it("discards an interval effect when its own trigger kills the target", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;
    warrior.currentHealth = 40;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Lethal Burn",
        effects: effectSequence(
          createEffect({
            name: "Lethal Burning",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 50,
            intervalTicks: 1,
            triggerCount: 2,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(warrior.currentHealth).toBe(0);
    expect(warrior.activeEffects).toHaveLength(0);
  });

  it("expires interval effects cleanly if the source unit no longer exists", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Burn",
        effects: effectSequence(
          createEffect({
            name: "Burning",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 20,
            intervalTicks: 1,
            triggerCount: 2,
          }),
        ),
      }),
    );

    state.scenarios[0].rows.ranged = [];
    processOngoingEffects(state, 1);

    expect(warrior.activeEffects).toHaveLength(0);
    expect(
      state.log.some((entry) => entry.type === "effect-expire" && entry.effect === "Burning"),
    ).toBe(true);
  });

  it("stops an ordered effect sequence once every original target is dead", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;
    warrior.currentHealth = 40;

    const item = createItem({
      name: "Combo",
      effects: effectSequence(
        createEffect({
          name: "One",
          effectType: "damage",
          timingType: "instant",
          directSpellDmg: 50,
        }),
        createEffect({
          name: "Two",
          effectType: "healing",
          timingType: "instant",
          directHealing: 25,
        }),
        createEffect({
          name: "Three",
          effectType: "damage",
          timingType: "interval",
          directSpellDmg: 20,
          intervalTicks: 1,
          triggerCount: 1,
        }),
      ),
    });

    const result = applyItemEffects(state, mage, item);
    expect(result.appliedEffectNames).toEqual(["One"]);
    expect(warrior.currentHealth).toBe(0);
    expect(warrior.activeEffects).toHaveLength(0);
    expect(state.log.filter((entry) => entry.type === "heal")).toHaveLength(0);
    expect(
      state.log.filter((entry) => entry.type === "damage" && entry.origin?.effect?.name !== "One"),
    ).toHaveLength(0);
  });

  it("discards an interval effect when its target dies before the first trigger", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;
    warrior.currentHealth = 40;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Delayed Combo",
        effects: effectSequence(
          createEffect({
            name: "Delayed Burn",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 20,
            intervalTicks: 1,
            triggerCount: 1,
          }),
          createEffect({
            name: "Execution",
            effectType: "damage",
            timingType: "instant",
            directSpellDmg: 50,
          }),
        ),
      }),
    );

    processOngoingEffects(state, 1);

    expect(warrior.currentHealth).toBe(0);
    expect(warrior.activeEffects).toHaveLength(0);
    expect(
      state.log.filter(
        (entry) => entry.type === "damage" && entry.origin?.effect?.name === "Delayed Burn",
      ),
    ).toHaveLength(0);
  });

  it("applies crit and dodge modifiers to instant and interval damage effects", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("alpha", {
          ranged: [
            createUnit("mage", {
              stats: createStats({ health: 200, spellDmg: 40, criticalChance: 50 }),
            }),
          ],
        }),
        createScenario("bravo", {
          tank: [
            createUnit("warrior", {
              stats: createStats({ health: 300, dodge: 20 }),
            }),
          ],
        }),
      ]),
    );
    const mage = state.scenarios[0].rows.ranged[0]!;
    const warrior = state.scenarios[1].rows.tank[0]!;

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Blast",
        effects: effectSequence(
          createEffect({
            name: "Arcane Damage",
            effectType: "damage",
            timingType: "instant",
            directSpellDmg: 40,
          }),
        ),
      }),
    );
    // directSpellDmg=40, crit=50%, dodge=20% => round(40 * 1.5 * 0.8) = 48, so 300 - 48 = 252.
    expect(warrior.currentHealth).toBe(252);

    applyItemEffects(
      state,
      mage,
      createItem({
        name: "Burn",
        effects: effectSequence(
          createEffect({
            name: "Burning",
            effectType: "damage",
            timingType: "interval",
            directSpellDmg: 20,
            intervalTicks: 1,
            triggerCount: 2,
          }),
        ),
      }),
    );
    processOngoingEffects(state, 2);
    // interval 20 dmg * 2 triggers with same modifiers => 24 * 2 = 48, then 252 - 48 = 204.
    expect(warrior.currentHealth).toBe(204);
  });

  it("attributes direct item-effect application to the source item and effect", () => {
    const state = createEffectState();
    const mage = state.scenarios[0].rows.ranged[0]!;
    const item = createItem({
      name: "Runed Wand",
      effects: effectSequence(
        createEffect({
          name: "Spark",
          effectType: "damage",
          timingType: "instant",
          directSpellDmg: 5,
        }),
      ),
    });

    applyItemEffects(state, mage, item);

    expect(state.log.find((entry) => entry.type === "item-activation")).toMatchObject({
      origin: {
        kind: "item-effect",
        item: { name: "Runed Wand", position: 1 },
      },
    });
    expect(
      state.log.find((entry) => entry.type === "damage" && entry.origin?.effect?.name === "Spark"),
    ).toMatchObject({
      origin: {
        kind: "item-effect",
        item: { name: "Runed Wand", position: 1 },
        effect: { name: "Spark", position: 1 },
      },
    });
  });
});
