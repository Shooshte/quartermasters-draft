import { describe, expect, it } from "vitest";
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
