import type { ReplayOutput } from "@qd/api-client";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BattleResultView } from "~/components/battle/battle-result";

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
    targetScope: "enemies",
    targetPriority: "lowest_health",
    targetCount: 1,
    selectionShape: "individual",
    activeEffects: [],
    shieldLayers: [],
    actedCount: 7,
    ...overrides,
  };
}

const attackLog = {
  batchNumber: 1,
  type: "attack" as const,
  attacker: "Dawn Warden",
  attackerId: "scenario-a:tank:1",
  target: "Iron Guard",
  targetId: "scenario-b:melee:1",
  damage: 28,
  message: "Dawn Warden attacks Iron Guard for 28 damage",
};

const battleEndLog = {
  batchNumber: 93,
  type: "battle-end" as const,
  outcome: "Ambush at Dawn",
  winnerId: "scenario-a",
  message: "Battle ends: Ambush at Dawn wins",
};

const fixture: Pick<ReplayOutput, "scenarios" | "result"> = {
  scenarios: [
    { id: "scenario-a", name: "Ambush at Dawn" },
    { id: "scenario-b", name: "The Iron Line" },
  ],
  result: {
    winnerId: "scenario-a",
    actionsResolved: 184,
    finalState: {
      actionCount: 184,
      batchCount: 93,
      status: "finished",
      winnerId: "scenario-a",
      fatigueActionThreshold: 500,
      fatigueDamageStart: 1,
      scenarios: [
        {
          id: "scenario-a",
          name: "Ambush at Dawn",
          rows: {
            tank: [
              unit({
                shieldLayers: [
                  { id: "ward-1", remaining: 10 },
                  { id: "ward-2", remaining: 5 },
                ],
                activeEffects: [
                  {
                    id: "focused-1",
                    name: "Focused",
                    sourceUnitId: "scenario-b:ranged:1",
                    sourceScenarioId: "scenario-b",
                    targetUnitId: "scenario-a:tank:1",
                    effectType: "buff",
                    timingType: "instant",
                    statKey: "speed",
                    value: 4,
                    actionsRemaining: 2,
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
    expect(screen.getByText("184 actions resolved")).toBeVisible();
    expect(screen.getByRole("cell", { name: "82 / 120" })).toBeVisible();
    const firstLedger = screen.getByRole("table", { name: "Ambush at Dawn final state" });
    expect(within(firstLedger).getByRole("columnheader", { name: "Shield" })).toBeVisible();
    expect(within(firstLedger).getByRole("cell", { name: "15" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Alive" })).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "Dead" })).toHaveLength(2);
    expect(screen.getByText("Focused (2 actions remaining)")).toBeVisible();
    expect(screen.getByText("Battle ended: Ambush at Dawn.")).toBeVisible();
    expect(screen.queryByText(new RegExp(["ti", "ck"].join(""), "i"))).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Grouped by simultaneous action batch. Display order does not determine outcomes.",
      ),
    ).toBeVisible();

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

  it("renders normal and effective final stats in the unit ledger", () => {
    const finalStateUnit = unit({
      itemBonusStats: { ...zeroStats, mana: 20, meleeDmg: 4, dodge: 2 },
      activeEffects: [
        { statKey: "health", value: 20 },
        { statKey: "mana", value: 10 },
        { statKey: "meleeDmg", value: 6 },
        { statKey: "speed", value: -4 },
        { statKey: "dodge", value: -50 },
        { value: 100 },
      ] as BattleUnit["activeEffects"],
    });
    const result: typeof fixture.result = {
      ...fixture.result,
      finalState: {
        ...fixture.result.finalState,
        scenarios: [
          {
            ...fixture.result.finalState.scenarios[0],
            rows: {
              ...fixture.result.finalState.scenarios[0].rows,
              tank: [finalStateUnit],
            },
          },
          fixture.result.finalState.scenarios[1],
        ],
      },
    };

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const ledger = screen.getByRole("table", { name: "Ambush at Dawn final state" });
    const dawnWardenRow = within(ledger).getAllByRole("row")[1];

    expect(within(dawnWardenRow).getByRole("cell", { name: "82 / 140" })).toBeVisible();
    expect(within(dawnWardenRow).getByRole("cell", { name: "34 / 130" })).toBeVisible();
    expect(dawnWardenRow).toHaveTextContent(/Melee damage\s*32 →\s*38/);
    expect(dawnWardenRow).toHaveTextContent(/Speed\s*14 →\s*10/);
    expect(dawnWardenRow).toHaveTextContent(/Ranged damage\s*0/);
    expect(dawnWardenRow).toHaveTextContent(/Mana regeneration\s*2/);
    expect(dawnWardenRow).toHaveTextContent(/Spell damage\s*0/);
    expect(dawnWardenRow).toHaveTextContent(/Dodge\s*2 →\s*0/);
    expect(dawnWardenRow).toHaveTextContent(/Critical chance\s*0/);
  });

  it("renders a draw when neither scenario wins", () => {
    const actionLimitResult = {
      ...fixture.result,
      winnerId: null,
      log: [
        {
          ...battleEndLog,
          outcome: "draw",
          winnerId: null,
          message: "Battle ends at the action limit: draw",
        },
      ],
    };

    render(<BattleResultView scenarios={fixture.scenarios} result={actionLimitResult} />);

    expect(screen.getByRole("heading", { name: "Draw" })).toBeVisible();
    expect(screen.getByText("Battle ended at the action limit: draw.")).toBeVisible();
  });

  it("renders simultaneous actions as peer turns in one labeled batch", () => {
    const actionId = "action-dawn-warden-8";
    const simultaneousActionId = "action-iron-guard-8";
    const result = {
      ...fixture.result,
      log: [
        {
          ...attackLog,
          batchNumber: 4,
          actionId,
          origin: {
            kind: "basic-attack",
            actionId,
            sourceUnitId: attackLog.attackerId,
          },
        },
        {
          batchNumber: 4,
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
          message: "Dawn Warden hits Iron Guard for 28 damage",
        },
        {
          batchNumber: 4,
          type: "attack",
          attacker: attackLog.target,
          attackerId: attackLog.targetId,
          target: attackLog.attacker,
          targetId: attackLog.attackerId,
          damage: 21,
          actionId: simultaneousActionId,
          origin: {
            kind: "basic-attack",
            actionId: simultaneousActionId,
            sourceUnitId: attackLog.targetId,
          },
          message: "Iron Guard attacks Dawn Warden for 21 damage",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const events = screen.getByRole("list", { name: "Battle events" });
    const simultaneousActions = within(events).getByRole("list", {
      name: "Simultaneous actions in batch 4",
    });
    expect(within(events).getByText("Simultaneous actions · Batch 4")).toBeVisible();
    expect(within(simultaneousActions).getAllByRole("listitem")).toHaveLength(2);
    expect(within(events).getByText("Dawn Warden · Ambush at Dawn / Tank 1")).toBeVisible();
    expect(within(events).getByText("Iron Guard · The Iron Line / Melee 1")).toBeVisible();
    expect(within(events).getAllByText("Basic attack")).toHaveLength(2);
    expect(
      within(events).queryByText(new RegExp(["ti", "ck"].join(""), "i")),
    ).not.toBeInTheDocument();
  });

  it("renders pre-action effects before peer turns and post-action events afterward", () => {
    const actionId = "action-dawn-warden-8";
    const simultaneousActionId = "action-iron-guard-8";
    const result = {
      ...fixture.result,
      log: [
        {
          batchNumber: 4,
          type: "damage",
          source: attackLog.target,
          sourceId: attackLog.targetId,
          target: attackLog.attacker,
          targetId: attackLog.attackerId,
          damage: 5,
          origin: {
            kind: "item-effect",
            sourceUnitId: attackLog.targetId,
            effect: { name: "Poison", position: 1 },
          },
          message: "Poison hits Dawn Warden for 5 damage",
        },
        {
          ...attackLog,
          batchNumber: 4,
          actionId,
          origin: {
            kind: "basic-attack",
            actionId,
            sourceUnitId: attackLog.attackerId,
          },
        },
        {
          ...attackLog,
          batchNumber: 4,
          attacker: attackLog.target,
          attackerId: attackLog.targetId,
          target: attackLog.attacker,
          targetId: attackLog.attackerId,
          damage: 21,
          actionId: simultaneousActionId,
          origin: {
            kind: "basic-attack",
            actionId: simultaneousActionId,
            sourceUnitId: attackLog.targetId,
          },
          message: "Iron Guard attacks Dawn Warden for 21 damage",
        },
        {
          batchNumber: 4,
          type: "fatigue",
          target: attackLog.attacker,
          targetId: attackLog.attackerId,
          damage: 3,
          origin: { kind: "fatigue" },
          message: "Fatigue hits Dawn Warden for 3 damage",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const events = screen.getByRole("list", { name: "Battle events" });
    const poison = within(events).getByText(/Poison dealt 5 damage/);
    const simultaneousActions = within(events).getByText("Simultaneous actions · Batch 4");
    const fatigue = within(events).getByText(/Fatigue dealt 3 damage/);

    expect(poison.compareDocumentPosition(simultaneousActions)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(simultaneousActions.compareDocumentPosition(fatigue)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      within(events).getByRole("list", { name: "Simultaneous actions in batch 4" }),
    ).toBeVisible();
  });

  it("shows item-effect attribution on immediate and delayed outcomes", () => {
    const actionId = "action-dawn-warden-8";
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
          batchNumber: 4,
          type: "item-activation",
          caster: attackLog.attacker,
          casterId: attackLog.attackerId,
          item: "Oak Staff",
          targets: [attackLog.target],
          targetIds: [attackLog.targetId],
          effects: ["Impact", "Burning"],
          actionId,
          origin: itemOrigin,
          message: "Dawn Warden activates Oak Staff on Iron Guard",
        },
        {
          batchNumber: 4,
          type: "damage",
          source: attackLog.attacker,
          sourceId: attackLog.attackerId,
          target: attackLog.target,
          targetId: attackLog.targetId,
          damage: 20,
          actionId,
          origin: { ...itemOrigin, effect: { name: "Impact", position: 1 } },
          message: "Dawn Warden hits Iron Guard for 20 damage",
        },
        {
          batchNumber: 9,
          type: "damage",
          source: attackLog.attacker,
          sourceId: attackLog.attackerId,
          target: attackLog.target,
          targetId: attackLog.targetId,
          damage: 8,
          origin: { ...itemOrigin, effect: { name: "Burning", position: 2 } },
          message: "Dawn Warden hits Iron Guard for 8 damage",
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

  it("nests detailed modifier applications and expirations beneath their effect headings", () => {
    const actionId = "action-dawn-warden-8";
    const effectOrigin = {
      kind: "item-effect",
      actionId,
      sourceUnitId: attackLog.attackerId,
      item: { id: "hood", name: "Acolyte Hood", position: 1 },
      effect: { id: "all-stats", name: "+10 all stats, 2 actions", position: 1 },
    };
    const result = {
      ...fixture.result,
      log: [
        {
          batchNumber: 4,
          type: "item-activation",
          caster: attackLog.attacker,
          casterId: attackLog.attackerId,
          item: "Acolyte Hood",
          targets: [attackLog.target],
          targetIds: [attackLog.targetId],
          effects: ["+10 all stats, 2 actions"],
          actionId,
          origin: effectOrigin,
          message: "Dawn Warden activates Acolyte Hood",
        },
        {
          batchNumber: 4,
          type: "effect-apply",
          effect: "+10 all stats, 2 actions",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          stat: "health",
          value: 10,
          actionsRemaining: 2,
          actionId,
          origin: effectOrigin,
          message: "Health modified",
        },
        {
          batchNumber: 4,
          type: "effect-apply",
          effect: "+10 all stats, 2 actions",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          stat: "speed",
          value: 10,
          actionsRemaining: 2,
          actionId,
          origin: effectOrigin,
          message: "Speed modified",
        },
        {
          batchNumber: 7,
          type: "effect-expire",
          effect: "+10 all stats, 2 actions",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          stat: "health",
          value: 10,
          actionsRemaining: 0,
          origin: effectOrigin,
          message: "Health expired",
        },
        {
          batchNumber: 7,
          type: "effect-expire",
          effect: "+10 all stats, 2 actions",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          stat: "speed",
          value: 10,
          actionsRemaining: 0,
          origin: effectOrigin,
          message: "Speed expired",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    const events = screen.getByRole("list", { name: "Battle events" });
    const effectHeading = within(events).getByText("+10 all stats, 2 actions", { exact: true });
    expect(effectHeading).toBeVisible();
    expect(
      within(events).getByText(
        "Health: +10 on Iron Guard · The Iron Line / Melee 1 (2 actions remaining).",
      ),
    ).toBeVisible();
    expect(
      within(events).getByText(
        "Speed: +10 on Iron Guard · The Iron Line / Melee 1 (2 actions remaining).",
      ),
    ).toBeVisible();
    expect(
      within(events).getByText(
        "+10 all stats, 2 actions expired on Iron Guard · The Iron Line / Melee 1.",
      ),
    ).toBeVisible();
    expect(within(events).getByText("Health: +10 expired.")).toBeVisible();
    expect(within(events).getByText("Speed: +10 expired.")).toBeVisible();

    const effectBlock = effectHeading.parentElement?.parentElement;
    expect(effectBlock).toContainElement(
      within(events).getByText(
        "Health: +10 on Iron Guard · The Iron Line / Melee 1 (2 actions remaining).",
      ),
    );
    expect(effectBlock).toContainElement(
      within(events).getByText(
        "Speed: +10 on Iron Guard · The Iron Line / Melee 1 (2 actions remaining).",
      ),
    );
  });

  it("keeps legacy effect application sentences when modifier values are absent", () => {
    const result = {
      ...fixture.result,
      log: [
        {
          batchNumber: 4,
          type: "effect-apply",
          effect: "Ward",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          message: "Ward applied",
        },
      ],
    } as unknown as ReplayOutput["result"];

    render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

    expect(screen.getByText("Ward applied to Iron Guard · The Iron Line / Melee 1.")).toBeVisible();
  });

  it("renders seven multi-stat expiration rows without duplicate React keys", () => {
    const effectOrigin = {
      kind: "item-effect",
      sourceUnitId: attackLog.attackerId,
      item: { id: "hood", name: "Acolyte Hood", position: 1 },
      effect: { id: "all-stats", name: "+10 all stats, 2 actions", position: 1 },
    };
    const result = {
      ...fixture.result,
      log: ["health", "mana", "meleeDmg", "rangedDmg", "manaRegen", "spellDmg", "speed"].map(
        (stat) => ({
          batchNumber: 7,
          type: "effect-expire",
          effect: "+10 all stats, 2 actions",
          target: "Iron Guard",
          targetId: "scenario-b:melee:1",
          stat,
          value: 10,
          actionsRemaining: 0,
          origin: effectOrigin,
          message: "+10 all stats, 2 actions expires on Iron Guard",
        }),
      ),
    } as unknown as ReplayOutput["result"];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      render(<BattleResultView scenarios={fixture.scenarios} result={result} />);

      expect(screen.getAllByText(/: \+10 expired\./)).toHaveLength(7);
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
        "Encountered two children with the same key",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
