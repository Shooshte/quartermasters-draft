export type LedgerLogEntry = {
  tick: number;
  type: string;
  message: string;
  actionId?: string;
  origin?: {
    kind?: string;
    actionId?: string;
    sourceUnitId?: string;
    item?: { id?: string; name: string; position: number };
    effect?: { id?: string; name: string; position: number };
  };
  target?: string;
  targetId?: string;
  stat?: string;
  value?: number;
  expiresAtTick?: number;
  attackerId?: string;
  casterId?: string;
  sourceId?: string;
  damage?: number;
};

export type BattleLedgerItem<T extends LedgerLogEntry = LedgerLogEntry> =
  | {
      kind: "entry";
      key: string;
      entry: T;
    }
  | {
      kind: "effect";
      key: string;
      eventType: "effect-apply" | "effect-expire";
      effect: string;
      entries: T[];
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
    }
  | {
      kind: "effect";
      key: string;
      eventType: "effect-apply" | "effect-expire";
      effect: string;
      entries: T[];
    };

function isDetailedModifierEntry(
  entry: LedgerLogEntry,
): entry is LedgerLogEntry & {
  type: "effect-apply" | "effect-expire";
  origin: NonNullable<LedgerLogEntry["origin"]> & {
    effect: NonNullable<NonNullable<LedgerLogEntry["origin"]>["effect"]>;
  };
} {
  return (
    (entry.type === "effect-apply" || entry.type === "effect-expire") &&
    Boolean(entry.targetId && entry.origin?.effect && entry.stat) &&
    typeof entry.value === "number" &&
    (entry.type === "effect-expire" || typeof entry.expiresAtTick === "number")
  );
}

function modifierGroupKey(entry: LedgerLogEntry) {
  return [
    entry.type,
    entry.tick,
    entry.actionId ?? entry.origin?.actionId ?? "",
    entry.origin?.sourceUnitId ?? "",
    entry.origin?.item?.id ?? entry.origin?.item?.position ?? "",
    entry.origin?.effect?.id ?? entry.origin?.effect?.position ?? "",
    entry.targetId ?? "",
  ].join(":");
}

export function buildBattleLedgerItems<T extends LedgerLogEntry>(
  entries: readonly T[],
): BattleLedgerItem<T>[] {
  const items: BattleLedgerItem<T>[] = [];

  for (const [index, entry] of entries.entries()) {
    if (!isDetailedModifierEntry(entry)) {
      items.push({
        kind: "entry",
        key: `${entry.tick}:${entry.type}:${index}`,
        entry,
      });
      continue;
    }

    const key = modifierGroupKey(entry);
    const lastItem = items.at(-1);

    if (lastItem?.kind === "effect" && lastItem.key === key) {
      lastItem.entries.push(entry);
      continue;
    }

    items.push({
      kind: "effect",
      key,
      eventType: entry.type,
      effect: entry.origin.effect.name,
      entries: [entry],
    });
  }

  return items;
}

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

    if (isDetailedModifierEntry(entry)) {
      const key = modifierGroupKey(entry);
      if (lastGroup?.kind === "effect" && lastGroup.key === key) {
        lastGroup.entries.push(entry);
      } else {
        groups.push({
          kind: "effect",
          key,
          eventType: entry.type,
          effect: entry.origin.effect.name,
          entries: [entry],
        });
      }
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
