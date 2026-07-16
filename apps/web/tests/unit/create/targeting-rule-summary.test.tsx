import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildTargetingRuleSummary,
  TargetingRuleSummary,
} from "~/components/create/targeting-rule-summary";

describe("buildTargetingRuleSummary", () => {
  it("treats an empty row restriction as all rows in combat order", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_health",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
    });

    expect(summary.eligibleRows).toBe("Eligible rows: Tank, Melee, Ranged, and Support.");
  });

  it("caps the effective row count by the eligible row types", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_damage",
      targetRowCount: 4,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: false,
      allowedRowTypes: ["melee", "tank"],
    });

    expect(summary.eligibleRows).toBe("Eligible rows: Tank and Melee.");
    expect(summary.selection).toBe(
      "Hits up to 2 occupied eligible rows per cast. Highest damage chooses up to 3 units in each selected row; they may occupy any positions.",
    );
  });

  it("uses singular copy for a single row and target", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_health",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: ["tank"],
    });

    expect(summary.selection).toBe(
      "Hits up to 1 occupied eligible row per cast. Highest health chooses 1 unit in each selected row; it may occupy any position.",
    );
  });

  it("describes adjacent targets as one group around the primary unit", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "lowest_health",
      targetRowCount: 1,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: true,
      allowedRowTypes: [],
    });

    expect(summary.selection).toBe(
      "Hits up to 1 occupied eligible row per cast. Lowest health chooses the primary unit in each selected row; up to 3 units form one adjacent group around it.",
    );
  });

  it("describes whole-row targeting without a position constraint", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "random",
      targetRowCount: 2,
      maxTargetsPerRow: null,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
    });

    expect(summary.selection).toBe(
      "Hits up to 2 occupied eligible rows per cast. All living units in each selected row are targeted; position does not limit targeting.",
    );
  });

  it("uses safe copy before a priority has been selected", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "",
      targetRowCount: 1,
      maxTargetsPerRow: 2,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
    });

    expect(summary.selection).toContain("The selected priority chooses up to 2 units");
  });
});

describe("TargetingRuleSummary", () => {
  it("renders the complete rule as an atomic polite status", () => {
    render(
      <TargetingRuleSummary
        targetPolicy="highest_health"
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("Eligible rows: Tank, Melee, Ranged, and Support.");
    expect(status).toHaveTextContent("Highest health chooses 1 unit");
  });
});
