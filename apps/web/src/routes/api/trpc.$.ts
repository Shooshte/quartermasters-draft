import { appRouter, type Context } from "@qd/api";
import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "~/lib/auth";
import { normalizeSessionRead } from "~/lib/auth-session";
import { getUserRole, mapDbRole } from "~/lib/route-utils";

async function handler({ request }: { request: Request }) {
  const sessionHeaders = new Headers();
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const result = await normalizeSessionRead(
        auth.api.getSession({
          headers: request.headers,
          returnHeaders: true,
        }),
      );
      for (const cookie of result?.headers.getSetCookie() ?? [])
        sessionHeaders.append("set-cookie", cookie);
      const session = result?.response;

      if (!session) {
        return { userId: null, userRole: null };
      }

      return {
        userId: session.user.id,
        userRole: mapDbRole(getUserRole(session.user)),
      };
    },
  });
  for (const cookie of sessionHeaders.getSetCookie()) response.headers.append("set-cookie", cookie);
  return response;
}

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
