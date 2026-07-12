import { UserRole } from "@qd/shared";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { auth } from "~/lib/auth";
import { authClient } from "~/lib/auth-client";
import { getProtectedRouteSessionOptions } from "~/lib/auth-session";
import { getUserRole, mapDbRole } from "~/lib/route-utils";

type RequestHeadersLike = Headers | Record<string, string | string[] | undefined>;

function getCookieHeader(headers: RequestHeadersLike): string {
  if (headers instanceof Headers) {
    return headers.get("cookie") ?? "";
  }

  const cookie = headers.cookie;
  return Array.isArray(cookie) ? cookie.join("; ") : (cookie ?? "");
}

const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession(getProtectedRouteSessionOptions(new Headers(headers)));
  if (!session) {
    const cookieHeader = getCookieHeader(headers);
    const hadSession = cookieHeader
      .split(";")
      .some((cookie) => cookie.trim().startsWith("better-auth."));
    return { authenticated: false as const, hadSession };
  }
  const dbRole = getUserRole(session.user);
  return {
    authenticated: true as const,
    userId: session.user.id,
    userRole: mapDbRole(dbRole) ?? UserRole.PLAYER,
  };
});

export const Route = createFileRoute("/_authenticated")({
  validateSearch: (search: Record<string, unknown>) => {
    const ALLOWED_NOTICES = new Set(["Invalid return URL"]);
    return {
      notice:
        typeof search.notice === "string" && ALLOWED_NOTICES.has(search.notice)
          ? search.notice
          : undefined,
    };
  },
  beforeLoad: async ({ location }) => {
    const result = await getAuthSession();
    if (!result.authenticated) {
      const excludedPaths = ["/login", "/403"];
      const search: Record<string, string> = {};
      if (!excludedPaths.includes(location.pathname)) {
        search.next = location.href;
      }
      if (result.hadSession) {
        search.reason = "expired";
      }
      throw redirect({
        to: "/login",
        search,
      });
    }
    return { userRole: result.userRole };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { notice } = Route.useSearch();
  const { userRole } = Route.useRouteContext();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const currentPath = window.location.pathname;
    const currentHref = window.location.href;
    try {
      await authClient.signOut();
      const excludedPaths = ["/login", "/403"];
      const url = new URL("/login", window.location.origin);
      if (!excludedPaths.includes(currentPath)) {
        const nextUrl = new URL(currentHref, window.location.origin);
        nextUrl.searchParams.delete("notice");
        url.searchParams.set("next", nextUrl.pathname + nextUrl.search + nextUrl.hash);
      }
      window.location.assign(url.toString());
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {notice && (
        <p role="status" className="bg-muted text-muted-foreground p-2 text-center text-sm">
          {notice}
        </p>
      )}
      <header className="flex items-center justify-end gap-1 border-b border-border/50 p-4">
        {userRole === UserRole.GAME_MASTER ? (
          <nav aria-label="Game master" className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/create"
                search={{
                  scenario_id: undefined,
                  entity_id: undefined,
                  effect_id: undefined,
                  spell_id: undefined,
                  item_id: undefined,
                  unit_id: undefined,
                  tab: undefined,
                  notice: undefined,
                }}
              >
                Create
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/battle" search={{ notice: undefined }}>
                Battle Lab
              </Link>
            </Button>
          </nav>
        ) : null}
        <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out…" : "Log out"}
        </Button>
      </header>
      <div className="flex flex-1 flex-col min-h-0">
        <Outlet />
      </div>
    </div>
  );
}
