import { describe, expect, it } from "vitest";
import { loadBattleScenario } from "../../routers/battleLab/load-scenario";

function queuedExecutor(results: unknown[][]) {
  let selectCount = 0;

  const executor = {
    select() {
      const result = results[selectCount] ?? [];
      selectCount += 1;

      const query = {
        from: () => query,
        innerJoin: () => query,
        where: () => query,
        orderBy: () => query,
        limit: () => query,
        // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are intentionally thenable.
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve),
      };

      return query;
    },
  };

  return {
    executor: executor as unknown as Parameters<typeof loadBattleScenario>[0],
    getSelectCount: () => selectCount,
  };
}

describe("loadBattleScenario", () => {
  it("translates a missing scenario into NOT_FOUND", async () => {
    const { executor, getSelectCount } = queuedExecutor([[]]);

    await expect(loadBattleScenario(executor, "missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Scenario not found",
    });
    expect(getSelectCount()).toBe(1);
  });

  it("skips dependent graph queries when the scenario has no assignments", async () => {
    const { executor, getSelectCount } = queuedExecutor([
      [{ id: "scenario-empty", name: "Empty Field" }],
      [],
    ]);

    await expect(loadBattleScenario(executor, "scenario-empty")).resolves.toEqual({
      id: "scenario-empty",
      name: "Empty Field",
      rows: { tank: [], melee: [], ranged: [], support: [] },
    });
    expect(getSelectCount()).toBe(2);
  });

  it("loads unit targeting and item effects in sequence order", async () => {
    const { executor } = queuedExecutor([
      [{ id: "scenario-a", name: "Ambush at Dawn" }],
      [
        {
          rowType: "ranged",
          slot: 1,
          unit: {
            id: "unit-1",
            name: "Mage",
            health: 60,
            mana: 200,
            meleeDmg: 3,
            rangedDmg: 0,
            manaRegen: 5,
            spellDmg: 30,
            speed: 1,
            dodge: 8,
            criticalChance: 6,
            targetSide: "allies",
            targetPolicy: "lowest_health",
            targetRowCount: 2,
            maxTargetsPerRow: 3,
            targetOnlyAdjacent: true,
          },
        },
      ],
      [
        { unitId: "unit-1", rowType: "support" },
        { unitId: "unit-1", rowType: "ranged" },
      ],
      [
        {
          unitId: "unit-1",
          priority: 1,
          item: {
            id: "item-1",
            name: "Oak Staff",
            meleeDmg: 1,
            rangedDmg: 2,
            mana: 25,
            manaRegen: 3,
            spellDmg: 4,
            dodge: 5,
            criticalChance: 6,
            activationManaCost: 7,
            activationHealthCost: 8,
          },
        },
      ],
      [
        {
          itemId: "item-1",
          sequenceOrder: 2,
          effect: { id: "effect-2", name: "Burn" },
        },
        {
          itemId: "item-1",
          sequenceOrder: 1,
          effect: { id: "effect-1", name: "Scorch" },
        },
      ],
    ]);

    const scenario = await loadBattleScenario(executor, "scenario-a");

    expect(scenario.rows?.ranged?.[0]).toMatchObject({
      targetSide: "allies",
      targetPolicy: "lowest_health",
      targetRowCount: 2,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: true,
      allowedRowTypes: ["ranged", "support"],
      items: [
        {
          name: "Oak Staff",
          effects: [
            { sequenceOrder: 1, effect: { name: "Scorch" } },
            { sequenceOrder: 2, effect: { name: "Burn" } },
          ],
        },
      ],
    });
  });
});
