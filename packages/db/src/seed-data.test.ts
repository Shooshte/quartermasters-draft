import { describe, expect, it } from "vitest";
import { buildSeedData, effectTemplateSeedData } from "./seed-data";

const FAKE_HASH = "$argon2id$v=19$m=65536,t=3,p=4$fakesalt$fakehash";

describe("seed data", () => {
  it("creates GM user with correct email and role", () => {
    const { users } = buildSeedData(FAKE_HASH);
    const gm = users.find((u) => u.email === "gm@example.com");
    expect(gm).toBeDefined();
    expect(gm!.role).toBe("gm");
    expect(gm!.name).toBe("Test GM");
    expect(gm!.id).toBe("seed-gm-001");
  });

  it("creates Player user with correct email and role", () => {
    const { users } = buildSeedData(FAKE_HASH);
    const player = users.find((u) => u.email === "player@example.com");
    expect(player).toBeDefined();
    expect(player!.role).toBe("player");
    expect(player!.name).toBe("Test Player");
    expect(player!.id).toBe("seed-player-001");
  });

  it("creates account records for each user", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    expect(accounts).toHaveLength(2);
  });

  it("creates account with providerId 'credential' and accountId matching userId", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    for (const account of accounts) {
      expect(account.providerId).toBe("credential");
      expect(account.accountId).toBe(account.userId);
    }
  });

  it("sets the hashed password on each account", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    for (const account of accounts) {
      expect(account.password).toBe(FAKE_HASH);
    }
  });

  it("maps account userId to matching user id", () => {
    const { users, accounts } = buildSeedData(FAKE_HASH);
    const userIds = users.map((u) => u.id);
    for (const account of accounts) {
      expect(userIds).toContain(account.userId);
    }
  });
});

describe("effectTemplateSeedData", () => {
  it("has 7 effect template records", () => {
    expect(effectTemplateSeedData).toHaveLength(7);
  });

  it("each record has required fields: name, timingType, effectType", () => {
    for (const template of effectTemplateSeedData) {
      expect(template.name).toBeDefined();
      expect(template.timingType).toBeDefined();
      expect(template.effectType).toBeDefined();
    }
  });

  it("covers all four effectType values", () => {
    const effectTypes = effectTemplateSeedData.map((t) => t.effectType);
    expect(effectTypes).toContain("buff");
    expect(effectTypes).toContain("debuff");
    expect(effectTypes).toContain("healing");
    expect(effectTypes).toContain("damage");
  });

  it("covers both timingType values", () => {
    const timingTypes = effectTemplateSeedData.map((t) => t.timingType);
    expect(timingTypes).toContain("instant");
    expect(timingTypes).toContain("interval");
  });

  it("interval records have intervalMs and triggerCount set", () => {
    const intervalRecords = effectTemplateSeedData.filter((t) => t.timingType === "interval");
    expect(intervalRecords.length).toBeGreaterThan(0);
    for (const template of intervalRecords) {
      expect(template.intervalMs).toBeDefined();
      expect(template.triggerCount).toBeDefined();
    }
  });

  it("instant records do not have intervalMs set", () => {
    const instantRecords = effectTemplateSeedData.filter((t) => t.timingType === "instant");
    expect(instantRecords.length).toBeGreaterThan(0);
    for (const template of instantRecords) {
      expect(template.intervalMs).toBeUndefined();
    }
  });

  it("healing records have directHealing or health set", () => {
    const healingRecords = effectTemplateSeedData.filter((t) => t.effectType === "healing");
    for (const template of healingRecords) {
      expect(template.directHealing !== undefined || template.health !== undefined).toBe(true);
    }
  });

  it("damage records have a direct damage field set", () => {
    const damageRecords = effectTemplateSeedData.filter((t) => t.effectType === "damage");
    for (const template of damageRecords) {
      expect(
        template.directSpellDmg !== undefined || template.directMeleeDmg !== undefined || template.directRangedDmg !== undefined,
      ).toBe(true);
    }
  });
});
