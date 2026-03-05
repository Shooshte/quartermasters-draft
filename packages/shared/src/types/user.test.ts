import { describe, expect, it, expectTypeOf } from "vitest";
import { UserRole, type User } from "./user";

describe("UserRole", () => {
  it("has the expected values", () => {
    expect(UserRole.GAME_MASTER).toBe("game_master");
    expect(UserRole.PLAYER).toBe("player");
  });

  it("only allows valid roles", () => {
    const roles: UserRole[] = [UserRole.GAME_MASTER, UserRole.PLAYER];
    expect(roles).toHaveLength(2);
  });
});

describe("User", () => {
  it("accepts a valid user object", () => {
    const user: User = {
      id: "usr_123",
      email: "gm@example.com",
      name: "Test GM",
      role: UserRole.GAME_MASTER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expectTypeOf(user).toMatchTypeOf<User>();
    expect(user.role).toBe(UserRole.GAME_MASTER);
  });
});
