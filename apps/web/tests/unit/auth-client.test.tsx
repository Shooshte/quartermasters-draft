import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { authClient } from "../../src/lib/auth-client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("revalidates a browser session after login and logout", async () => {
  let authenticated = false;
  const fetcher = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith("/login")) {
      authenticated = true;
      expect(JSON.parse(init.body as string)).toEqual({
        email: "gm@example.com",
        password: "secret",
        rememberMe: true,
      });
    }
    if (url.endsWith("/logout")) {
      authenticated = false;
      return new Response(JSON.stringify({ success: true }));
    }
    return new Response(
      JSON.stringify(
        authenticated
          ? { authenticated: true, userId: "gm-id", userRole: "game_master" }
          : { authenticated: false, hadSession: false },
      ),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const session = renderHook(() => authClient.useSession());
  await waitFor(() => expect(session.result.current.isPending).toBe(false));
  expect(session.result.current.data).toBeNull();
  await act(async () => {
    await authClient.signIn.email({
      email: "gm@example.com",
      password: "secret",
      rememberMe: true,
    });
  });
  await waitFor(() =>
    expect(session.result.current.data?.user).toEqual({ id: "gm-id", role: "gm" }),
  );
  await act(async () => {
    await authClient.signOut();
  });
  await waitFor(() => expect(session.result.current.data).toBeNull());
});
it("retains a session transport error so the login page can explain unavailability", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
  const session = renderHook(() => authClient.useSession());
  await waitFor(() => expect(session.result.current.error).toEqual(new Error("Offline")));
});
