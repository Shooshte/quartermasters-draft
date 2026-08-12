import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  createDefaultEffectFormValues,
  effectRecordToFormValues,
  isIntervalFieldDisabled,
  normalizeEffectFormValues,
  validateEffectForm,
} from "~/components/create/effect-form";
import { EffectWorkspaceForm } from "~/components/create/effect-workspace-form";

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
      shield: null,
      bypassesShield: false,
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

  it("maps shield configuration from API records to form values", () => {
    const result = effectRecordToFormValues({
      name: "Ward",
      shield: 20,
      bypassesShield: true,
    });

    expect(result.shield).toBe(20);
    expect(result.bypassesShield).toBe(true);
  });

  it("renders shield authoring controls", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      createElement(EffectWorkspaceForm, {
        mode: "create",
        formValues: { ...createDefaultEffectFormValues(), name: "Ward", shield: 20 },
        onFieldChange,
        onSave: vi.fn(),
        isSaving: false,
        saveError: null,
      }),
    );

    expect(screen.getByTestId("effect-shield-input")).toHaveValue(20);
    const bypassesShield = screen.getByTestId("effect-bypassesShield-input");
    expect(bypassesShield).not.toBeChecked();

    await user.click(bypassesShield);
    expect(onFieldChange).toHaveBeenCalledWith("bypassesShield", true);
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

  it("permits a persistent instant taunt with stat modifiers", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Persistent Challenge",
      effectType: "buff",
      isTaunt: true,
      speed: 3,
      lastsForActions: null,
    });

    expect(errors.lastsForActions).toBeUndefined();
    expect(errors).toEqual({});
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

  it("rejects an interval taunt", () => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Periodic Challenge",
      timingType: "interval",
      triggerEveryActions: 1,
      triggerCount: 1,
      isTaunt: true,
    });

    expect(errors.timingType).toContain("instant");
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

  it("requires duration for an instant shield buff", () => {
    expect(
      validateEffectForm({ ...createDefaultEffectFormValues(), name: "Ward", shield: 20 }),
    ).toMatchObject({ lastsForActions: expect.stringContaining("required") });
  });

  it.each([
    { timingType: "interval" as const, effectType: "buff" as const },
    { timingType: "instant" as const, effectType: "healing" as const },
    { timingType: "instant" as const, effectType: "damage" as const },
  ])("rejects shield for $timingType $effectType effects", ({ timingType, effectType }) => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Unsupported Ward",
      timingType,
      effectType,
      shield: 20,
      ...(timingType === "interval" ? { triggerEveryActions: 1, triggerCount: 1 } : {}),
    });

    expect(errors.shield).toContain("only supported for instant buffs and debuffs");
  });

  it("accepts a zero shield instant buff without an action duration", () => {
    const values = {
      ...createDefaultEffectFormValues(),
      name: "Empty Ward",
      shield: 0,
      lastsForActions: 4,
    };

    expect(normalizeEffectFormValues(values).lastsForActions).toBeNull();
    expect(validateEffectForm(values).lastsForActions).toBeUndefined();
  });

  it.each([
    "shield",
    "directHealing",
    "directMeleeDmg",
    "directRangedDmg",
    "directSpellDmg",
  ] as const)("rejects a negative %s amount", (field) => {
    const errors = validateEffectForm({
      ...createDefaultEffectFormValues(),
      name: "Invalid signed effect",
      effectType: "damage",
      [field]: -1,
    });

    expect(errors[field]).toContain("zero or greater");
  });

  it("accepts zero shield, damage, and healing amounts", () => {
    expect(
      validateEffectForm({
        ...createDefaultEffectFormValues(),
        name: "Zero effect",
        effectType: "damage",
        shield: 0,
        directHealing: 0,
        directMeleeDmg: 0,
        directRangedDmg: 0,
        directSpellDmg: 0,
      }),
    ).toEqual({});
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
