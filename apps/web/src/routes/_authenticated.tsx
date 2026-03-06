import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({
    headers: headers as unknown as Headers,
  });
  if (!session) {
    return null;
  }
  return {
    userId: session.user.id,
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
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
