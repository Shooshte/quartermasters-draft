import { UserRole } from "@qd/shared";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth-client before importing the component
const mockSignOut = vi.fn();

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

function stubWindowLocation(path: string, assignSpy: ReturnType<typeof vi.fn>) {
  const url = new URL(path, "http://localhost:3000");
  vi.stubGlobal("location", {
    ...window.location,
    assign: assignSpy,
    origin: url.origin,
    href: url.href,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  });
}

async function renderAuthenticatedLayoutAt(
  path: string,
  userRole: UserRole = UserRole.GAME_MASTER,
) {
  const { Route: AuthRoute } = await import("../../src/routes/_authenticated");

  const rootRoute = createRootRoute();
  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    beforeLoad: () => ({ userRole }),
    component: AuthRoute.options.component!,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/dashboard",
    component: () => <div data-testid="dashboard">Dashboard</div>,
  });
  const replayRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/replay/$id",
    component: () => <div data-testid="replay">Replay</div>,
  });
  const forbiddenRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/403",
    component: () => <div data-testid="forbidden">Forbidden</div>,
  });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => <div data-testid="login-page">Login</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      authenticatedRoute.addChildren([dashboardRoute, replayRoute, forbiddenRoute]),
      loginRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

async function renderAuthenticatedLayout() {
  return renderAuthenticatedLayoutAt("/dashboard");
}

describe("Authenticated navigation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows Create and Battle Lab links to game masters", async () => {
    await renderAuthenticatedLayoutAt("/dashboard", UserRole.GAME_MASTER);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Create" })).toHaveAttribute("href", "/create");
      expect(screen.getByRole("link", { name: "Battle Lab" })).toHaveAttribute("href", "/battle");
    });
  });

  it("does not show game-master links to players", async () => {
    await renderAuthenticatedLayoutAt("/dashboard", UserRole.PLAYER);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: "Create" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Battle Lab" })).not.toBeInTheDocument();
  });
});

describe("Logout functionality", () => {
  const assignSpy = vi.fn();

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stubWindowLocation("/dashboard", assignSpy);
  });

  it("renders a logout button in the authenticated layout", async () => {
    await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });
  });

  it("calls authClient.signOut when logout button is clicked", async () => {
    mockSignOut.mockResolvedValue({});

    await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("redirects to /login after successful sign-out", async () => {
    mockSignOut.mockResolvedValue({});

    await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe("/dashboard");
    });
  });

  it("redirects to /login?next=<route> when logged out from a protected route", async () => {
    mockSignOut.mockResolvedValue({});

    stubWindowLocation("/replay/abc445", assignSpy);
    await renderAuthenticatedLayoutAt("/replay/abc445");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe("/replay/abc445");
    });
  });

  it("preserves query params in the next param when logging out", async () => {
    mockSignOut.mockResolvedValue({});

    stubWindowLocation("/replay/abc445?tab=details", assignSpy);
    await renderAuthenticatedLayoutAt("/replay/abc445?tab=details");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe("/replay/abc445?tab=details");
    });
  });

  it("strips transient notice param from next when logging out", async () => {
    mockSignOut.mockResolvedValue({});

    stubWindowLocation("/dashboard?notice=Invalid+return+URL", assignSpy);
    await renderAuthenticatedLayoutAt("/dashboard?notice=Invalid+return+URL");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBe("/dashboard");
    });
  });

  it("redirects to /login without next param when logged out from /403", async () => {
    mockSignOut.mockResolvedValue({});

    stubWindowLocation("/403", assignSpy);
    await renderAuthenticatedLayoutAt("/403");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /log\s*out/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("next")).toBeNull();
    });
  });
});
