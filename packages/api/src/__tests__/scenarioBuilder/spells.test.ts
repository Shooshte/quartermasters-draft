import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory, router } from "../../trpc";
import { chainable, gmCtx, playerCtx, anonCtx } from "./test-utils";

const mockSelect = vi.fn();
const mockDb = { select: mockSelect };

vi.mock("@qd/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@qd/db")>();
  return { ...actual, db: mockDb };
});

const { spellsRouter } = await import(
  "../../routers/scenarioBuilder/spells"
);

const createCaller = createCallerFactory(router({ spells: spellsRouter }));

describe("spellsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(caller.spells.list()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(caller.spells.list()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("returns spells ordered by name with pagination", async () => {
      const mockSpells = [
        { id: "1", name: "Alpha", updatedAt: new Date() },
        { id: "2", name: "Beta", updatedAt: new Date() },
      ];
      mockSelect.mockReturnValue(chainable(mockSpells));

      const caller = createCaller(gmCtx);
      const result = await caller.spells.list();
      expect(result.items).toEqual(mockSpells);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it("uses default pagination when no input provided", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      const result = await caller.spells.list();
      expect(result).toEqual({ items: [], page: 1, limit: 100 });
    });

    it("respects custom page and limit", async () => {
      const mockSpells = [
        { id: "3", name: "Gamma", updatedAt: new Date() },
      ];
      mockSelect.mockReturnValue(chainable(mockSpells));

      const caller = createCaller(gmCtx);
      const result = await caller.spells.list({ page: 2, limit: 10 });
      expect(result.items).toEqual(mockSpells);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe("get", () => {
    it("throws UNAUTHORIZED for unauthenticated user", async () => {
      const caller = createCaller(anonCtx);
      await expect(
        caller.spells.get({ id: "b0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN for player role", async () => {
      const caller = createCaller(playerCtx);
      await expect(
        caller.spells.get({ id: "b0000000-0000-0000-0000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns spell with effectIds when found", async () => {
      const mockSpell = {
        id: "b0000000-0000-0000-0000-000000000001",
        name: "Fireball",
        targetPolicy: "highest_health",
      };
      const mockEffectLinks = [
        { effectTemplateId: "a0000000-0000-0000-0000-000000000006" },
        { effectTemplateId: "a0000000-0000-0000-0000-000000000007" },
      ];

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainable([mockSpell]);
        }
        return chainable(mockEffectLinks);
      });

      const caller = createCaller(gmCtx);
      const result = await caller.spells.get({
        id: "b0000000-0000-0000-0000-000000000001",
      });
      expect(result).toEqual({
        ...mockSpell,
        effectIds: [
          "a0000000-0000-0000-0000-000000000006",
          "a0000000-0000-0000-0000-000000000007",
        ],
      });
    });

    it("throws NOT_FOUND when spell is missing", async () => {
      mockSelect.mockReturnValue(chainable([]));

      const caller = createCaller(gmCtx);
      await expect(
        caller.spells.get({ id: "00000000-0000-0000-0000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
