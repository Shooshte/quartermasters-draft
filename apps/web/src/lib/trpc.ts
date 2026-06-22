import type { AppRouter } from "@qd/api";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import superjson from "superjson";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:3000`;
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: superjson,
      url: `${getBaseUrl()}/api/trpc`,
    }),
  ],
});
