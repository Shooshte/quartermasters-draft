import type { AppRouter } from "@qd/api";
import { render, screen, within } from "@testing-library/react";
import type { inferRouterOutputs } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { BattleResultView } from "~/components/battle/battle-result";

type ReplayOutput = inferRouterOutputs<AppRouter>["battleLab"]["get"];
type BattleUnit = ReplayOutput["result"]["finalState"]["scenarios"][number]["rows"]["tank"][number];

const stats = {
  health: 120,
  mana: 100,
  meleeDmg: 28,
  rangedDmg: 0,
  manaRegen: 2,
  spellDmg: 0,
  speed: 14,
  dodge: 0,
  criticalChance: 0,
};

const zeroStats = {
  health: 0,
  mana: 0,
  meleeDmg: 0,
  rangedDmg: 0,
  manaRegen: 0,
  spellDmg: 0,
  speed: 0,
  dodge: 0,
  criticalChance: 0,
};

function unit(overrides: Partial<BattleUnit>): BattleUnit {
  return {
    instanceId: "scenario-a:tank:1",
    templateId: "unit-1",
    scenarioId: "scenario-a",
    rowType: "tank",
    slot: 1,
    name: "Dawn Warden",
    baseStats: stats,
    itemBonusStats: zeroStats,
    currentHealth: 82,
    mana: 34,
    actionBar: 61,
    items: [],
    targetSide: "enemies",
    targetPolicy: "lowest_health",
    targetRowCount: 1,
    maxTargetsPerRow: 1,
    targetOnlyAdjacent: false,
    allowedRowTypes: [],
    targetPolicyOverride: null,
    activeEffects: [],
    actedCount: 7,
    ...overrides,
  };
}

const attackLog = {
  tick: 11,
  type: "attack" as const,
  attacker: "Dawn Warden",
  attackerId: "scenario-a:tank:1",
  target: "Iron Guard",
  targetId: "scenario-b:melee:1",
  damage: 28,
  message: "Tick 11: Dawn Warden attacks Iron Guard for 28 damage",
};

const battleEndLog = {
  tick: 184,
  type: "battle-end" as const,
  outcome: "Ambush at Dawn",
  winnerId: "scenario-a",
  message: "Tick 184: Battle ends: Ambush at Dawn wins",
};

const fixture: Pick<ReplayOutput, "scenarios" | "result"> = {
  scenarios: [
    { id: "scenario-a", name: "Ambush at Dawn" },
    { id: "scenario-b", name: "The Iron Line" },
  ],
  result: {
    winnerId: "scenario-a",
    ticksElapsed: 184,
    finalState: {
      tick: 184,
      status: "finished",
      winnerId: "scenario-a",
      fatigueTickThreshold: 100,
      fatigueDamageStart: 1,
      scenarios: [
        {
          id: "scenario-a",
          name: "Ambush at Dawn",
          rows: {
            tank: [
              unit({
                activeEffects: [
                  {
                    id: "burning-1",
                    name: "Burning",
                    sourceUnitId: "scenario-b:ranged:1",
                    sourceScenarioId: "scenario-b",
                    targetUnitId: "scenario-a:tank:1",
                    effectType: "damage",
                    timingType: "interval",
                    value: 4,
                    remainingTriggers: 2,
                    nextTriggerTick: 190,
                    intervalTicks: 10,
                  },
                ],
              }),
            ],
            melee: [],
            ranged: [
              unit({
                instanceId: "scenario-a:ranged:1",
                rowType: "ranged",
                name: "Sun Archer",
                currentHealth: 0,
                baseStats: { ...stats, health: 70 },
              }),
            ],
            support: [],
          },
        },
        {
          id: "scenario-b",
          name: "The Iron Line",
          rows: {
            tank: [],
            melee: [
              unit({
                instanceId: "scenario-b:melee:1",
                scenarioId: "scenario-b",
                rowType: "melee",
                name: "Iron Guard",
                currentHealth: 0,
              }),
            ],
            ranged: [],
            support: [],
          },
        },
      ],
      log: [attackLog, battleEndLog],
    },
    log: [attackLog, battleEndLog],
  },
};

describe("BattleResultView", () => {
  it("renders the winner, final unit ledgers, active effects, and ordered event log", () => {
    render(<BattleResultView scenarios={fixture.scenarios} result={fixture.result} />);

    expect(screen.getByRole("heading", { name: "Ambush at Dawn wins" })).toBeVisible();
    expect(screen.getByText("184 ticks")).toBeVisible();
    expect(screen.getByRole("cell", { name: "82 / 120" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Alive" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "Dead" })).toHaveLength(2);
    expect(screen.getByText("Burning (2 triggers remaining)")).toBeVisible();
    expect(screen.getByText("Battle ended: Ambush at Dawn.")).toBeVisible();

    const firstLedger = screen.getByRole("table", { name: "Ambush at Dawn final state" });
    const unitNames = within(firstLedger)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("cell")[0]?.textContent);
    expect(unitNames).toEqual(["Dawn Warden", "Sun Archer"]);

    const events = screen.getByRole("list", { name: "Battle events" });
    expect(
      within(events)
        .getAllByRole("listitem")
        .map((entry) => entry.textContent),
    ).toEqual([
      "Basic attackDealt 28 damage to Iron Guard · The Iron Line / Melee 1.",
      "Battle ended: Ambush at Dawn.",
    ]);
  });

  it("renders a draw when neither scenario wins", () => {
    render(
      <BattleResultView
        scenarios={fixture.scenarios}
        result={{ ...fixture.result, winnerId: null }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Draw" })).toBeVisible();
  });

  it("renders attributed turn blocks without per-event tick labels", () => {
    const actionId = "11:scenario-a:tank:1:8";
    const result = {
      ...fixture.result,
      log: [
        {
          ...attackLog,
          actionId,
          origin: {
            kind: "basic-attack",
            actionId,
            sourceUnitId: attackLog.attackerId,
          },
        },
        {
          tick: 11,
          type: "damage",
          source: attackLog.attacker,
          sourceId: attackLog.attackerId,
          target: attackLog.target,
          targetId: attackLog.targetId,
          damage: attackLog.damage,
          actionId,
          origin: {
            kind: "basic-attack",
            actionId,
            sourceUnitId: attackLog.attackerId,
          },
          message: "Tick 11: Dawn Warden hits Iron Guard for 28 damage",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const events = screen.getByRole("list", { name: "Battle events" });
    expect(within(events).getByText("Dawn Warden · Ambush at Dawn / Tank 1")).toBeVisible();
    expect(within(events).getByText(/Iron Guard · The Iron Line \/ Melee 1/)).toBeVisible();
    expect(within(events).getByText("Basic attack")).toBeVisible();
    expect(within(events).queryByText("Tick 11", { exact: false })).not.toBeInTheDocument();
  });

  it("shows item-effect attribution on immediate and delayed outcomes", () => {
    const actionId = "11:scenario-a:tank:1:8";
    const itemOrigin = {
      kind: "item-effect",
      actionId,
      sourceUnitId: attackLog.attackerId,
      item: { name: "Oak Staff", position: 1 },
    };
    const result = {
      ...fixture.result,
      log: [
        {
          tick: 11,
          type: "item-activation",
          caster: attackLog.attacker,
          casterId: attackLog.attackerId,
          item: "Oak Staff",
          targets: [attackLog.target],
          targetIds: [attackLog.targetId],
          effects: ["Impact", "Burning"],
          actionId,
          origin: itemOrigin,
          message: "Tick 11: Dawn Warden activates Oak Staff on Iron Guard",
        },
        {
          tick: 11,
          type: "damage",
          source: attackLog.attacker,
          sourceId: attackLog.attackerId,
          target: attackLog.target,
          targetId: attackLog.targetId,
          damage: 20,
          actionId,
          origin: { ...itemOrigin, effect: { name: "Impact", position: 1 } },
          message: "Tick 11: Dawn Warden hits Iron Guard for 20 damage",
        },
        {
          tick: 19,
          type: "damage",
          source: attackLog.attacker,
          sourceId: attackLog.attackerId,
          target: attackLog.target,
          targetId: attackLog.targetId,
          damage: 8,
          origin: { ...itemOrigin, effect: { name: "Burning", position: 2 } },
          message: "Tick 19: Dawn Warden hits Iron Guard for 8 damage",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const events = screen.getByRole("list", { name: "Battle events" });
    expect(within(events).getByText("Oak Staff")).toBeVisible();
    expect(within(events).getByText(/Impact dealt 20 damage/)).toBeVisible();
    expect(within(events).getByText(/Burning dealt 8 damage/)).toBeVisible();
    expect(
      within(events).getByText("From Dawn Warden · Ambush at Dawn / Tank 1 · Oak Staff"),
    ).toBeVisible();
  });
});
