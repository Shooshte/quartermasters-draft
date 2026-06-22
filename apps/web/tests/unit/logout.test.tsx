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

// Mock the server fn (getAuthSession) — not available in jsdom
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: () => vi.fn(),
  }),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: vi.fn(),
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

async function renderAuthenticatedLayoutAt(path: string) {
  const { Route: AuthRoute } = await import("../../src/routes/_authenticated");

  const rootRoute = createRootRoute();
  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
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
