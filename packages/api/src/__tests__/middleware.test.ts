import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, gmProcedure, createCallerFactory } from "../trpc";
import type { Context } from "../trpc";

const createContext = (overrides: Partial<Context> = {}): Context => ({
  userId: null,
  userRole: null,
  ...overrides,
});

const testRouter = router({
  protectedRoute: protectedProcedure.query(() => "authenticated"),
  gmRoute: gmProcedure.query(() => "gm only"),
});

const createCaller = createCallerFactory(testRouter);

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when no userId", async () => {
    const caller = createCaller(createContext());
    await expect(caller.protectedRoute()).rejects.toThrow(TRPCError);
    await expect(caller.protectedRoute()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows authenticated users", async () => {
    const caller = createCaller(createContext({ userId: "user-1", userRole: "player" }));
    const result = await caller.protectedRoute();
    expect(result).toBe("authenticated");
  });
});

describe("gmProcedure", () => {
  it("throws UNAUTHORIZED when no userId", async () => {
    const caller = createCaller(createContext());
    await expect(caller.gmRoute()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN for non-GM users", async () => {
    const caller = createCaller(createContext({ userId: "user-1", userRole: "player" }));
    await expect(caller.gmRoute()).rejects.toThrow(TRPCError);
    await expect(caller.gmRoute()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows game masters", async () => {
    const caller = createCaller(createContext({ userId: "gm-1", userRole: "game_master" }));
    const result = await caller.gmRoute();
    expect(result).toBe("gm only");
  });
});
