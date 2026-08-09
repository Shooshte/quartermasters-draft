import type { AppRouter } from "@qd/api";
import type { inferRouterOutputs } from "@trpc/server";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { BattleEventLedger } from "./battle-event-ledger";

type ReplayOutput = inferRouterOutputs<AppRouter>["battleLab"]["get"];
type BattleUnit = ReplayOutput["result"]["finalState"]["scenarios"][number]["rows"]["tank"][number];

interface BattleResultViewProps {
  scenarios: ReplayOutput["scenarios"];
  result: ReplayOutput["result"];
}

const rowOrder = ["tank", "melee", "ranged", "support"] as const;

const displayedStatKeys = [
  ["meleeDmg", "Melee damage"],
  ["rangedDmg", "Ranged damage"],
  ["manaRegen", "Mana regeneration"],
  ["spellDmg", "Spell damage"],
  ["speed", "Speed"],
  ["dodge", "Dodge"],
  ["criticalChance", "Critical chance"],
] as const;

function normalStats(unit: BattleUnit) {
  const stats = { ...unit.baseStats };

  for (const statKey of Object.keys(stats) as Array<keyof typeof stats>) {
    stats[statKey] += unit.itemBonusStats[statKey];
  }

  return stats;
}

function effectiveStats(unit: BattleUnit) {
  const stats = normalStats(unit);

  for (const effect of unit.activeEffects) {
    if (effect.statKey) stats[effect.statKey] += effect.value;
  }

  for (const statKey of Object.keys(stats) as Array<keyof typeof stats>) {
    stats[statKey] = Math.max(0, stats[statKey]);
  }

  return stats;
}

function displayRow(row: BattleUnit["rowType"]) {
  return `${row.charAt(0).toUpperCase()}${row.slice(1)}`;
}

function displayEffects(unit: BattleUnit) {
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

function FinalStateLedger({
  scenario,
  name,
}: {
  scenario: ReplayOutput["result"]["finalState"]["scenarios"][number];
  name: string;
}) {
  const units = rowOrder.flatMap((row) => scenario.rows[row]);

  return (
    <Card className="min-w-0 gap-4 py-0">
      <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div>
          <p className="mb-1 text-[10px] tracking-[0.18em] text-primary/80 uppercase">
            Final state
          </p>
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table aria-label={`${name} final state`}>
          <TableHeader>
            <TableRow disableHover>
              <TableHead className="pl-4">Unit</TableHead>
              <TableHead>Row</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mana</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead className="pr-4">Active effects</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow disableHover>
                <TableCell colSpan={9} className="px-4 py-5 text-muted-foreground italic">
                  No units in this scenario.
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => {
                const normal = normalStats(unit);
                const effective = effectiveStats(unit);

                return (
                  <TableRow key={unit.instanceId}>
                    <TableCell className="pl-4 font-medium text-foreground">{unit.name}</TableCell>
                    <TableCell>{displayRow(unit.rowType)}</TableCell>
                    <TableCell className="tabular-nums">{unit.slot}</TableCell>
                    <TableCell className="tabular-nums">
                      {unit.currentHealth} / {effective.health}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          unit.currentHealth > 0 ? "text-emerald-300/90" : "text-muted-foreground"
                        }
                      >
                        {unit.currentHealth > 0 ? "Alive" : "Dead"}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {unit.mana} / {effective.mana}
                    </TableCell>
                    <TableCell>
                      <dl className="space-y-1 text-xs">
                        {displayedStatKeys.map(([statKey, label]) => {
                          const changed = normal[statKey] !== effective[statKey];
                          const effectiveClassName =
                            effective[statKey] > normal[statKey]
                              ? "text-emerald-300/90"
                              : "text-rose-300/90";

                          return (
                            <div key={statKey} className="flex justify-between gap-3">
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="tabular-nums">
                                {changed ? (
                                  <>
                                    {normal[statKey]} →{" "}
                                    <span className={effectiveClassName}>{effective[statKey]}</span>
                                  </>
                                ) : (
                                  normal[statKey]
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </TableCell>
                    <TableCell className="tabular-nums">{unit.actedCount}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                      {displayEffects(unit)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function BattleResultView({ scenarios, result }: BattleResultViewProps) {
  const winner = scenarios.find((scenario) => scenario.id === result.winnerId);
  const outcome = winner ? `${winner.name} wins` : "Draw";
  return (
    <section aria-labelledby="battle-outcome" className="space-y-4">
      <Card className="relative overflow-hidden border-primary/25 bg-primary/[0.055] py-0">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" aria-hidden="true" />
        <CardHeader className="gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6">
          <div>
            <p className="mb-1 text-[10px] tracking-[0.2em] text-primary uppercase">
              Resolution entered
            </p>
            <h2 id="battle-outcome" className="text-xl font-semibold sm:text-2xl">
              {outcome}
            </h2>
          </div>
          <div className="self-center border-l border-primary/25 pl-4 text-right">
            <p className="text-lg font-semibold tabular-nums text-primary">
              {result.ticksElapsed} ticks
            </p>
            <p className="text-xs text-muted-foreground">Elapsed</p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {result.finalState.scenarios.map((scenario, index) => (
          <FinalStateLedger
            key={scenario.id}
            scenario={scenario}
            name={scenarios[index]?.name ?? scenario.name ?? scenario.id}
          />
        ))}
      </div>

      <BattleEventLedger scenarios={scenarios} result={result} />
    </section>
  );
}
