/**
 * Shared seed entity IDs and constants used across e2e test files.
 * Single source of truth — import from here instead of re-declaring inline.
 */

// ─── tRPC Base Path ──────────────────────────────────────────────────────────

export const TRPC_BASE = "/api/trpc";

// ─── Effect IDs ──────────────────────────────────────────────────────────────

export const BARBARIAN_ROAR_ID = "a0000000-0000-0000-0000-000000000001";
export const ARCANE_DAMAGE_ID = "a0000000-0000-0000-0000-000000000006";
export const SIZZLING_FLESH_ID = "a0000000-0000-0000-0000-000000000007";
export const ZODIAC_BURST_ID = "a0000000-0000-0000-0000-000000000021";

// ─── Item IDs ────────────────────────────────────────────────────────────────

export const IRON_SWORD_ID = "d0000000-0000-0000-0000-000000000001";
export const OAK_STAFF_ID = "d0000000-0000-0000-0000-000000000002";
export const LEATHER_SHIELD_ID = "d0000000-0000-0000-0000-000000000003";
export const WYRM_SCALE_ID = "d0000000-0000-0000-0000-000000000011";

// ─── Unit IDs ────────────────────────────────────────────────────────────────

export const BARBARIAN_ID = "f0000000-0000-0000-0000-000000000001";
export const MAGE_ID = "f0000000-0000-0000-0000-000000000002";
export const RANGER_ID = "f0000000-0000-0000-0000-000000000003";
export const SAMURAI_ID = "f0000000-0000-0000-0000-000000000004";
export const TEMPLAR_ID = "f0000000-0000-0000-0000-000000000005";
export const UNDEAD_KNIGHT_ID = "f0000000-0000-0000-0000-000000000006";
export const ZEPHYR_MONK_ID = "f0000000-0000-0000-0000-000000000011";

/** Name → ID map for units used in scenario workspace tests */
export const UNIT_IDS: Record<string, string> = {
  Barbarian: BARBARIAN_ID,
  Mage: MAGE_ID,
  Ranger: RANGER_ID,
  Samurai: SAMURAI_ID,
  Templar: TEMPLAR_ID,
  "Undead Knight": UNDEAD_KNIGHT_ID,
};

// ─── Scenario IDs ────────────────────────────────────────────────────────────

export const AMBUSH_AT_DAWN_ID = "a2000000-0000-0000-0000-000000000001";
export const CASTLE_SIEGE_ID = "a2000000-0000-0000-0000-000000000002";
export const AMBUSH_AT_DAWN_NAME = "Ambush at Dawn";
export const CASTLE_SIEGE_NAME = "Castle Siege";
export const BATTLE_LAB_SEED = "balance-pass-3";

// ─── Misc ────────────────────────────────────────────────────────────────────

export const UNKNOWN_UUID = "00000000-0000-0000-0000-000000000099";

// ─── ID Generation ───────────────────────────────────────────────────────────

/** ID prefix patterns used for each entity type in the seed data */
const ENTITY_PREFIXES: Record<string, string> = {
  effects: "a0000000-0000-0000-0000-",
  items: "d0000000-0000-0000-0000-",
  units: "f0000000-0000-0000-0000-",
  scenarios: "a2000000-0000-0000-0000-",
};

/**
 * Generate an array of deterministic seed entity IDs.
 *
 * @example generateEntityIds("items", 21) → ["d0000000-0000-0000-0000-000000000001", ...]
 */
export function generateEntityIds(
  entityType: "effects" | "items" | "units" | "scenarios",
  count: number,
): string[] {
  const prefix = ENTITY_PREFIXES[entityType];
  return Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(12, "0")}`);
}
