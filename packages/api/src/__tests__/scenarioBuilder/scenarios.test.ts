import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, gmCtx, playerCtx, anonCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDeleteFn = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockDb = {
  select: mockSelect,
  delete: mockDeleteFn,
  insert: mockInsert,
  update: mockUpdate,
  transaction: mockTransaction,
};

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

  describe("create", () => {
    it("creates a scenario with four empty rows", async () => {
      const createdScenario = {
        id: "a2000000-0000-0000-0000-000000000099",
        name: "Frontier Watch",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      };

      tx.insert
        .mockReturnValueOnce(chainable([createdScenario]))
        .mockReturnValueOnce(chainable([
          { id: "r1", scenarioId: createdScenario.id, rowType: "tank" },
          { id: "r2", scenarioId: createdScenario.id, rowType: "melee" },
          { id: "r3", scenarioId: createdScenario.id, rowType: "ranged" },
          { id: "r4", scenarioId: createdScenario.id, rowType: "support" },
        ]))
        .mockReturnValueOnce(chainable([]));

      let selectCallCount = 0;
      tx.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return chainable([createdScenario]);
        }
        if (selectCallCount === 2) {
          return chainable([
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
            { id: "r1", rowType: "tank" },
          ]);
        }
        return chainable([]);
      });

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.create({
        name: "Frontier Watch",
        rows: [
          { rowType: "tank", unitIds: [] },
          { rowType: "melee", unitIds: [] },
          { rowType: "ranged", unitIds: [] },
          { rowType: "support", unitIds: [] },
        ],
      });

      expect(result.name).toBe("Frontier Watch");
      expect(result.rows.map((row) => row.rowType)).toEqual(["melee", "ranged", "support", "tank"]);
      expect(result.rows.every((row) => Array.isArray(row.assignments))).toBe(true);
    });

    it("creates a scenario with assignments across rows", async () => {
      const createdScenario = {
        id: "a2000000-0000-0000-0000-000000000100",
        name: "Siege Breakers",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      };

      tx.insert
        .mockReturnValueOnce(chainable([createdScenario]))
        .mockReturnValueOnce(chainable([
          { id: "r1", scenarioId: createdScenario.id, rowType: "tank" },
          { id: "r2", scenarioId: createdScenario.id, rowType: "melee" },
          { id: "r3", scenarioId: createdScenario.id, rowType: "ranged" },
          { id: "r4", scenarioId: createdScenario.id, rowType: "support" },
        ]))
        .mockReturnValueOnce(chainable([]));

      let selectCallCount = 0;
      tx.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return chainable([createdScenario]);
        }
        if (selectCallCount === 2) {
          return chainable([
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
            { id: "r1", rowType: "tank" },
          ]);
        }
        return chainable([
          {
            scenarios_rows_units: {
              id: "a1",
              rowId: "r2",
              unitId: "u1",
              slot: 1,
            },
            units: { name: "Barbarian" },
          },
          {
            scenarios_rows_units: {
              id: "a2",
              rowId: "r3",
              unitId: "u2",
              slot: 1,
            },
            units: { name: "Mage" },
          },
          {
            scenarios_rows_units: {
              id: "a3",
              rowId: "r4",
              unitId: "u3",
              slot: 1,
            },
            units: { name: "Ranger" },
          },
        ]);
      });

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.create({
        name: "Siege Breakers",
        rows: [
          { rowType: "tank", unitIds: [] },
          { rowType: "melee", unitIds: ["f0000000-0000-0000-0000-000000000001"] },
          { rowType: "ranged", unitIds: ["f0000000-0000-0000-0000-000000000002"] },
          { rowType: "support", unitIds: ["f0000000-0000-0000-0000-000000000003"] },
        ],
      });

      expect(result.rows.find((row) => row.rowType === "melee")?.assignments[0]?.unitName).toBe("Barbarian");
      expect(result.rows.find((row) => row.rowType === "ranged")?.assignments[0]?.unitName).toBe("Mage");
      expect(result.rows.find((row) => row.rowType === "support")?.assignments[0]?.unitName).toBe("Ranger");
    });

    it("throws CONFLICT for duplicate scenario names", async () => {
      const duplicateError = { code: "23505" };
      mockTransaction.mockRejectedValueOnce(duplicateError);

      const caller = createCaller(gmCtx);

      await expect(
        caller.scenarios.create({
          name: "Ambush at Dawn",
          rows: [
            { rowType: "tank", unitIds: [] },
            { rowType: "melee", unitIds: [] },
            { rowType: "ranged", unitIds: [] },
            { rowType: "support", unitIds: [] },
          ],
        }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "A scenario with this name already exists.",
      });
    });
  });

  describe("update", () => {
    it("updates only the scenario name", async () => {
      const updatedScenario = {
        id: "a2000000-0000-0000-0000-000000000001",
        name: "Ambush at Dusk",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx = {
        insert: vi.fn().mockReturnValue(chainable([])),
        select: vi.fn(),
        delete: vi.fn().mockReturnValue(chainable([])),
        update: vi.fn().mockReturnValue(chainable([updatedScenario])),
      };

      let selectCallCount = 0;
      tx.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return chainable([
            { id: "r1", rowType: "tank" },
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
          ]);
        }
        if (selectCallCount === 2) {
          return chainable([updatedScenario]);
        }
        if (selectCallCount === 3) {
          return chainable([
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
            { id: "r1", rowType: "tank" },
          ]);
        }
        return chainable([]);
      });

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.update({
        id: "a2000000-0000-0000-0000-000000000001",
        name: "Ambush at Dusk",
        rows: [
          { rowType: "tank", unitIds: [] },
          { rowType: "melee", unitIds: ["f0000000-0000-0000-0000-000000000001"] },
          { rowType: "ranged", unitIds: ["f0000000-0000-0000-0000-000000000002"] },
          { rowType: "support", unitIds: ["f0000000-0000-0000-0000-000000000003"] },
        ],
      });

      expect(result.name).toBe("Ambush at Dusk");
    });

    it("updates assignments and preserves slot order", async () => {
      const updatedScenario = {
        id: "a2000000-0000-0000-0000-000000000002",
        name: "Castle Siege",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx = {
        insert: vi.fn().mockReturnValue(chainable([])),
        select: vi.fn(),
        delete: vi.fn().mockReturnValue(chainable([])),
        update: vi.fn().mockReturnValue(chainable([updatedScenario])),
      };

      let selectCallCount = 0;
      tx.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return chainable([
            { id: "r1", rowType: "tank" },
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
          ]);
        }
        if (selectCallCount === 2) {
          return chainable([updatedScenario]);
        }
        if (selectCallCount === 3) {
          return chainable([
            { id: "r2", rowType: "melee" },
            { id: "r3", rowType: "ranged" },
            { id: "r4", rowType: "support" },
            { id: "r1", rowType: "tank" },
          ]);
        }
        return chainable([
          {
            scenarios_rows_units: { id: "a1", rowId: "r2", unitId: "u2", slot: 1 },
            units: { name: "Samurai" },
          },
          {
            scenarios_rows_units: { id: "a2", rowId: "r2", unitId: "u1", slot: 2 },
            units: { name: "Barbarian" },
          },
        ]);
      });

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      const result = await caller.scenarios.update({
        id: "a2000000-0000-0000-0000-000000000002",
        name: "Castle Siege",
        rows: [
          { rowType: "tank", unitIds: [] },
          {
            rowType: "melee",
            unitIds: [
              "f0000000-0000-0000-0000-000000000002",
              "f0000000-0000-0000-0000-000000000001",
            ],
          },
          { rowType: "ranged", unitIds: [] },
          { rowType: "support", unitIds: [] },
        ],
      });

      expect(result.rows.find((row) => row.rowType === "melee")?.assignments).toEqual([
        { assignmentId: "a1", unitId: "u2", unitName: "Samurai", position: 1 },
        { assignmentId: "a2", unitId: "u1", unitName: "Barbarian", position: 2 },
      ]);
    });

    it("throws INTERNAL_SERVER_ERROR when persisted scenario rows are invalid", async () => {
      const updatedScenario = {
        id: "a2000000-0000-0000-0000-000000000003",
        name: "Broken Scenario",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        update: vi.fn().mockReturnValue(chainable([updatedScenario])),
      };

      tx.select.mockReturnValue(
        chainable([
          { id: "r1", rowType: "tank" },
          { id: "r2", rowType: "melee" },
          { id: "r3", rowType: "ranged" },
        ]),
      );

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      await expect(
        caller.scenarios.update({
          id: updatedScenario.id,
          name: updatedScenario.name,
          rows: [
            { rowType: "tank", unitIds: [] },
            { rowType: "melee", unitIds: [] },
            { rowType: "ranged", unitIds: [] },
            { rowType: "support", unitIds: [] },
          ],
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Scenario data is in an unexpected state. Please contact support.",
      });
    });

    it("throws NOT_FOUND when updating a missing scenario", async () => {
      const tx = {
        insert: vi.fn(),
        select: vi.fn(),
        delete: vi.fn(),
        update: vi.fn().mockReturnValue(chainable([])),
      };

      mockTransaction.mockImplementation(async (callback) => callback(tx));

      const caller = createCaller(gmCtx);
      await expect(
        caller.scenarios.update({
          id: "00000000-0000-0000-0000-000000000099",
          name: "Missing",
          rows: [
            { rowType: "tank", unitIds: [] },
            { rowType: "melee", unitIds: [] },
            { rowType: "ranged", unitIds: [] },
            { rowType: "support", unitIds: [] },
          ],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
