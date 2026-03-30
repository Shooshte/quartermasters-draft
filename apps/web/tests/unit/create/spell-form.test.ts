import { describe, it, expect } from "vitest";
import {
  createDefaultSpellFormValues,
  validateSpellForm,
  hasSpellFormErrors,
  normalizeSpellFormValues,
  spellRecordToFormValues,
} from "~/components/create/spell-form";

describe("spell-form", () => {
  it("provides defaults for a new spell", () => {
    const defaults = createDefaultSpellFormValues();
    expect(defaults).toEqual({
      name: "",
      description: "",
      targetPolicy: "",
      effectIds: [],
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      requiresAdjacent: false,
      allowedRowTypes: [],
    });
  });

  it("returns error when name is empty", () => {
    const errors = validateSpellForm(createDefaultSpellFormValues());
    expect(errors.name).toBe("Name is required");
  });

  it("returns error when name is only whitespace", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "   ",
    });
    expect(errors.name).toBe("Name is required");
  });

  it("returns error when targetPolicy is empty", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
    });
    expect(errors.targetPolicy).toBe("Target policy is required");
  });

  it("returns error when no linked effects are present", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
    });
    expect(errors.effectIds).toBe("At least one linked effect is required");
  });

  it("returns no errors for valid form", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
    });
    expect(errors).toEqual({});
  });

  it("hasSpellFormErrors returns true when errors exist", () => {
    expect(hasSpellFormErrors(createDefaultSpellFormValues())).toBe(true);
  });

  it("hasSpellFormErrors returns false when form is valid", () => {
    expect(
      hasSpellFormErrors({
        ...createDefaultSpellFormValues(),
        name: "Fireball",
        targetPolicy: "highest_health",
        effectIds: ["id-1"],
      }),
    ).toBe(false);
  });

  it("normalizes name by trimming whitespace", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "  Fireball  ",
      description: "test",
      targetPolicy: "random",
    });
    expect(result.name).toBe("Fireball");
  });

  it("normalizes empty description to null", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      description: "",
      targetPolicy: "random",
    });
    expect(result.description).toBeNull();
  });

  it("normalizes whitespace-only description to null", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      description: "   ",
      targetPolicy: "random",
    });
    expect(result.description).toBeNull();
  });

  it("normalizes non-empty description by trimming", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      description: "  A blazing sphere  ",
      targetPolicy: "random",
    });
    expect(result.description).toBe("A blazing sphere");
  });

  it("passes through targetPolicy and effectIds unchanged", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1", "id-2"],
    });
    expect(result.targetPolicy).toBe("highest_health");
    expect(result.effectIds).toEqual(["id-1", "id-2"]);
  });

  it("maps null description from a saved spell to an empty string form value", () => {
    const result = spellRecordToFormValues({
      name: "Fireball",
      description: null,
      targetPolicy: "random",
      effectIds: ["id-1"],
    });

    expect(result.description).toBe("");
  });

  // --- Targeting field tests ---

  it("returns error when targetRowCount is less than 1", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
      targetRowCount: 0,
    });
    expect(errors.targetRowCount).toBe("Target row count must be at least 1");
  });

  it("returns error when maxTargetsPerRow is less than 1 and not null", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
      maxTargetsPerRow: 0,
    });
    expect(errors.maxTargetsPerRow).toBe("Max targets per row must be at least 1");
  });

  it("returns error when requiresAdjacent is true and maxTargetsPerRow is null", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
      maxTargetsPerRow: null,
      requiresAdjacent: true,
    });
    expect(errors.requiresAdjacent).toBe("Adjacent targeting requires a limited number of targets per row");
  });

  it("returns error when requiresAdjacent is true and maxTargetsPerRow is 1", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
      maxTargetsPerRow: 1,
      requiresAdjacent: true,
    });
    expect(errors.requiresAdjacent).toBe("Adjacent targeting requires at least 2 targets per row");
  });

  it("no error when maxTargetsPerRow is null and requiresAdjacent is false", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Fireball",
      targetPolicy: "highest_health",
      effectIds: ["id-1"],
      maxTargetsPerRow: null,
      requiresAdjacent: false,
    });
    expect(errors).toEqual({});
  });

  it("no error for valid targeting combination", () => {
    const errors = validateSpellForm({
      ...createDefaultSpellFormValues(),
      name: "Chain Lightning",
      targetPolicy: "highest_damage",
      effectIds: ["id-1"],
      targetRowCount: 1,
      maxTargetsPerRow: 3,
      requiresAdjacent: true,
      allowedRowTypes: ["melee", "tank"],
    });
    expect(errors).toEqual({});
  });

  it("normalizes targeting fields through unchanged", () => {
    const result = normalizeSpellFormValues({
      ...createDefaultSpellFormValues(),
      name: "Earthquake",
      targetPolicy: "random",
      effectIds: ["id-1"],
      targetRowCount: 2,
      maxTargetsPerRow: null,
      requiresAdjacent: false,
      allowedRowTypes: ["melee", "tank"],
    });
    expect(result.targetRowCount).toBe(2);
    expect(result.maxTargetsPerRow).toBeNull();
    expect(result.requiresAdjacent).toBe(false);
    expect(result.allowedRowTypes).toEqual(["melee", "tank"]);
  });

  it("spellRecordToFormValues maps targeting fields", () => {
    const result = spellRecordToFormValues({
      name: "Chain Lightning",
      targetPolicy: "highest_damage",
      effectIds: ["id-1"],
      targetRowCount: 1,
      maxTargetsPerRow: 3,
      requiresAdjacent: true,
      allowedRowTypes: ["melee", "tank"],
    });
    expect(result.targetRowCount).toBe(1);
    expect(result.maxTargetsPerRow).toBe(3);
    expect(result.requiresAdjacent).toBe(true);
    expect(result.allowedRowTypes).toEqual(["melee", "tank"]);
  });

  it("spellRecordToFormValues defaults missing targeting fields", () => {
    const result = spellRecordToFormValues({
      name: "Fireball",
      targetPolicy: "random",
      effectIds: ["id-1"],
    });
    expect(result.targetRowCount).toBe(1);
    expect(result.maxTargetsPerRow).toBe(1);
    expect(result.requiresAdjacent).toBe(false);
    expect(result.allowedRowTypes).toEqual([]);
  });

  it("spellRecordToFormValues maps null maxTargetsPerRow from DB", () => {
    const result = spellRecordToFormValues({
      name: "Earthquake",
      targetPolicy: "random",
      effectIds: ["id-1"],
      maxTargetsPerRow: null,
    });
    expect(result.maxTargetsPerRow).toBeNull();
  });
});
