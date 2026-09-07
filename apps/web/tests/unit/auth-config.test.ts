import { describe, expect, it } from "vitest";
import { authConfig } from "../../src/lib/auth-config";

describe("auth session configuration", () => {
  it("sets the core maximum to 30 days", () => {
    expect(authConfig.session?.expiresIn).toBe(30 * 24 * 60 * 60);
  });

  it("disables core refresh so stored policy controls renewal", () => {
    expect(authConfig.session.disableSessionRefresh).toBe(true);
    expect(authConfig.session.cookieCache.enabled).toBe(false);
  });

  it("enables email and password authentication", () => {
    expect(authConfig.emailAndPassword?.enabled).toBe(true);
  });
});
