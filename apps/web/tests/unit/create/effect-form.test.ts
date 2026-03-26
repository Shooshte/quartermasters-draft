import { describe, it, expect } from "vitest";
import {
  createDefaultEffectFormValues,
  effectRecordToFormValues,
  isIntervalFieldDisabled,
  normalizeEffectFormValues,
  validateEffectForm,
} from "~/components/create/effect-form";

describe("effect-form", () => {
  it("provides defaults for a new effect", () => {
    expect(createDefaultEffectFormValues()).toMatchObject({
      name: "",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });
  });

  it("maps API records to form values", () => {
    const result = effectRecordToFormValues({
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      meleeDmg: 2,
    });

    expect(result.name).toBe("Barbarian Roar");
    expect(result.meleeDmg).toBe(2);
    expect(result.durationMs).toBeNull();
  });

  it("normalizes instant timing to null interval fields", () => {
    const result = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "  Test  ",
      intervalMs: 500,
      triggerCount: 2,
    });

    expect(result.name).toBe("Test");
    expect(result.intervalMs).toBeNull();
    expect(result.triggerCount).toBeNull();
  });

  it("marks interval fields disabled for instant timing", () => {
    expect(isIntervalFieldDisabled({ timingType: "instant" })).toBe(true);
    expect(isIntervalFieldDisabled({ timingType: "interval" })).toBe(false);
  });

  it("requires interval fields for interval timing", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Rage",
      timingType: "interval",
    });

    expect(errors.intervalMs).toContain("required");
    expect(errors.triggerCount).toContain("required");
  });

  it("validates positive integer fields", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Rage",
      timingType: "interval",
      intervalMs: 0,
      triggerCount: 1.5,
      durationMs: -1,
    });

    expect(errors.intervalMs).toContain("positive integer");
    expect(errors.triggerCount).toContain("positive integer");
    expect(errors.durationMs).toContain("positive integer");
  });
});
