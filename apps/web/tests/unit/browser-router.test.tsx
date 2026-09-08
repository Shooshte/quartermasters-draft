import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api, clearApiSessionExpiry } from "../../src/lib/api";
import { authClient } from "../../src/lib/auth-client";
import { getRouter } from "../../src/router";

afterEach(() => {
  clearApiSessionExpiry();
  cleanup();
  vi.unstubAllGlobals();
});

it("gates a fresh protected deep link and preserves the return URL and expiry notice", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ authenticated: false, hadSession: true })),
    );
  vi.stubGlobal("fetch", fetcher);
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ["/replay/abc?view=log"] }),
  });
  render(<RouterProvider router={router} />);
  expect(screen.queryByText("Battle Lab")).not.toBeInTheDocument();
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(router.state.location.search).toMatchObject({
    next: "/replay/abc?view=log",
    reason: "expired",
  });
  expect(await screen.findByText("Session expired, please log in to continue")).toBeInTheDocument();
  expect(fetcher.mock.calls[0][0]).toBe("/api/v1/auth/session");
});

it("renders public login inside the browser shell without a session", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ authenticated: false, hadSession: false })),
      ),
  );
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ["/login"] }),
  });
  const { container } = render(<RouterProvider router={router} />);
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(container.querySelector("html")).toBeNull();
});

it("denies a player's direct editor deep link before loading editor content", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ authenticated: true, userId: "player", userRole: "player" }),
          ),
      ),
  );
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ["/create"] }),
  });
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole("heading", { name: "Access Denied" })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/403");
  expect(screen.queryByRole("link", { name: "Battle Lab" })).not.toBeInTheDocument();
});

it.each([
  401, 403,
])("preserves only a protected HTTP 401 expiry after cookies are cleared (status %s)", async (status) => {
  let hasSession = true;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/v1/battle/scenario-options") {
        hasSession = false; // The failed protected response clears the browser's session cookie.
        return new Response(
          JSON.stringify({
            error: {
              code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
              message: "Access denied",
            },
          }),
          { status },
        );
      }
      return new Response(
        JSON.stringify(
          hasSession
            ? { authenticated: true, userId: "gm", userRole: "game_master" }
            : { authenticated: false, hadSession: false },
        ),
      );
    }),
  );
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ["/play?view=party"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: "Log out" });
  const revalidate = () => {
    router.options.context.queryClient.clear();
    void router.invalidate();
  };
  window.addEventListener("qd:authorization-failure", revalidate);
  try {
    await act(async () => {
      await expect(api.battleLab.scenarioOptions.query()).rejects.toMatchObject({ status });
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(router.state.location.search).toMatchObject({ next: "/play?view=party" });
    expect(router.state.location.search.reason).toBe(status === 401 ? "expired" : undefined);
    if (status === 401)
      expect(
        await screen.findByText("Session expired, please log in to continue"),
      ).toBeInTheDocument();
    else
      expect(
        screen.queryByText("Session expired, please log in to continue"),
      ).not.toBeInTheDocument();
  } finally {
    window.removeEventListener("qd:authorization-failure", revalidate);
  }
});

it.each(["login", "logout"])("clears remembered API expiry after successful %s", async (action) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/v1/battle/scenario-options")
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Session expired" } }),
          { status: 401 },
        );
      if (url === "/api/v1/auth/login")
        return new Response(
          JSON.stringify({ authenticated: true, userId: "gm", userRole: "game_master" }),
        );
      if (url === "/api/v1/auth/logout") return new Response(JSON.stringify({ success: true }));
      return new Response(JSON.stringify({ authenticated: false, hadSession: false }));
    }),
  );
  await expect(api.battleLab.scenarioOptions.query()).rejects.toMatchObject({ status: 401 });
  if (action === "login")
    await authClient.signIn.email({
      email: "gm@example.com",
      password: "password",
      rememberMe: false,
    });
  else await authClient.signOut();
  const router = getRouter();
  router.update({
    context: router.options.context,
    history: createMemoryHistory({ initialEntries: ["/play"] }),
  });
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(router.state.location.search.reason).toBeUndefined();
});
