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

describe("session policy rejection normalization", () => {
  it("treats only the explicit policy rejection as unauthenticated", async () => {
    const { APIError } = await import("better-auth/api");
    const { normalizeSessionRead } = await import("../../src/lib/auth-session");
    expect(
      await normalizeSessionRead(
        Promise.reject(
          new APIError("UNAUTHORIZED", {
            code: "SESSION_POLICY_REJECTED",
            message: "Session expired",
          }),
        ),
      ),
    ).toEqual({ response: null, headers: new Headers() });
    const error = new Error("database unavailable");
    await expect(normalizeSessionRead(Promise.reject(error))).rejects.toBe(error);
    const other = new APIError("UNAUTHORIZED", { code: "OTHER_ERROR", message: "Other" });
    await expect(normalizeSessionRead(Promise.reject(other))).rejects.toBe(other);
  });
});
