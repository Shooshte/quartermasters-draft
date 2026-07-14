import { expect, type Page } from "@playwright/test";

type ScenarioSide = "A" | "B";

const rowOrder = ["tank", "melee", "ranged", "support"] as const;

type ScenarioRowType = (typeof rowOrder)[number];

interface ExpectedBattleUnit {
  name: string;
  rowType: ScenarioRowType;
  slot: number;
  currentHealth: number;
  baseStats: { health: number };
  itemBonusStats: { health: number };
  mana: number;
  actedCount: number;
  activeEffects: {
    name: string;
    remainingTriggers?: number;
    expiresAtTick?: number;
  }[];
}

interface ExpectedBattleReplay {
  scenarios: { id: string; name: string }[];
  result: {
    winnerId: string | null;
    ticksElapsed: number;
    finalState: {
      scenarios: {
        id: string;
        rows: Record<ScenarioRowType, ExpectedBattleUnit[]>;
      }[];
    };
    log: { tick: number; type: string; message: string }[];
  };
}

interface ExpectedSelection {
  id: string;
  name: string;
}

function displayRow(row: ScenarioRowType) {
  return `${row.charAt(0).toUpperCase()}${row.slice(1)}`;
}

function displayEffects(unit: ExpectedBattleUnit) {
  if (unit.activeEffects.length === 0) return "—";

  return unit.activeEffects
    .map((effect) => {
      if (effect.remainingTriggers !== undefined) {
        const triggerLabel = effect.remainingTriggers === 1 ? "trigger" : "triggers";
        return `${effect.name} (${effect.remainingTriggers} ${triggerLabel} remaining)`;
      }

      if (effect.expiresAtTick !== undefined) {
        return `${effect.name} (until tick ${effect.expiresAtTick})`;
      }

      return effect.name;
    })
    .join(", ");
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

  async expectResult(expected: ExpectedBattleReplay) {
    const winner = expected.scenarios.find((scenario) => scenario.id === expected.result.winnerId);
    await expect(
      this.page.getByRole("heading", {
        name: winner ? `${winner.name} wins` : "Draw",
        level: 2,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      this.page.getByText(`${expected.result.ticksElapsed} ticks`, { exact: true }),
    ).toBeVisible();

    for (const finalScenario of expected.result.finalState.scenarios) {
      const scenario = expected.scenarios.find((candidate) => candidate.id === finalScenario.id);
      if (!scenario) {
        throw new Error(`Expected scenario metadata for final-state scenario ${finalScenario.id}`);
      }

      const table = this.page.getByRole("table", {
        name: `${scenario.name} final state`,
      });
      const units = rowOrder.flatMap((row) => finalScenario.rows[row]);
      await expect(table).toBeVisible();
      await expect(table.getByRole("row")).toHaveCount(units.length + 1);

      for (const [index, unit] of units.entries()) {
        const row = table.getByRole("row").nth(index + 1);
        await expect(row.getByRole("cell")).toHaveText([
          unit.name,
          displayRow(unit.rowType),
          String(unit.slot),
          `${unit.currentHealth} / ${unit.baseStats.health + unit.itemBonusStats.health}`,
          unit.currentHealth > 0 ? "Alive" : "Dead",
          String(unit.mana),
          String(unit.actedCount),
          displayEffects(unit),
        ]);
      }
    }

    const eventLedger = this.page.getByRole("list", { name: "Battle events" });
    const eventEntries = eventLedger.getByRole("listitem");
    await expect(eventLedger).toBeVisible();
    await expect(eventEntries.first()).toBeVisible();
    await expect(eventLedger.getByText(/Tick \d+/)).toHaveCount(0);
    await expect(eventEntries.last()).toContainText("Battle ended:");

    const attributedSpell = expected.result.log.find(
      (entry) => entry.origin?.item?.name && entry.origin.spell?.name,
    );
    if (attributedSpell?.origin?.item && attributedSpell.origin.spell) {
      await expect(
        eventLedger.getByText(
          `${attributedSpell.origin.item.name} › ${attributedSpell.origin.spell.name}`,
        ),
      ).toBeVisible();
    }
  }

  get replayId() {
    const match = new URL(this.page.url()).pathname.match(/^\/replay\/([0-9a-f-]{36})$/);
    if (!match?.[1]) {
      throw new Error(`Expected a persisted replay URL, received ${this.page.url()}`);
    }
    return match[1];
  }
}
