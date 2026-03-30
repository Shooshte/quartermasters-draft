import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeTargetedSlots, TargetingGridPreview } from "~/components/create/targeting-grid-preview";

describe("computeTargetedSlots", () => {
  it("defaults: 1 row, 1 target, all types → 1 slot in ranged", () => {
    const result = computeTargetedSlots({
      targetRowCount: 1,
      maxTargetsPerRow: 1,

      allowedRowTypes: [],
    });
    expect(result.get("ranged")).toEqual({ enabled: true, targetedCount: 1 });
    expect(result.get("support")).toEqual({ enabled: true, targetedCount: 0 });
    expect(result.get("melee")).toEqual({ enabled: true, targetedCount: 0 });
    expect(result.get("tank")).toEqual({ enabled: true, targetedCount: 0 });
  });

  it("whole row (null), 1 row → 5 slots in ranged", () => {
    const result = computeTargetedSlots({
      targetRowCount: 1,
      maxTargetsPerRow: null,

      allowedRowTypes: [],
    });
    expect(result.get("ranged")).toEqual({ enabled: true, targetedCount: 5 });
    expect(result.get("support")).toEqual({ enabled: true, targetedCount: 0 });
  });

  it("2 rows, 3 targets → 3 slots each in ranged + support", () => {
    const result = computeTargetedSlots({
      targetRowCount: 2,
      maxTargetsPerRow: 3,

      allowedRowTypes: [],
    });
    expect(result.get("ranged")).toEqual({ enabled: true, targetedCount: 3 });
    expect(result.get("support")).toEqual({ enabled: true, targetedCount: 3 });
    expect(result.get("melee")).toEqual({ enabled: true, targetedCount: 0 });
    expect(result.get("tank")).toEqual({ enabled: true, targetedCount: 0 });
  });

  it("row restriction to melee+tank → ranged/support disabled, melee targeted", () => {
    const result = computeTargetedSlots({
      targetRowCount: 1,
      maxTargetsPerRow: 2,

      allowedRowTypes: ["melee", "tank"],
    });
    expect(result.get("ranged")).toEqual({ enabled: false, targetedCount: 0 });
    expect(result.get("support")).toEqual({ enabled: false, targetedCount: 0 });
    expect(result.get("melee")).toEqual({ enabled: true, targetedCount: 2 });
    expect(result.get("tank")).toEqual({ enabled: true, targetedCount: 0 });
  });

  it("targetRowCount exceeds allowed rows → capped", () => {
    const result = computeTargetedSlots({
      targetRowCount: 4,
      maxTargetsPerRow: 1,

      allowedRowTypes: ["melee", "tank"],
    });
    expect(result.get("melee")).toEqual({ enabled: true, targetedCount: 1 });
    expect(result.get("tank")).toEqual({ enabled: true, targetedCount: 1 });
    expect(result.get("ranged")).toEqual({ enabled: false, targetedCount: 0 });
    expect(result.get("support")).toEqual({ enabled: false, targetedCount: 0 });
  });

  it("empty allowedRowTypes means all allowed", () => {
    const result = computeTargetedSlots({
      targetRowCount: 1,
      maxTargetsPerRow: 2,

      allowedRowTypes: [],
    });
    expect(result.get("ranged")!.enabled).toBe(true);
    expect(result.get("support")!.enabled).toBe(true);
    expect(result.get("melee")!.enabled).toBe(true);
    expect(result.get("tank")!.enabled).toBe(true);
  });

  it("maxTargetsPerRow exceeding 5 is capped at 5", () => {
    const result = computeTargetedSlots({
      targetRowCount: 1,
      maxTargetsPerRow: 10,

      allowedRowTypes: [],
    });
    expect(result.get("ranged")!.targetedCount).toBe(5);
  });
});

describe("TargetingGridPreview", () => {
  it("renders 4 row groups in correct order", () => {
    render(
      <TargetingGridPreview
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
      />
    );
    const grid = screen.getByTestId("targeting-grid");
    expect(grid).toBeInTheDocument();

    const rows = ["ranged", "support", "melee", "tank"];
    rows.forEach((rowType) => {
      expect(screen.getByTestId(`targeting-grid-row-${rowType}`)).toBeInTheDocument();
    });

    // Verify order by checking DOM position
    const rowElements = grid.querySelectorAll("[data-testid^='targeting-grid-row-']");
    expect(rowElements[0]).toHaveAttribute("data-testid", "targeting-grid-row-ranged");
    expect(rowElements[1]).toHaveAttribute("data-testid", "targeting-grid-row-support");
    expect(rowElements[2]).toHaveAttribute("data-testid", "targeting-grid-row-melee");
    expect(rowElements[3]).toHaveAttribute("data-testid", "targeting-grid-row-tank");
  });

  it("renders 5 slots per row", () => {
    render(
      <TargetingGridPreview
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
      />
    );
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`targeting-grid-slot-ranged-${i}`)).toBeInTheDocument();
    }
  });

  it("marks targeted slots with data-targeted true", () => {
    render(
      <TargetingGridPreview
        targetRowCount={1}
        maxTargetsPerRow={3}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
      />
    );
    // First 3 slots in ranged should be targeted
    expect(screen.getByTestId("targeting-grid-slot-ranged-0")).toHaveAttribute("data-targeted", "true");
    expect(screen.getByTestId("targeting-grid-slot-ranged-1")).toHaveAttribute("data-targeted", "true");
    expect(screen.getByTestId("targeting-grid-slot-ranged-2")).toHaveAttribute("data-targeted", "true");
    expect(screen.getByTestId("targeting-grid-slot-ranged-3")).toHaveAttribute("data-targeted", "false");
    expect(screen.getByTestId("targeting-grid-slot-ranged-4")).toHaveAttribute("data-targeted", "false");
  });

  it("marks disabled rows with data-enabled false", () => {
    render(
      <TargetingGridPreview
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={["melee", "tank"]}
      />
    );
    expect(screen.getByTestId("targeting-grid-row-ranged")).toHaveAttribute("data-enabled", "false");
    expect(screen.getByTestId("targeting-grid-row-support")).toHaveAttribute("data-enabled", "false");
    expect(screen.getByTestId("targeting-grid-row-melee")).toHaveAttribute("data-enabled", "true");
    expect(screen.getByTestId("targeting-grid-row-tank")).toHaveAttribute("data-enabled", "true");
  });

  it("renders row labels", () => {
    render(
      <TargetingGridPreview
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
      />
    );
    expect(screen.getByText("Ranged")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Melee")).toBeInTheDocument();
    expect(screen.getByText("Tank")).toBeInTheDocument();
  });
});
