import { effects, items, itemsSpells, scenarios, scenariosRows, scenariosRowsUnits, spells, spellsEffects, units, unitsItems } from "./schema";

const now = new Date();

export function buildSeedData(hashedPassword: string) {
  const users = [
    {
      id: "seed-gm-001",
      name: "Test GM",
      email: "gm@example.com",
      emailVerified: false,
      role: "gm" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-player-001",
      name: "Test Player",
      email: "player@example.com",
      emailVerified: false,
      role: "player" as const,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const accounts = users.map((user) => ({
    id: `account-${user.id}`,
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  }));

  return { users, accounts };
}

export const effectSeedData: (typeof effects.$inferInsert)[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Barbarian Roar",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationMs: 5000,
    meleeDmg: 20.5
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Rage",
    effectType: "buff" as const,
    timingType: "interval" as const,
    intervalMs: 1000,
    triggerCount: 5,
    meleeDmg: 10.0,
    rangedDmg: 10.0,
    speed: 0.5
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Exhaust",
    effectType: "debuff" as const,
    timingType: "instant" as const,
    durationMs: 10000,
    speed: -0.2,
    dodge: -0.2,
    criticalChance: -25,
    meleeDmg: -5,
    rangedDmg: -5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Mend",
    effectType: "healing" as const,
    timingType: "instant" as const,
    directHealing: 10.25
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Bandage",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalMs: 5000,
    triggerCount: 5,
    health: 10.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000006",
    name: "Arcane Damage",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 8.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000007",
    name: "Sizzling Flesh",
    effectType: "damage" as const,
    timingType: "interval" as const,
    intervalMs: 1000,
    triggerCount: 2,
    directSpellDmg: 12.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000008",
    name: "Frostbite",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 15.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000009",
    name: "Guardian Shield",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationMs: 8000,
    dodge: 0.3,
  },
  {
    id: "a0000000-0000-0000-0000-000000000010",
    name: "Poison Cloud",
    effectType: "debuff" as const,
    timingType: "interval" as const,
    intervalMs: 2000,
    triggerCount: 3,
    directSpellDmg: 5.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000011",
    name: "Rejuvenation",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalMs: 3000,
    triggerCount: 4,
    health: 8.0,
  },
];

export const spellSeedData: (typeof spells.$inferInsert)[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "Fireball",
    description: "Hurls a ball of fire at the target, dealing instant arcane damage followed by burning.",
    targetPolicy: "highest_health" as const,
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Battle Cry",
    description: "A mighty roar that buffs the caster with increased melee damage.",
    targetPolicy: "random" as const,
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "Healing Touch",
    description: "Gently mends wounds, restoring health over time.",
    targetPolicy: "lowest_health" as const,
  },
];

export const spellsEffectsSeedData: (typeof spellsEffects.$inferInsert)[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    spellId: "b0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000006", // Arcane Damage
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    spellId: "b0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000007", // Sizzling Flesh
    sequenceOrder: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    spellId: "b0000000-0000-0000-0000-000000000002",
    effectTemplateId: "a0000000-0000-0000-0000-000000000001", // Barbarian Roar
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    spellId: "b0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000004", // Mend
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000005",
    spellId: "b0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000005", // Bandage
    sequenceOrder: 2,
  },
];

export const itemSeedData: (typeof items.$inferInsert)[] = [
  {
    id: "d0000000-0000-0000-0000-000000000001",
    name: "Iron Sword",
    meleeDmg: 15,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 5,
    activationManaCost: 0,
    activationHealthCost: 0,
  },
  {
    id: "d0000000-0000-0000-0000-000000000002",
    name: "Oak Staff",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 3,
    spellDmg: 12,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
  },
  {
    id: "d0000000-0000-0000-0000-000000000003",
    name: "Leather Shield",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 10,
    criticalChance: 0,
    activationManaCost: 5,
    activationHealthCost: 0,
  },
];

export const itemsSpellsSeedData: (typeof itemsSpells.$inferInsert)[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    itemId: "d0000000-0000-0000-0000-000000000002", // Oak Staff
    spellId: "b0000000-0000-0000-0000-000000000001", // Fireball
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    itemId: "d0000000-0000-0000-0000-000000000003", // Leather Shield
    spellId: "b0000000-0000-0000-0000-000000000003", // Healing Touch
  },
];

export const unitSeedData: (typeof units.$inferInsert)[] = [
  {
    id: "f0000000-0000-0000-0000-000000000001",
    name: "Barbarian",
    meleeDmg: 25,
    health: 120,
    rangedDmg: 5,
    manaRegen: 1,
    spellDmg: 0,
    speed: 0.8,
    dodge: 5,
    criticalChance: 10,
  },
  {
    id: "f0000000-0000-0000-0000-000000000002",
    name: "Mage",
    meleeDmg: 5,
    health: 70,
    rangedDmg: 10,
    manaRegen: 8,
    spellDmg: 30,
    speed: 0.6,
    dodge: 3,
    criticalChance: 15,
  },
  {
    id: "f0000000-0000-0000-0000-000000000003",
    name: "Ranger",
    meleeDmg: 10,
    health: 90,
    rangedDmg: 25,
    manaRegen: 3,
    spellDmg: 5,
    speed: 1.0,
    dodge: 12,
    criticalChance: 20,
  },
];

export const unitsItemsSeedData: (typeof unitsItems.$inferInsert)[] = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    unitId: "f0000000-0000-0000-0000-000000000001", // Barbarian
    itemId: "d0000000-0000-0000-0000-000000000001", // Iron Sword
    priority: 1,
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    unitId: "f0000000-0000-0000-0000-000000000002", // Mage
    itemId: "d0000000-0000-0000-0000-000000000002", // Oak Staff
    priority: 1,
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    unitId: "f0000000-0000-0000-0000-000000000003", // Ranger
    itemId: "d0000000-0000-0000-0000-000000000003", // Leather Shield
    priority: 1,
  },
];

export const scenarioSeedData: (typeof scenarios.$inferInsert)[] = [
  {
    id: "a2000000-0000-0000-0000-000000000001",
    name: "Ambush at Dawn",
    createdAt: new Date("2025-04-01T00:00:00Z"),
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000002",
    name: "Castle Siege",
    createdAt: new Date("2025-05-01T00:00:00Z"),
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000003",
    name: "Bridge Defense",
    createdAt: new Date("2025-07-01T00:00:00Z"),
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000004",
    name: "Dragon's Lair",
    createdAt: new Date("2025-08-01T00:00:00Z"),
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000005",
    name: "Eclipse Ritual",
    createdAt: new Date("2025-09-01T00:00:00Z"),
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000006",
    name: "Forest Ambush",
    createdAt: new Date("2025-10-01T00:00:00Z"),
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000007",
    name: "Goblin Raid",
    createdAt: new Date("2025-11-01T00:00:00Z"),
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000008",
    name: "Harbor Assault",
    createdAt: new Date("2025-12-01T00:00:00Z"),
    updatedAt: new Date("2025-12-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000009",
    name: "Ice Cavern",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000010",
    name: "Jungle Trek",
    createdAt: new Date("2026-02-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000011",
    name: "Zombie Horde",
    createdAt: new Date("2025-06-01T00:00:00Z"),
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
];

export const scenariosRowsSeedData: (typeof scenariosRows.$inferInsert)[] = [
  {
    id: "a3000000-0000-0000-0000-000000000001",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "tank" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000002",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000003",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000004",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000005",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "tank" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000006",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000007",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000008",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "support" as const,
  },
];

export const scenariosRowsUnitsSeedData: (typeof scenariosRowsUnits.$inferInsert)[] = [
  {
    id: "a4000000-0000-0000-0000-000000000001",
    rowId: "a3000000-0000-0000-0000-000000000002", // melee row
    unitId: "f0000000-0000-0000-0000-000000000001", // Barbarian
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000002",
    rowId: "a3000000-0000-0000-0000-000000000003", // ranged row
    unitId: "f0000000-0000-0000-0000-000000000002", // Mage
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000003",
    rowId: "a3000000-0000-0000-0000-000000000004", // support row
    unitId: "f0000000-0000-0000-0000-000000000003", // Ranger
    slot: 1,
  },
];
