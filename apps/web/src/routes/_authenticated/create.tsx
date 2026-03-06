import { createFileRoute, redirect } from "@tanstack/react-router";
import { canAccessRoute } from "~/lib/route-utils";

export const Route = createFileRoute("/_authenticated/create")({
  beforeLoad: ({ context }) => {
    if (!canAccessRoute(context.userRole, "/create")) {
      throw redirect({ to: "/403" });
    }
  },
  component: CreatePage,
});

function CreatePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Create Game</h1>
    </main>
  );
}
