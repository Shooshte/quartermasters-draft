import type { AppRouter } from "@qd/api";
import type { inferRouterOutputs } from "@trpc/server";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { buildBattleEventGroups, type LedgerLogEntry } from "./battle-event-ledger-model";

type ReplayOutput = inferRouterOutputs<AppRouter>["battleLab"]["get"];
type BattleUnit = ReplayOutput["result"]["finalState"]["scenarios"][number]["rows"]["tank"][number];
type BattleLogEntry = ReplayOutput["result"]["log"][number];

interface BattleEventLedgerProps {
  scenarios: ReplayOutput["scenarios"];
  result: ReplayOutput["result"];
}

function displayRow(row: BattleUnit["rowType"]) {
  return `${row.charAt(0).toUpperCase()}${row.slice(1)}`;
}

function createUnitDirectory(scenarios: ReplayOutput["scenarios"], result: ReplayOutput["result"]) {
  const scenarioNames = new Map(scenarios.map((scenario) => [scenario.id, scenario.name]));
  const units = result.finalState.scenarios.flatMap((scenario) =>
    Object.values(scenario.rows).flat(),
  );

  return new Map(
    units.map((unit) => [
      unit.instanceId,
      `${unit.name} · ${scenarioNames.get(unit.scenarioId) ?? unit.scenarioId} / ${displayRow(unit.rowType)} ${unit.slot}`,
    ]),
  );
}

function unitLabel(unitIds: Map<string, string>, unitId: string | undefined, fallback: string) {
  return (unitId && unitIds.get(unitId)) ?? fallback;
}

function sourceLabel(entry: BattleLogEntry) {
  const origin = entry.origin;
  if (!origin) return null;
  return origin.item?.name ?? null;
}

function effectLabel(entry: BattleLogEntry) {
  return entry.origin?.effect?.name;
}

function entryKey(entry: BattleLogEntry) {
  return [
    entry.type,
    entry.message,
    "targetId" in entry ? entry.targetId : "",
    "damage" in entry ? entry.damage : "",
    "amount" in entry ? entry.amount : "",
    entry.origin?.effect?.position ?? "",
  ].join(":");
}

function EventDescription({
  entry,
  unitIds,
}: {
  entry: BattleLogEntry;
  unitIds: Map<string, string>;
}) {
  switch (entry.type) {
    case "attack":
      return (
        <>
          <p className="font-medium text-foreground">Basic attack</p>
          <p>
            Dealt {entry.damage} damage to {unitLabel(unitIds, entry.targetId, entry.target)}.
          </p>
        </>
      );
    case "item-activation":
      return <p className="font-medium text-foreground">{sourceLabel(entry) ?? entry.item}</p>;
    case "damage":
      return (
        <p className="text-rose-300/90">
          {effectLabel(entry) ? `${effectLabel(entry)} dealt` : "Dealt"} {entry.damage} damage to{" "}
          {unitLabel(unitIds, entry.targetId, entry.target)}.
        </p>
      );
    case "heal":
      return (
        <p className="text-emerald-300/90">
          {effectLabel(entry) ? `${effectLabel(entry)} restored` : "Restored"} {entry.amount} health
          to {unitLabel(unitIds, entry.targetId, entry.target)}.
        </p>
      );
    case "effect-apply":
      return (
        <p>
          {entry.effect} applied to {unitLabel(unitIds, entry.targetId, entry.target)}.
        </p>
      );
    case "effect-expire":
      return (
        <p>
          {entry.effect} expired on {unitLabel(unitIds, entry.targetId, entry.target)}.
        </p>
      );
    case "death":
      return (
        <p className="text-muted-foreground">
          {unitLabel(unitIds, entry.unitId, entry.unit)} died.
        </p>
      );
    case "fatigue":
      return (
        <p className="text-rose-300/90">
          Fatigue dealt {entry.damage} damage to {unitLabel(unitIds, entry.targetId, entry.target)}.
        </p>
      );
    case "battle-end":
      return <p className="font-medium text-foreground">Battle ended: {entry.outcome}.</p>;
    default:
      return <p>{(entry as { message: string }).message}</p>;
  }
}

function SourceCaption({
  entry,
  unitIds,
}: {
  entry: BattleLogEntry;
  unitIds: Map<string, string>;
}) {
  const source = sourceLabel(entry);
  const sourceUnit = entry.origin?.sourceUnitId;
  if (!source && !sourceUnit) return null;

  return (
    <p className="mt-1 text-xs text-muted-foreground">
      From {unitLabel(unitIds, sourceUnit, "Unknown source")}
      {source ? ` · ${source}` : ""}
    </p>
  );
}

export function BattleEventLedger({ scenarios, result }: BattleEventLedgerProps) {
  const unitIds = createUnitDirectory(scenarios, result);
  const groups = buildBattleEventGroups(result.log as BattleLogEntry[] as LedgerLogEntry[]);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold">Event ledger</h3>
          <CardDescription>Recorded in resolution order.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <ol aria-label="Battle events" className="divide-y divide-border/70">
          {groups.map((group) => {
            if (group.kind === "event") {
              const entry = group.entry as BattleLogEntry;
              return (
                <li
                  key={group.key}
                  className="px-4 py-3 text-sm leading-5 text-foreground/90 sm:px-5"
                >
                  <EventDescription entry={entry} unitIds={unitIds} />
                  <SourceCaption entry={entry} unitIds={unitIds} />
                </li>
              );
            }

            return (
              <li key={group.key} className="px-4 py-4 sm:px-5">
                <p className="text-sm font-semibold text-foreground">
                  {unitLabel(unitIds, group.actorId, "Unknown unit")}
                </p>
                <div className="mt-2 space-y-2 border-l border-primary/30 pl-3 text-sm leading-5 text-foreground/90">
                  {group.entries.map((entry) => (
                    <div key={entryKey(entry as BattleLogEntry)}>
                      <EventDescription entry={entry as BattleLogEntry} unitIds={unitIds} />
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
