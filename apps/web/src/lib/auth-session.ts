export function getProtectedRouteSessionOptions(headers: Headers) {
  return {
    headers,
    query: { disableCookieCache: true },
  } as const;
}
