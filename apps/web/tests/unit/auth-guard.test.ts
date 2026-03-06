import { describe, expect, it } from "vitest";
import { buildLoginRedirectUrl } from "../../src/lib/auth-guard";

describe("buildLoginRedirectUrl", () => {
  it("redirects to /login with next param preserving the original path", () => {
    expect(buildLoginRedirectUrl("/dashboard")).toBe(
      "/login?next=%2Fdashboard",
    );
  });

  it("redirects to /login with next param for nested routes", () => {
    expect(buildLoginRedirectUrl("/some/nested/path")).toBe(
      "/login?next=%2Fsome%2Fnested%2Fpath",
    );
  });

  it("redirects to /login without next param for root path", () => {
    expect(buildLoginRedirectUrl("/")).toBe("/login");
  });

  it("redirects to /login without next param for /login itself", () => {
    expect(buildLoginRedirectUrl("/login")).toBe("/login");
  });

  it("preserves query string in the next param", () => {
    expect(buildLoginRedirectUrl("/play?id=123")).toBe(
      "/login?next=%2Fplay%3Fid%3D123",
    );
  });
});
