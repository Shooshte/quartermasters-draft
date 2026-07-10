import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { type ChainableQuery, chainable, describeAuthGuard, gmCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDeleteFn = vi.fn();
const mockInsertFn = vi.fn();
const mockUpdateFn = vi.fn();
const mockTransaction = vi.fn();
const mockDb = {
  select: mockSelect,
  delete: mockDeleteFn,
  insert: mockInsertFn,
  update: mockUpdateFn,
  transaction: mockTransaction,
};

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const { unitsRouter } = await import("../../routers/scenarioBuilder/units");

const createCaller = createCallerFactory(router({ units: unitsRouter }));

describe("unitsRouter", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDeleteFn.mockReset();
    mockInsertFn.mockReset();
    mockUpdateFn.mockReset();
    mockTransaction.mockReset();
    mockTransaction.mockImplementation(async (callback) => callback(mockDb));
  });

  const ITEM_ID_1 = "d0000000-0000-4000-8000-000000000001";
  const ITEM_ID_2 = "d0000000-0000-4000-8000-000000000002";

  describe("list", () => {
    describeAuthGuard((ctx) => createCaller(ctx).units.list());

    it("returns units with totalCount and default limit=20", async () => {
      const mockUnits = [
        { id: "1", name: "Alpha", updatedAt: new Date() },
        { id: "2", name: "Beta", updatedAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockUnits);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.units.list();
      expect(result.items).toEqual(mockUnits);
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
      const result = await caller.units.list();
      expect(result).toEqual({ items: [], page: 1, limit: 20, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockUnits = [{ id: "3", name: "Gamma", updatedAt: new Date() }];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockUnits);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.units.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockUnits);
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
      const result = await caller.units.list({
        sortBy: "updatedAt",
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
      const list = caller.units.list as (input: unknown) => Promise<unknown>;
      await list({
        linkageFilter: {
          mode: "scenario",
          scenarioId: "a2000000-0000-4000-8000-000000000001",
        },
      });

      expect(rowsQuery.where).toHaveBeenCalledTimes(1);
      expect(countQuery.where).toHaveBeenCalledTimes(1);
    });
  });

  describe("get", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).units.get({ id: "f0000000-0000-4000-8000-000000000001" }),
    );

    it("returns unit with itemIds when found", async () => {
      const mockUnit = {
        id: "f0000000-0000-4000-8000-000000000001",
        name: "Barbarian",
      };
      const mockItemLinks = [{ itemId: "d0000000-0000-4000-8000-000000000001" }];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockUnit]);
        }
        return chainable(mockItemLinks);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.units.get({
        id: "f0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({
        ...mockUnit,
        itemIds: ["d0000000-0000-4000-8000-000000000001"],
      });
    });

    it("throws NOT_FOUND when unit is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.units.get({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).units.delete({ id: "f0000000-0000-4000-8000-000000000001" }),
    );

    it("deletes unit and returns success", async () => {
      mockDeleteFn.mockReturnValue(chainable([{ id: "f0000000-0000-4000-8000-000000000001" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.units.delete({
        id: "f0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when unit does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.units.delete({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).units.create({
        name: "Bronze Sentinel",
        meleeDmg: 0,
        health: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 0,
        dodge: 0,
        criticalChance: 0,
        itemIds: [],
      }),
    );

    it("creates a unit with no linked items", async () => {
      const created = {
        id: "u-created",
        name: "Bronze Sentinel",
        meleeDmg: 0,
        health: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 0,
        dodge: 0,
        criticalChance: 0,
      };
      const unitValues = vi.fn().mockReturnValue(chainable([created]));
      mockInsertFn.mockReturnValueOnce({ values: unitValues });
      mockSelect.mockReturnValueOnce(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.units.create({
        name: "Bronze Sentinel",
        meleeDmg: 0,
        health: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 0,
        dodge: 0,
        criticalChance: 0,
        itemIds: [],
      });

      expect(result).toEqual({
        ...created,
        itemIds: [],
      });
      expect(mockInsertFn).toHaveBeenCalledTimes(1);
    });

    it("creates a unit and preserves ordered duplicate linked item ids", async () => {
      const created = {
        id: "u-dual",
        name: "Twinblade Adept",
        meleeDmg: 12.5,
        health: 82.25,
        rangedDmg: 0,
        manaRegen: -1.25,
        spellDmg: 4,
        speed: 1.35,
        dodge: 6.5,
        criticalChance: 7.25,
      };
      const unitValues = vi.fn().mockReturnValue(chainable([created]));
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn
        .mockReturnValueOnce({ values: unitValues })
        .mockReturnValueOnce({ values: insertLinks });
      mockSelect.mockReturnValueOnce(
        chainable([{ itemId: ITEM_ID_1 }, { itemId: ITEM_ID_1 }, { itemId: ITEM_ID_2 }]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.units.create({
        name: " Twinblade Adept ",
        meleeDmg: 12.5,
        health: 82.25,
        rangedDmg: 0,
        manaRegen: -1.25,
        spellDmg: 4,
        speed: 1.35,
        dodge: 6.5,
        criticalChance: 7.25,
        itemIds: [ITEM_ID_1, ITEM_ID_1, ITEM_ID_2],
      });

      expect(result).toEqual({
        ...created,
        itemIds: [ITEM_ID_1, ITEM_ID_1, ITEM_ID_2],
      });
      expect(unitValues).toHaveBeenCalledWith({
        name: "Twinblade Adept",
        meleeDmg: 12.5,
        health: 82.25,
        rangedDmg: 0,
        manaRegen: -1.25,
        spellDmg: 4,
        speed: 1.35,
        dodge: 6.5,
        criticalChance: 7.25,
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { unitId: "u-dual", itemId: ITEM_ID_1, priority: 1 },
        { unitId: "u-dual", itemId: ITEM_ID_1, priority: 2 },
        { unitId: "u-dual", itemId: ITEM_ID_2, priority: 3 },
      ]);
    });
  });

  describe("update", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).units.update({
        id: "f0000000-0000-4000-8000-000000000001",
        name: "Barbarian Updated",
        meleeDmg: 20,
        health: 120,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 1,
        dodge: 5,
        criticalChance: 10,
        itemIds: [ITEM_ID_2, ITEM_ID_1],
      }),
    );

    it("updates unit fields and replaces linked item order", async () => {
      const updated = {
        id: "f0000000-0000-4000-8000-000000000001",
        name: "Barbarian Updated",
        meleeDmg: 20,
        health: 120,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 1,
        dodge: 5,
        criticalChance: 10,
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValueOnce(chainable([]));
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: insertLinks });
      mockSelect.mockReturnValueOnce(chainable([{ itemId: ITEM_ID_2 }, { itemId: ITEM_ID_1 }]));

      const caller = createCaller(gmCtx);
      const result = await caller.units.update({
        id: updated.id,
        name: " Barbarian Updated ",
        meleeDmg: 20,
        health: 120,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 1,
        dodge: 5,
        criticalChance: 10,
        itemIds: [ITEM_ID_2, ITEM_ID_1],
      });

      expect(result).toEqual({
        ...updated,
        itemIds: [ITEM_ID_2, ITEM_ID_1],
      });
      expect(updateSet).toHaveBeenCalledWith({
        name: "Barbarian Updated",
        meleeDmg: 20,
        health: 120,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 1,
        dodge: 5,
        criticalChance: 10,
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { unitId: updated.id, itemId: ITEM_ID_2, priority: 1 },
        { unitId: updated.id, itemId: ITEM_ID_1, priority: 2 },
      ]);
    });

    it("throws NOT_FOUND when the unit does not exist", async () => {
      const updateSet = vi.fn().mockReturnValue(chainable([]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });

      const caller = createCaller(gmCtx);
      await expect(
        caller.units.update({
          id: "00000000-0000-4000-8000-000000000099",
          name: "Missing Unit",
          meleeDmg: 0,
          health: 0,
          rangedDmg: 0,
          manaRegen: 0,
          spellDmg: 0,
          speed: 0,
          dodge: 0,
          criticalChance: 0,
          itemIds: [],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
