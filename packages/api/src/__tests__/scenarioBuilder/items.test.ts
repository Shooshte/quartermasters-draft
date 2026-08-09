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

const { itemsRouter } = await import("../../routers/scenarioBuilder/items");

const createCaller = createCallerFactory(router({ items: itemsRouter }));
const EFFECT_ID_1 = "00000000-0000-4000-8000-000000000001";
const EFFECT_ID_2 = "00000000-0000-4000-8000-000000000002";

describe("itemsRouter", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockDeleteFn.mockReset();
    mockInsertFn.mockReset();
    mockUpdateFn.mockReset();
    mockTransaction.mockReset();
    mockTransaction.mockImplementation(async (callback) => callback(mockDb));
  });

  describe("list", () => {
    describeAuthGuard((ctx) => createCaller(ctx).items.list());

    it("returns items with totalCount and default limit=20", async () => {
      const mockItems = [
        {
          id: "1",
          name: "Alpha",
          updatedAt: new Date(),
          meleeDmg: 8,
          rangedDmg: 1,
          mana: 2,
          manaRegen: 3,
          spellDmg: 4,
          dodge: 5,
          criticalChance: 6,
        },
        {
          id: "2",
          name: "Beta",
          updatedAt: new Date(),
          meleeDmg: 18,
          rangedDmg: 11,
          mana: 12,
          manaRegen: 13,
          spellDmg: 14,
          dodge: 15,
          criticalChance: 16,
        },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockItems);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.items.list();
      expect(Object.keys(mockSelect.mock.calls[0]?.[0] ?? {})).toEqual([
        "id",
        "name",
        "updatedAt",
        "meleeDmg",
        "rangedDmg",
        "mana",
        "manaRegen",
        "spellDmg",
        "dodge",
        "criticalChance",
      ]);
      expect(result.items).toEqual(mockItems);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalCount).toBe(5);
    });

    it("applies scenario linkage filters to both row and count queries", async () => {
      const rowsQuery = chainable([]) as ChainableQuery;
      const countQuery = chainable([{ count: 0 }]) as ChainableQuery;
      mockSelect
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(rowsQuery)
        .mockReturnValueOnce(countQuery);

      const caller = createCaller(gmCtx);
      const list = caller.items.list as (input: unknown) => Promise<unknown>;
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
    it("returns item with ordered effectIds and combat-ordered allowed row types", async () => {
      const mockItem = {
        id: "d0000000-0000-4000-8000-000000000002",
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const mockEffectLinks = [
        { effectTemplateId: EFFECT_ID_2 },
        { effectTemplateId: EFFECT_ID_1 },
        { effectTemplateId: EFFECT_ID_2 },
      ];
      const mockAllowedRows = [
        { rowType: "support" },
        { rowType: "tank" },
        { rowType: "ranged" },
        { rowType: "melee" },
      ];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockItem]);
        }
        if (callCount === 2) {
          return chainable(mockEffectLinks);
        }
        return chainable(mockAllowedRows);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.items.get({
        id: "d0000000-0000-4000-8000-000000000002",
      });
      expect(result).toEqual({
        ...mockItem,
        effectIds: [EFFECT_ID_2, EFFECT_ID_1, EFFECT_ID_2],
        allowedRowTypes: ["tank", "melee", "ranged", "support"],
      });
    });

    it("throws NOT_FOUND when item is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.get({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    it("creates an item and preserves ordered effects and allowed rows", async () => {
      const created = {
        id: "d-created",
        name: "Arcane Focus",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      const insertAllowedRows = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: insertLinks })
        .mockReturnValueOnce({ values: insertAllowedRows });
      mockSelect
        .mockReturnValueOnce(
          chainable([
            { effectTemplateId: EFFECT_ID_1 },
            { effectTemplateId: EFFECT_ID_1 },
            { effectTemplateId: EFFECT_ID_2 },
          ]),
        )
        .mockReturnValueOnce(chainable([{ rowType: "ranged" }, { rowType: "support" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.create({
        name: " Arcane Focus ",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        effectIds: [EFFECT_ID_1, EFFECT_ID_1, EFFECT_ID_2],
        allowedRowTypes: ["ranged", "support"],
      });

      expect(result).toEqual({
        ...created,
        effectIds: [EFFECT_ID_1, EFFECT_ID_1, EFFECT_ID_2],
        allowedRowTypes: ["ranged", "support"],
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { itemId: "d-created", effectTemplateId: EFFECT_ID_1, sequenceOrder: 1 },
        { itemId: "d-created", effectTemplateId: EFFECT_ID_1, sequenceOrder: 2 },
        { itemId: "d-created", effectTemplateId: EFFECT_ID_2, sequenceOrder: 3 },
      ]);
      expect(insertAllowedRows).toHaveBeenCalledWith([
        { itemId: "d-created", rowType: "ranged" },
        { itemId: "d-created", rowType: "support" },
      ]);
    });

    it("rejects duplicate allowed row types with BAD_REQUEST", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.items.create({
          name: "Duplicate Rows",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          mana: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: [],
          allowedRowTypes: ["ranged", "ranged"],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("allows decimal and negative non-cost stats", async () => {
      const created = {
        id: "d-precise",
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: -3.5,
        dodge: -1,
        criticalChance: 7.25,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const itemValues = vi.fn().mockReturnValue(chainable([created]));
      mockInsertFn
        .mockReturnValueOnce({ values: itemValues })
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });
      mockSelect.mockReturnValueOnce(chainable([{ effectTemplateId: EFFECT_ID_1 }]));

      const caller = createCaller(gmCtx);
      await caller.items.create({
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: -3.5,
        dodge: -1,
        criticalChance: 7.25,
        activationManaCost: 0,
        activationHealthCost: 0,
        effectIds: [EFFECT_ID_1],
        allowedRowTypes: [],
      });

      expect(itemValues).toHaveBeenCalledWith({
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: -3.5,
        dodge: -1,
        criticalChance: 7.25,
        activationManaCost: 0,
        activationHealthCost: 0,
      });
    });

    it("rejects negative activation costs", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.items.create({
          name: "Broken Relay",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          mana: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: -1,
          activationHealthCost: 0,
          effectIds: ["00000000-0000-4000-8000-000000000001"],
          allowedRowTypes: [],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it.each([
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ])("rejects non-finite mana modifier %s", async (mana) => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.items.create({
          name: "Impossible Focus",
          meleeDmg: 0,
          rangedDmg: 0,
          mana,
          manaRegen: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: [],
          allowedRowTypes: [],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("creates an item with no linked effects", async () => {
      const created = {
        id: "d-effect-less",
        name: "Effect-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const itemValues = vi.fn().mockReturnValue(chainable([created]));
      mockInsertFn.mockReturnValueOnce({ values: itemValues });
      mockSelect.mockReturnValueOnce(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.create({
        name: "Effect-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        effectIds: [],
        allowedRowTypes: [],
      });

      expect(result).toEqual({
        ...created,
        effectIds: [],
        allowedRowTypes: [],
      });
      expect(mockInsertFn).toHaveBeenCalledTimes(1);
      expect(itemValues).toHaveBeenCalledWith({
        name: "Effect-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        mana: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      });
    });
  });

  describe("update", () => {
    it("rejects duplicate allowed row types with BAD_REQUEST before a transaction", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.items.update({
          id: "d0000000-0000-4000-8000-000000000002",
          name: "Duplicate Rows",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          mana: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: [],
          allowedRowTypes: ["support", "support"],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("updates item fields and replaces ordered effects and allowed rows", async () => {
      const updated = {
        id: "d0000000-0000-4000-8000-000000000002",
        name: "Oak Staff Updated",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValue(chainable([]));
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      const insertAllowedRows = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn
        .mockReturnValueOnce({ values: insertLinks })
        .mockReturnValueOnce({ values: insertAllowedRows });
      mockSelect
        .mockReturnValueOnce(
          chainable([
            { effectTemplateId: EFFECT_ID_2 },
            { effectTemplateId: EFFECT_ID_1 },
            { effectTemplateId: EFFECT_ID_2 },
          ]),
        )
        .mockReturnValueOnce(chainable([{ rowType: "support" }, { rowType: "melee" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.update({
        id: updated.id,
        name: " Oak Staff Updated ",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        effectIds: [EFFECT_ID_2, EFFECT_ID_1, EFFECT_ID_2],
        allowedRowTypes: ["support", "melee"],
      });

      expect(result).toEqual({
        ...updated,
        effectIds: [EFFECT_ID_2, EFFECT_ID_1, EFFECT_ID_2],
        allowedRowTypes: ["support", "melee"],
      });
      expect(updateSet).toHaveBeenCalledWith({
        name: "Oak Staff Updated",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { itemId: updated.id, effectTemplateId: EFFECT_ID_2, sequenceOrder: 1 },
        { itemId: updated.id, effectTemplateId: EFFECT_ID_1, sequenceOrder: 2 },
        { itemId: updated.id, effectTemplateId: EFFECT_ID_2, sequenceOrder: 3 },
      ]);
      expect(insertAllowedRows).toHaveBeenCalledWith([
        { itemId: updated.id, rowType: "support" },
        { itemId: updated.id, rowType: "melee" },
      ]);
      expect(mockDeleteFn).toHaveBeenCalledTimes(2);
    });

    it("returns NOT_FOUND for a missing item id", async () => {
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.update({
          id: "00000000-0000-4000-8000-000000000099",
          name: "Missing",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          mana: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: ["00000000-0000-4000-8000-000000000001"],
          allowedRowTypes: [],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("updates an item with no linked effects", async () => {
      const updated = {
        id: "d0000000-0000-4000-8000-000000000002",
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValue(chainable([]));
      mockSelect.mockReturnValueOnce(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.update({
        id: updated.id,
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        mana: 0,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        effectIds: [],
        allowedRowTypes: [],
      });

      expect(result).toEqual({
        ...updated,
        effectIds: [],
        allowedRowTypes: [],
      });
      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it("maps duplicate names to CONFLICT", async () => {
      mockUpdateFn.mockImplementationOnce(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23505" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.update({
          id: "d0000000-0000-4000-8000-000000000002",
          name: "Iron Sword",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          mana: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: ["00000000-0000-4000-8000-000000000001"],
          allowedRowTypes: [],
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("delete", () => {
    it("deletes item and returns success", async () => {
      mockDeleteFn.mockReturnValue(chainable([{ id: "d0000000-0000-4000-8000-000000000001" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.delete({
        id: "d0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when item does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.delete({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
