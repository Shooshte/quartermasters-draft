import { UserRole } from "@qd/shared";
import { describe, expect, it } from "vitest";
import {
  canAccessRoute,
  getDefaultRoute,
  getRedirectTarget,
  getUserRole,
  isValidNextUrl,
  mapDbRole,
} from "../../src/lib/route-utils";

describe("getUserRole", () => {
  it("extracts role from user object with role property", () => {
    expect(getUserRole({ role: "gm" })).toBe("gm");
  });

  it("returns 'player' when role is missing", () => {
    expect(getUserRole({})).toBe("player");
  });

  it("returns 'player' when role is undefined", () => {
    expect(getUserRole({ role: undefined })).toBe("player");
  });
});

describe("mapDbRole", () => {
  it("maps 'gm' to game_master", () => {
    expect(mapDbRole("gm")).toBe(UserRole.GAME_MASTER);
  });

  it("maps 'player' to player", () => {
    expect(mapDbRole("player")).toBe(UserRole.PLAYER);
  });

  it("returns null for unknown roles", () => {
    expect(mapDbRole("unknown")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(mapDbRole(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(mapDbRole(undefined)).toBeNull();
  });
});

describe("getDefaultRoute", () => {
  it("returns /create for game_master", () => {
    expect(getDefaultRoute(UserRole.GAME_MASTER)).toBe("/create");
  });

  it("returns /play for player", () => {
    expect(getDefaultRoute(UserRole.PLAYER)).toBe("/play");
  });
});

describe("canAccessRoute", () => {
  it("allows game_master to access /create", () => {
    expect(canAccessRoute(UserRole.GAME_MASTER, "/create")).toBe(true);
  });

  it("denies player access to /create", () => {
    expect(canAccessRoute(UserRole.PLAYER, "/create")).toBe(false);
  });

  it("allows any role to access unrestricted routes", () => {
    expect(canAccessRoute(UserRole.PLAYER, "/play")).toBe(true);
    expect(canAccessRoute(UserRole.GAME_MASTER, "/play")).toBe(true);
  });
});

describe("isValidNextUrl", () => {
  it("accepts relative paths starting with /", () => {
    expect(isValidNextUrl("/play")).toBe(true);
    expect(isValidNextUrl("/create")).toBe(true);
    expect(isValidNextUrl("/some/nested/path")).toBe(true);
  });

  it("rejects null/undefined/empty", () => {
    expect(isValidNextUrl(null)).toBe(false);
    expect(isValidNextUrl(undefined)).toBe(false);
    expect(isValidNextUrl("")).toBe(false);
  });

  it("rejects external URLs", () => {
    expect(isValidNextUrl("https://example.com")).toBe(false);
    expect(isValidNextUrl("http://evil.com/steal")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isValidNextUrl("//evil.com/path")).toBe(false);
  });

  it("rejects paths not starting with /", () => {
    expect(isValidNextUrl("play")).toBe(false);
    expect(isValidNextUrl("example.com")).toBe(false);
  });
});

describe("getRedirectTarget", () => {
  it("returns default route when no next param", () => {
    expect(getRedirectTarget(UserRole.GAME_MASTER, undefined)).toEqual({
      path: "/create",
    });
    expect(getRedirectTarget(UserRole.PLAYER, null)).toEqual({
      path: "/play",
    });
  });

  it("honours valid next param", () => {
    expect(getRedirectTarget(UserRole.GAME_MASTER, "/play")).toEqual({
      path: "/play",
    });
  });

  it("rejects external next param with notice", () => {
    expect(getRedirectTarget(UserRole.GAME_MASTER, "https://example.com")).toEqual({
      path: "/create",
      notice: "Invalid return URL",
    });
  });

  it("redirects to /403 when next is forbidden for role", () => {
    expect(getRedirectTarget(UserRole.PLAYER, "/create")).toEqual({
      path: "/403",
    });
  });

  it("allows next to accessible routes", () => {
    expect(getRedirectTarget(UserRole.PLAYER, "/play")).toEqual({
      path: "/play",
    });
  });
});
