// @vitest-environment node
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authConfig } from "../../src/lib/auth-config";

const hour = 3600000;
const month = 30 * 24 * hour;
const start = new Date("2026-01-01T00:00:00Z");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(start);
});
afterEach(() => vi.useRealTimers());
async function setup(rememberMe?: boolean, role = "player") {
  const data: Record<string, Record<string, unknown>[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };
  const auth = betterAuth({
    ...authConfig,
    database: memoryAdapter(data),
    baseURL: "http://localhost:3000",
    secret: "test-secret-long-enough-for-better-auth-runtime",
  });
  await auth.api.signUpEmail({
    body: { email: "test@example.com", password: "password123", name: "Tester" },
  });
  data.user[0].role = role;
  const result = await auth.api.signInEmail({
    body: {
      email: "test@example.com",
      password: "password123",
      ...(rememberMe === undefined ? {} : { rememberMe }),
    },
    returnHeaders: true,
  });
  const cookies = result.headers.getSetCookie();
  const headers = new Headers({ cookie: cookies.map((c) => c.split(";")[0]).join("; ") });
  const stored = data.session.find((s) => s.token === result.response.token)!;
  return { auth, data, headers, cookies, stored };
}
describe("server-owned session policy", () => {
  it.each(["gm", "player"])("slides one-hour %s sessions on repeated activity", async (role) => {
    const { auth, headers, stored } = await setup(false, role);
    expect(+new Date(stored.expiresAt as Date) - +new Date(stored.updatedAt as Date)).toBe(hour);
    for (const minutes of [59, 118]) {
      vi.setSystemTime(+start + minutes * 60000);
      const result = await auth.api.getSession({ headers, returnHeaders: true });
      expect(result.response).not.toBeNull();
      expect(+result.response!.session.expiresAt).toBe(Date.now() + hour);
      expect(
        result.headers.getSetCookie().find((c) => c.startsWith("better-auth.session_token=")),
      ).not.toMatch(/Max-Age|Expires/i);
    }
  });
  it.each([
    false,
    undefined,
    true,
  ])("stores policy and issues appropriate cookies: %s", async (remember) => {
    const { stored, cookies } = await setup(remember);
    expect(stored.rememberMe).toBe(remember === true);
    expect(+new Date(stored.expiresAt as Date) - +new Date(stored.updatedAt as Date)).toBe(
      remember ? month : hour,
    );
    const token = cookies.find((c) => c.startsWith("better-auth.session_token="));
    if (remember) expect(token).toMatch(/Max-Age=2592000/i);
    else expect(token).not.toMatch(/Max-Age|Expires/i);
  });
  it.each([
    [false, hour],
    [true, month],
  ])("rejects expired policy %s at the boundary", async (remember, ttl) => {
    const { auth, headers } = await setup(remember as boolean);
    vi.setSystemTime(+start + Number(ttl));
    await expect(auth.api.getSession({ headers })).rejects.toMatchObject({
      status: "UNAUTHORIZED",
      body: { code: "SESSION_POLICY_REJECTED" },
    });
    vi.setSystemTime(+start + Number(ttl) + 1);
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
  it("rejects exact HTTP expiry and clears the token cookie", async () => {
    const { auth, headers } = await setup(false);
    vi.setSystemTime(+start + hour);
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "SESSION_POLICY_REJECTED" });
    expect(
      response.headers.getSetCookie().find((c) => c.startsWith("better-auth.session_token=")),
    ).toMatch(/Max-Age=0/);
  });
  it("renews remembered sessions after 61 minutes through HTTP", async () => {
    const { auth, headers } = await setup(true);
    vi.setSystemTime(+start + 61 * 60000);
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers }),
    );
    const body = await response.json();
    expect(body).not.toBeNull();
    expect(+new Date(body.session.expiresAt)).toBe(Date.now() + month);
    expect(response.headers.getSetCookie().join(";")).toMatch(/Max-Age=2592000/i);
  });
  it("does not increase TTL when the client deletes its remember-state cookie", async () => {
    const { auth, headers } = await setup(false);
    headers.set(
      "cookie",
      headers
        .get("cookie")!
        .split("; ")
        .filter((c) => !c.includes("dont_remember"))
        .join("; "),
    );
    vi.setSystemTime(+start + 59 * 60000);
    const result = await auth.api.getSession({ headers });
    expect(+result!.session.expiresAt).toBe(Date.now() + hour);
  });
  it("defaults omitted signup rememberMe to a one-hour session", async () => {
    const { data } = await setup();
    const signupSession = data.session[0];
    expect(signupSession.rememberMe).toBe(false);
    expect(
      +new Date(signupSession.expiresAt as Date) - +new Date(signupSession.updatedAt as Date),
    ).toBe(hour);
  });
  it.each([
    false,
    true,
  ])("issues HTTP sign-in and renewal cookies for policy %s", async (rememberMe) => {
    const { auth } = await setup();
    const signedIn = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email: "test@example.com", password: "password123", rememberMe }),
      }),
    );
    expect(signedIn.status).toBe(200);
    const cookies = signedIn.headers.getSetCookie();
    const headers = new Headers({
      cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
    });
    vi.setSystemTime(+start + 30 * 60000);
    const renewed = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers }),
    );
    expect(renewed.status).toBe(200);
    for (const response of [signedIn, renewed]) {
      const cookie = response.headers
        .getSetCookie()
        .find((c) => c.startsWith("better-auth.session_token="));
      expect(cookie).toBeDefined();
      if (rememberMe) expect(cookie).toMatch(/Max-Age=2592000/i);
      else expect(cookie).not.toMatch(/Max-Age|Expires/i);
    }
  });
  it("clears a stale client nonremember marker for a stored remembered session", async () => {
    const short = await setup(false);
    const remembered = await setup(true);
    const marker = short.cookies
      .find((c) => c.startsWith("better-auth.dont_remember="))!
      .split(";")[0];
    remembered.headers.set("cookie", `${remembered.headers.get("cookie")}; ${marker}`);
    vi.setSystemTime(+start + 61 * 60000);
    const result = await remembered.auth.api.getSession({
      headers: remembered.headers,
      returnHeaders: true,
    });
    expect(+result.response!.session.expiresAt).toBe(Date.now() + month);
    expect(
      result.headers.getSetCookie().find((c) => c.startsWith("better-auth.dont_remember=")),
    ).toMatch(/Max-Age=0/);
  });
  it("does not renew with disableRefresh", async () => {
    const { auth, headers } = await setup(false);
    vi.setSystemTime(+start + 30 * 60000);
    const result = await auth.api.getSession({ headers, query: { disableRefresh: true } });
    expect(+result!.session.expiresAt).toBe(+start + hour);
  });
  it("rejects when logout deletes the session during renewal", async () => {
    const { auth, headers } = await setup(false);
    const context = await auth.$context;
    vi.spyOn(context.internalAdapter, "updateSession").mockResolvedValueOnce(null);
    await expect(auth.api.getSession({ headers })).rejects.toMatchObject({
      status: "UNAUTHORIZED",
      body: { code: "SESSION_POLICY_REJECTED" },
    });
  });
  it("cannot replay a logged-out token", async () => {
    const { auth, headers } = await setup(false);
    await auth.api.signOut({ headers });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
});
