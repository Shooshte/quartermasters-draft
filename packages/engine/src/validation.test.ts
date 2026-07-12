import { describe, expect, it } from "vitest";
import {
  createBattleInput,
  createBattleInputWithSeed,
  createScenario,
  createStats,
  createUnit,
} from "./test-helpers";
import { validateBattleInput } from "./validation";

describe("battle input validation", () => {
  it("throws when seed is NaN", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([createScenario("A"), createScenario("B")], Number.NaN),
      ),
    ).toThrow(/finite number/i);
  });

  it("throws when seed is Infinity", () => {
    expect(() =>
      validateBattleInput(createBattleInput([createScenario("A"), createScenario("B")], Infinity)),
    ).toThrow(/finite number/i);
  });

  it("throws when seed is -Infinity", () => {
    expect(() =>
      validateBattleInput(createBattleInput([createScenario("A"), createScenario("B")], -Infinity)),
    ).toThrow(/finite number/i);
  });

  it("accepts a non-blank string seed", () => {
    expect(() => validateBattleInput(createBattleInputWithSeed("balance-pass-3"))).not.toThrow();
  });

  it("rejects a blank string seed", () => {
    expect(() => validateBattleInput(createBattleInputWithSeed("   "))).toThrow(/must not be blank/i);
  });

  it("throws when all units across both scenarios have zero health", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A", {
            tank: [createUnit("A", { stats: createStats({ health: 0 }) })],
          }),
          createScenario("B", {
            tank: [createUnit("B", { stats: createStats({ health: 0 }) })],
          }),
        ]),
      ),
    ).toThrow(/at least one living unit/i);
  });

  it("does not throw when at least one unit is alive", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A", {
            tank: [createUnit("A", { stats: createStats({ health: 1 }) })],
          }),
          createScenario("B", {
            tank: [createUnit("B", { stats: createStats({ health: 0 }) })],
          }),
        ]),
      ),
    ).not.toThrow();
  });

  it("does not throw when one scenario is empty but the other has living units", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A"),
          createScenario("B", {
            tank: [createUnit("B", { stats: createStats({ health: 1 }) })],
          }),
        ]),
      ),
    ).not.toThrow();
  });
});
