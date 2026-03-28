import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { getDefaultRoute, getUserRole, mapDbRole } from "~/lib/route-utils";
import { UserRole } from "@qd/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/_authenticated/403")({
  component: ForbiddenPage,
});

function ForbiddenPage() {
  const { data: session } = authClient.useSession();
  const dbRole = session?.user ? getUserRole(session.user as Record<string, unknown>) : undefined;
  const role = mapDbRole(dbRole);
  const defaultRoute = role ? getDefaultRoute(role) : "/";
  const linkText =
    role === UserRole.GAME_MASTER
      ? "Go to Create"
      : role === UserRole.PLAYER
        ? "Go to Play"
        : "Go to Dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.015_60)_0%,oklch(0.17_0.01_60)_70%)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl">Access Denied</h1>
          </CardTitle>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={defaultRoute}>{linkText}</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
