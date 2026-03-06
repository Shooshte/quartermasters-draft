import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { getDefaultRoute } from "~/lib/route-utils";
import { type UserRole } from "@qd/shared";
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
  const role = session?.user?.role as UserRole | undefined;
  const defaultRoute = role ? getDefaultRoute(role) : "/";

  return (
    <main className="flex min-h-screen items-center justify-center">
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
            <Link to={defaultRoute}>Go to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
