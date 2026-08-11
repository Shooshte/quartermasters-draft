import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    actionsResolved: 184,
    finalState: {
      actionCount: 184,
      batchCount: 93,
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
      fatigueActionThreshold: 500,
      fatigueDamageStart: 1,
    },
    log: [],
  },
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
}

function renderWorkbench(replayId?: string, queryClient = createQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BattleWorkbench replayId={replayId} />
    </QueryClientProvider>,
  );
}

async function configureBattle(user: ReturnType<typeof userEvent.setup>) {
  const scenarioA = await screen.findByRole("combobox", { name: "Scenario A" });
  const scenarioB = screen.getByRole("combobox", { name: "Scenario B" });
  await user.click(scenarioA);
  await user.click(screen.getByRole("option", { name: "Ambush at Dawn" }));
  await user.click(scenarioB);
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
      search: { notice: undefined },
    });
  });

  it("loads a replay into the editable form and renders its current result", async () => {
    renderWorkbench("replay-1");

    expect(await screen.findByRole("heading", { name: "Ambush at Dawn wins" })).toBeVisible();
    expect(getQuery).toHaveBeenCalledWith({ id: "replay-1" });
    expect(screen.getByText("Results use the latest scenario versions.")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Scenario A" })).toHaveTextContent(
      "Ambush at Dawn",
    );
    expect(screen.getByRole("combobox", { name: "Scenario B" })).toHaveTextContent("The Iron Line");
    expect(screen.getByRole("textbox", { name: "Battle seed" })).toHaveValue("fixed-seed");
  });

  it("hides cached replay output while regenerating from latest scenario versions", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["battleLab", "replay", "replay-1"], {
      ...replayOutput,
      scenarios: [
        { id: "scenario-a", name: "Cached Ambush" },
        { id: "scenario-b", name: "Cached Iron Line" },
      ],
    });
    let resolveRefresh!: (value: typeof replayOutput) => void;
    getQuery.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    renderWorkbench("replay-1", queryClient);

    expect(await screen.findByText("Regenerating battle result…")).toBeVisible();
    expect(getQuery).toHaveBeenCalledWith({ id: "replay-1" });
    expect(screen.queryByRole("heading", { name: "Cached Ambush wins" })).not.toBeInTheDocument();
    expect(screen.queryByText("Results use the latest scenario versions.")).not.toBeInTheDocument();

    await act(async () => resolveRefresh(replayOutput));
    expect(await screen.findByRole("heading", { name: "Ambush at Dawn wins" })).toBeVisible();
    expect(screen.getByText("Results use the latest scenario versions.")).toBeVisible();
  });

  it("does not show cached replay output or a freshness claim when regeneration fails", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["battleLab", "replay", "replay-1"], {
      ...replayOutput,
      scenarios: [
        { id: "scenario-a", name: "Cached Ambush" },
        { id: "scenario-b", name: "Cached Iron Line" },
      ],
    });
    let rejectRefresh!: (reason: Error) => void;
    getQuery.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      }),
    );

    renderWorkbench("replay-1", queryClient);

    expect(await screen.findByText("Regenerating battle result…")).toBeVisible();
    await act(async () =>
      rejectRefresh(new Error("Latest scenario versions could not be loaded.")),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Latest scenario versions could not be loaded.",
    );
    expect(screen.queryByRole("heading", { name: "Cached Ambush wins" })).not.toBeInTheDocument();
    expect(screen.queryByText("Results use the latest scenario versions.")).not.toBeInTheDocument();
  });

  it("keeps the selected setup visible when replay creation fails", async () => {
    const user = userEvent.setup();
    createMutation.mockRejectedValue(new Error("Battle could not be resolved."));
    renderWorkbench();
    await configureBattle(user);

    await user.click(screen.getByRole("button", { name: "Run & save battle" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Battle could not be resolved.");
    expect(screen.getByRole("combobox", { name: "Scenario A" })).toHaveTextContent(
      "Ambush at Dawn",
    );
    expect(screen.getByRole("combobox", { name: "Scenario B" })).toHaveTextContent("The Iron Line");
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
    const form = submit.closest("form");
    expect(form).not.toBeNull();
    act(() => {
      fireEvent.submit(form as HTMLFormElement);
      fireEvent.submit(form as HTMLFormElement);
    });

    await waitFor(() => expect(createMutation).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Resolving battle…" })).toBeDisabled();

    await act(async () => resolveCreate({ replay: replayOutput.replay }));
  });

  it("renders a clear replay loading failure", async () => {
    getQuery.mockRejectedValue(new Error("Replay not found"));
    renderWorkbench("missing-replay");

    expect(await screen.findByRole("alert")).toHaveTextContent("Replay not found");
  });
});
