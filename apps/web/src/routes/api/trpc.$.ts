import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, type Context } from "@qd/api";
import { auth } from "~/lib/auth";
import { mapDbRole } from "~/lib/route-utils";

async function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return { userId: null, userRole: null };
      }

      return {
        userId: session.user.id,
        userRole: mapDbRole((session.user as { role?: string }).role ?? "player"),
      };
    },
  });
}

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
