import { createApiClient } from "@qd/api-client";
export const api = createApiClient({
  onAuthorizationFailure: () => window.dispatchEvent(new Event("qd:authorization-failure")),
});
