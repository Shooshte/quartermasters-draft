import { createApiClient } from "@qd/api-client";

// A protected 401 can clear the cookie before the route guard rereads the session.
// Retain its expiry context until authentication succeeds or explicitly changes.
let expiredSessionObserved = false;

export function hasExpiredApiSession() {
  return expiredSessionObserved;
}

export function clearApiSessionExpiry() {
  expiredSessionObserved = false;
}

export const api = createApiClient({
  onAuthorizationFailure: (status) => {
    if (status === 401) expiredSessionObserved = true;
    window.dispatchEvent(new CustomEvent("qd:authorization-failure", { detail: { status } }));
  },
});
