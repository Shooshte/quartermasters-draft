import { getResponseHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";
import { getProtectedRouteSessionOptions, normalizeSessionRead } from "./auth-session";

export async function getProtectedSession(headers: Headers) {
  const result = await normalizeSessionRead(
    auth.api.getSession({ ...getProtectedRouteSessionOptions(headers), returnHeaders: true }),
  );
  // Use a static Start import: the bundled Better Auth cookie plugin's dynamic
  // import loses its named exports in the production Nitro/Vite server bundle.
  for (const cookie of result?.headers.getSetCookie() ?? []) {
    getResponseHeaders().append("set-cookie", cookie);
  }
  return result?.response ?? null;
}
