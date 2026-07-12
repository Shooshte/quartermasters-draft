import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { type BattleSetup, BattleSetupForm } from "~/components/battle/battle-setup-form";

const options = [
  { id: "scenario-a", name: "Ambush at Dawn" },
  { id: "scenario-b", name: "The Iron Line" },
  { id: "scenario-c", name: "Ashen Vanguard" },
];

function SetupHarness({
  initialValue = { scenarioAId: "", scenarioBId: "", seed: "" },
  onSubmit = vi.fn(),
  pending = false,
  error,
}: {
  initialValue?: BattleSetup;
  onSubmit?: (value: BattleSetup) => void;
  pending?: boolean;
  error?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <BattleSetupForm
      options={options}
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      pending={pending}
      error={error}
    />
  );
}

describe("BattleSetupForm", () => {
  it.each([
    ["missing values", { scenarioAId: "", scenarioBId: "", seed: "seed" }],
    ["equal scenario IDs", { scenarioAId: "scenario-a", scenarioBId: "scenario-a", seed: "seed" }],
    [
      "a whitespace-only seed",
      { scenarioAId: "scenario-a", scenarioBId: "scenario-b", seed: "   " },
    ],
  ])("disables battle resolution for %s", (_case, initialValue) => {
    render(<SetupHarness initialValue={initialValue} />);

    expect(screen.getByRole("button", { name: "Run & save battle" })).toBeDisabled();
  });

  it("selects two scenarios and submits their IDs with a trimmed seed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SetupHarness onSubmit={onSubmit} />);

    const scenarioA = screen.getByRole("combobox", { name: "Scenario A" });
    const scenarioB = screen.getByRole("combobox", { name: "Scenario B" });
    await user.click(scenarioA);
    expect(screen.getByRole("listbox", { name: "Scenario A options" })).toBeVisible();
    await user.click(screen.getByRole("option", { name: "Ambush at Dawn" }));

    await user.click(scenarioB);
    expect(screen.getByRole("listbox", { name: "Scenario B options" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "Ambush at Dawn" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "The Iron Line" }));
    await user.type(screen.getByRole("textbox", { name: "Battle seed" }), "  fixed-seed  ");

    const submit = screen.getByRole("button", { name: "Run & save battle" });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({
      scenarioAId: "scenario-a",
      scenarioBId: "scenario-b",
      seed: "fixed-seed",
    });
  });

  it("shows pending and API error states", () => {
    render(
      <SetupHarness
        initialValue={{
          scenarioAId: "scenario-a",
          scenarioBId: "scenario-b",
          seed: "seed",
        }}
        pending
        error="Battle could not be resolved."
      />,
    );

    expect(screen.getByRole("button", { name: "Resolving battle…" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Battle could not be resolved.");
  });
});
