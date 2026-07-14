import { describe, expect, it } from "vitest";
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
      intervalTicks: null,
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
    expect(result.durationTicks).toBeNull();
  });

  it("normalizes instant timing to null interval fields", () => {
    const result = normalizeEffectFormValues({
      ...createDefaultEffectFormValues(),
      name: "  Test  ",
      intervalTicks: 500,
      triggerCount: 2,
    });

    expect(result.name).toBe("Test");
    expect(result.intervalTicks).toBeNull();
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

    expect(errors.intervalTicks).toContain("required");
    expect(errors.triggerCount).toContain("required");
  });

  it("validates positive integer fields", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Rage",
      timingType: "interval",
      intervalTicks: 0,
      triggerCount: 1.5,
      durationTicks: -1,
    });

    expect(errors.intervalTicks).toContain("positive integer");
    expect(errors.triggerCount).toContain("positive integer");
    expect(errors.durationTicks).toContain("positive integer");
  });
});
