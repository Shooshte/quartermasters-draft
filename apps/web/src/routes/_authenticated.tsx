import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useState } from "react";
import { auth } from "~/lib/auth";
import { authClient } from "~/lib/auth-client";
import { mapDbRole } from "~/lib/route-utils";
import { Button } from "~/components/ui/button";

const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (!session) {
    // Detect if a session cookie was present (expired session vs never logged in)
    const h = headers as unknown as Record<string, unknown>;
    const cookieHeader = String(
      typeof (h as any).get === "function"
        ? (h as any).get("cookie") ?? ""
        : h.cookie ?? "",
    );
    const hadSession = cookieHeader.split(";").some(c => c.trim().startsWith("better-auth."));
    return { authenticated: false as const, hadSession };
  }
  const dbRole = (session.user as { role?: string }).role ?? "player";
  return {
    authenticated: true as const,
    userId: session.user.id,
    userRole: mapDbRole(dbRole),
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
      const excludedPaths = ["/", "/login", "/403"];
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
  const router = useRouter();
  const { notice } = Route.useSearch();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const currentPath = router.state.location.pathname;
    const currentHref = router.state.location.href;
    try {
      await authClient.signOut();
      const excludedPaths = ["/", "/login", "/403"];
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
    <div>
      {notice && (
        <p role="status" className="bg-muted text-muted-foreground p-2 text-center text-sm">
          {notice}
        </p>
      )}
      <header className="flex items-center justify-end p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out…" : "Log out"}
        </Button>
      </header>
      <Outlet />
    </div>
  );
}
