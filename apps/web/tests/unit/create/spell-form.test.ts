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
      name: "Fireball",
      description: "",
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
        name: "Fireball",
        description: "",
        targetPolicy: "highest_health",
        effectIds: ["id-1"],
      }),
    ).toBe(false);
  });

  it("normalizes name by trimming whitespace", () => {
    const result = normalizeSpellFormValues({
      name: "  Fireball  ",
      description: "test",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.name).toBe("Fireball");
  });

  it("normalizes empty description to null", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBeNull();
  });

  it("normalizes whitespace-only description to null", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "   ",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBeNull();
  });

  it("normalizes non-empty description by trimming", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "  A blazing sphere  ",
      targetPolicy: "random",
      effectIds: [],
    });
    expect(result.description).toBe("A blazing sphere");
  });

  it("passes through targetPolicy and effectIds unchanged", () => {
    const result = normalizeSpellFormValues({
      name: "Fireball",
      description: "",
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
});
