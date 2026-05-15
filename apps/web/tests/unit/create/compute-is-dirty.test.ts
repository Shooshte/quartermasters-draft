import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceState } from "~/components/create/types";

const dirtyMocks = vi.hoisted(() => ({
  isItemFormDirty: vi.fn(),
  isUnitFormDirty: vi.fn(),
  isScenarioFormDirty: vi.fn(),
}));

vi.mock("~/components/create/item-form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/components/create/item-form")>()),
  isItemFormDirty: dirtyMocks.isItemFormDirty,
}));

vi.mock("~/components/create/unit-form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/components/create/unit-form")>()),
  isUnitFormDirty: dirtyMocks.isUnitFormDirty,
}));

vi.mock("~/components/create/scenario-form", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/components/create/scenario-form")>()),
  isScenarioFormDirty: dirtyMocks.isScenarioFormDirty,
}));

const { computeIsDirty } = await import("~/components/create/hooks/use-workspace-loader");

function compute(
  formValues: WorkspaceState["formValues"],
  originalData: WorkspaceState["data"],
  entityType: WorkspaceState["entityType"] = "effect",
) {
  return computeIsDirty(formValues, originalData, entityType);
}

describe("computeIsDirty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false for identical form values and original data", () => {
    expect(
      compute(
        { name: "Burn", timingType: "interval", triggerCount: "2" },
        { name: "Burn", timingType: "interval", triggerCount: "2" },
      ),
    ).toBe(false);
  });

  it("returns true when a string field changes", () => {
    expect(compute({ name: "Burn" }, { name: "Freeze" })).toBe(true);
  });

  it("returns true when a numeric field changes", () => {
    expect(compute({ directSpellDmg: 10 }, { directSpellDmg: 12 })).toBe(true);
  });

  it("normalizes null/undefined to empty string for comparison", () => {
    expect(compute({ description: undefined }, { name: "Spell", description: null })).toBe(false);
  });

  it("returns true when an array field differs in length", () => {
    expect(compute({ effectIds: ["a"] }, { name: "Spell", effectIds: ["a", "b"] })).toBe(true);
  });

  it("returns true when an array field differs in content", () => {
    expect(compute({ effectIds: ["a", "c"] }, { name: "Spell", effectIds: ["a", "b"] })).toBe(true);
  });

  it("returns false for new entity form matching defaults (null original)", () => {
    expect(compute({ name: "" }, null)).toBe(false);
  });

  it("delegates to isItemFormDirty for item entity type", () => {
    dirtyMocks.isItemFormDirty.mockReturnValueOnce(true);

    expect(compute({ name: "Item" }, { name: "Original" }, "item")).toBe(true);
    expect(dirtyMocks.isItemFormDirty).toHaveBeenCalledWith({ name: "Item" }, { name: "Original" });
  });

  it("delegates to isUnitFormDirty for unit entity type", () => {
    dirtyMocks.isUnitFormDirty.mockReturnValueOnce(true);

    expect(compute({ name: "Unit" }, { name: "Original" }, "unit")).toBe(true);
    expect(dirtyMocks.isUnitFormDirty).toHaveBeenCalledWith({ name: "Unit" }, { name: "Original" });
  });

  it("delegates to isScenarioFormDirty for scenario entity type", () => {
    dirtyMocks.isScenarioFormDirty.mockReturnValueOnce(true);

    expect(compute({ name: "Scenario" }, { name: "Original" }, "scenario")).toBe(true);
    expect(dirtyMocks.isScenarioFormDirty).toHaveBeenCalledWith(
      { name: "Scenario" },
      { name: "Original" },
    );
  });
});
