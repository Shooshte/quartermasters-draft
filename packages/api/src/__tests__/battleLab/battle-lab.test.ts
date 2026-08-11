import { BattleEngine, type ScenarioInput } from "@qd/engine";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chainable, describeAuthGuard, gmCtx } from "../scenarioBuilder/test-utils";

const SCENARIO_A_ID = "a0000000-0000-4000-8000-000000000001";
const SCENARIO_B_ID = "b0000000-0000-4000-8000-000000000002";
const REPLAY_ID = "c0000000-0000-4000-8000-000000000003";
const SEEDED_SCENARIO_A_ID = "a2000000-0000-0000-0000-000000000001";
const SEEDED_SCENARIO_B_ID = "a2000000-0000-0000-0000-000000000002";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const mockLoadBattleScenario = vi.fn();

vi.mock("../../routers/battleLab/load-scenario", () => ({
  loadBattleScenario: mockLoadBattleScenario,
}));

const { createCaller } = await import("../../root");

const stats = {
  health: 10,
  mana: 100,
  meleeDmg: 10,
  rangedDmg: 0,
  manaRegen: 0,
  spellDmg: 0,
  speed: 100,
  dodge: 0,
  criticalChance: 0,
};

function livingScenario(id: string, name: string): ScenarioInput {
  return {
    id,
    name,
    rows: {
      tank: [{ id: `${id}-unit`, name: `${name} Unit`, stats }],
    },
  };
}

const scenarioA = livingScenario(SCENARIO_A_ID, "Alpha");
const scenarioB = livingScenario(SCENARIO_B_ID, "Bravo");
const createdAt = new Date("2026-07-12T12:00:00.000Z");
const replay = {
  id: REPLAY_ID,
  scenarioAId: SCENARIO_A_ID,
  scenarioBId: SCENARIO_B_ID,
  seed: "fixed-seed",
  createdAt,
};

describe("battleLabRouter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSelect.mockReset();
    mockInsert.mockReset();
    mockUpdate.mockReset();
    mockLoadBattleScenario.mockReset();
  });

  describe("scenarioOptions", () => {
    describeAuthGuard((ctx) => createCaller(ctx).battleLab.scenarioOptions());

    it("returns scenarios ordered by name and id", async () => {
      const options = [
        { id: SCENARIO_A_ID, name: "Alpha" },
        { id: SCENARIO_B_ID, name: "Bravo" },
      ];
      const query = chainable(options);
      mockSelect.mockReturnValue(query);

      await expect(createCaller(gmCtx).battleLab.scenarioOptions()).resolves.toEqual(options);
      expect(query.orderBy).toHaveBeenCalledOnce();
      expect(query.orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything());
    });
  });

  describe("create", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).battleLab.create({
        scenarioAId: SCENARIO_A_ID,
        scenarioBId: SCENARIO_B_ID,
        seed: "fixed-seed",
      }),
    );

    it("rejects identical scenarios", async () => {
      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_A_ID,
          seed: "mirror",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects case-variant identical scenarios before loading them", async () => {
      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_A_ID.toUpperCase(),
          seed: "mirror",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("Choose two different scenarios."),
      });
      expect(mockLoadBattleScenario).not.toHaveBeenCalled();
    });

    it("rejects a blank seed", async () => {
      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "   ",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("does not consume queued persistence mocks when validation fails", async () => {
      mockLoadBattleScenario
        .mockResolvedValueOnce(livingScenario(SCENARIO_A_ID, "Stale Alpha"))
        .mockResolvedValueOnce(livingScenario(SCENARIO_B_ID, "Stale Bravo"));
      mockInsert.mockReturnValueOnce(chainable([{ ...replay, seed: "stale-seed" }]));

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "   ",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockLoadBattleScenario).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("starts a valid call without queued values from a previous test", async () => {
      const freshScenarioA = livingScenario(SCENARIO_A_ID, "Fresh Alpha");
      const freshScenarioB = livingScenario(SCENARIO_B_ID, "Fresh Bravo");
      mockLoadBattleScenario.mockImplementation((_executor, id) =>
        Promise.resolve(id === SCENARIO_A_ID ? freshScenarioA : freshScenarioB),
      );
      mockInsert.mockReturnValue(chainable([{ ...replay, seed: "fresh-seed" }]));

      const result = await createCaller(gmCtx).battleLab.create({
        scenarioAId: SCENARIO_A_ID,
        scenarioBId: SCENARIO_B_ID,
        seed: "fresh-seed",
      });

      expect(result.scenarios).toEqual([
        { id: SCENARIO_A_ID, name: "Fresh Alpha" },
        { id: SCENARIO_B_ID, name: "Fresh Bravo" },
      ]);
      expect(result.replay.seed).toBe("fresh-seed");
    });

    it("accepts deterministic seeded scenario IDs", async () => {
      const seededScenarioA = livingScenario(SEEDED_SCENARIO_A_ID, "Seeded Alpha");
      const seededScenarioB = livingScenario(SEEDED_SCENARIO_B_ID, "Seeded Bravo");
      mockLoadBattleScenario
        .mockResolvedValueOnce(seededScenarioA)
        .mockResolvedValueOnce(seededScenarioB);
      mockInsert.mockReturnValue(
        chainable([
          {
            ...replay,
            scenarioAId: SEEDED_SCENARIO_A_ID,
            scenarioBId: SEEDED_SCENARIO_B_ID,
          },
        ]),
      );

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SEEDED_SCENARIO_A_ID,
          scenarioBId: SEEDED_SCENARIO_B_ID,
          seed: "seed-data-replay",
        }),
      ).resolves.toMatchObject({
        replay: {
          scenarioAId: SEEDED_SCENARIO_A_ID,
          scenarioBId: SEEDED_SCENARIO_B_ID,
        },
      });
    });

    it("resolves before insert, persists the trimmed seed, and returns the replay and result", async () => {
      let resolveScenarioB: ((scenario: ScenarioInput) => void) | undefined;
      const pendingScenarioB = new Promise<ScenarioInput>((resolve) => {
        resolveScenarioB = resolve;
      });
      mockLoadBattleScenario.mockResolvedValueOnce(scenarioA).mockReturnValueOnce(pendingScenarioB);
      const insertQuery = chainable([replay]);
      mockInsert.mockReturnValue(insertQuery);

      const resultPromise = createCaller(gmCtx).battleLab.create({
        scenarioAId: SCENARIO_A_ID,
        scenarioBId: SCENARIO_B_ID,
        seed: "  fixed-seed  ",
      });

      await vi.waitFor(() => expect(mockLoadBattleScenario).toHaveBeenCalledTimes(2));
      expect(mockInsert).not.toHaveBeenCalled();

      resolveScenarioB?.(scenarioB);
      const result = await resultPromise;

      expect(mockLoadBattleScenario).toHaveBeenNthCalledWith(1, mockDb, SCENARIO_A_ID);
      expect(mockLoadBattleScenario).toHaveBeenNthCalledWith(2, mockDb, SCENARIO_B_ID);
      expect(insertQuery.values).toHaveBeenCalledWith({
        scenarioAId: SCENARIO_A_ID,
        scenarioBId: SCENARIO_B_ID,
        seed: "fixed-seed",
      });
      expect(result.replay).toEqual(replay);
      expect(result.scenarios).toEqual([
        { id: SCENARIO_A_ID, name: "Alpha" },
        { id: SCENARIO_B_ID, name: "Bravo" },
      ]);
      expect(result.result).toMatchObject({
        winnerId: null,
        actionsResolved: 2,
        finalState: {
          actionCount: 2,
          batchCount: 1,
        },
      });
      expect(result.result.log[0]).toMatchObject({ batchNumber: 1 });
    });

    it("rejects linked effects with incomplete action timing before replay insertion", async () => {
      const scenarioWithIncompleteEffect = livingScenario(SCENARIO_A_ID, "Incomplete Alpha");
      const incompleteUnit = scenarioWithIncompleteEffect.rows?.tank?.[0];
      if (!incompleteUnit) {
        throw new Error("Expected the test scenario to include a tank unit.");
      }
      incompleteUnit.items = [
        {
          id: "item-incomplete",
          name: "Incomplete Item",
          effects: [
            {
              sequenceOrder: 1,
              effect: {
                name: "Incomplete Burn",
                timingType: "interval",
                effectType: "damage",
                triggerEveryActions: null,
                triggerCount: 3,
              },
            },
          ],
        },
      ];
      mockLoadBattleScenario
        .mockResolvedValueOnce(scenarioWithIncompleteEffect)
        .mockResolvedValueOnce(scenarioB);

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "incomplete-effect",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: 'Effect "Incomplete Burn" timing needs configuration.',
      });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("does not insert when battle resolution fails validation", async () => {
      mockLoadBattleScenario
        .mockResolvedValueOnce({ id: SCENARIO_A_ID, name: "Empty Alpha", rows: {} })
        .mockResolvedValueOnce({ id: SCENARIO_B_ID, name: "Empty Bravo", rows: {} });

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "invalid-battle",
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Battle initialization requires at least one living unit.",
      });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("sanitizes an unexpected battle engine failure", async () => {
      mockLoadBattleScenario.mockResolvedValueOnce(scenarioA).mockResolvedValueOnce(scenarioB);
      vi.spyOn(BattleEngine.prototype, "resolve").mockImplementationOnce(() => {
        throw new Error("sensitive engine internals");
      });

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "fixed-seed",
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Battle could not be resolved.",
      });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("throws INTERNAL_SERVER_ERROR when the replay is not saved", async () => {
      mockLoadBattleScenario.mockResolvedValueOnce(scenarioA).mockResolvedValueOnce(scenarioB);
      mockInsert.mockReturnValue(chainable([]));

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "fixed-seed",
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Replay was not saved.",
      });
    });

    it("sanitizes a database error while saving the replay", async () => {
      mockLoadBattleScenario.mockResolvedValueOnce(scenarioA).mockResolvedValueOnce(scenarioB);
      const returning = vi.fn().mockRejectedValue(new Error("sensitive database details"));
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({ returning }),
      });

      await expect(
        createCaller(gmCtx).battleLab.create({
          scenarioAId: SCENARIO_A_ID,
          scenarioBId: SCENARIO_B_ID,
          seed: "fixed-seed",
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Replay was not saved.",
      });
    });
  });

  describe("get", () => {
    describeAuthGuard((ctx) => createCaller(ctx).battleLab.get({ id: REPLAY_ID }));

    it("throws NOT_FOUND when the replay does not exist", async () => {
      mockSelect.mockReturnValue(chainable([]));

      await expect(createCaller(gmCtx).battleLab.get({ id: REPLAY_ID })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("reloads current scenarios on every request without mutating the replay", async () => {
      mockSelect.mockImplementation(() => chainable([replay]));
      let currentA = scenarioA;
      let currentB = scenarioB;
      mockLoadBattleScenario.mockImplementation((_executor, id) =>
        Promise.resolve(id === SCENARIO_A_ID ? currentA : currentB),
      );

      const first = await createCaller(gmCtx).battleLab.get({ id: REPLAY_ID });

      currentA = livingScenario(SCENARIO_A_ID, "Updated Alpha");
      currentB = livingScenario(SCENARIO_B_ID, "Updated Bravo");
      const second = await createCaller(gmCtx).battleLab.get({ id: REPLAY_ID });

      expect(first.scenarios).toEqual([
        { id: SCENARIO_A_ID, name: "Alpha" },
        { id: SCENARIO_B_ID, name: "Bravo" },
      ]);
      expect(second.scenarios).toEqual([
        { id: SCENARIO_A_ID, name: "Updated Alpha" },
        { id: SCENARIO_B_ID, name: "Updated Bravo" },
      ]);
      expect(second.replay).toEqual(replay);
      expect(mockLoadBattleScenario).toHaveBeenCalledTimes(4);
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
