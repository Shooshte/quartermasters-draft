import { APIError } from "better-auth/api";

export const SESSION_POLICY_REJECTED = "SESSION_POLICY_REJECTED";

export async function normalizeSessionRead<T>(
  read: Promise<T>,
): Promise<T | { response: null; headers: Headers }> {
  try {
    return await read;
  } catch (error) {
    if (
      error instanceof APIError &&
      error.status === "UNAUTHORIZED" &&
      error.body?.code === SESSION_POLICY_REJECTED
    )
      return { response: null, headers: new Headers(error.headers) };
    throw error;
  }
}

export function getProtectedRouteSessionOptions(headers: Headers) {
  return {
    headers,
    query: { disableCookieCache: true },
  } as const;
}
