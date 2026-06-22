import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth-client before importing the route
const mockSignIn = vi.fn();
const mockGetSession = vi.fn();
const mockUseSession = vi.fn();

vi.mock("~/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => mockSignIn(...args),
    },
    getSession: (...args: unknown[]) => mockGetSession(...args),
    useSession: () => mockUseSession(),
  },
}));

async function renderLoginRoute(search = "") {
  const { Route: LoginRoute } = await import("../../src/routes/login");

  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    validateSearch: LoginRoute.options.validateSearch as (s: Record<string, unknown>) => {
      next?: string;
    },
    component: LoginRoute.options.component!,
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
  const forbiddenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/403",
    component: () => <div data-testid="forbidden-page">Forbidden</div>,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([loginRoute, createRoute_, playRoute, forbiddenRoute]),
    history: createMemoryHistory({ initialEntries: [`/login${search}`] }),
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe("Login page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, isPending: false });
  });

  it("renders email, password, remember me, and submit button", async () => {
    await renderLoginRoute();

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText("Remember me")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows 'Invalid credentials' on failed sign-in", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "bad creds" } });

    await renderLoginRoute();

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("disables submit button during request", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));

    await renderLoginRoute();

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    });
  });

  it("redirects already-authenticated GM to /create", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", role: "gm" } },
      isPending: false,
    });

    const router = await renderLoginRoute();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/create");
    });
  });

  it("redirects already-authenticated player to /play", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "2", role: "player" } },
      isPending: false,
    });

    const router = await renderLoginRoute();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/play");
    });
  });

  it("redirects authenticated user to valid next param", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", role: "gm" } },
      isPending: false,
    });

    const router = await renderLoginRoute("?next=/play");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/play");
    });
  });

  it("redirects authenticated player to /403 when next is forbidden", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "2", role: "player" } },
      isPending: false,
    });

    const router = await renderLoginRoute("?next=/create");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/403");
    });
  });

  it("redirects to role default after successful login", async () => {
    mockSignIn.mockResolvedValue({ data: { session: {} } });
    mockGetSession.mockResolvedValue({
      data: { user: { id: "1", role: "gm" } },
    });

    const router = await renderLoginRoute();

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "gm@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/create");
    });
  });

  it("honours next param after successful login", async () => {
    mockSignIn.mockResolvedValue({ data: { session: {} } });
    mockGetSession.mockResolvedValue({
      data: { user: { id: "1", role: "gm" } },
    });

    const router = await renderLoginRoute("?next=/play");

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "gm@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/play");
    });
  });

  it("shows notice when external next URL is rejected after login", async () => {
    const assignSpy = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign: assignSpy,
      origin: "http://localhost:3000",
    });

    mockSignIn.mockResolvedValue({ data: { session: {} } });
    mockGetSession.mockResolvedValue({
      data: { user: { id: "1", role: "gm" } },
    });

    await renderLoginRoute("?next=https://example.com");

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "gm@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
      const url = new URL(assignSpy.mock.calls[0][0]);
      expect(url.pathname).toBe("/create");
      expect(url.searchParams.get("notice")).toBe("Invalid return URL");
    });

    vi.unstubAllGlobals();
  });

  it("redirects to /403 when player logs in with forbidden next", async () => {
    mockSignIn.mockResolvedValue({ data: { session: {} } });
    mockGetSession.mockResolvedValue({
      data: { user: { id: "2", role: "player" } },
    });

    const router = await renderLoginRoute("?next=/create");

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "player@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/403");
    });
  });
});
