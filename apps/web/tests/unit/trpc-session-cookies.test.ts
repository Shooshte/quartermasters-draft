// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("~/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@qd/api", () => ({ appRouter: {} }));
vi.mock("@trpc/server/adapters/fetch", () => ({
  fetchRequestHandler: async (options: { createContext: () => Promise<unknown> }) => {
    await options.createContext();
    return new Response("{}");
  },
}));

import { Route } from "../../src/routes/api/trpc.$";

beforeEach(() => vi.clearAllMocks());
it("forwards all session Set-Cookie headers onto the tRPC response", async () => {
  const headers = new Headers();
  headers.append("set-cookie", "better-auth.session_token=renewed; Max-Age=2592000; HttpOnly");
  headers.append("set-cookie", "better-auth.dont_remember=; Max-Age=0");
  mocks.getSession.mockResolvedValue({ response: null, headers });
  const route = Route as unknown as {
    server: { handlers: { GET: (args: { request: Request }) => Promise<Response> } };
  };
  const response = await route.server.handlers.GET({
    request: new Request("http://localhost:3000/api/trpc/test"),
  });
  expect(mocks.getSession).toHaveBeenCalledWith(expect.objectContaining({ returnHeaders: true }));
  expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie());
});

it("normalizes only a policy rejection at the tRPC read boundary", async () => {
  const { APIError } = await import("better-auth/api");
  const route = Route as unknown as {
    server: { handlers: { GET: (args: { request: Request }) => Promise<Response> } };
  };
  mocks.getSession.mockRejectedValueOnce(
    new APIError("UNAUTHORIZED", { code: "SESSION_POLICY_REJECTED", message: "Session expired" }),
  );
  await expect(
    route.server.handlers.GET({ request: new Request("http://localhost:3000/api/trpc/test") }),
  ).resolves.toBeInstanceOf(Response);
  const failure = new Error("database unavailable");
  mocks.getSession.mockRejectedValueOnce(failure);
  await expect(
    route.server.handlers.GET({ request: new Request("http://localhost:3000/api/trpc/test") }),
  ).rejects.toBe(failure);
});

it("forwards all clearing cookies on a policy rejection", async () => {
  const { APIError } = await import("better-auth/api");
  const headers = new Headers();
  headers.append("set-cookie", "better-auth.session_token=; Max-Age=0; HttpOnly");
  headers.append("set-cookie", "better-auth.dont_remember=; Max-Age=0");
  mocks.getSession.mockRejectedValueOnce(
    new APIError(
      "UNAUTHORIZED",
      {
        code: "SESSION_POLICY_REJECTED",
        message: "Session expired or revoked",
      },
      headers,
    ),
  );
  const route = Route as unknown as {
    server: { handlers: { GET: (args: { request: Request }) => Promise<Response> } };
  };
  const response = await route.server.handlers.GET({
    request: new Request("http://localhost:3000/api/trpc/test"),
  });
  expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie());
});
