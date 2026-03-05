import { describe, it, expect } from "vitest";
import { createCaller } from "../root";
import type { Context } from "../trpc";

const createContext = (overrides: Partial<Context> = {}): Context => ({
  userId: null,
  userRole: null,
  ...overrides,
});

describe("health router", () => {
  it("returns ok status", async () => {
    const caller = createCaller(createContext());
    const result = await caller.health.check();

    expect(result.status).toBe("ok");
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
