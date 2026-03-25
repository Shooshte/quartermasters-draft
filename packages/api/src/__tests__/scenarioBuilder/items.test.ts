import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, gmCtx, playerCtx, anonCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDeleteFn = vi.fn();
const mockDb = { select: mockSelect, delete: mockDeleteFn };

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const { itemsRouter } = await import(
  "../../routers/scenarioBuilder/items"
);

const createCaller = createCallerFactory(router({ items: itemsRouter }));

describe("itemsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("returns items with totalCount and default limit=10", async () => {
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
      expect(result.limit).toBe(10);
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
      const result = await caller.items.list();
      expect(result).toEqual({ items: [], page: 1, limit: 10, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockItems = [
        { id: "3", name: "Gamma", updatedAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockItems);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.items.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockItems);
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
      const result = await caller.items.list({
        sortBy: "updatedAt",
        sortDir: "desc",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe("get", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.items.get({ id: "d0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.items.get({ id: "d0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns item with spellIds when found", async () => {
      const mockItem = {
        id: "d0000000-0000-0000-0000-000000000002",
        name: "Oak Staff",
      };
      const mockSpellLinks = [
        { spellId: "b0000000-0000-0000-0000-000000000001" },
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
        spellIds: ["b0000000-0000-0000-0000-000000000001"],
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

  describe("delete", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.items.delete({ id: "d0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.items.delete({ id: "d0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

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
