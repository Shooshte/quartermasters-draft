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
    return null;
  }
  const dbRole = (session.user as { role?: string }).role ?? "player";
  return {
    userId: session.user.id,
    userRole: mapDbRole(dbRole),
  };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await getAuthSession();
    if (!session) {
      const nextParam =
        location.href !== "/" && location.href !== "/login"
          ? { next: location.href }
          : undefined;
      throw redirect({
        to: "/login",
        search: nextParam,
      });
    }
    return { userRole: session.userRole };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const currentPath = router.state.location.pathname;
    try {
      await authClient.signOut();
      const excludedPaths = ["/", "/login", "/403"];
      const nextParam = excludedPaths.includes(currentPath)
        ? undefined
        : { next: currentPath };
      await router.navigate({ to: "/login", search: nextParam });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div>
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
