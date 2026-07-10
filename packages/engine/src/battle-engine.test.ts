import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

describe("BattleEngine", () => {
  it("should create an instance", () => {
    const engine = new BattleEngine();
    expect(engine).toBeInstanceOf(BattleEngine);
  });

  it("should return a BattleResult from resolve()", () => {
    const engine = new BattleEngine();
    const result = engine.resolve();

    expect(result).toHaveProperty("winnerId");
    expect(result).toHaveProperty("log");
    expect(Array.isArray(result.log)).toBe(true);
  });

  describe("orchestration", () => {
    it("tick() advances the tick counter", () => {
      const engine = new BattleEngine(undefined, { resolveActionsOnTick: false });

      const state = engine.tick(5);

      expect(state.tick).toBe(5);
    });

    it("tick() stops advancing after battle finishes", () => {
      const engine = new BattleEngine(
        createBattleInput([
          createScenario("A"),
          createScenario("B", {
            tank: [createUnit("Survivor", { stats: createStats({ health: 10 }) })],
          }),
        ]),
      );

      const state = engine.tick(100);

      expect(state.status).toBe("finished");
      expect(state.tick).toBe(0);
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
      expect(result.finalState.tick).toBe(result.ticksElapsed);
    });

    it("getState() returns a snapshot that does not mutate engine internals", () => {
      const engine = new BattleEngine();
      const snapshot = engine.getState();
      snapshot.tick = 99;
      snapshot.scenarios[0].rows.tank[0]!.currentHealth = 1;

      const nextSnapshot = engine.getState();

      expect(nextSnapshot.tick).toBe(0);
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
