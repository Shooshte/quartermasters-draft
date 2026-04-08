import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

describe("win conditions", () => {
  it("resolves wins, draws, and immediate victories for empty opposing sides", () => {
    const winA = new BattleEngine(
      createBattleInput([
        createScenario("A", { tank: [createUnit("a-1", { stats: createStats({ health: 200, meleeDmg: 50, speed: 10 }) })] }),
        createScenario("B", { tank: [createUnit("b-1", { stats: createStats({ health: 100, meleeDmg: 10, speed: 5 }) })] }),
      ]),
    ).resolve();
    expect(winA.winnerId).toBe("A");

    const draw = new BattleEngine(
      createBattleInput([
        createScenario("A", { support: [createUnit("a-1", { stats: createStats({ health: 1, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
        createScenario("B", { support: [createUnit("b-1", { stats: createStats({ health: 1, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
      ]),
      { fatigueTickThreshold: 1, fatigueDamageStart: 1 },
    ).resolve();
    expect(draw.winnerId).toBeNull();

    const immediate = new BattleEngine(
      createBattleInput([
        createScenario("A"),
        createScenario("B", { tank: [createUnit("b-1", { stats: createStats({ health: 100, meleeDmg: 30, speed: 10 }) })] }),
      ]),
    ).resolve();
    expect(immediate.winnerId).toBe("B");
    expect(immediate.ticksElapsed).toBe(0);
  });

  it("applies fatigue at and after the threshold and guarantees termination", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", { support: [createUnit("a-1", { stats: createStats({ health: 9999, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
        createScenario("B", { support: [createUnit("b-1", { stats: createStats({ health: 9999, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
      ]),
      { fatigueTickThreshold: 100, fatigueDamageStart: 1 },
    );

    engine.tick(100);
    let state = engine.getState();
    expect(Object.values(state.scenarios[0].rows).flat()[0]!.currentHealth).toBe(9998);

    engine.tick(3);
    state = engine.getState();
    expect(Object.values(state.scenarios[0].rows).flat()[0]!.currentHealth).toBe(9989);

    const finite = new BattleEngine(
      createBattleInput([
        createScenario("A", { support: [createUnit("a-1", { stats: createStats({ health: 500, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
        createScenario("B", { support: [createUnit("b-1", { stats: createStats({ health: 500, meleeDmg: 0, rangedDmg: 0, speed: 1, manaRegen: 0, spellDmg: 0 }) })] }),
      ]),
      { fatigueTickThreshold: 100, fatigueDamageStart: 1 },
    ).resolve();
    expect(finite.winnerId).toBeNull();
    expect(finite.finalState.status).toBe("finished");
  });
});
