import type { getRouter } from "../router";

export function watchSessionChanges(router: ReturnType<typeof getRouter>) {
  let leavingAfterLogout = false;
  function revalidateSession(event: Event) {
    const action =
      event.type === "qd:session-changed" && event instanceof CustomEvent
        ? event.detail?.action
        : undefined;
    if (action === "logout") {
      // The logout button owns the document navigation. A second guard redirect can
      // arrive after /login loads and interrupt the user's next navigation.
      leavingAfterLogout = true;
      router.options.context.queryClient.clear();
      return;
    }
    if (action === "login") leavingAfterLogout = false;
    // Ignore late failures from requests that were already running during logout.
    if (leavingAfterLogout) return;
    router.options.context.queryClient.clear();
    void router.invalidate();
  }
  window.addEventListener("qd:session-changed", revalidateSession);
  window.addEventListener("qd:authorization-failure", revalidateSession);
  return () => {
    window.removeEventListener("qd:session-changed", revalidateSession);
    window.removeEventListener("qd:authorization-failure", revalidateSession);
  };
}
