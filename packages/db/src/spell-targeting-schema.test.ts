import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("removed spell persistence", () => {
  it("does not export spell schema tables", () => {
    expect(schema).not.toHaveProperty("spells");
    expect(schema).not.toHaveProperty("spellsEffects");
    expect(schema).not.toHaveProperty("spellsAllowedRows");
    expect(schema).not.toHaveProperty("itemsSpells");
  });
});
