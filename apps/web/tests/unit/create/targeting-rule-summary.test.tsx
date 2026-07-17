import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildTargetingRuleSummary,
  buildTargetSideSummary,
  type TargetingEffectSummary,
  TargetingRuleSummary,
} from "~/components/create/targeting-rule-summary";

function linkedEffect(
  id: string,
  name: string,
  effectType: TargetingEffectSummary["effectType"],
): TargetingEffectSummary {
  return { id, name, effectType };
}

describe("buildTargetSideSummary", () => {
  it.each([
    ["buff", "Barbarian Roar", "Buff"],
    ["healing", "Heal Light", "Healing"],
  ] as const)("maps a first %s effect to allies", (effectType, name, label) => {
    expect(
      buildTargetSideSummary("self_and_others", [linkedEffect("first", name, effectType)]),
    ).toBe(
      `Target side: Allies, including the caster. The first linked effect, ${name} (${label}), determines the target side for every effect in this spell.`,
    );
  });

  it.each([
    ["damage", "Arcane Damage", "Damage"],
    ["debuff", "Exhaust", "Debuff"],
  ] as const)("maps a first %s effect to enemies", (effectType, name, label) => {
    expect(
      buildTargetSideSummary("self_and_others", [linkedEffect("first", name, effectType)]),
    ).toBe(
      `Target side: Enemies. The first linked effect, ${name} (${label}), determines the target side for every effect in this spell.`,
    );
  });

  it("describes Others scope as allies without the caster", () => {
    expect(
      buildTargetSideSummary("others", [linkedEffect("first", "Heal Light", "healing")]),
    ).toContain("Target side: Allies other than the caster.");
  });

  it("describes the eligible-row condition for the Self scope override", () => {
    expect(buildTargetSideSummary("self", [linkedEffect("first", "Arcane Damage", "damage")])).toBe(
      "Target side: Caster. Self scope overrides the first effect's normal allegiance; if the caster's current row is eligible, every linked effect applies to the caster.",
    );
  });

  it("prompts for the first effect when no effect is linked", () => {
    expect(buildTargetSideSummary("self_and_others", [])).toBe(
      "Target side: Add an effect to determine whether this spell targets allies or enemies.",
    );
  });

  it("waits when first-effect metadata is unavailable", () => {
    expect(buildTargetSideSummary("self_and_others", [null])).toBe(
      "Target side: Waiting for the first linked effect's details.",
    );
  });

  it("warns that enemy-side later effects still apply to allies", () => {
    expect(
      buildTargetSideSummary("self_and_others", [
        linkedEffect("buff", "Barbarian Roar", "buff"),
        linkedEffect("damage", "Arcane Damage", "damage"),
        linkedEffect("debuff", "Exhaust", "debuff"),
        linkedEffect("damage-2", "Frostbite", "damage"),
      ]),
    ).toContain(
      "Mixed effects keep this target side; later Damage and Debuff effects also apply to those allies.",
    );
  });

  it("warns that ally-side later effects still apply to enemies", () => {
    expect(
      buildTargetSideSummary("self_and_others", [
        linkedEffect("damage", "Arcane Damage", "damage"),
        linkedEffect("healing", "Heal Light", "healing"),
        linkedEffect("buff", "Barbarian Roar", "buff"),
      ]),
    ).toContain(
      "Mixed effects keep this target side; later Healing and Buff effects also apply to those enemies.",
    );
  });

  it("omits the warning while later metadata is unavailable", () => {
    const copy = buildTargetSideSummary("self_and_others", [
      linkedEffect("buff", "Barbarian Roar", "buff"),
      null,
      linkedEffect("damage", "Arcane Damage", "damage"),
    ]);

    expect(copy).toContain("Target side: Allies, including the caster.");
    expect(copy).not.toContain("Mixed effects keep this target side");
  });
});

describe("buildTargetingRuleSummary", () => {
  it("treats an empty row restriction as all rows in combat order", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_health",
      targetScope: "self_and_others",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
      linkedEffects: [],
    });

    expect(summary.eligibleRows).toBe("Eligible rows: Tank, Melee, Ranged, and Support.");
  });

  it("caps the effective row count by the eligible row types", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_damage",
      targetScope: "self_and_others",
      targetRowCount: 4,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: false,
      allowedRowTypes: ["melee", "tank"],
      linkedEffects: [],
    });

    expect(summary.eligibleRows).toBe("Eligible rows: Tank and Melee.");
    expect(summary.selection).toBe(
      "Hits up to 2 occupied eligible rows per cast. Highest damage chooses up to 3 units in each selected row; they may occupy any positions.",
    );
  });

  it("explains that Self selects only an eligible caster regardless of other selection rules", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_damage",
      targetScope: "self",
      targetRowCount: 4,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: true,
      allowedRowTypes: ["melee", "tank"],
      linkedEffects: [linkedEffect("first", "Arcane Damage", "damage")],
    });

    expect(summary.eligibleRows).toBe("Eligible rows: Tank and Melee.");
    expect(summary.selection).toBe(
      "Self scope selects only the caster when the caster's current row is eligible; otherwise the spell has no target. Row count, per-row limit, position rule, and priority do not add targets.",
    );
    expect(summary.targetSide).toBe(
      "Target side: Caster. Self scope overrides the first effect's normal allegiance; if the caster's current row is eligible, every linked effect applies to the caster.",
    );
    expect(summary.selection).not.toContain("occupied eligible rows");
    expect(summary.selection).not.toContain("adjacent group");
  });

  it("uses singular copy for a single row and target", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "highest_health",
      targetScope: "self_and_others",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: ["tank"],
      linkedEffects: [],
    });

    expect(summary.selection).toBe(
      "Hits up to 1 occupied eligible row per cast. Highest health chooses 1 unit in each selected row; it may occupy any position.",
    );
  });

  it("describes adjacent targets as one group around the primary unit", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "lowest_health",
      targetScope: "self_and_others",
      targetRowCount: 1,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: true,
      allowedRowTypes: [],
      linkedEffects: [],
    });

    expect(summary.selection).toBe(
      "Hits up to 1 occupied eligible row per cast. Lowest health chooses the primary unit in each selected row; up to 3 units form one adjacent group around it.",
    );
  });

  it("describes whole-row targeting without a position constraint", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "random",
      targetScope: "self_and_others",
      targetRowCount: 2,
      maxTargetsPerRow: null,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
      linkedEffects: [],
    });

    expect(summary.selection).toBe(
      "Hits up to 2 occupied eligible rows per cast. All living units in each selected row are targeted; position does not limit targeting.",
    );
  });

  it("uses safe copy before a priority has been selected", () => {
    const summary = buildTargetingRuleSummary({
      targetPolicy: "",
      targetScope: "self_and_others",
      targetRowCount: 1,
      maxTargetsPerRow: 2,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
      linkedEffects: [],
    });

    expect(summary.selection).toContain("The selected priority chooses up to 2 units");
  });
});

describe("TargetingRuleSummary", () => {
  it("renders the complete rule as an atomic polite status", () => {
    render(
      <TargetingRuleSummary
        targetPolicy="highest_health"
        targetScope="self_and_others"
        targetRowCount={1}
        maxTargetsPerRow={1}
        targetOnlyAdjacent={false}
        allowedRowTypes={[]}
        linkedEffects={[]}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("Eligible rows: Tank, Melee, Ranged, and Support.");
    expect(status).toHaveTextContent("Highest health chooses 1 unit");
    expect(status).toHaveTextContent(
      "Target side: Add an effect to determine whether this spell targets allies or enemies.",
    );
  });
});
