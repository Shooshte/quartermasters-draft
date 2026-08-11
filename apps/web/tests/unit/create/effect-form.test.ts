import { describe, expect, it } from "vitest";
import {
  createDefaultEffectFormValues,
  effectRecordToFormValues,
  isIntervalFieldDisabled,
  normalizeEffectFormValues,
  validateEffectForm,
} from "~/components/create/effect-form";

describe("effect-form", () => {
  it("provides action timing defaults for a new effect", () => {
    expect(createDefaultEffectFormValues()).toMatchObject({
      name: "",
      timingType: "instant",
      effectType: "buff",
      isTaunt: false,
      triggerEveryActions: null,
      triggerCount: null,
      lastsForActions: null,
      mana: null,
    });
  });

  it("maps action timing from API records to form values", () => {
    const result = effectRecordToFormValues({
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      meleeDmg: 2,
      lastsForActions: 3,
      isTaunt: true,
    });

    expect(result.name).toBe("Barbarian Roar");
    expect(result.meleeDmg).toBe(2);
    expect(result.lastsForActions).toBe(3);
    expect(result.isTaunt).toBe(true);
  });

  it("does not copy API metadata into mutation-ready form values", () => {
    const apiRecord = {
      id: "effect-1",
      name: "Legacy Poison",
      timingType: "interval" as const,
      effectType: "damage" as const,
      triggerEveryActions: null,
      triggerCount: null,
      needsTimingConfiguration: true,
      updatedAt: new Date("2026-08-11T00:00:00Z"),
    };

    const result = effectRecordToFormValues(apiRecord);

    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("needsTimingConfiguration");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("normalizes an interval effect by clearing its action duration", () => {
    const result = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "  Test  ",
      timingType: "interval",
      triggerEveryActions: 2,
      triggerCount: 2,
      lastsForActions: 4,
    });

    expect(result.name).toBe("Test");
    expect(result.triggerEveryActions).toBe(2);
    expect(result.triggerCount).toBe(2);
    expect(result.lastsForActions).toBeNull();
  });

  it("normalizes an instant direct effect by clearing its action duration", () => {
    const result = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "Arc Spark",
      effectType: "damage",
      directSpellDmg: 4,
      lastsForActions: 4,
    });

    expect(result.lastsForActions).toBeNull();
  });

  it("retains an action duration for an instant stat modifier", () => {
    const result = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "Haste",
      speed: 2,
      lastsForActions: 4,
    });

    expect(result.lastsForActions).toBe(4);
  });

  it("retains a taunt duration and permits a persistent instant taunt", () => {
    const persistentTaunt = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "Challenge",
      isTaunt: true,
    });
    const timedTaunt = normalizeEffectFormValues({
      ...persistentTaunt,
      lastsForActions: 4,
    });

    expect(persistentTaunt.lastsForActions).toBeNull();
    expect(timedTaunt.lastsForActions).toBe(4);
    expect(validateEffectForm(persistentTaunt).lastsForActions).toBeUndefined();
  });

  it("marks interval fields disabled for instant timing", () => {
    expect(isIntervalFieldDisabled({ timingType: "instant" })).toBe(true);
    expect(isIntervalFieldDisabled({ timingType: "interval" })).toBe(false);
  });

  it("requires action timing for an interval", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Poison",
      timingType: "interval",
    });

    expect(errors.triggerEveryActions).toContain("required");
    expect(errors.triggerCount).toContain("required");
  });

  it("requires duration for a stat-bearing instant buff", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Haste",
      timingType: "instant",
      effectType: "buff",
      speed: 2,
    });

    expect(errors.lastsForActions).toContain("required");
  });

  it("does not require duration for an interval stat buff", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Battle Rhythm",
      timingType: "interval",
      effectType: "buff",
      speed: 2,
      triggerEveryActions: 2,
      triggerCount: 3,
    });

    expect(errors.lastsForActions).toBeUndefined();
    expect(errors).toEqual({});
  });

  it("does not require duration for an instant direct effect", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Arc Spark",
      timingType: "instant",
      effectType: "damage",
      directSpellDmg: 4,
    });

    expect(errors.lastsForActions).toBeUndefined();
  });

  it("validates positive interval timing fields while ignoring an inapplicable duration", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Rage",
      timingType: "interval",
      triggerEveryActions: 0,
      triggerCount: 1.5,
      lastsForActions: -1,
    });

    expect(errors.triggerEveryActions).toContain("positive integer");
    expect(errors.triggerCount).toContain("positive integer");
    expect(errors.lastsForActions).toBeUndefined();
  });
});
