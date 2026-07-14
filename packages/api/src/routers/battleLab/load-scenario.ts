import {
  type db,
  effects,
  items,
  itemsSpells,
  scenarios,
  scenariosRows,
  scenariosRowsUnits,
  spells,
  spellsAllowedRows,
  spellsEffects,
  units,
  unitsItems,
} from "@qd/db";
import type { ScenarioInput } from "@qd/engine";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import { toScenarioInput } from "./scenario-input";

export type BattleReadExecutor = Pick<typeof db, "select">;

export async function loadBattleScenario(
  executor: BattleReadExecutor,
  scenarioId: string,
): Promise<ScenarioInput> {
  const [scenario] = await executor
    .select({ id: scenarios.id, name: scenarios.name })
    .from(scenarios)
    .where(eq(scenarios.id, scenarioId))
    .limit(1);

  if (!scenario) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
  }

  const assignments = await executor
    .select({
      rowType: scenariosRows.rowType,
      slot: scenariosRowsUnits.slot,
      unit: {
        id: units.id,
        name: units.name,
        health: units.health,
        mana: units.mana,
        meleeDmg: units.meleeDmg,
        rangedDmg: units.rangedDmg,
        manaRegen: units.manaRegen,
        spellDmg: units.spellDmg,
        speed: units.speed,
        dodge: units.dodge,
        criticalChance: units.criticalChance,
      },
    })
    .from(scenariosRows)
    .innerJoin(scenariosRowsUnits, eq(scenariosRowsUnits.rowId, scenariosRows.id))
    .innerJoin(units, eq(units.id, scenariosRowsUnits.unitId))
    .where(eq(scenariosRows.scenarioId, scenarioId))
    .orderBy(asc(scenariosRowsUnits.slot));

  const unitIds = [...new Set(assignments.map((assignment) => assignment.unit.id))];
  const unitItems =
    unitIds.length === 0
      ? []
      : await executor
          .select({
            unitId: unitsItems.unitId,
            priority: unitsItems.priority,
            item: {
              id: items.id,
              name: items.name,
              meleeDmg: items.meleeDmg,
              rangedDmg: items.rangedDmg,
              mana: items.mana,
              manaRegen: items.manaRegen,
              spellDmg: items.spellDmg,
              dodge: items.dodge,
              criticalChance: items.criticalChance,
              activationManaCost: items.activationManaCost,
              activationHealthCost: items.activationHealthCost,
            },
          })
          .from(unitsItems)
          .innerJoin(items, eq(items.id, unitsItems.itemId))
          .where(inArray(unitsItems.unitId, unitIds))
          .orderBy(asc(unitsItems.priority));

  const itemIds = [...new Set(unitItems.map((link) => link.item.id))];
  const itemSpells =
    itemIds.length === 0
      ? []
      : await executor
          .select({
            itemId: itemsSpells.itemId,
            spell: {
              id: spells.id,
              name: spells.name,
              description: spells.description,
              targetPolicy: spells.targetPolicy,
              targetRowCount: spells.targetRowCount,
              maxTargetsPerRow: spells.maxTargetsPerRow,
              targetOnlyAdjacent: spells.targetOnlyAdjacent,
            },
          })
          .from(itemsSpells)
          .innerJoin(spells, eq(spells.id, itemsSpells.spellId))
          .where(inArray(itemsSpells.itemId, itemIds));

  const spellIds = [...new Set(itemSpells.map((link) => link.spell.id))];
  const spellAllowedRows =
    spellIds.length === 0
      ? []
      : await executor
          .select({ spellId: spellsAllowedRows.spellId, rowType: spellsAllowedRows.rowType })
          .from(spellsAllowedRows)
          .where(inArray(spellsAllowedRows.spellId, spellIds));

  const spellEffects =
    spellIds.length === 0
      ? []
      : await executor
          .select({
            spellId: spellsEffects.spellId,
            sequenceOrder: spellsEffects.sequenceOrder,
            effect: {
              id: effects.id,
              name: effects.name,
              timingType: effects.timingType,
              effectType: effects.effectType,
              intervalTicks: effects.intervalTicks,
              triggerCount: effects.triggerCount,
              durationTicks: effects.durationTicks,
              meleeDmg: effects.meleeDmg,
              health: effects.health,
              mana: effects.mana,
              rangedDmg: effects.rangedDmg,
              manaRegen: effects.manaRegen,
              spellDmg: effects.spellDmg,
              speed: effects.speed,
              dodge: effects.dodge,
              criticalChance: effects.criticalChance,
              directHealing: effects.directHealing,
              directMeleeDmg: effects.directMeleeDmg,
              directRangedDmg: effects.directRangedDmg,
              directSpellDmg: effects.directSpellDmg,
            },
          })
          .from(spellsEffects)
          .innerJoin(effects, eq(effects.id, spellsEffects.effectTemplateId))
          .where(inArray(spellsEffects.spellId, spellIds))
          .orderBy(asc(spellsEffects.sequenceOrder));

  return toScenarioInput({
    scenario,
    assignments,
    unitItems,
    itemSpells,
    spellAllowedRows,
    spellEffects,
  });
}
