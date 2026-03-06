import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";

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

async function renderAuthenticatedLayout() {
  const { Route: AuthRoute } = await import(
    "../../src/routes/_authenticated.tsx"
  );

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
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => <div data-testid="login-page">Login</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      authenticatedRoute.addChildren([dashboardRoute]),
      loginRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe("Logout functionality", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a logout button in the authenticated layout", async () => {
    await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /log\s*out/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls authClient.signOut when logout button is clicked", async () => {
    mockSignOut.mockResolvedValue({});

    await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /log\s*out/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("redirects to /login after successful sign-out", async () => {
    mockSignOut.mockResolvedValue({});

    const router = await renderAuthenticatedLayout();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /log\s*out/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log\s*out/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });
});
