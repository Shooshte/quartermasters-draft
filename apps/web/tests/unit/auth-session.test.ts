import { describe, expect, it } from "vitest";
import { getProtectedRouteSessionOptions } from "../../src/lib/auth-session";

describe("getProtectedRouteSessionOptions", () => {
  it("disables Better Auth cookie cache for protected route checks", () => {
    const headers = new Headers({ cookie: "better-auth.session_token=value" });

    expect(getProtectedRouteSessionOptions(headers)).toEqual({
      headers,
      query: { disableCookieCache: true },
    });
  });
});
