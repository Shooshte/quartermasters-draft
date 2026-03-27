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

const { scenariosRouter } = await import(
  "../../routers/scenarioBuilder/scenarios"
);

const createCaller = createCallerFactory(
  router({ scenarios: scenariosRouter }),
);

describe("scenariosRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(caller.scenarios.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(caller.scenarios.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("returns scenarios with totalCount and default limit=20", async () => {
      const mockScenarios = [
        { id: "1", name: "Ambush at Dawn", updatedAt: new Date(), createdAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockScenarios);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.list();
      expect(result.items).toEqual(mockScenarios);
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
      const result = await caller.scenarios.list();
      expect(result).toEqual({ items: [], page: 1, limit: 20, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockScenarios = [
        { id: "2", name: "Battle Royale", updatedAt: new Date(), createdAt: new Date() },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockScenarios);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockScenarios);
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
      const result = await caller.scenarios.list({
        sortBy: "updatedAt",
        sortDir: "desc",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe("get", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.scenarios.get({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.scenarios.get({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns scenario with rows and assignments when found", async () => {
      const mockScenario = {
        id: "a0000000-0000-0000-0000-000000000001",
        name: "Ambush at Dawn",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockRows = [
        {
          id: "b0000000-0000-0000-0000-000000000002",
          rowType: "melee",
        },
        {
          id: "b0000000-0000-0000-0000-000000000001",
          rowType: "tank",
        },
      ];
      const mockAssignmentsWithUnits = [
        {
          scenarios_rows_units: {
            id: "c0000000-0000-0000-0000-000000000001",
            rowId: "b0000000-0000-0000-0000-000000000002",
            unitId: "f0000000-0000-0000-0000-000000000001",
            slot: 1,
          },
          units: { name: "Barbarian" },
        },
      ];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockScenario]);
        }
        if (callCount === 2) {
          return chainable(mockRows);
        }
        return chainable(mockAssignmentsWithUnits);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.get({
        id: "a0000000-0000-0000-0000-000000000001",
      });

      expect(result.id).toBe("a0000000-0000-0000-0000-000000000001");
      expect(result.name).toBe("Ambush at Dawn");
      expect(result.rows).toHaveLength(2);

      expect(result.rows[0].rowType).toBe("melee");
      expect(result.rows[1].rowType).toBe("tank");

      expect(result.rows[0].assignments).toEqual([
        {
          assignmentId: "c0000000-0000-0000-0000-000000000001",
          unitId: "f0000000-0000-0000-0000-000000000001",
          unitName: "Barbarian",
          position: 1,
        },
      ]);

      expect(result.rows[1].assignments).toEqual([]);
    });

    it("throws NOT_FOUND when scenario is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.scenarios.get({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.scenarios.delete({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.scenarios.delete({ id: "a0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("deletes scenario and returns success", async () => {
      mockDeleteFn.mockReturnValue(
        chainable([{ id: "a0000000-0000-0000-0000-000000000001" }]),
      );

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.delete({
        id: "a0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when scenario does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.scenarios.delete({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
