import { describe, expect, it } from "vitest";
import {
  createIdleWorkspace,
  DEFAULT_TAB,
  ENTITY_TABS,
  isEntityTab,
  isValidTab,
  TABS,
} from "~/components/create/types";

describe("create/types", () => {
  describe("TABS", () => {
    it("contains all five tab names", () => {
      expect(TABS).toEqual(["Effects", "Spells", "Items", "Units", "Scenarios"]);
    });
  });

  describe("DEFAULT_TAB", () => {
    it('defaults to "Scenarios"', () => {
      expect(DEFAULT_TAB).toBe("Scenarios");
    });
  });

  describe("ENTITY_TABS", () => {
    it("contains only entity tabs (not Scenarios)", () => {
      expect(ENTITY_TABS).toEqual(["Effects", "Spells", "Items", "Units"]);
    });
  });

  describe("isValidTab", () => {
    it.each([
      "Effects",
      "Spells",
      "Items",
      "Units",
      "Scenarios",
    ] as const)('returns true for "%s"', (tab) => {
      expect(isValidTab(tab)).toBe(true);
    });

    it("returns false for an unknown string", () => {
      expect(isValidTab("Unknown")).toBe(false);
    });

    it("returns false for non-string values", () => {
      expect(isValidTab(42)).toBe(false);
      expect(isValidTab(null)).toBe(false);
      expect(isValidTab(undefined)).toBe(false);
    });
  });

  describe("isEntityTab", () => {
    it.each(["Effects", "Spells", "Items", "Units"] as const)('returns true for "%s"', (tab) => {
      expect(isEntityTab(tab)).toBe(true);
    });

    it('returns false for "Scenarios"', () => {
      expect(isEntityTab("Scenarios")).toBe(false);
    });
  });

  describe("createIdleWorkspace", () => {
    it("returns an idle workspace state", () => {
      expect(createIdleWorkspace()).toEqual({
        mode: "idle",
        entityType: null,
        entityId: null,
        data: null,
        formValues: {},
        isDirty: false,
      });
    });
  });
});
