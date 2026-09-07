import { UserRole } from "@qd/shared";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth-client";

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
    const result = await api.auth.session();
    if (!("userId" in result) || !result.authenticated) {
      const excludedPaths = ["/login", "/403"];
      const search: Record<string, string> = {};
      if (!excludedPaths.includes(location.pathname)) {
        search.next = location.href;
      }
      if ("hadSession" in result && result.hadSession) {
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
