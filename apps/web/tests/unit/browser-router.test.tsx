import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getRouter } from "../../src/router";

afterEach(() => {
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
