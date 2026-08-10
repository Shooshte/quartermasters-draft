import { describe, expect, it } from "vitest";
import { commitPlannedActions } from "./action-operations";
import { planUnitAction, resolveUnitAction } from "./resolution";
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
  it("plans same-batch targeting from one common snapshot", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Archer One", { stats: createStats({ rangedDmg: 20 }) }),
            createUnit("Archer Two", { stats: createStats({ rangedDmg: 20 }) }),
          ],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Healthy", { stats: createStats({ health: 200 }) }),
            createUnit("Wounded", { stats: createStats({ health: 150 }) }),
          ],
        }),
      ]),
    );
    const [first, second] = state.scenarios[0].rows.ranged;
    let effectId = 0;
    const allocateEffectId = () => `planned-effect-${++effectId}`;

    const plans = [first!, second!].map((actor) =>
      planUnitAction(state, actor.instanceId, 3, () => 0.5, allocateEffectId),
    );

    expect(
      plans.map((plan) => plan.operations.find((operation) => operation.kind === "damage")),
    ).toEqual([
      { kind: "damage", targetId: "Bravo:tank:1", amount: 10 },
      { kind: "damage", targetId: "Bravo:tank:1", amount: 10 },
    ]);
    expect(plans.map((plan) => plan.actionId)).toEqual([
      "3:Alpha:ranged:1:1",
      "3:Alpha:ranged:2:1",
    ]);
    expect(state.scenarios[1].rows.tank.map((unit) => unit.currentHealth)).toEqual([200, 150]);

    commitPlannedActions(state, plans, 3);
    expect(state.scenarios[1].rows.tank.map((unit) => unit.currentHealth)).toEqual([180, 150]);
  });

  it("consumes one shared random stream across isolated plans", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Archer One", { targetPriority: "random" }),
            createUnit("Archer Two", { targetPriority: "random" }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Target One"), createUnit("Target Two")],
        }),
      ]),
    );
    const draws = [0.9, 0.1, 0.1, 0.9];
    const random = () => {
      const draw = draws.shift();
      if (draw === undefined) throw new Error("Planning consumed too many RNG draws.");
      return draw;
    };

    const plans = state.scenarios[0].rows.ranged.map((actor) =>
      planUnitAction(state, actor.instanceId, 3, random, () => "unused-effect-id"),
    );

    expect(
      plans.map(
        (plan) => plan.operations.find((operation) => operation.kind === "damage")?.targetId,
      ),
    ).toEqual(["Bravo:tank:2", "Bravo:tank:1"]);
    expect(draws).toEqual([]);
  });

  it("plans attacks against pre-batch stats when another action adds a modifier", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          tank: [createUnit("Guard", { stats: createStats({ health: 200, dodge: 0 }) })],
          support: [
            createUnit("Protector", {
              targetScope: "allies",
              items: [
                createItem({
                  name: "Ward",
                  effects: effectSequence(
                    createEffect({
                      name: "Defended",
                      effectType: "buff",
                      timingType: "instant",
                      dodge: 50,
                      lastsForActions: 2,
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Attacker", { stats: createStats({ meleeDmg: 20 }) })],
        }),
      ]),
    );
    const protector = state.scenarios[0].rows.support[0]!;
    const attacker = state.scenarios[1].rows.tank[0]!;
    let effectId = 0;
    const allocateEffectId = () => `planned-effect-${++effectId}`;

    const plans = [protector, attacker].map((actor) =>
      planUnitAction(state, actor.instanceId, 4, () => 0.5, allocateEffectId),
    );
    const attackDamage = plans[1]?.operations.find((operation) => operation.kind === "damage");
    const addedEffect = plans[0]?.operations.find((operation) => operation.kind === "add-effect");

    expect(attackDamage).toEqual({ kind: "damage", targetId: "Alpha:tank:1", amount: 20 });
    expect(addedEffect).toMatchObject({
      kind: "add-effect",
      effect: { id: "planned-effect-1", name: "Defended" },
    });
    commitPlannedActions(state, plans, 4);
    expect(state.scenarios[0].rows.tank[0]).toMatchObject({
      currentHealth: 180,
      activeEffects: [{ name: "Defended", statKey: "dodge", value: 50 }],
    });
  });

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

  it("uses the attacker's target priority for a basic attack", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          tank: [createUnit("Attacker", { targetPriority: "lowest_health" })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Healthy", { stats: createStats({ health: 200 }) }),
            createUnit("Wounded", { stats: createStats({ health: 50 }) }),
          ],
        }),
      ]),
    );

    resolveUnitAction(state, state.scenarios[0].rows.tank[0]!);

    expect(state.scenarios[1].rows.tank[0]!.currentHealth).toBe(200);
    expect(state.scenarios[1].rows.tank[1]!.currentHealth).toBe(40);
  });

  it("pays exactly once and retains original target IDs across ordered effects", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Warrior", {
              stats: createStats({ health: 100, mana: 50 }),
              targetPriority: "random",
              targetCount: 2,
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
          ranged: [createUnit("Dummy C", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );
    const warrior = state.scenarios[0].rows.ranged[0]!;

    const outcome = resolveUnitAction(state, warrior);
    const damageEntries = state.log.filter(
      (entry) => entry.type === "damage" && entry.origin?.kind === "item-effect",
    );

    expect(outcome).toMatchObject({
      usedBasicAttack: false,
      totalDamage: 40,
      activatedItemNames: ["Runed Blade"],
    });
    expect(warrior.mana).toBe(40);
    expect(warrior.currentHealth).toBe(85);
    expect(damageEntries.map((entry) => entry.origin?.effect?.name)).toEqual([
      "Burn",
      "Burn",
      "Weaken",
      "Weaken",
    ]);
    const burnTargetIds = damageEntries
      .filter((entry) => entry.origin?.effect?.name === "Burn")
      .map((entry) => (entry.type === "damage" ? entry.targetId : "unexpected"));
    const weakenTargetIds = damageEntries
      .filter((entry) => entry.origin?.effect?.name === "Weaken")
      .map((entry) => (entry.type === "damage" ? entry.targetId : "unexpected"));
    expect(burnTargetIds).toHaveLength(2);
    expect(weakenTargetIds).toEqual(burnTargetIds);
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
      { targetScope: "allies" },
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

  it("gives later effects only the surviving members of the original target group", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Warrior", {
              targetPriority: "lowest_health",
              targetCount: 2,
              items: [
                createItem({
                  name: "Finisher",
                  effects: effectSequence(
                    damageEffect("Alpha Blast", 200),
                    damageEffect("Beta Follow-up"),
                  ),
                }),
              ],
            }),
          ],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Dummy A", { stats: createStats({ health: 100 }) }),
            createUnit("Dummy B", { stats: createStats({ health: 250 }) }),
            createUnit("Unselected Dummy", { stats: createStats({ health: 300 }) }),
          ],
        }),
      ]),
    );
    const warrior = state.scenarios[0].rows.ranged[0]!;

    const outcome = resolveUnitAction(state, warrior);
    const damageEntries = state.log.filter(
      (entry) => entry.type === "damage" && entry.origin?.kind === "item-effect",
    );
    const targetIdsFor = (effectName: string) =>
      damageEntries
        .filter((entry) => entry.origin?.effect?.name === effectName)
        .map((entry) => (entry.type === "damage" ? entry.targetId : "unexpected"));
    const alphaTargetIds = targetIdsFor("Alpha Blast");
    const betaTargetIds = targetIdsFor("Beta Follow-up");

    expect(outcome.activatedItemNames).toEqual(["Finisher"]);
    expect(outcome.totalDamage).toBe(310);
    expect(alphaTargetIds).toHaveLength(2);
    expect(betaTargetIds).toEqual([state.scenarios[1].rows.tank[1]!.instanceId]);
    expect(alphaTargetIds).toContain(betaTargetIds[0]);
    expect(state.scenarios[1].rows.tank[2]!.currentHealth).toBe(300);
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
