import { describe, it, expect } from "vitest";
import { BattleEngine } from "./battle-engine";

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
});
