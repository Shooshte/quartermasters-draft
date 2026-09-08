import type { SessionResponse } from "@qd/api-client";
import { useEffect, useState } from "react";
import { api, clearApiSessionExpiry } from "./api";

type BrowserSession = { user: { id: string; role: "gm" | "player" } } | null;
function toSession(response: SessionResponse): BrowserSession {
  return "userId" in response && response.authenticated
    ? { user: { id: response.userId, role: response.userRole === "game_master" ? "gm" : "player" } }
    : null;
}

function notifySessionChanged(action: "login" | "logout") {
  clearApiSessionExpiry();
  window.dispatchEvent(new CustomEvent("qd:session-changed", { detail: { action } }));
}
async function getSession() {
  return { data: toSession(await api.auth.session()) };
}

export const authClient = {
  getSession,
  signIn: {
    async email(input: { email: string; password: string; rememberMe: boolean }) {
      try {
        const response = await api.auth.login(input);
        notifySessionChanged("login");
        return { data: toSession(response), error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  },
  async signOut() {
    await api.auth.logout();
    notifySessionChanged("logout");
  },
  useSession() {
    const [state, setState] = useState<{
      data: BrowserSession;
      isPending: boolean;
      error?: unknown;
    }>({ data: null, isPending: true });
    useEffect(() => {
      let active = true;
      const refresh = () => {
        getSession()
          .then(({ data }) => {
            if (active) setState({ data, isPending: false });
          })
          .catch((error) => {
            if (active) setState({ data: null, isPending: false, error });
          });
      };
      refresh();
      window.addEventListener("qd:session-changed", refresh);
      window.addEventListener("qd:authorization-failure", refresh);
      return () => {
        active = false;
        window.removeEventListener("qd:session-changed", refresh);
        window.removeEventListener("qd:authorization-failure", refresh);
      };
    }, []);
    return state;
  },
};
