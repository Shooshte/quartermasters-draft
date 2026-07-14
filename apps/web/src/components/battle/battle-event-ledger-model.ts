export type LedgerLogEntry = {
  tick: number;
  type: string;
  message: string;
  actionId?: string;
  origin?: { kind?: string; actionId?: string; sourceUnitId?: string };
  attackerId?: string;
  casterId?: string;
  sourceId?: string;
  targetId?: string;
  damage?: number;
};

export type BattleEventGroup<T extends LedgerLogEntry = LedgerLogEntry> =
  | {
      kind: "turn";
      key: string;
      actionId: string;
      actorId: string;
      entries: T[];
    }
  | {
      kind: "event";
      key: string;
      entry: T;
    };

function actorId(entry: LedgerLogEntry): string | undefined {
  return entry.attackerId ?? entry.casterId ?? entry.sourceId ?? entry.origin?.sourceUnitId;
}

function isPairedBasicAttackDamage(previous: LedgerLogEntry | undefined, entry: LedgerLogEntry) {
  return (
    previous?.type === "attack" &&
    entry.type === "damage" &&
    previous.actionId === entry.actionId &&
    previous.origin?.kind === "basic-attack" &&
    entry.origin?.kind === "basic-attack" &&
    previous.targetId === entry.targetId &&
    previous.damage === entry.damage
  );
}

export function buildBattleEventGroups<T extends LedgerLogEntry>(
  log: readonly T[],
): BattleEventGroup<T>[] {
  const groups: BattleEventGroup<T>[] = [];

  for (const [index, entry] of log.entries()) {
    const lastGroup = groups.at(-1);
    const entryActorId = actorId(entry);

    if (
      entry.actionId &&
      entryActorId &&
      lastGroup?.kind === "turn" &&
      lastGroup.actionId === entry.actionId
    ) {
      if (!isPairedBasicAttackDamage(lastGroup.entries.at(-1), entry)) {
        lastGroup.entries.push(entry);
      }
      continue;
    }

    if (entry.actionId && entryActorId) {
      groups.push({
        kind: "turn",
        key: entry.actionId,
        actionId: entry.actionId,
        actorId: entryActorId,
        entries: [entry],
      });
      continue;
    }

    groups.push({
      kind: "event",
      key: `${entry.tick}:${entry.type}:${index}`,
      entry,
    });
  }

  return groups;
}
