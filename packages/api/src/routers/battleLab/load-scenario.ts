import {
  type db,
  effects,
  items,
  itemsAllowedRows,
  itemsEffects,
  scenarios,
  scenariosRows,
  scenariosRowsUnits,
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
        targetScope: units.targetScope,
        targetPriority: units.targetPriority,
        targetCount: units.targetCount,
        selectionShape: units.selectionShape,
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
  const itemAllowedRows =
    itemIds.length === 0
      ? []
      : await executor
          .select({ itemId: itemsAllowedRows.itemId, rowType: itemsAllowedRows.rowType })
          .from(itemsAllowedRows)
          .where(inArray(itemsAllowedRows.itemId, itemIds));

  const itemEffects =
    itemIds.length === 0
      ? []
      : await executor
          .select({
            itemId: itemsEffects.itemId,
            sequenceOrder: itemsEffects.sequenceOrder,
            effect: {
              id: effects.id,
              name: effects.name,
              timingType: effects.timingType,
              effectType: effects.effectType,
              triggerEveryActions: effects.triggerEveryActions,
              triggerCount: effects.triggerCount,
              lastsForActions: effects.lastsForActions,
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
          .from(itemsEffects)
          .innerJoin(effects, eq(effects.id, itemsEffects.effectTemplateId))
          .where(inArray(itemsEffects.itemId, itemIds))
          .orderBy(asc(itemsEffects.sequenceOrder));

  return toScenarioInput({
    scenario,
    assignments,
    unitItems,
    itemAllowedRows,
    itemEffects,
  });
}
