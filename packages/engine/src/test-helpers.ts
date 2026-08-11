import type {
  BattleInput,
  BattleItemState,
  EffectTemplateInput,
  ItemInput,
  RowType,
  ScenarioInput,
  StatKey,
  UnitInput,
  UnitStats,
} from "./types";

export function createStats(overrides: Partial<UnitStats> = {}): UnitStats {
  return {
    health: 100,
    mana: 100,
    meleeDmg: 10,
    rangedDmg: 10,
    manaRegen: 0,
    spellDmg: 10,
    speed: 10,
    dodge: 0,
    criticalChance: 0,
    ...overrides,
  };
}

export function createEffect(
  effect: Partial<EffectTemplateInput> & Pick<EffectTemplateInput, "effectType" | "timingType">,
): EffectTemplateInput {
  return {
    id: effect.id ?? effect.name?.toLowerCase().replace(/\s+/g, "-") ?? `effect-${Math.random()}`,
    name: effect.name ?? "Effect",
    isTaunt: false,
    triggerEveryActions: null,
    triggerCount: null,
    lastsForActions: null,
    meleeDmg: null,
    health: null,
    mana: null,
    rangedDmg: null,
    manaRegen: null,
    spellDmg: null,
    speed: null,
    dodge: null,
    criticalChance: null,
    directHealing: null,
    directMeleeDmg: null,
    directRangedDmg: null,
    directSpellDmg: null,
    ...effect,
  };
}

export function createItem(
  overrides: Partial<ItemInput> & Pick<ItemInput, "name">,
): BattleItemState {
  return {
    id: overrides.id ?? overrides.name.toLowerCase().replace(/\s+/g, "-"),
    mana: 0,
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    effects: [],
    ...overrides,
  };
}

export function createUnit(name: string, overrides: Partial<UnitInput> = {}): UnitInput {
  return {
    id: overrides.id ?? name.toLowerCase().replace(/\s+/g, "-"),
    name,
    stats: createStats(),
    items: [],
    targetScope: "enemies",
    targetPriority: "highest_health",
    targetCount: 1,
    selectionShape: "individual",
    ...overrides,
  };
}

export function createScenario(
  id: string,
  rows: Partial<Record<RowType, UnitInput[]>> = {},
): ScenarioInput {
  return {
    id,
    name: id,
    rows,
  };
}

export function createBattleInput(
  scenarios: [ScenarioInput, ScenarioInput],
  seed: number | string = 42,
): BattleInput {
  return {
    scenarios,
    seed,
  };
}

export function createBattleInputWithSeed(seed: number | string): BattleInput {
  return createBattleInput(
    [
      createScenario("A", { tank: [createUnit("A")] }),
      createScenario("B", { tank: [createUnit("B")] }),
    ],
    seed,
  );
}

export function effectSequence(
  ...effects: EffectTemplateInput[]
): NonNullable<ItemInput["effects"]> {
  return effects.map((effect, index) => ({
    sequenceOrder: index + 1,
    effect,
  }));
}

export function statBuff(
  statKey: StatKey,
  value: number,
  lastsForActions: number,
  effectType: "buff" | "debuff" = "buff",
): EffectTemplateInput {
  return createEffect({
    name: `${effectType}-${statKey}`,
    effectType,
    timingType: "instant",
    lastsForActions,
    [statKey]: value,
  });
}
