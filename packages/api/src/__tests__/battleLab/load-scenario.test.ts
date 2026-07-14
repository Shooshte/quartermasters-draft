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
});
