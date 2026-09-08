import { describe, expect, it } from "vitest";
import { createSeededRandom } from "./rng";

describe("seeded random", () => {
  it("produces values in [0, 1) range", () => {
    const random = createSeededRandom(42);

    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is deterministic for the same seed", () => {
    const first = createSeededRandom(42);
    const second = createSeededRandom(42);

    expect(Array.from({ length: 100 }, () => first())).toEqual(
      Array.from({ length: 100 }, () => second()),
    );
  });

  it("is deterministic for canonical string seeds", () => {
    const first = createSeededRandom("balance-pass-3");
    const second = createSeededRandom("  balance-pass-3  ");
    expect(Array.from({ length: 20 }, first)).toEqual(Array.from({ length: 20 }, second));
  });

  it("produces different sequences for different string seeds", () => {
    const first = createSeededRandom("alpha");
    const second = createSeededRandom("bravo");
    expect(Array.from({ length: 10 }, first)).not.toEqual(Array.from({ length: 10 }, second));
  });

  it("produces different sequences for different seeds", () => {
    const first = createSeededRandom(1);
    const second = createSeededRandom(2);

    const diverged = Array.from({ length: 10 }, () => first()).some((value) => value !== second());
    expect(diverged).toBe(true);
  });

  it("handles edge-case seeds: 0, negative, MAX_SAFE_INTEGER", () => {
    for (const seed of [0, -1, Number.MAX_SAFE_INTEGER]) {
      const random = createSeededRandom(seed);
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
