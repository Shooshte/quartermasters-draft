export type LedgerLogEntry = {
  batchNumber: number;
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
  actionsRemaining?: number;
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

export type BattleTurnGroup<T extends LedgerLogEntry = LedgerLogEntry> = {
  kind: "turn";
  key: string;
  actionId: string;
  actorId: string;
  entries: T[];
};

export type BattleUnattributedEvent<T extends LedgerLogEntry = LedgerLogEntry> =
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

export type BattleEventPhase<T extends LedgerLogEntry = LedgerLogEntry> =
  | {
      kind: "turns";
      key: string;
      turns: BattleTurnGroup<T>[];
    }
  | {
      kind: "events";
      key: string;
      events: BattleUnattributedEvent<T>[];
    };

export type BattleEventGroup<T extends LedgerLogEntry = LedgerLogEntry> = {
  kind: "batch";
  key: string;
  batchNumber: number;
  phases: BattleEventPhase<T>[];
};

function isDetailedModifierEntry(entry: LedgerLogEntry): entry is LedgerLogEntry & {
  type: "effect-apply" | "effect-expire";
  origin: NonNullable<LedgerLogEntry["origin"]> & {
    effect: NonNullable<NonNullable<LedgerLogEntry["origin"]>["effect"]>;
  };
} {
  return (
    (entry.type === "effect-apply" || entry.type === "effect-expire") &&
    Boolean(entry.targetId && entry.origin?.effect && entry.stat) &&
    typeof entry.value === "number" &&
    typeof entry.actionsRemaining === "number"
  );
}

function modifierGroupKey(entry: LedgerLogEntry) {
  return [
    entry.type,
    entry.batchNumber,
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
        key: `${entry.batchNumber}:${entry.type}:${index}`,
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
    let batch = groups.at(-1);
    if (batch?.batchNumber !== entry.batchNumber) {
      batch = {
        kind: "batch",
        key: `batch:${entry.batchNumber}`,
        batchNumber: entry.batchNumber,
        phases: [],
      };
      groups.push(batch);
    }

    const entryActorId = actorId(entry);

    if (entry.actionId && entryActorId) {
      let turnPhase = batch.phases.find((phase) => phase.kind === "turns");
      if (!turnPhase) {
        turnPhase = {
          kind: "turns",
          key: `batch:${entry.batchNumber}:turns`,
          turns: [],
        };
        batch.phases.push(turnPhase);
      }

      const turn = turnPhase.turns.find((candidate) => candidate.actionId === entry.actionId);
      if (turn) {
        if (!isPairedBasicAttackDamage(turn.entries.at(-1), entry)) {
          turn.entries.push(entry);
        }
      } else {
        turnPhase.turns.push({
          kind: "turn",
          key: entry.actionId,
          actionId: entry.actionId,
          actorId: entryActorId,
          entries: [entry],
        });
      }
      continue;
    }

    let eventPhase = batch.phases.at(-1);
    if (eventPhase?.kind !== "events") {
      eventPhase = {
        kind: "events",
        key: `batch:${entry.batchNumber}:events:${batch.phases.length}`,
        events: [],
      };
      batch.phases.push(eventPhase);
    }

    if (isDetailedModifierEntry(entry)) {
      const key = modifierGroupKey(entry);
      const lastEvent = eventPhase.events.at(-1);
      if (lastEvent?.kind === "effect" && lastEvent.key === key) {
        lastEvent.entries.push(entry);
      } else {
        eventPhase.events.push({
          kind: "effect",
          key,
          eventType: entry.type,
          effect: entry.origin.effect.name,
          entries: [entry],
        });
      }
      continue;
    }

    eventPhase.events.push({
      kind: "event",
      key: `${entry.batchNumber}:${entry.type}:${index}`,
      entry,
    });
  }

  return groups;
}
