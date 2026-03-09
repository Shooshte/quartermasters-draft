import { test, expect } from "../auth/auth.fixtures";
import { test as base } from "@playwright/test";

const BASE = "http://localhost:3000/api/trpc";

/** Helper to parse superjson tRPC response */
async function parseTrpcResponse(response: Awaited<ReturnType<import("@playwright/test").APIRequestContext["get"]>>) {
  const body = await response.json();
  return body.result.data.json;
}

test.describe("Scenario Builder Read API — GM access", () => {
  // ── Effects ──────────────────────────────────────────────────────

  test("GM can list effects (7 records, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(7);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(100);
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
    const input = encodeURIComponent(JSON.stringify({ json: { id: "a0000000-0000-0000-0000-000000000001" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.effects.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Barbarian Roar");
    expect(data.effectType).toBe("buff");
    expect(data.timingType).toBe("instant");
  });

  // ── Spells ───────────────────────────────────────────────────────

  test("GM can list spells (3 records, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.spells.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(100);
    const names = data.items.map((s: { name: string }) => s.name);
    expect(names).toEqual([...names].sort());
  });

  test("GM can get spell with effectIds (Fireball)", async ({ gmPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: "b0000000-0000-0000-0000-000000000001" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.spells.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Fireball");
    // Fireball has Arcane Damage (seq 1) then Sizzling Flesh (seq 2)
    expect(data.effectIds).toEqual([
      "a0000000-0000-0000-0000-000000000006",
      "a0000000-0000-0000-0000-000000000007",
    ]);
  });

  // ── Items ────────────────────────────────────────────────────────

  test("GM can list items (3 records, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.items.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(100);
    const names = data.items.map((i: { name: string }) => i.name);
    expect(names).toEqual([...names].sort());
  });

  test("GM can get item with spellIds (Oak Staff)", async ({ gmPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: "d0000000-0000-0000-0000-000000000002" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.items.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Oak Staff");
    expect(data.spellIds).toEqual(["b0000000-0000-0000-0000-000000000001"]);
  });

  // ── Units ────────────────────────────────────────────────────────

  test("GM can list units (3 records, alphabetical)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.units.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(3);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(100);
    const names = data.items.map((u: { name: string }) => u.name);
    expect(names).toEqual([...names].sort());
  });

  test("GM can get unit with itemIds (Barbarian)", async ({ gmPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: "f0000000-0000-0000-0000-000000000001" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.units.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Barbarian");
    expect(data.itemIds).toEqual(["d0000000-0000-0000-0000-000000000001"]);
  });

  // ── Scenarios ────────────────────────────────────────────────────

  test("GM can list scenarios (1 record)", async ({ gmPage }) => {
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.scenarios.list`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.items).toHaveLength(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(100);
    expect(data.items[0].name).toBe("Ambush at Dawn");
  });

  test("GM can get scenario with rows and assignments", async ({ gmPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: "a2000000-0000-0000-0000-000000000001" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.scenarios.get?input=${input}`);
    expect(res.ok()).toBe(true);
    const data = await parseTrpcResponse(res);
    expect(data.name).toBe("Ambush at Dawn");
    expect(data.rows).toHaveLength(4);

    // Rows sorted alphabetically by rowType: melee, ranged, support, tank
    const rowTypes = data.rows.map((r: { rowType: string }) => r.rowType);
    expect(rowTypes).toEqual(["melee", "ranged", "support", "tank"]);

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
    const input = encodeURIComponent(JSON.stringify({ json: { id: "00000000-0000-0000-0000-000000000099" } }));
    const res = await gmPage.request.get(`${BASE}/scenarioBuilder.effects.get?input=${input}`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("NOT_FOUND");
  });
});

// ── Access control ───────────────────────────────────────────────

test.describe("Scenario Builder Read API — Player FORBIDDEN", () => {
  test("Player gets FORBIDDEN on effects.list", async ({ playerPage }) => {
    const res = await playerPage.request.get(`${BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("FORBIDDEN");
  });

  test("Player gets FORBIDDEN on scenarios.get", async ({ playerPage }) => {
    const input = encodeURIComponent(JSON.stringify({ json: { id: "a2000000-0000-0000-0000-000000000001" } }));
    const res = await playerPage.request.get(`${BASE}/scenarioBuilder.scenarios.get?input=${input}`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("FORBIDDEN");
  });
});

base.describe("Scenario Builder Read API — Unauthenticated UNAUTHORIZED", () => {
  base("Unauthenticated request gets UNAUTHORIZED", async ({ request }) => {
    const res = await request.get(`${BASE}/scenarioBuilder.effects.list`);
    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error.json.data.code).toBe("UNAUTHORIZED");
  });
});
