import type { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import {
  throwDeleteConflict,
  throwUniqueNameConflict,
} from "../routers/scenarioBuilder/crud-errors";
import { toPaginatedResult } from "../routers/scenarioBuilder/pagination";
import { findDbError } from "../routers/scenarioBuilder/shared";

describe("findDbError", () => {
  it("returns code when error has a direct code property", () => {
    expect(findDbError({ code: "23505" })).toEqual({ code: "23505" });
  });

  it("traverses nested cause chain to find the code", () => {
    expect(findDbError({ cause: { cause: { code: "23503" } } })).toEqual({ code: "23503" });
  });

  it("returns null when no code is found in chain", () => {
    expect(findDbError({ cause: { message: "No database code" } })).toBeNull();
  });

  it("returns null for non-object errors", () => {
    expect(findDbError("boom")).toBeNull();
    expect(findDbError(null)).toBeNull();
  });

  it("handles circular cause references without infinite loop", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;

    expect(findDbError(error)).toBeNull();
  });

  it("extracts constraint when present alongside code", () => {
    expect(findDbError({ code: "23505", constraint: "items_name_unique" })).toEqual({
      code: "23505",
      constraint: "items_name_unique",
    });
  });
});

describe("CRUD error translation", () => {
  it("translates wrapped unique violations with the entity label", () => {
    expect(() => throwUniqueNameConflict({ cause: { code: "23505" } }, "item")).toThrowError(
      expect.objectContaining<Partial<TRPCError>>({
        code: "CONFLICT",
        message: "An item with this name already exists.",
      }),
    );
  });

  it("translates accepted delete constraint codes", () => {
    expect(() =>
      throwDeleteConflict({ cause: { code: "23514" } }, "Spell is linked.", ["23503", "23514"]),
    ).toThrowError(expect.objectContaining({ code: "CONFLICT", message: "Spell is linked." }));
  });

  it("rethrows unknown errors without changing their identity", () => {
    const original = new Error("database offline");
    expect(() => throwUniqueNameConflict(original, "item")).toThrow(original);
  });
});

describe("toPaginatedResult", () => {
  it("builds the stable list response shape", () => {
    expect(toPaginatedResult([{ id: "one" }], [{ count: 7 }], 2, 3)).toEqual({
      items: [{ id: "one" }],
      page: 2,
      limit: 3,
      totalCount: 7,
    });
  });
});
