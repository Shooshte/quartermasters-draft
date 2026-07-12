import { expect, type Page } from "@playwright/test";

type ScenarioSide = "A" | "B";

interface ExpectedScenario {
  name: string;
  unitCount: number;
}

interface ExpectedSelection {
  id: string;
  name: string;
}

export class BattleLabPage {
  constructor(readonly page: Page) {}

  private scenarioPicker(side: ScenarioSide) {
    return this.page.getByRole("combobox", { name: `Scenario ${side}` });
  }

  async goto() {
    await this.page.goto("/battle");
    await expect(this.page.getByRole("heading", { name: "Battle lab", level: 1 })).toBeVisible();
  }

  async selectScenario(side: ScenarioSide, id: string, name: string) {
    const picker = this.scenarioPicker(side);
    await picker.click();
    await this.page.getByTestId(`battle-scenario-${side.toLowerCase()}-search`).fill(name);

    const option = this.page
      .getByRole("listbox", { name: `Scenario ${side} options` })
      .getByRole("option", { name, exact: true });
    await expect(option).toHaveAttribute(
      "data-testid",
      `battle-scenario-${side.toLowerCase()}-option-${id}`,
    );
    await option.click();
    await expect(picker).toContainText(name);
  }

  async setSeed(seed: string) {
    await this.page.getByRole("textbox", { name: "Battle seed" }).fill(seed);
  }

  async run() {
    await this.page.getByRole("button", { name: "Run & save battle" }).click();
    await expect(this.page).toHaveURL(/\/replay\/[0-9a-f-]{36}$/);
  }

  private async expectSelectedScenario(side: ScenarioSide, scenario: ExpectedSelection) {
    const picker = this.scenarioPicker(side);
    await expect(picker).toContainText(scenario.name);
    await picker.click();

    const selectedOption = this.page
      .getByRole("listbox", { name: `Scenario ${side} options` })
      .getByRole("option", { name: scenario.name, exact: true });
    await expect(selectedOption).toHaveAttribute(
      "data-testid",
      `battle-scenario-${side.toLowerCase()}-option-${scenario.id}`,
    );
    await expect(selectedOption).toHaveAttribute("aria-selected", "true");
    await picker.click();
  }

  async expectSetup(scenarioA: ExpectedSelection, scenarioB: ExpectedSelection, seed: string) {
    await this.expectSelectedScenario("A", scenarioA);
    await this.expectSelectedScenario("B", scenarioB);
    await expect(this.page.getByRole("textbox", { name: "Battle seed" })).toHaveValue(seed);
  }

  async expectResult(expectedScenarios: ExpectedScenario[]) {
    await expect(
      this.page.getByRole("heading", { name: /(?: wins|^Draw$)/, level: 2 }),
    ).toBeVisible();
    await expect(this.page.getByText(/^\d+ ticks$/)).toBeVisible();

    for (const scenario of expectedScenarios) {
      const table = this.page.getByRole("table", {
        name: `${scenario.name} final state`,
      });
      await expect(table).toBeVisible();
      await expect(table.getByRole("row")).toHaveCount(scenario.unitCount + 1);
    }

    const eventLedger = this.page.getByRole("list", { name: "Battle events" });
    const eventEntries = eventLedger.getByRole("listitem");
    await expect(eventLedger).toBeVisible();
    await expect(eventLedger.getByText(/^(?:attack|battle end)$/i).first()).toBeVisible();

    const tickLabels = await eventEntries.getByText(/^Tick \d+$/).allTextContents();
    const ticks = tickLabels.map((label) => Number(label.replace("Tick ", "")));
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks).toEqual([...ticks].sort((left, right) => left - right));
  }

  get replayId() {
    const match = new URL(this.page.url()).pathname.match(/^\/replay\/([0-9a-f-]{36})$/);
    if (!match?.[1]) {
      throw new Error(`Expected a persisted replay URL, received ${this.page.url()}`);
    }
    return match[1];
  }
}
