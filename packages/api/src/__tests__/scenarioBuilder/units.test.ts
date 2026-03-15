import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, gmCtx, playerCtx, anonCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDb = { select: mockSelect };

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const { unitsRouter } = await import(
  "../../routers/scenarioBuilder/units"
);

const createCaller = createCallerFactory(router({ units: unitsRouter }));

describe("unitsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(caller.units.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(caller.units.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("returns units ordered by name with pagination", async () => {
      const mockUnits = [
        { id: "1", name: "Alpha", updatedAt: new Date() },
        { id: "2", name: "Beta", updatedAt: new Date() },
      ];
      mockSelect.mockReturnValue(chainable(mockUnits));

      const caller = createCaller(gmCtx);
      const result = await caller.units.list();
      expect(result.items).toEqual(mockUnits);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it("uses default pagination when no input provided", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.units.list();
      expect(result).toEqual({ items: [], page: 1, limit: 100 });
    });

    it("respects custom page and limit", async () => {
      const mockUnits = [
        { id: "3", name: "Gamma", updatedAt: new Date() },
      ];
      mockSelect.mockReturnValue(chainable(mockUnits));

      const caller = createCaller(gmCtx);
      const result = await caller.units.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockUnits);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe("get", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.units.get({ id: "f0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.units.get({ id: "f0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns unit with itemIds when found", async () => {
      const mockUnit = {
        id: "f0000000-0000-0000-0000-000000000001",
        name: "Barbarian",
      };
      const mockItemLinks = [
        { itemId: "d0000000-0000-0000-0000-000000000001" },
      ];

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
        id: "f0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual({
        ...mockUnit,
        itemIds: ["d0000000-0000-0000-0000-000000000001"],
      });
    });

    it("throws NOT_FOUND when unit is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.units.get({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
