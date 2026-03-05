import { describe, expect, it } from "vitest";
import { authConfig } from "../../src/lib/auth-config";

describe("auth session configuration", () => {
  it("sets session expiresIn to 1 hour (3600 seconds)", () => {
    expect(authConfig.session?.expiresIn).toBe(60 * 60);
  });

  it("enables sliding expiration (updateAge = 0)", () => {
    expect(authConfig.session?.updateAge).toBe(0);
  });

  it("enables email and password authentication", () => {
    expect(authConfig.emailAndPassword?.enabled).toBe(true);
  });
});
