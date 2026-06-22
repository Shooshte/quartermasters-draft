import { UserRole as Roles, type UserRole } from "@qd/shared";

/** Extract the database role string from a Better Auth user object. */
export function getUserRole(user: Record<string, unknown>): string {
  return (user as { role?: string }).role ?? "player";
}

/** Map database role values to shared UserRole type. */
const dbRoleToUserRole: Record<string, UserRole> = {
  gm: Roles.GAME_MASTER,
  player: Roles.PLAYER,
};

export function mapDbRole(dbRole: string | null | undefined): UserRole | null {
  if (!dbRole) return null;
  return dbRoleToUserRole[dbRole] ?? null;
}

/** Default landing page per role after login. */
export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case Roles.GAME_MASTER:
      return "/create";
    case Roles.PLAYER:
      return "/play";
    default:
      return "/";
  }
}

/** Routes restricted to specific roles. Unlisted routes are accessible to all authenticated users. */
const routeRoleMap: Record<string, UserRole> = {
  "/create": Roles.GAME_MASTER,
};

/** Check if a role can access a given route path. */
export function canAccessRoute(role: UserRole, path: string): boolean {
  const pathname = path.split("?")[0];
  const requiredRole = routeRoleMap[pathname];
  if (!requiredRole) return true;
  return role === requiredRole;
}

/** Validate a `next` query param: must be a relative path (starts with `/`) and not an external URL. */
export function isValidNextUrl(next: string | undefined | null): next is string {
  if (!next) return false;
  // Reject anything that doesn't start with `/` or starts with `//` (protocol-relative URL)
  if (!next.startsWith("/") || next.startsWith("//")) return false;
  // Extra safety: try parsing as URL — if it has a host, it's external
  try {
    const url = new URL(next, "http://localhost");
    if (url.hostname !== "localhost") return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Determine where to redirect after login/when already authenticated.
 * Returns { path, notice? }.
 */
export function getRedirectTarget(
  role: UserRole,
  next: string | undefined | null,
): { path: string; notice?: string } {
  const defaultRoute = getDefaultRoute(role);

  if (next && !isValidNextUrl(next)) {
    return { path: defaultRoute, notice: "Invalid return URL" };
  }

  if (next) {
    if (!canAccessRoute(role, next)) {
      return { path: "/403" };
    }
    return { path: next };
  }

  return { path: defaultRoute };
}
