import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { type ChainableQuery, chainable, describeAuthGuard, gmCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDeleteFn = vi.fn();
const mockInsertFn = vi.fn();
const mockUpdateFn = vi.fn();
const mockDb = {
  select: mockSelect,
  delete: mockDeleteFn,
  insert: mockInsertFn,
  update: mockUpdateFn,
};

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const { effectsRouter } = await import("../../routers/scenarioBuilder/effects");

const createCaller = createCallerFactory(router({ effects: effectsRouter }));

const emptyEffectStats = {
  meleeDmg: null,
  health: null,
  mana: null,
  rangedDmg: null,
  manaRegen: null,
  spellDmg: null,
  speed: null,
  dodge: null,
  criticalChance: null,
};

describe("effectsRouter", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDeleteFn.mockReset();
    mockInsertFn.mockReset();
    mockUpdateFn.mockReset();
  });

  describe("list", () => {
    describeAuthGuard((ctx) => createCaller(ctx).effects.list());

    it("returns effects with totalCount and default limit=20", async () => {
      const mockEffects = [
        {
          id: "1",
          name: "Alpha",
          timingType: "instant",
          effectType: "buff",
          triggerEveryActions: null,
          triggerCount: null,
          lastsForActions: null,
          ...emptyEffectStats,
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Beta",
          timingType: "interval",
          effectType: "damage",
          triggerEveryActions: 2,
          triggerCount: 3,
          lastsForActions: null,
          ...emptyEffectStats,
          updatedAt: new Date(),
        },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockEffects);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list();
      expect(result.items).toEqual([
        { ...mockEffects[0], needsTimingConfiguration: false },
        { ...mockEffects[1], needsTimingConfiguration: false },
      ]);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalCount).toBe(5);
    });

    it("uses default pagination when no input provided", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable([]);
        return chainable([{ count: 0 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list();
      expect(result).toEqual({ items: [], page: 1, limit: 20, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockEffects = [
        {
          id: "3",
          name: "Gamma",
          timingType: "instant",
          effectType: "healing",
          updatedAt: new Date(),
        },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockEffects);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list({ page: 2, limit: 10 });
      expect(result.items).toEqual([{ ...mockEffects[0], needsTimingConfiguration: false }]);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalCount).toBe(15);
    });

    it("accepts sortBy and sortDir params", async () => {
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable([]);
        return chainable([{ count: 0 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list({
        sortBy: "timingType",
        sortDir: "desc",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("applies scenario linkage filters to both row and count queries", async () => {
      const rowsQuery = chainable([]) as ChainableQuery;
      const countQuery = chainable([{ count: 0 }]) as ChainableQuery;
      mockSelect
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(rowsQuery)
        .mockReturnValueOnce(countQuery);

      const caller = createCaller(gmCtx);
      const list = caller.effects.list as (input: unknown) => Promise<unknown>;
      await list({
        linkageFilter: {
          mode: "scenario",
          scenarioId: "a2000000-0000-4000-8000-000000000001",
        },
      });

      expect(rowsQuery.where).toHaveBeenCalledTimes(1);
      expect(countQuery.where).toHaveBeenCalledTimes(1);
    });

    it("rejects a scenario linkage filter without a scenario id", async () => {
      const caller = createCaller(gmCtx);
      const list = caller.effects.list as (input: unknown) => Promise<unknown>;

      await expect(list({ linkageFilter: { mode: "scenario" } })).rejects.toThrow();
    });

    it("marks legacy interval timing for configuration", async () => {
      const effectRow = {
        id: "1",
        name: "Legacy Burn",
        timingType: "interval" as const,
        effectType: "damage" as const,
        triggerEveryActions: null,
        triggerCount: null,
        lastsForActions: null,
        ...emptyEffectStats,
        updatedAt: new Date(),
      };
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable([effectRow]);
        return chainable([{ count: 1 }]);
      });

      const result = await createCaller(gmCtx).effects.list();

      expect(result.items[0]?.needsTimingConfiguration).toBe(true);
    });
  });

  describe("get", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).effects.get({ id: "a0000000-0000-4000-8000-000000000001" }),
    );

    it("returns effect when found", async () => {
      const mockEffect = {
        id: "a0000000-0000-4000-8000-000000000001",
        name: "Barbarian Roar",
        effectType: "buff",
        timingType: "instant",
        triggerEveryActions: null,
        triggerCount: null,
        lastsForActions: null,
        ...emptyEffectStats,
      };
      mockSelect.mockReturnValue(chainable([mockEffect]));

      const caller = createCaller(gmCtx);
      const result = await caller.effects.get({
        id: "a0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({ ...mockEffect, needsTimingConfiguration: false });
    });

    it("throws NOT_FOUND when effect is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.get({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).effects.delete({ id: "a0000000-0000-4000-8000-000000000001" }),
    );

    it("deletes effect and returns success", async () => {
      mockDeleteFn.mockReturnValue(chainable([{ id: "a0000000-0000-4000-8000-000000000001" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.effects.delete({
        id: "a0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("maps linked-item dependency failures to CONFLICT", async () => {
      mockDeleteFn.mockImplementationOnce(() => ({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23503" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.delete({ id: "a0000000-0000-4000-8000-000000000001" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Cannot delete effect while it is linked to one or more items.",
      });
    });

    it("throws NOT_FOUND when effect does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.delete({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).effects.create({
        name: "New Effect",
        timingType: "instant",
        effectType: "buff",
      }),
    );

    it("creates a valid instant effect", async () => {
      mockInsertFn.mockReturnValue(
        chainable([
          {
            id: "e1",
            name: "New Effect",
            timingType: "instant",
            effectType: "buff",
            triggerEveryActions: null,
            triggerCount: null,
            lastsForActions: null,
          },
        ]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.effects.create({
        name: "New Effect",
        timingType: "instant",
        effectType: "buff",
      });

      expect(result).toMatchObject({ id: "e1", name: "New Effect" });
    });

    it("accepts and returns a persistent instant taunt", async () => {
      const values = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "taunt-1",
            name: "Challenge",
            timingType: "instant",
            effectType: "buff",
            isTaunt: true,
            triggerEveryActions: null,
            triggerCount: null,
            lastsForActions: null,
          },
        ]),
      });
      mockInsertFn.mockReturnValue({ values });

      const result = await createCaller(gmCtx).effects.create({
        name: "Challenge",
        timingType: "instant",
        effectType: "buff",
        isTaunt: true,
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ isTaunt: true, lastsForActions: null }),
      );
      expect(result).toMatchObject({ id: "taunt-1", isTaunt: true, lastsForActions: null });
    });

    it("accepts a persistent instant taunt with stat modifiers", async () => {
      const values = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "taunt-modifier-1",
            name: "Persistent Challenge",
            timingType: "instant",
            effectType: "buff",
            isTaunt: true,
            speed: 3,
            lastsForActions: null,
          },
        ]),
      });
      mockInsertFn.mockReturnValue({ values });

      await createCaller(gmCtx).effects.create({
        name: "Persistent Challenge",
        timingType: "instant",
        effectType: "buff",
        isTaunt: true,
        speed: 3,
        lastsForActions: null,
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ isTaunt: true, speed: 3, lastsForActions: null }),
      );
    });

    it("retains a positive duration for a timed instant taunt", async () => {
      const values = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "taunt-2",
            name: "Provoke",
            timingType: "instant",
            effectType: "buff",
            isTaunt: true,
            triggerEveryActions: null,
            triggerCount: null,
            lastsForActions: 2,
          },
        ]),
      });
      mockInsertFn.mockReturnValue({ values });

      await createCaller(gmCtx).effects.create({
        name: "Provoke",
        timingType: "instant",
        effectType: "buff",
        isTaunt: true,
        lastsForActions: 2,
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ isTaunt: true, lastsForActions: 2 }),
      );
    });

    it("creates a valid interval effect", async () => {
      mockInsertFn.mockReturnValue(
        chainable([
          {
            id: "e2",
            name: "Rage",
            timingType: "interval",
            effectType: "buff",
            triggerEveryActions: 2,
            triggerCount: 3,
            lastsForActions: null,
          },
        ]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.effects.create({
        name: "Rage",
        timingType: "interval",
        effectType: "buff",
        triggerEveryActions: 2,
        triggerCount: 3,
      });

      expect(result).toMatchObject({
        id: "e2",
        timingType: "interval",
        triggerEveryActions: 2,
        triggerCount: 3,
      });
    });

    it("rejects an interval taunt", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.effects.create({
          name: "Periodic Challenge",
          timingType: "interval",
          triggerEveryActions: 1,
          triggerCount: 1,
          effectType: "buff",
          isTaunt: true,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it("creates a stat-bearing interval buff without an action duration", async () => {
      mockInsertFn.mockReturnValue(
        chainable([
          {
            id: "e3",
            name: "Periodic Strength",
            timingType: "interval",
            effectType: "buff",
            triggerEveryActions: 2,
            triggerCount: 3,
            lastsForActions: null,
            meleeDmg: 5,
          },
        ]),
      );

      const result = await createCaller(gmCtx).effects.create({
        name: "Periodic Strength",
        timingType: "interval",
        effectType: "buff",
        triggerEveryActions: 2,
        triggerCount: 3,
        meleeDmg: 5,
        lastsForActions: null,
      });

      expect(result).toMatchObject({
        id: "e3",
        lastsForActions: null,
        needsTimingConfiguration: false,
      });
    });

    it.each([
      {
        name: "Periodic Strength",
        timingType: "interval" as const,
        effectType: "buff" as const,
        triggerEveryActions: 2,
        triggerCount: 3,
        meleeDmg: 5,
      },
      {
        name: "Arc Spark",
        timingType: "instant" as const,
        effectType: "damage" as const,
        directSpellDmg: 4,
      },
    ])("clears invalid action duration before creating %s", async (input) => {
      const values = vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ id: "e-normalized", ...input, lastsForActions: null }]),
      });
      mockInsertFn.mockReturnValue({ values });

      await createCaller(gmCtx).effects.create({ ...input, lastsForActions: 4 });

      expect(values).toHaveBeenCalledWith(expect.objectContaining({ lastsForActions: null }));
    });

    it("rejects missing interval fields for interval timing", async () => {
      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.create({ name: "Rage", timingType: "interval", effectType: "buff" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("rejects legacy time-unit aliases", async () => {
      const caller = createCaller(gmCtx);
      const create = caller.effects.create as (input: unknown) => Promise<unknown>;
      const legacyIntervalKey = ["intervalTi", "cks"].join("");
      const legacyDurationKey = ["durationTi", "cks"].join("");

      await expect(
        create({
          name: "Legacy Rage",
          timingType: "interval",
          effectType: "damage",
          triggerEveryActions: 2,
          triggerCount: 3,
          [legacyIntervalKey]: 1_000,
          [legacyDurationKey]: 3_000,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it("requires lastsForActions for a stat-bearing modifier", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.effects.create({
          name: "Fleeting Strength",
          timingType: "instant",
          effectType: "buff",
          meleeDmg: 5,
          lastsForActions: null,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it.each([
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("rejects non-finite mana modifier %s", async (mana) => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.effects.create({
          name: "Impossible Reservoir",
          timingType: "instant",
          effectType: "buff",
          mana,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it("maps duplicate names to CONFLICT", async () => {
      mockInsertFn.mockReturnValue(chainable([]));
      mockInsertFn.mockImplementationOnce(() => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23505" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.create({ name: "Duplicate", timingType: "instant", effectType: "buff" }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("update", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).effects.update({
        id: "a0000000-0000-4000-8000-000000000001",
        name: "New Effect",
        timingType: "instant",
        effectType: "buff",
      }),
    );

    it("updates an existing effect", async () => {
      mockUpdateFn.mockReturnValue(
        chainable([
          {
            id: "a0000000-0000-4000-8000-000000000001",
            name: "Updated",
            timingType: "instant",
            effectType: "buff",
          },
        ]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.effects.update({
        id: "a0000000-0000-4000-8000-000000000001",
        name: "Updated",
        timingType: "instant",
        effectType: "buff",
      });

      expect(result).toMatchObject({ name: "Updated" });
    });

    it("returns NOT_FOUND for missing id", async () => {
      mockUpdateFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.update({
          id: "00000000-0000-4000-8000-000000000099",
          name: "Updated",
          timingType: "instant",
          effectType: "buff",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("maps duplicate names to CONFLICT", async () => {
      mockUpdateFn.mockImplementationOnce(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23505" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.update({
          id: "a0000000-0000-4000-8000-000000000001",
          name: "Duplicate",
          timingType: "instant",
          effectType: "buff",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });
});
