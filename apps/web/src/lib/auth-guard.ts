/**
 * Build the login redirect URL, preserving the original path as a `next` query parameter.
 * Skips adding `next` for root ("/") and "/login" paths.
 */
export function buildLoginRedirectUrl(originalPath: string): string {
  if (originalPath === "/" || originalPath === "/login") {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(originalPath)}`;
}
