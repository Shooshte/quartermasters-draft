import { expect, test } from "../db-reset.fixture";
import {
  ARCANE_DAMAGE_ID,
  IRON_SWORD_ID,
  SIZZLING_FLESH_ID,
  TRPC_BASE,
} from "../helpers/seed-constants";
import { parseTrpcResponse } from "../helpers/trpc-api";
import { test as base } from "../worker-base.fixture";

test.describe("Scenario Builder Read API — GM access", () => {
  test.beforeEach(async ({ resetDb }) => {
    await resetDb();
  });

  // ── Effects ──────────────────────────────────────────────────────

  test("GM can list effects (20 per page, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(20);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    // Alphabetical order
    const names = data.items.map((e: { name: string }) => e.name);
    expect(names).toEqual([...names].sort());
    // Each item has expected shape
    for (const item of data.items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("updatedAt");
    }
  });

  test("GM can get effect by ID (Barbarian Roar)", async ({ gmPage }) => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: "a0000000-0000-0000-0000-000000000001" } }),
    );
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.effects.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Barbarian Roar");
    expect(data.effectType).toBe("buff");
    expect(data.timingType).toBe("instant");
  });

  // ── Items ────────────────────────────────────────────────────────

  test("GM can list items (21 records, 20 per page, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.items.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(20);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    const names = data.items.map((i: { name: string }) => i.name);
    expect(names).toEqual([...names].sort());
  });

  test("GM can get item with ordered effectIds (Iron Sword)", async ({ gmPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: IRON_SWORD_ID } }));
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.items.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Iron Sword");
    expect(data.effectIds).toEqual([ARCANE_DAMAGE_ID, SIZZLING_FLESH_ID]);
    expect(data.allowedRowTypes).toEqual(["tank", "melee", "ranged", "support"]);
  });

  // ── Units ────────────────────────────────────────────────────────

  test("GM can list units (21 records, 20 per page, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.units.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(20);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    const names = data.items.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort());
  });

  test("GM can get unit with itemIds (Barbarian)", async ({ gmPage }) => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: "f0000000-0000-0000-0000-000000000001" } }),
    );
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.units.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Barbarian");
    expect(data.itemIds).toEqual(["d0000000-0000-0000-0000-000000000001"]);
    expect(data).toMatchObject({
      targetScope: "enemies",
      targetPriority: "random",
      targetCount: 1,
      selectionShape: "individual",
    });
  });

  // ── Scenarios ────────────────────────────────────────────────────

  test("GM can list scenarios (paginated, 20 per page)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.scenarios.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(20);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    expect(data.totalCount).toBe(21);
    // Default sort: name ascending
    expect(data.items[0].name).toBe("Ambush at Dawn");
    expect(data.items[1].name).toBe("Bridge Defense");
  });

  test("GM can get scenario with rows and assignments", async ({ gmPage }) => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: "a2000000-0000-0000-0000-000000000001" } }),
    );
    const res = await gmPage.request.get(
      `${TRPC_BASE}/scenarioBuilder.scenarios.get?input=${input}`,
    );
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Ambush at Dawn");
    expect(data.rows).toHaveLength(4);

    // Rows in canonical order: ranged, support, melee, tank
    const rowTypes = data.rows.map((r: { rowType: string }) => r.rowType);
    expect(rowTypes).toEqual(["ranged", "support", "melee", "tank"]);

    // melee row has Barbarian at position 1
    const meleeRow = data.rows.find((r: { rowType: string }) => r.rowType === "melee");
    expect(meleeRow.assignments).toHaveLength(1);
    expect(meleeRow.assignments[0].unitName).toBe("Barbarian");
    expect(meleeRow.assignments[0].position).toBe(1);

    // ranged row has Mage
    const rangedRow = data.rows.find((r: { rowType: string }) => r.rowType === "ranged");
    expect(rangedRow.assignments).toHaveLength(1);
    expect(rangedRow.assignments[0].unitName).toBe("Mage");

    // support row has Ranger
    const supportRow = data.rows.find((r: { rowType: string }) => r.rowType === "support");
    expect(supportRow.assignments).toHaveLength(1);
    expect(supportRow.assignments[0].unitName).toBe("Ranger");

    // tank row is empty
    const tankRow = data.rows.find((r: { rowType: string }) => r.rowType === "tank");
    expect(tankRow.assignments).toHaveLength(0);
  });

  // ── NOT_FOUND ────────────────────────────────────────────────────

  test("Nonexistent UUID returns NOT_FOUND", async ({ gmPage }) => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: "00000000-0000-0000-0000-000000000099" } }),
    );
    const res = await gmPage.request.get(`${TRPC_BASE}/scenarioBuilder.effects.get?input=${input}`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("NOT_FOUND");
  });
});

// ── Access control ───────────────────────────────────────────────

test.describe("Scenario Builder Read API — Player FORBIDDEN", () => {
  test.beforeEach(async ({ resetDb }) => {
    await resetDb();
  });

  test("Player gets FORBIDDEN on effects.list", async ({ playerPage }) => {
    const res = await playerPage.request.get(`${TRPC_BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("FORBIDDEN");
  });

  test("Player gets FORBIDDEN on scenarios.get", async ({ playerPage }) => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { id: "a2000000-0000-0000-0000-000000000001" } }),
    );
    const res = await playerPage.request.get(
      `${TRPC_BASE}/scenarioBuilder.scenarios.get?input=${input}`,
    );
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("FORBIDDEN");
  });
});

base.describe("Scenario Builder Read API — Unauthenticated UNAUTHORIZED", () => {
  base("Unauthenticated request gets UNAUTHORIZED", async ({ request }) => {
    const res = await request.get(`${TRPC_BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("UNAUTHORIZED");
  });
});
