/**
 * Shared REST API helpers for e2e tests.
 * Provides generic CRUD operations for scenario builder entities.
 */
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { expect } from "@playwright/test";
import { API_BASE } from "./seed-constants";

export type EntityType = "effects" | "items" | "units" | "scenarios";

// ─── Response Parsing ────────────────────────────────────────────────────────

/** Parse a plain JSON REST response body */
export async function parseApiResponse(response: APIResponse) {
  const body = await response.json();
  return body;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/** Delete a single entity via the REST mutation API */
export async function deleteEntityViaApi(
  request: APIRequestContext,
  entityType: EntityType,
  id: string,
): Promise<APIResponse> {
  return request.delete(`${API_BASE}/${entityType}/${id}`, {
    headers: { "Content-Type": "application/json" },
  });
}

/** Delete multiple entities by ID, asserting each succeeds */
export async function deleteAllEntitiesViaApi(
  request: APIRequestContext,
  entityType: EntityType,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    const response = await deleteEntityViaApi(request, entityType, id);
    expect(response.ok()).toBeTruthy();
  }
}

// ─── List ────────────────────────────────────────────────────────────────────

/** List entity IDs via the REST query API (fetches up to 500, sorted by name) */
export async function listEntityIdsViaApi(
  request: APIRequestContext,
  entityType: EntityType,
): Promise<string[]> {
  const input = encodeURIComponent(
    JSON.stringify({
      page: 1,
      limit: 500,
      sortBy: "name",
      sortDir: "asc",
    }),
  );
  const response = await request.get(`${API_BASE}/${entityType}?input=${input}`);
  expect(response.ok()).toBeTruthy();
  const data = await parseApiResponse(response);
  return data.items.map((item: { id: string }) => item.id);
}
