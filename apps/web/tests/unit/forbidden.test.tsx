import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";

const mockUseSession = vi.fn();

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

async function renderForbiddenRoute() {
  const { Route: ForbiddenRoute } = await import(
    "../../src/routes/_authenticated/403"
  );

  const rootRoute = createRootRoute();
  const forbiddenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/403",
    component: ForbiddenRoute.options.component!,
  });
  const createRoute_ = createRoute({
    getParentRoute: () => rootRoute,
    path: "/create",
    component: () => <div data-testid="create-page">Create Page</div>,
  });
  const playRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/play",
    component: () => <div data-testid="play-page">Play Page</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([forbiddenRoute, createRoute_, playRoute]),
    history: createMemoryHistory({ initialEntries: ["/403"] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe("403 Forbidden page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders access denied heading", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", role: "game_master" } },
      isPending: false,
    });

    await renderForbiddenRoute();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /access denied/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders forbidden message", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", role: "game_master" } },
      isPending: false,
    });

    await renderForbiddenRoute();

    await waitFor(() => {
      expect(
        screen.getByText(/you do not have permission/i),
      ).toBeInTheDocument();
    });
  });

  it("shows link to /create for GM users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", role: "game_master" } },
      isPending: false,
    });

    await renderForbiddenRoute();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/create");
    });
  });

  it("shows link to /play for player users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "2", role: "player" } },
      isPending: false,
    });

    await renderForbiddenRoute();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/play");
    });
  });

  it("shows fallback link to / when session has no user", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    await renderForbiddenRoute();

    await waitFor(() => {
      const link = screen.getByRole("link", { name: /go to dashboard/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/");
    });
  });
});
