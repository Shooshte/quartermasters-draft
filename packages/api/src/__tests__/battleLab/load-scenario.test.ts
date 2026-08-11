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

  it("loads unit targeting, item placement rows, and item effects in sequence order", async () => {
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
            targetScope: "self_allies",
            targetPriority: "support",
            targetCount: 3,
            selectionShape: "adjacent",
          },
        },
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
        { itemId: "item-1", rowType: "support" },
        { itemId: "item-1", rowType: "ranged" },
      ],
      [
        {
          itemId: "item-1",
          sequenceOrder: 2,
          effect: {
            id: "effect-2",
            name: "Burn",
            timingType: "interval",
            effectType: "damage",
            triggerEveryActions: 2,
            triggerCount: 3,
            lastsForActions: null,
          },
        },
        {
          itemId: "item-1",
          sequenceOrder: 1,
          effect: {
            id: "effect-1",
            name: "Scorch",
            timingType: "instant",
            effectType: "debuff",
            triggerEveryActions: null,
            triggerCount: null,
            lastsForActions: 3,
          },
        },
      ],
    ]);

    const scenario = await loadBattleScenario(executor, "scenario-a");

    expect(scenario.rows?.ranged?.[0]).toMatchObject({
      targetScope: "self_allies",
      targetPriority: "support",
      targetCount: 3,
      selectionShape: "adjacent",
      items: [
        {
          id: "item-1",
          name: "Oak Staff",
          allowedRowTypes: ["ranged", "support"],
          effects: [
            { sequenceOrder: 1, effect: { name: "Scorch", lastsForActions: 3 } },
            {
              sequenceOrder: 2,
              effect: { name: "Burn", triggerEveryActions: 2, triggerCount: 3 },
            },
          ],
        },
      ],
    });
  });
});
