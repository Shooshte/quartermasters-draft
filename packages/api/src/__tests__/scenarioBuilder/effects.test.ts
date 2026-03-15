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

const { effectsRouter } = await import(
  "../../routers/scenarioBuilder/effects"
);

const createCaller = createCallerFactory(router({ effects: effectsRouter }));

describe("effectsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(caller.effects.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(caller.effects.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("returns effects with totalCount and default limit=10", async () => {
      const mockEffects = [
        { id: "1", name: "Alpha", timingType: "instant", effectType: "buff", updatedAt: new Date() },
        { id: "2", name: "Beta", timingType: "interval", effectType: "damage", updatedAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockEffects);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list();
      expect(result.items).toEqual(mockEffects);
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
      const result = await caller.effects.list();
      expect(result).toEqual({ items: [], page: 1, limit: 10, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockEffects = [
        { id: "3", name: "Gamma", timingType: "instant", effectType: "healing", updatedAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockEffects);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.effects.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockEffects);
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
      expect(result.limit).toBe(10);
    });
  });

  describe("get", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.effects.get({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.effects.get({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns effect when found", async () => {
      const mockEffect = {
        id: "a0000000-0000-0000-0000-000000000001",
        name: "Barbarian Roar",
        effectType: "buff",
        timingType: "instant",
      };
      mockSelect.mockReturnValue(chainable([mockEffect]));

      const caller = createCaller(gmCtx);
      const result = await caller.effects.get({
        id: "a0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual(mockEffect);
    });

    it("throws NOT_FOUND when effect is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.get({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.effects.delete({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.effects.delete({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("deletes effect and returns success", async () => {
      mockDeleteFn.mockReturnValue(
        chainable([{ id: "a0000000-0000-0000-0000-000000000001" }]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.effects.delete({
        id: "a0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when effect does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.effects.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
