// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), responseHeaders: new Headers() }));
vi.mock("../../src/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@tanstack/react-start/server", () => ({
  getResponseHeaders: () => mocks.responseHeaders,
}));

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of mocks.responseHeaders.keys()) mocks.responseHeaders.delete(key);
});

it("forwards every session cookie into the SSR response headers", async () => {
  const { getProtectedSession } = await import("../../src/lib/auth-session.server");
  const headers = new Headers();
  headers.append("set-cookie", "better-auth.session_token=renewed; Max-Age=2592000; HttpOnly");
  headers.append("set-cookie", "better-auth.dont_remember=; Max-Age=0");
  const session = { session: { id: "session" }, user: { id: "user" } };
  mocks.getSession.mockResolvedValue({ response: session, headers });
  const requestHeaders = new Headers({ cookie: "better-auth.session_token=old" });
  expect(await getProtectedSession(requestHeaders)).toBe(session);
  expect(mocks.getSession).toHaveBeenCalledWith({
    headers: requestHeaders,
    query: { disableCookieCache: true },
    returnHeaders: true,
  });
  expect(mocks.responseHeaders.getSetCookie()).toEqual(headers.getSetCookie());
});

it("forwards cookie clearing for expired sessions and preserves unrelated errors", async () => {
  const { getProtectedSession } = await import("../../src/lib/auth-session.server");
  const headers = new Headers({ "set-cookie": "better-auth.session_token=; Max-Age=0" });
  mocks.getSession.mockResolvedValueOnce({ response: null, headers });
  expect(await getProtectedSession(new Headers())).toBeNull();
  expect(mocks.responseHeaders.getSetCookie()).toEqual(headers.getSetCookie());
  const error = new Error("database unavailable");
  mocks.getSession.mockRejectedValueOnce(error);
  await expect(getProtectedSession(new Headers())).rejects.toBe(error);
});
