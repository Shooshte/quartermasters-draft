import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { scenarioOptionsQuery, createMutation, getQuery, navigate } = vi.hoisted(() => ({
  scenarioOptionsQuery: vi.fn(),
  createMutation: vi.fn(),
  getQuery: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("~/lib/trpc", () => ({
  trpc: {
    battleLab: {
      scenarioOptions: { query: scenarioOptionsQuery },
      create: { mutate: createMutation },
      get: { query: getQuery },
    },
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

import { BattleWorkbench } from "~/components/battle/battle-workbench";

const options = [
  { id: "scenario-a", name: "Ambush at Dawn" },
  { id: "scenario-b", name: "The Iron Line" },
  { id: "scenario-c", name: "Ashen Vanguard" },
];

const replayOutput = {
  replay: {
    id: "replay-1",
    scenarioAId: "scenario-a",
    scenarioBId: "scenario-b",
    seed: "fixed-seed",
    createdAt: new Date("2026-07-12T12:00:00.000Z"),
  },
  scenarios: [
    { id: "scenario-a", name: "Ambush at Dawn" },
    { id: "scenario-b", name: "The Iron Line" },
  ] as const,
  result: {
    winnerId: "scenario-a",
    ticksElapsed: 184,
    finalState: {
      tick: 184,
      status: "finished" as const,
      winnerId: "scenario-a",
      scenarios: [
        {
          id: "scenario-a",
          name: "Ambush at Dawn",
          rows: { tank: [], melee: [], ranged: [], support: [] },
        },
        {
          id: "scenario-b",
          name: "The Iron Line",
          rows: { tank: [], melee: [], ranged: [], support: [] },
        },
      ] as const,
      log: [],
      fatigueTickThreshold: 100,
      fatigueDamageStart: 1,
    },
    log: [],
  },
};

function renderWorkbench(replayId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BattleWorkbench replayId={replayId} />
    </QueryClientProvider>,
  );
}

async function configureBattle(user: ReturnType<typeof userEvent.setup>) {
  const pickers = await screen.findAllByRole("combobox");
  await user.click(pickers[0]);
  await user.click(screen.getByRole("option", { name: "Ambush at Dawn" }));
  await user.click(pickers[1]);
  await user.click(screen.getByRole("option", { name: "The Iron Line" }));
  await user.type(screen.getByRole("textbox", { name: "Battle seed" }), "  fixed-seed  ");
}

describe("BattleWorkbench", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scenarioOptionsQuery.mockResolvedValue(options);
    getQuery.mockResolvedValue(replayOutput);
  });

  it("loads scenario options on /battle without rendering a result", async () => {
    renderWorkbench();

    expect(await screen.findByRole("heading", { name: "Battle lab" })).toBeVisible();
    expect(scenarioOptionsQuery).toHaveBeenCalledOnce();
    expect(getQuery).not.toHaveBeenCalled();
    expect(screen.queryByText("Resolution entered")).not.toBeInTheDocument();
  });

  it("creates a replay from a valid setup and navigates to its result", async () => {
    const user = userEvent.setup();
    createMutation.mockResolvedValue({ replay: replayOutput.replay });
    renderWorkbench();
    await configureBattle(user);

    await user.click(screen.getByRole("button", { name: "Run & save battle" }));

    await waitFor(() =>
      expect(createMutation).toHaveBeenCalledWith({
        scenarioAId: "scenario-a",
        scenarioBId: "scenario-b",
        seed: "fixed-seed",
      }),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/replay/$id",
      params: { id: "replay-1" },
    });
  });

  it("loads a replay into the editable form and renders its current result", async () => {
    renderWorkbench("replay-1");

    expect(await screen.findByRole("heading", { name: "Ambush at Dawn wins" })).toBeVisible();
    expect(getQuery).toHaveBeenCalledWith({ id: "replay-1" });
    expect(screen.getByText("Results use the latest scenario versions.")).toBeVisible();
    const pickers = screen.getAllByRole("combobox");
    expect(pickers[0]).toHaveTextContent("Ambush at Dawn");
    expect(pickers[1]).toHaveTextContent("The Iron Line");
    expect(screen.getByRole("textbox", { name: "Battle seed" })).toHaveValue("fixed-seed");
  });

  it("keeps the selected setup visible when replay creation fails", async () => {
    const user = userEvent.setup();
    createMutation.mockRejectedValue(new Error("Battle could not be resolved."));
    renderWorkbench();
    await configureBattle(user);

    await user.click(screen.getByRole("button", { name: "Run & save battle" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Battle could not be resolved.");
    const pickers = screen.getAllByRole("combobox");
    expect(pickers[0]).toHaveTextContent("Ambush at Dawn");
    expect(pickers[1]).toHaveTextContent("The Iron Line");
    expect(screen.getByRole("textbox", { name: "Battle seed" })).toHaveValue("  fixed-seed  ");
  });

  it("ignores repeated submissions while replay creation is pending", async () => {
    const user = userEvent.setup();
    let resolveCreate!: (value: { replay: typeof replayOutput.replay }) => void;
    createMutation.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderWorkbench();
    await configureBattle(user);

    const submit = screen.getByRole("button", { name: "Run & save battle" });
    await user.click(submit);
    await user.click(submit);

    expect(createMutation).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Resolving battle…" })).toBeDisabled();

    await act(async () => resolveCreate({ replay: replayOutput.replay }));
  });

  it("renders a clear replay loading failure", async () => {
    getQuery.mockRejectedValue(new Error("Replay not found"));
    renderWorkbench("missing-replay");

    expect(await screen.findByRole("alert")).toHaveTextContent("Replay not found");
  });
});
