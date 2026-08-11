import { describe, expect, it } from "vitest";
import { initializeBattleState } from "./state";
import {
  createBattleInput,
  createBattleInputWithSeed,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";
import type { BattleInput } from "./types";
import { InvalidBattleInputError, validateBattleInput } from "./validation";

describe("battle input validation", () => {
  it("uses a typed error for an invalid scenario graph", () => {
    expect(InvalidBattleInputError).toBeTypeOf("function");
    expect(() =>
      validateBattleInput(createBattleInput([createScenario("A"), createScenario("B")], 1)),
    ).toThrow(InvalidBattleInputError);
  });

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
    expect(() => validateBattleInput(createBattleInputWithSeed("   "))).toThrow(
      /must not be blank/i,
    );
  });

  it("rejects unsupported runtime seed types", () => {
    const unsupportedSeeds: unknown[] = [true, null, {}, undefined];

    for (const seed of unsupportedSeeds) {
      const input = {
        ...createBattleInputWithSeed(42),
        seed,
      } as unknown as BattleInput;

      expect(() => validateBattleInput(input)).toThrow(
        "Battle seed must be a finite number or non-blank string.",
      );
    }
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

  it("rejects a unit with a non-positive target count", () => {
    expect(() =>
      initializeBattleState(
        createBattleInput([
          createScenario("A", { tank: [createUnit("Caster", { targetCount: 0 })] }),
          createScenario("B", { tank: [createUnit("Enemy")] }),
        ]),
      ),
    ).toThrowError("Target count must be a positive integer");
  });

  it("rejects a unit with a non-integer target count", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A", { tank: [createUnit("Caster", { targetCount: 1.5 })] }),
          createScenario("B", { tank: [createUnit("Enemy")] }),
        ]),
      ),
    ).toThrowError("Target count must be a positive integer");
  });

  it.each([
    ["targetScope", "nearby", 'Invalid target scope "nearby" for Caster.'],
    ["targetPriority", "weakest", 'Invalid target priority "weakest" for Caster.'],
    ["selectionShape", "cone", 'Invalid selection shape "cone" for Caster.'],
  ] as const)("rejects an unknown serialized %s", (field, value, message) => {
    const caster = createUnit("Caster");
    (caster as unknown as Record<string, unknown>)[field] = value;
    const input = createBattleInput([
      createScenario("A", { tank: [caster] }),
      createScenario("B", { tank: [createUnit("Enemy")] }),
    ]);

    expect(() => validateBattleInput(input)).toThrowError(InvalidBattleInputError);
    expect(() => validateBattleInput(input)).toThrowError(message);
  });

  it("rejects an item that repeats an allowed row", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A", {
            tank: [
              createUnit("Caster", {
                items: [createItem({ name: "Bow", allowedRowTypes: ["ranged", "ranged"] })],
              }),
            ],
          }),
          createScenario("B", { tank: [createUnit("Enemy")] }),
        ]),
      ),
    ).toThrowError("Bow has duplicate allowed row types");
  });

  it("rejects items with no shared allowed rows", () => {
    expect(() =>
      validateBattleInput(
        createBattleInput([
          createScenario("A", {
            tank: [
              createUnit("Caster", {
                items: [
                  createItem({ name: "Bow", allowedRowTypes: ["ranged"] }),
                  createItem({ name: "Shield", allowedRowTypes: ["tank"] }),
                ],
              }),
            ],
          }),
          createScenario("B", { tank: [createUnit("Enemy")] }),
        ]),
      ),
    ).toThrowError("Caster has no shared allowed item rows");
  });

  it("rejects a unit deployed outside an equipped item's allowed rows", () => {
    expect(() =>
      initializeBattleState(
        createBattleInput([
          createScenario("A", {
            tank: [
              createUnit("Caster", {
                items: [createItem({ name: "Bow", allowedRowTypes: ["ranged"] })],
              }),
            ],
          }),
          createScenario("B", { tank: [createUnit("Enemy")] }),
        ]),
      ),
    ).toThrowError("Caster cannot be deployed in tank");
  });

  it.each([
    createEffect({
      name: "Incomplete interval",
      effectType: "damage",
      timingType: "interval",
      triggerEveryActions: 1,
      triggerCount: null,
      directSpellDmg: 5,
    }),
    createEffect({
      name: "Interval without cadence",
      effectType: "damage",
      timingType: "interval",
      triggerEveryActions: null,
      triggerCount: 1,
      directSpellDmg: 5,
    }),
    createEffect({
      name: "Incomplete buff",
      effectType: "buff",
      timingType: "instant",
      speed: 5,
      lastsForActions: null,
    }),
    createEffect({
      name: "Incomplete debuff",
      effectType: "debuff",
      timingType: "instant",
      dodge: -5,
      lastsForActions: null,
    }),
  ])("rejects action-timed effect configurations with missing durations", (effect) => {
    const input = createBattleInput([
      createScenario("A", {
        support: [
          createUnit("Caster", {
            items: [createItem({ name: "Item", effects: effectSequence(effect) })],
          }),
        ],
      }),
      createScenario("B", { tank: [createUnit("Enemy")] }),
    ]);

    expect(() => validateBattleInput(input)).toThrowError(
      `Effect "${effect.name}" timing needs configuration.`,
    );
  });

  it("accepts persistent instant taunts with stat modifiers during initialization", () => {
    const effect = createEffect({
      name: "Persistent Provoke",
      effectType: "buff",
      timingType: "instant",
      isTaunt: true,
      speed: 5,
      dodge: 3,
      lastsForActions: null,
    });
    const input = createBattleInput([
      createScenario("A", {
        support: [
          createUnit("Caster", {
            items: [createItem({ name: "Item", effects: effectSequence(effect) })],
          }),
        ],
      }),
      createScenario("B", { tank: [createUnit("Enemy")] }),
    ]);

    expect(() => initializeBattleState(input)).not.toThrow();
  });

  it("rejects interval taunts", () => {
    const effect = createEffect({
      name: "Interval Provoke",
      effectType: "buff",
      timingType: "interval",
      isTaunt: true,
      triggerEveryActions: 1,
      triggerCount: 1,
    });
    const input = createBattleInput([
      createScenario("A", {
        support: [
          createUnit("Caster", {
            items: [createItem({ name: "Item", effects: effectSequence(effect) })],
          }),
        ],
      }),
      createScenario("B", { tank: [createUnit("Enemy")] }),
    ]);

    expect(() => validateBattleInput(input)).toThrowError(
      'Taunt effect "Interval Provoke" must use instant timing.',
    );
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    1.5,
  ])("rejects an invalid timed taunt duration of %s", (lastsForActions) => {
    const effect = createEffect({
      name: "Invalid Timed Provoke",
      effectType: "buff",
      timingType: "instant",
      isTaunt: true,
      lastsForActions,
    });
    const input = createBattleInput([
      createScenario("A", {
        support: [
          createUnit("Caster", {
            items: [createItem({ name: "Item", effects: effectSequence(effect) })],
          }),
        ],
      }),
      createScenario("B", { tank: [createUnit("Enemy")] }),
    ]);

    expect(() => validateBattleInput(input)).toThrowError(
      'Taunt effect "Invalid Timed Provoke" must have a positive duration.',
    );
  });
});
