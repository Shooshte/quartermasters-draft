import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, type ChainableQuery, describeAuthGuard, gmCtx } from "./test-utils";

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

const { spellsRouter } = await import("../../routers/scenarioBuilder/spells");

const createCaller = createCallerFactory(router({ spells: spellsRouter }));

describe("spellsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockDb));
  });

  describe("list", () => {
    describeAuthGuard((ctx) => createCaller(ctx).spells.list());

    it("returns spells with totalCount and default limit=20", async () => {
      const mockSpells = [
        {
          id: "1",
          name: "Alpha",
          description: "Desc A",
          targetPolicy: "random",
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "Beta",
          description: "Desc B",
          targetPolicy: "highest_health",
          updatedAt: new Date(),
        },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockSpells);
        return chainable([{ count: 5 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.list();
      expect(result.items).toEqual(mockSpells);
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
      const result = await caller.spells.list();
      expect(result).toEqual({ items: [], page: 1, limit: 20, totalCount: 0 });
    });

    it("respects custom page and limit", async () => {
      const mockSpells = [
        {
          id: "3",
          name: "Gamma",
          description: null,
          targetPolicy: "lowest_health",
          updatedAt: new Date(),
        },
      ];
      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return chainable(mockSpells);
        return chainable([{ count: 15 }]);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockSpells);
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
      const result = await caller.spells.list({
        sortBy: "targetPolicy",
        sortDir: "desc",
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("applies unlinked filters to both row and count queries", async () => {
      const rowsQuery = chainable([]) as ChainableQuery;
      const countQuery = chainable([{ count: 0 }]) as ChainableQuery;
      mockSelect
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(rowsQuery)
        .mockReturnValueOnce(countQuery);

      const caller = createCaller(gmCtx);
      const list = caller.spells.list as (input: unknown) => Promise<unknown>;
      await list({ linkageFilter: { mode: "unlinked" } });

      expect(rowsQuery.where).toHaveBeenCalledTimes(1);
      expect(countQuery.where).toHaveBeenCalledTimes(1);
    });
  });

  describe("get", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).spells.get({ id: "b0000000-0000-4000-8000-000000000001" }),
    );

    it("returns spell with effectIds and allowedRowTypes when found", async () => {
      const mockSpell = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Fireball",
        targetPolicy: "highest_health",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
      };
      const mockEffectLinks = [
        { effectTemplateId: "a0000000-0000-4000-8000-000000000006" },
        { effectTemplateId: "a0000000-0000-4000-8000-000000000007" },
      ];
      const mockAllowedRows = [{ rowType: "melee" }, { rowType: "tank" }];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockSpell]);
        }
        if (callCount === 2) {
          return chainable(mockEffectLinks);
        }
        return chainable(mockAllowedRows);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.get({
        id: "b0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({
        ...mockSpell,
        effectIds: ["a0000000-0000-4000-8000-000000000006", "a0000000-0000-4000-8000-000000000007"],
        allowedRowTypes: ["melee", "tank"],
      });
    });

    it("throws NOT_FOUND when spell is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.get({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).spells.create({
        name: "New Spell",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      }),
    );

    it("creates a spell with required fields", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000010",
        name: "Arcane Volley",
        description: null,
        targetPolicy: "highest_damage",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: " Arcane Volley ",
        targetPolicy: "highest_damage",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      });

      expect(result).toEqual({
        ...created,
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
        allowedRowTypes: [],
      });
      expect(mockInsertFn).toHaveBeenCalledTimes(2);
    });

    it("creates a spell with description normalized to null when blank", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000011",
        name: "Silent Strike",
        description: null,
        targetPolicy: "random",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const values = vi.fn().mockReturnValue(chainable([created]));
      mockInsertFn
        .mockReturnValueOnce({ values })
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Silent Strike",
        description: "   ",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      });

      expect(result.description).toBeNull();
      expect(values).toHaveBeenCalledWith({
        name: "Silent Strike",
        description: null,
        targetPolicy: "random",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
      });
    });

    it("creates ordered linked effects", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000012",
        name: "Combo Strike",
        description: null,
        targetPolicy: "random",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const spellInsert = chainable([created]);
      const linksValues = vi.fn().mockReturnValue(
        chainable([
          { effectTemplateId: "a0000000-0000-4000-8000-000000000001", sequenceOrder: 1 },
          { effectTemplateId: "a0000000-0000-4000-8000-000000000003", sequenceOrder: 2 },
        ]),
      );
      mockInsertFn.mockReturnValueOnce(spellInsert).mockReturnValueOnce({ values: linksValues });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Combo Strike",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000003"],
      });

      expect(result.effectIds).toEqual([
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000003",
      ]);
      expect(linksValues).toHaveBeenCalledWith([
        {
          spellId: created.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000001",
          sequenceOrder: 1,
        },
        {
          spellId: created.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000003",
          sequenceOrder: 2,
        },
      ]);
    });

    it("allows duplicate effectIds", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000013",
        name: "Echo Blast",
        description: null,
        targetPolicy: "random",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const linksValues = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: linksValues });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Echo Blast",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000001"],
      });

      expect(result.effectIds).toEqual([
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000001",
      ]);
      expect(linksValues).toHaveBeenCalledWith([
        {
          spellId: created.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000001",
          sequenceOrder: 1,
        },
        {
          spellId: created.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000001",
          sequenceOrder: 2,
        },
      ]);
    });

    it("maps duplicate spell names to CONFLICT", async () => {
      mockInsertFn.mockImplementationOnce(() => ({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23505" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.create({
          name: "Duplicate",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("rejects create when effectIds is empty", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.spells.create({
          name: "No Effect Spell",
          targetPolicy: "random",
          effectIds: [],
        }),
      ).rejects.toThrow("At least one linked effect is required");

      expect(mockInsertFn).not.toHaveBeenCalled();
    });

    it("creates a spell with explicit targeting fields", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000030",
        name: "Chain Lightning",
        description: null,
        targetPolicy: "highest_damage",
        targetRowCount: 1,
        maxTargetsPerRow: 3,
        targetOnlyAdjacent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Chain Lightning",
        targetPolicy: "highest_damage",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
        targetRowCount: 1,
        maxTargetsPerRow: 3,
        targetOnlyAdjacent: true,
        allowedRowTypes: [],
      });

      expect(result.targetRowCount).toBe(1);
      expect(result.maxTargetsPerRow).toBe(3);
      expect(result.targetOnlyAdjacent).toBe(true);
    });

    it("creates a spell with maxTargetsPerRow null (whole row)", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000031",
        name: "Earthquake",
        description: null,
        targetPolicy: "random",
        targetRowCount: 2,
        maxTargetsPerRow: null,
        targetOnlyAdjacent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Earthquake",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
        targetRowCount: 2,
        maxTargetsPerRow: null,
      });

      expect(result.maxTargetsPerRow).toBeNull();
      expect(result.targetRowCount).toBe(2);
    });

    it("creates a spell with allowedRowTypes", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000032",
        name: "Tank Buster",
        description: null,
        targetPolicy: "highest_health",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) })
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Tank Buster",
        targetPolicy: "highest_health",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
        allowedRowTypes: ["melee", "tank"],
      });

      expect(result.allowedRowTypes).toEqual(["melee", "tank"]);
    });

    it("applies targeting defaults when new fields omitted", async () => {
      const created = {
        id: "b0000000-0000-4000-8000-000000000033",
        name: "Simple Spell",
        description: null,
        targetPolicy: "random",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockInsertFn
        .mockReturnValueOnce(chainable([created]))
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.create({
        name: "Simple Spell",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      });

      expect(result.targetRowCount).toBe(1);
      expect(result.maxTargetsPerRow).toBe(1);
      expect(result.targetOnlyAdjacent).toBe(false);
      expect(result.allowedRowTypes).toEqual([]);
    });

    it("rejects targetRowCount less than 1", async () => {
      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.create({
          name: "Bad Spell",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
          targetRowCount: 0,
        }),
      ).rejects.toThrow();
    });

    it("rejects maxTargetsPerRow less than 1 when not null", async () => {
      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.create({
          name: "Bad Spell",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
          maxTargetsPerRow: 0,
        }),
      ).rejects.toThrow();
    });

    it("rejects targetOnlyAdjacent true with maxTargetsPerRow null", async () => {
      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.create({
          name: "Bad Spell",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
          maxTargetsPerRow: null,
          targetOnlyAdjacent: true,
        }),
      ).rejects.toThrow();
    });

    it("rejects targetOnlyAdjacent true with maxTargetsPerRow 1", async () => {
      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.create({
          name: "Bad Spell",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
          maxTargetsPerRow: 1,
          targetOnlyAdjacent: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).spells.update({
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Updated",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      }),
    );

    it("updates spell fields", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Fireball Updated",
        description: "Updated desc",
        targetPolicy: "highest_damage",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      // delete effects, insert effects, delete allowed rows
      mockDeleteFn.mockReturnValueOnce(chainable([])).mockReturnValueOnce(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: " Fireball Updated ",
        description: " Updated desc ",
        targetPolicy: "highest_damage",
        effectIds: ["a0000000-0000-4000-8000-000000000006"],
      });

      expect(result).toEqual({
        ...updated,
        effectIds: ["a0000000-0000-4000-8000-000000000006"],
        allowedRowTypes: [],
      });
      expect(updateSet).toHaveBeenCalledWith({
        name: "Fireball Updated",
        description: "Updated desc",
        targetPolicy: "highest_damage",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
      });
    });

    it("clears description to null", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Silent Spell",
        description: null,
        targetPolicy: "random",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      mockDeleteFn.mockReturnValueOnce(chainable([])).mockReturnValueOnce(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: "Silent Spell",
        description: "   ",
        targetPolicy: "random",
        effectIds: ["a0000000-0000-4000-8000-000000000001"],
      });

      expect(result.description).toBeNull();
      expect(updateSet).toHaveBeenCalledWith({
        name: "Silent Spell",
        description: null,
        targetPolicy: "random",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
      });
    });

    it("replaces linked effects in the submitted order", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Fireball",
        description: null,
        targetPolicy: "highest_health" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([updated])) });
      mockDeleteFn.mockReturnValueOnce(chainable([])).mockReturnValueOnce(chainable([]));
      const linksValues = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: linksValues });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: updated.name,
        targetPolicy: updated.targetPolicy,
        effectIds: ["a0000000-0000-4000-8000-000000000007", "a0000000-0000-4000-8000-000000000006"],
      });

      expect(result.effectIds).toEqual([
        "a0000000-0000-4000-8000-000000000007",
        "a0000000-0000-4000-8000-000000000006",
      ]);
      expect(linksValues).toHaveBeenCalledWith([
        {
          spellId: updated.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000007",
          sequenceOrder: 1,
        },
        {
          spellId: updated.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000006",
          sequenceOrder: 2,
        },
      ]);
    });

    it("removes linked effects when fewer ids are submitted", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Fireball",
        description: null,
        targetPolicy: "highest_health" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([updated])) });
      mockDeleteFn.mockReturnValueOnce(chainable([])).mockReturnValueOnce(chainable([]));
      const linksValues = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: linksValues });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: updated.name,
        targetPolicy: updated.targetPolicy,
        effectIds: ["a0000000-0000-4000-8000-000000000006"],
      });

      expect(result.effectIds).toEqual(["a0000000-0000-4000-8000-000000000006"]);
      expect(linksValues).toHaveBeenCalledWith([
        {
          spellId: updated.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000006",
          sequenceOrder: 1,
        },
      ]);
    });

    it("allows duplicate effectIds on update", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Echo Blast",
        description: null,
        targetPolicy: "random" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([updated])) });
      mockDeleteFn.mockReturnValueOnce(chainable([])).mockReturnValueOnce(chainable([]));
      const linksValues = vi.fn().mockReturnValue(chainable([]));
      mockInsertFn.mockReturnValueOnce({ values: linksValues });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: updated.name,
        targetPolicy: updated.targetPolicy,
        effectIds: ["a0000000-0000-4000-8000-000000000001", "a0000000-0000-4000-8000-000000000001"],
      });

      expect(result.effectIds).toEqual([
        "a0000000-0000-4000-8000-000000000001",
        "a0000000-0000-4000-8000-000000000001",
      ]);
      expect(linksValues).toHaveBeenCalledWith([
        {
          spellId: updated.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000001",
          sequenceOrder: 1,
        },
        {
          spellId: updated.id,
          effectTemplateId: "a0000000-0000-4000-8000-000000000001",
          sequenceOrder: 2,
        },
      ]);
    });

    it("returns NOT_FOUND for missing id", async () => {
      mockUpdateFn.mockReturnValueOnce({ set: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.update({
          id: "00000000-0000-4000-8000-000000000099",
          name: "Updated",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("maps duplicate spell names to CONFLICT", async () => {
      mockUpdateFn.mockImplementationOnce(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23505" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.update({
          id: "b0000000-0000-4000-8000-000000000001",
          name: "Battle Cry",
          targetPolicy: "random",
          effectIds: ["a0000000-0000-4000-8000-000000000001"],
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("rejects update when effectIds is empty", async () => {
      const caller = createCaller(gmCtx);

      await expect(
        caller.spells.update({
          id: "b0000000-0000-4000-8000-000000000001",
          name: "Fireball",
          targetPolicy: "random",
          effectIds: [],
        }),
      ).rejects.toThrow("At least one linked effect is required");

      expect(mockUpdateFn).not.toHaveBeenCalled();
      expect(mockDeleteFn).not.toHaveBeenCalled();
    });

    it("updates targeting fields and replaces allowedRowTypes", async () => {
      const updated = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Fireball",
        description: null,
        targetPolicy: "highest_health" as const,
        targetRowCount: 2,
        maxTargetsPerRow: null,
        targetOnlyAdjacent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updateSet = vi.fn().mockReturnValue(chainable([updated]));
      mockUpdateFn.mockReturnValueOnce({ set: updateSet });
      // delete effects
      mockDeleteFn.mockReturnValueOnce(chainable([]));
      // insert effects
      mockInsertFn.mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });
      // delete allowed rows
      mockDeleteFn.mockReturnValueOnce(chainable([]));
      // insert allowed rows
      mockInsertFn.mockReturnValueOnce({ values: vi.fn().mockReturnValue(chainable([])) });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.update({
        id: updated.id,
        name: updated.name,
        targetPolicy: updated.targetPolicy,
        effectIds: ["a0000000-0000-4000-8000-000000000006"],
        targetRowCount: 2,
        maxTargetsPerRow: null,
        targetOnlyAdjacent: false,
        allowedRowTypes: ["melee", "tank"],
      });

      expect(result.targetRowCount).toBe(2);
      expect(result.maxTargetsPerRow).toBeNull();
      expect(result.allowedRowTypes).toEqual(["melee", "tank"]);
    });
  });

  describe("delete", () => {
    describeAuthGuard((ctx) =>
      createCaller(ctx).spells.delete({ id: "b0000000-0000-4000-8000-000000000001" }),
    );

    it("deletes spell and returns success", async () => {
      mockDeleteFn.mockReturnValue(chainable([{ id: "b0000000-0000-4000-8000-000000000001" }]));

      const caller = createCaller(gmCtx);
      const result = await caller.spells.delete({
        id: "b0000000-0000-4000-8000-000000000001",
      });
      expect(result).toEqual({ success: true });
    });

    it("maps linked-item dependency failures to CONFLICT", async () => {
      mockDeleteFn.mockImplementationOnce(() => ({
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue({ cause: { code: "23514" } }),
      }));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.delete({ id: "b0000000-0000-4000-8000-000000000001" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "Cannot delete spell while it is linked to one or more items.",
      });
    });

    it("throws NOT_FOUND when spell does not exist", async () => {
      mockDeleteFn.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.delete({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
