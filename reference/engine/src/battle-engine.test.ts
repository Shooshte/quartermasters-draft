import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { allUnits } from "./state";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";
import type { BattleLogEntry } from "./types";

function pairedInput(health: number, damage: number) {
  return createBattleInput([
    createScenario("A", {
      tank: [createUnit("A", { stats: createStats({ health, meleeDmg: damage, speed: 100 }) })],
    }),
    createScenario("B", {
      tank: [createUnit("B", { stats: createStats({ health, meleeDmg: damage, speed: 100 }) })],
    }),
  ]);
}

function fatigueDamage(log: BattleLogEntry[]): number {
  return (
    log.filter((entry) => entry.type === "fatigue").reduce((sum, entry) => sum + entry.damage, 0) /
    2
  );
}

describe("BattleEngine", () => {
  it("should create an instance", () => {
    const engine = new BattleEngine();
    expect(engine).toBeInstanceOf(BattleEngine);
  });

  it("should return a BattleResult from resolve()", () => {
    const engine = new BattleEngine();
    const result = engine.resolve();

    expect(result).toHaveProperty("winnerId");
    expect(result).toHaveProperty("actionsResolved");
    expect(result).toHaveProperty("log");
    expect(Array.isArray(result.log)).toBe(true);
  });

  describe("orchestration", () => {
    it("resolves every unit ready at the same moment", () => {
      const engine = new BattleEngine(pairedInput(10, 10));
      const state = engine.resolveNextBatch();
      expect(state.batchCount).toBe(1);
      expect(state.actionCount).toBe(2);
      expect(allUnits(state).map((unit) => unit.actedCount)).toEqual([1, 1]);
      expect(allUnits(state).map((unit) => unit.currentHealth)).toEqual([0, 0]);
      expect(state.winnerId).toBeNull();
    });

    it("starts fatigue after the action threshold", () => {
      const engine = new BattleEngine(pairedInput(100, 0), {
        fatigueActionThreshold: 2,
        fatigueDamageStart: 1,
      });
      expect(fatigueDamage(engine.resolveNextBatch().log)).toBe(0);
      const next = engine.resolveNextBatch();
      expect(next.actionCount).toBe(4);
      expect(fatigueDamage(next.log)).toBe(3);
    });

    it("uses shields for fatigue damage", () => {
      const ward = createItem({
        name: "Ward",
        effects: effectSequence(
          createEffect({
            name: "Ward",
            effectType: "buff",
            timingType: "instant",
            shield: 5,
            lastsForActions: 3,
          }),
        ),
      });
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            tank: [
              createUnit("A", {
                items: [ward],
                targetScope: "self",
                stats: createStats({ health: 100, meleeDmg: 0, speed: 100 }),
              }),
            ],
          }),
          createScenario("B", {
            tank: [
              createUnit("B", {
                items: [ward],
                targetScope: "self",
                stats: createStats({ health: 100, meleeDmg: 0, speed: 100 }),
              }),
            ],
          }),
        ]),
        { fatigueActionThreshold: 0, fatigueDamageStart: 1 },
      );
      const next = engine.resolveNextBatch();

      expect(allUnits(next).map((unit) => unit.currentHealth)).toEqual([100, 100]);
      expect(allUnits(next).map((unit) => unit.shieldLayers)).toEqual([
        [expect.objectContaining({ remaining: 2 })],
        [expect.objectContaining({ remaining: 2 })],
      ]);
    });

    it("logs a shielded unit dead and prevents its action when bypass damage is lethal", () => {
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            support: [
              createUnit("Caster", {
                stats: createStats({ spellDmg: 0, speed: 100 }),
                items: [
                  createItem({
                    name: "Piercing Ward",
                    effects: effectSequence(
                      createEffect({
                        name: "Ward",
                        effectType: "buff",
                        timingType: "instant",
                        shield: 25,
                        lastsForActions: 3,
                      }),
                      createEffect({
                        name: "Piercing Burn",
                        effectType: "damage",
                        timingType: "interval",
                        directSpellDmg: 100,
                        bypassesShield: true,
                        triggerEveryActions: 1,
                        triggerCount: 1,
                      }),
                    ),
                  }),
                ],
              }),
            ],
          }),
          createScenario("B", {
            support: [
              createUnit("Victim", {
                stats: createStats({ health: 100, rangedDmg: 50, speed: 50 }),
              }),
            ],
          }),
        ]),
      );

      engine.resolveNextBatch();
      const state = engine.resolveNextBatch();
      const victim = allUnits(state).find((unit) => unit.name === "Victim")!;

      expect(victim.currentHealth).toBe(0);
      expect(victim.shieldLayers).toEqual([expect.objectContaining({ remaining: 25 })]);
      expect(victim.actedCount).toBe(0);
      expect(
        state.log.some((entry) => entry.type === "death" && entry.unitId === victim.instanceId),
      ).toBe(true);
    });

    it("uses 500 resolved actions as the default fatigue threshold", () => {
      const engine = new BattleEngine(pairedInput(10_000, 0));
      for (let batch = 0; batch < 250; batch += 1) engine.resolveNextBatch();

      const atThreshold = engine.getState();
      expect(atThreshold.actionCount).toBe(500);
      expect(fatigueDamage(atThreshold.log)).toBe(0);

      const afterThreshold = engine.resolveNextBatch();
      expect(afterThreshold.actionCount).toBe(502);
      expect(fatigueDamage(afterThreshold.log)).toBe(3);
    });

    it("does not count a ready unit killed by a due pre-action effect", () => {
      const burn = createItem({
        name: "Burn",
        effects: effectSequence(
          createEffect({
            name: "Burning",
            effectType: "damage",
            timingType: "interval",
            triggerEveryActions: 1,
            triggerCount: 1,
            directSpellDmg: 100,
          }),
        ),
      });
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            support: [
              createUnit("Caster", {
                stats: createStats({ spellDmg: 0, speed: 100 }),
                items: [burn],
              }),
            ],
          }),
          createScenario("B", {
            support: [
              createUnit("Victim", {
                stats: createStats({ health: 100, rangedDmg: 50, speed: 50 }),
              }),
            ],
          }),
        ]),
      );

      engine.resolveNextBatch();
      const state = engine.resolveNextBatch();
      const victim = allUnits(state).find((unit) => unit.name === "Victim")!;

      expect(victim.currentHealth).toBe(0);
      expect(victim.actedCount).toBe(0);
      expect(state.actionCount).toBe(2);
      expect(
        state.log.some(
          (entry) => entry.type === "attack" && entry.attackerId === victim.instanceId,
        ),
      ).toBe(false);
    });

    it("does not decrement a modifier added during its application batch", () => {
      const focus = createItem({
        name: "Focus",
        effects: effectSequence(
          createEffect({
            name: "Focused",
            effectType: "buff",
            timingType: "instant",
            speed: 10,
            lastsForActions: 2,
          }),
        ),
      });
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            support: [
              createUnit("Caster", {
                stats: createStats({ speed: 100 }),
                items: [focus],
                targetScope: "self",
              }),
            ],
          }),
          createScenario("B", {
            tank: [createUnit("Dummy", { stats: createStats({ health: 1_000, speed: 1 }) })],
          }),
        ]),
      );

      const state = engine.resolveNextBatch();
      const focused = allUnits(state)
        .find((unit) => unit.name === "Caster")!
        .activeEffects.find((effect) => effect.name === "Focused");

      expect(focused?.actionsRemaining).toBe(2);
    });

    it("allocates distinct effect IDs from one shared deterministic stream", () => {
      const focus = createItem({
        name: "Focus",
        effects: effectSequence(
          createEffect({
            name: "Focused",
            effectType: "buff",
            timingType: "instant",
            dodge: 5,
            lastsForActions: 2,
          }),
        ),
      });
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            support: [
              createUnit("First", {
                stats: createStats({ speed: 100 }),
                items: [focus],
                targetScope: "self",
              }),
              createUnit("Second", {
                stats: createStats({ speed: 100 }),
                items: [focus],
                targetScope: "self",
              }),
            ],
          }),
          createScenario("B", {
            tank: [createUnit("Dummy", { stats: createStats({ health: 1_000, speed: 1 }) })],
          }),
        ]),
      );

      const effectIds = allUnits(engine.resolveNextBatch())
        .filter((unit) => unit.scenarioId === "A")
        .flatMap((unit) => unit.activeEffects.map((effect) => effect.id));

      expect(effectIds).toEqual(["active-effect-1", "active-effect-2"]);
    });

    it("resolveNextBatch() does not advance after battle finishes", () => {
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A"),
          createScenario("B", {
            tank: [createUnit("Survivor", { stats: createStats({ health: 10 }) })],
          }),
        ]),
      );

      const state = engine.resolveNextBatch();

      expect(state.status).toBe("finished");
      expect(state.batchCount).toBe(0);
      expect(state.actionCount).toBe(0);
    });

    it("resolve() produces a complete result with winner, log, and final state", () => {
      const result = new BattleEngine(
        createBattleInput([
          createScenario("A", {
            tank: [
              createUnit("Striker", {
                stats: createStats({ health: 100, meleeDmg: 100, speed: 100 }),
              }),
            ],
          }),
          createScenario("B", {
            tank: [
              createUnit("Target", {
                stats: createStats({ health: 10, meleeDmg: 0, speed: 1 }),
              }),
            ],
          }),
        ]),
      ).resolve();

      expect(result.winnerId).toBe("A");
      expect(result.log.length).toBeGreaterThan(0);
      expect(result.finalState.status).toBe("finished");
      expect(result.finalState.actionCount).toBe(result.actionsResolved);
    });

    it("getState() returns a snapshot that does not mutate engine internals", () => {
      const engine = new BattleEngine();
      const snapshot = engine.getState();
      snapshot.actionCount = 99;
      snapshot.scenarios[0].rows.tank[0]!.currentHealth = 1;

      const nextSnapshot = engine.getState();

      expect(nextSnapshot.actionCount).toBe(0);
      expect(nextSnapshot.scenarios[0].rows.tank[0]?.currentHealth).toBe(100);
    });

    it("battle is deterministic: identical inputs produce identical results", () => {
      const input = createBattleInput([
        createScenario("A", {
          tank: [createUnit("A", { stats: createStats({ health: 100, meleeDmg: 20, speed: 20 }) })],
        }),
        createScenario("B", {
          tank: [createUnit("B", { stats: createStats({ health: 100, meleeDmg: 20, speed: 20 }) })],
        }),
      ]);

      expect(new BattleEngine(input).resolve()).toEqual(new BattleEngine(input).resolve());
    });
  });
});
