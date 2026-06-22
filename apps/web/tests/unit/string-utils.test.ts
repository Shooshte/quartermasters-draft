import { describe, expect, it } from "vitest";
import { capitalize } from "../../src/lib/string-utils";

describe("capitalize", () => {
  it("capitalizes the first letter of a lowercase string", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("returns empty string for empty input", () => {
    expect(capitalize("")).toBe("");
  });

  it("leaves already-capitalized string unchanged", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("capitalizes single character", () => {
    expect(capitalize("a")).toBe("A");
  });

  it("only capitalizes the first character", () => {
    expect(capitalize("hello world")).toBe("Hello world");
  });
});
