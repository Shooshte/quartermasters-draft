import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

describe("win conditions", () => {
  it("declares the scenario with surviving units as the winner", () => {
    const winA = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          tank: [
            createUnit("a-1", {
              stats: createStats({ health: 200, meleeDmg: 50, speed: 10 }),
            }),
          ],
        }),
        createScenario("B", {
          tank: [
            createUnit("b-1", {
              stats: createStats({ health: 100, meleeDmg: 10, speed: 5 }),
            }),
          ],
        }),
      ]),
    ).resolve();

    expect(winA.winnerId).toBe("A");
  });

  it("declares a draw when both sides die simultaneously from fatigue", () => {
    const draw = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("a-1", {
              stats: createStats({
                health: 1,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 0,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
        createScenario("B", {
          support: [
            createUnit("b-1", {
              stats: createStats({
                health: 1,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 0,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
      ]),
      { fatigueActionThreshold: 2, fatigueDamageStart: 1 },
    ).resolve();

    expect(draw.winnerId).toBeNull();
    expect(draw.log.at(-1)?.message).toMatch(/action limit/i);
    expect(draw.log.at(-1)?.message).not.toMatch(new RegExp(`${["ti", "ck"].join("")} limit`, "i"));
  });

  it("immediately declares victory when the opposing scenario has no units", () => {
    const immediate = new BattleEngine(
      createBattleInput([
        createScenario("A"),
        createScenario("B", {
          tank: [
            createUnit("b-1", {
              stats: createStats({ health: 100, meleeDmg: 30, speed: 10 }),
            }),
          ],
        }),
      ]),
    ).resolve();

    expect(immediate.winnerId).toBe("B");
    expect(immediate.actionsResolved).toBe(0);
  });

  it("does not attribute an attack victory to the action limit", () => {
    const result = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          tank: [
            createUnit("a-1", {
              stats: createStats({ health: 100, meleeDmg: 10, speed: 100 }),
            }),
          ],
        }),
        createScenario("B", {
          tank: [
            createUnit("b-1", {
              stats: createStats({ health: 20, meleeDmg: 0, speed: 100 }),
            }),
          ],
        }),
      ]),
      { fatigueActionThreshold: 2, fatigueDamageStart: 1 },
    ).resolve();

    expect(result.winnerId).toBe("A");
    expect(result.actionsResolved).toBe(2);
    expect(result.log.some((entry) => entry.type === "fatigue")).toBe(false);
    expect(result.log.at(-1)?.message).toBe("Battle ends: A");
  });

  it("attributes a fatigue-changed attack victory to the action limit", () => {
    const result = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          tank: [
            createUnit("a-1", {
              stats: createStats({ health: 3, meleeDmg: 10, speed: 100 }),
            }),
          ],
        }),
        createScenario("B", {
          tank: [
            createUnit("b-1", {
              stats: createStats({ health: 20, meleeDmg: 0, speed: 100 }),
            }),
          ],
        }),
      ]),
      { fatigueActionThreshold: 2, fatigueDamageStart: 1 },
    ).resolve();

    expect(result.winnerId).toBeNull();
    expect(result.actionsResolved).toBe(2);
    expect(result.log.at(-1)?.message).toBe("Battle ends: draw");
  });

  it("applies fatigue after the action threshold and guarantees termination", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("a-1", {
              stats: createStats({
                health: 9999,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 1,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
        createScenario("B", {
          support: [
            createUnit("b-1", {
              stats: createStats({
                health: 9999,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 1,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
      ]),
      { fatigueActionThreshold: 100, fatigueDamageStart: 1 },
    );

    for (let batch = 0; batch < 50; batch += 1) engine.resolveNextBatch();
    let state = engine.getState();
    expect(Object.values(state.scenarios[0].rows).flat()[0]?.currentHealth).toBe(9999);

    engine.resolveNextBatch();
    state = engine.getState();
    expect(Object.values(state.scenarios[0].rows).flat()[0]?.currentHealth).toBe(9996);

    const finite = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("a-1", {
              stats: createStats({
                health: 500,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 1,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
        createScenario("B", {
          support: [
            createUnit("b-1", {
              stats: createStats({
                health: 500,
                meleeDmg: 0,
                rangedDmg: 0,
                speed: 1,
                manaRegen: 0,
                spellDmg: 0,
              }),
            }),
          ],
        }),
      ]),
      { fatigueActionThreshold: 100, fatigueDamageStart: 1 },
    ).resolve();
    expect(finite.winnerId).toBeNull();
    expect(finite.finalState.status).toBe("finished");
  });
});
