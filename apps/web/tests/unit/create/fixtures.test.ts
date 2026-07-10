import { describe, expect, it } from "vitest";
import { createMockPageState } from "./fixtures";

describe("createMockPageState", () => {
  it("preserves explicit grouped state overrides", () => {
    const defaults = createMockPageState();

    const state = createMockPageState({
      workspaces: defaults.workspaces,
      domains: defaults.domains,
    });

    expect(state.workspaces).toBe(defaults.workspaces);
    expect(state.domains).toBe(defaults.domains);
  });
});
