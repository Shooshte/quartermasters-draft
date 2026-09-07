import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "../../../../packages/api-client/src/index";

afterEach(() => vi.unstubAllGlobals());

describe("Rust HTTP API transport", () => {
  it("encodes list filters as plain JSON and restores entity dates", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "effect", updatedAt: "2026-09-07T10:00:00.000Z" }],
          totalCount: 1,
          page: 2,
          limit: 20,
        }),
      ),
    );
    const api = createApiClient({ fetch: fetcher });
    const input = { page: 2, linkageFilter: { mode: "scenario" as const, scenarioId: "abc" } };
    const result = await api.scenarioBuilder.effects.list.query(input);
    expect(fetcher.mock.calls[0][0]).toBe(
      `/api/v1/effects?input=${encodeURIComponent(JSON.stringify(input))}`,
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", method: "GET" });
    expect(result.items[0].updatedAt).toEqual(new Date("2026-09-07T10:00:00.000Z"));
  });
  it("maps update and delete to resource URLs without putting IDs in the update body", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify({ success: true })));
    const api = createApiClient({ fetch: fetcher });
    await api.scenarioBuilder.scenarios.update.mutate({ id: "abc", name: "New", rows: [] });
    expect(fetcher.mock.calls[0]).toEqual([
      "/api/v1/scenarios/abc",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "New", rows: [] }) }),
    ]);
    await api.scenarioBuilder.scenarios.delete.mutate({ id: "abc" });
    expect(fetcher.mock.calls[1]).toEqual([
      "/api/v1/scenarios/abc",
      expect.objectContaining({ method: "DELETE" }),
    ]);
  });
  it("preserves conflict messages, status and field details", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "CONFLICT",
            message: "Effect name already exists.",
            details: { name: ["Taken"] },
          },
        }),
        { status: 409 },
      ),
    );
    const api = createApiClient({ fetch: fetcher });
    await expect(api.scenarioBuilder.effects.get.query({ id: "abc" })).rejects.toMatchObject({
      message: "Effect name already exists.",
      status: 409,
      data: { code: "CONFLICT" },
      details: { name: ["Taken"] },
    });
  });
  it("notifies the browser guard on authorization failures", async () => {
    const failed = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Session expired" } }),
          { status: 401 },
        ),
      );
    const api = createApiClient({ fetch: fetcher, onAuthorizationFailure: failed });
    await expect(api.battleLab.scenarioOptions.query()).rejects.toThrow("Session expired");
    expect(failed).toHaveBeenCalledWith(401);
  });
  it("keeps absent and expired session responses distinct and never caches them", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ authenticated: false, hadSession: true })));
    const api = createApiClient({ fetch: fetcher });
    expect(await api.auth.session()).toEqual({ authenticated: false, hadSession: true });
    expect(fetcher.mock.calls[0]).toEqual([
      "/api/v1/auth/session",
      expect.objectContaining({ cache: "no-store" }),
    ]);
  });
});
