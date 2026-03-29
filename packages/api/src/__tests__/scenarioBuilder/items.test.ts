import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, gmCtx, playerCtx, anonCtx } from "./test-utils";

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

const { itemsRouter } = await import(
  "../../routers/scenarioBuilder/items"
);

const createCaller = createCallerFactory(router({ items: itemsRouter }));
const SPELL_ID_1 = "00000000-0000-0000-0000-000000000001";
const SPELL_ID_2 = "00000000-0000-0000-0000-000000000002";

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
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(caller.items.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(caller.items.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("returns items with totalCount and default limit=20", async () => {
      const mockItems = [
        { id: "1", name: "Alpha", updatedAt: new Date() },
        { id: "2", name: "Beta", updatedAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockItems);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.items.list();
      expect(result.items).toEqual(mockItems);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalCount).toBe(5);
    });
  });

  describe("get", () => {
    it("returns item with full stats and spellIds sorted by spell name", async () => {
      const mockItem = {
        id: "d0000000-0000-0000-0000-000000000002",
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const mockSpellLinks = [
        { spellId: "spell-b", spellName: "Battle Cry" },
        { spellId: "spell-a", spellName: "Fireball" },
      ];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockItem]);
        }
        return chainable(mockSpellLinks);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.items.get({
        id: "d0000000-0000-0000-0000-000000000002",
      });
      expect(result).toEqual({
        ...mockItem,
        spellIds: ["spell-b", "spell-a"],
      });
    });

    it("throws NOT_FOUND when item is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.get({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    it("creates an item and dedupes linked spell ids", async () => {
      const created = {
        id: "d-created",
        name: "Arcane Focus",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: insertLinks });
      mockSelect.mockReturnValueOnce(chainable([
        { spellId: SPELL_ID_1, spellName: "Fireball" },
        { spellId: SPELL_ID_2, spellName: "Healing Touch" },
      ]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.create({
        name: " Arcane Focus ",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        spellIds: [SPELL_ID_1, SPELL_ID_1, SPELL_ID_2],
      });

      expect(result).toEqual({
        ...created,
        spellIds: [SPELL_ID_1, SPELL_ID_2],
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { itemId: "d-created", spellId: SPELL_ID_1 },
        { itemId: "d-created", spellId: SPELL_ID_2 },
      ]);
    });

    it("allows decimal and negative non-cost stats", async () => {
      const created = {
        id: "d-precise",
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
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
      mockSelect.mockReturnValueOnce(chainable([
        { spellId: SPELL_ID_1, spellName: "Fireball" },
      ]));

      const caller = createCaller(gmCtx);
      await caller.items.create({
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: -3.5,
        dodge: -1,
        criticalChance: 7.25,
        activationManaCost: 0,
        activationHealthCost: 0,
        spellIds: [SPELL_ID_1],
      });

      expect(itemValues).toHaveBeenCalledWith({
        name: "Cursed Focus",
        meleeDmg: 12.5,
        rangedDmg: 0,
        manaRegen: 0,
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
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: -1,
          activationHealthCost: 0,
          spellIds: ["00000000-0000-0000-0000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("creates an item with no linked spells", async () => {
      const created = {
        id: "d-spell-less",
        name: "Spell-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
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
        name: "Spell-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        spellIds: [],
      });

      expect(result).toEqual({
        ...created,
        spellIds: [],
      });
      expect(mockInsertFn).toHaveBeenCalledTimes(1);
      expect(itemValues).toHaveBeenCalledWith({
        name: "Spell-less Item",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      });
    });
  });

  describe("update", () => {
    it("updates item fields and replaces linked spell set", async () => {
      const updated = {
        id: "d0000000-0000-0000-0000-000000000002",
        name: "Oak Staff Updated",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValueOnce(chainable([]));
      const insertLinks = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: insertLinks });
      mockSelect.mockReturnValueOnce(chainable([
        { spellId: SPELL_ID_2, spellName: "Battle Cry" },
        { spellId: SPELL_ID_1, spellName: "Fireball" },
      ]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.update({
        id: updated.id,
        name: " Oak Staff Updated ",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        spellIds: [SPELL_ID_1, SPELL_ID_2, SPELL_ID_2],
      });

      expect(result).toEqual({
        ...updated,
        spellIds: [SPELL_ID_2, SPELL_ID_1],
      });
      expect(updateSet).toHaveBeenCalledWith({
        name: "Oak Staff Updated",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 20,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      });
      expect(insertLinks).toHaveBeenCalledWith([
        { itemId: updated.id, spellId: SPELL_ID_1 },
        { itemId: updated.id, spellId: SPELL_ID_2 },
      ]);
    });

    it("returns NOT_FOUND for a missing item id", async () => {
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.update({
          id: "00000000-0000-0000-0000-000000000099",
          name: "Missing",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          spellIds: ["00000000-0000-0000-0000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("updates an item with no linked spells", async () => {
      const updated = {
        id: "d0000000-0000-0000-0000-000000000002",
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValueOnce(chainable([]));
      mockSelect.mockReturnValueOnce(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.items.update({
        id: updated.id,
        name: "Oak Staff",
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 3,
        spellDmg: 12,
        dodge: 0,
        criticalChance: 0,
        activationManaCost: 0,
        activationHealthCost: 0,
        spellIds: [],
      });

      expect(result).toEqual({
        ...updated,
        spellIds: [],
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
          id: "d0000000-0000-0000-0000-000000000002",
          name: "Iron Sword",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 0,
          spellDmg: 0,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          spellIds: ["00000000-0000-0000-0000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("delete", () => {
    it("deletes item and returns success", async () => {
      mockDeleteFn.mockReturnValue(
        chainable([{ id: "d0000000-0000-0000-0000-000000000001" }]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.items.delete({
        id: "d0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when item does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.items.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
