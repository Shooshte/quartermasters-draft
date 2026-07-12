import type { items, itemsSpells } from "../schema";

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
    updatedAt: new Date("2025-01-01T00:00:00Z"),
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
    updatedAt: new Date("2025-02-01T00:00:00Z"),
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
    updatedAt: new Date("2025-03-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000004",
    name: "Pearl Dagger",
    meleeDmg: 8,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 8,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000005",
    name: "Quartz Staff",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 5,
    spellDmg: 10,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000006",
    name: "Ruby Wand",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 2,
    spellDmg: 18,
    dodge: 0,
    criticalChance: 5,
    activationManaCost: 5,
    activationHealthCost: 0,
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000007",
    name: "Silver Shield",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 15,
    criticalChance: 0,
    activationManaCost: 8,
    activationHealthCost: 0,
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000008",
    name: "Thunder Hammer",
    meleeDmg: 22,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 5,
    dodge: 0,
    criticalChance: 3,
    activationManaCost: 10,
    activationHealthCost: 0,
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000009",
    name: "Unicorn Horn",
    meleeDmg: 5,
    rangedDmg: 0,
    manaRegen: 8,
    spellDmg: 15,
    dodge: 0,
    criticalChance: 10,
    activationManaCost: 0,
    activationHealthCost: 5,
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000010",
    name: "Venom Blade",
    meleeDmg: 12,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 8,
    dodge: 0,
    criticalChance: 12,
    activationManaCost: 0,
    activationHealthCost: 3,
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000011",
    name: "Wyrm Scale",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 20,
    criticalChance: 0,
    activationManaCost: 12,
    activationHealthCost: 0,
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000012",
    name: "Jade Lantern",
    meleeDmg: 2,
    rangedDmg: 0,
    manaRegen: 4,
    spellDmg: 6,
    dodge: 1,
    criticalChance: 2,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-03-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000013",
    name: "Knightbreaker Axe",
    meleeDmg: 19,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 6,
    activationManaCost: 4,
    activationHealthCost: 0,
    updatedAt: new Date("2025-04-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000014",
    name: "Luminous Cape",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 2,
    spellDmg: 4,
    dodge: 12,
    criticalChance: 0,
    activationManaCost: 3,
    activationHealthCost: 0,
    updatedAt: new Date("2025-05-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000015",
    name: "Moonsteel Helm",
    meleeDmg: 4,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 6,
    criticalChance: 1,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-06-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000016",
    name: "Nightglass Orb",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 5,
    spellDmg: 14,
    dodge: 0,
    criticalChance: 4,
    activationManaCost: 6,
    activationHealthCost: 0,
    updatedAt: new Date("2025-07-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000017",
    name: "Onyx Pike",
    meleeDmg: 11,
    rangedDmg: 6,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 2,
    criticalChance: 7,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-08-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000018",
    name: "Phoenix Mail",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 1,
    spellDmg: 0,
    dodge: 9,
    criticalChance: 0,
    activationManaCost: 8,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000019",
    name: "Quillblade",
    meleeDmg: 13,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 2,
    dodge: 3,
    criticalChance: 11,
    activationManaCost: 0,
    activationHealthCost: 2,
    updatedAt: new Date("2025-09-20T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000020",
    name: "Yew Longbow",
    meleeDmg: 0,
    rangedDmg: 21,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 4,
    criticalChance: 9,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-25T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000021",
    name: "Zircon Crown",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 6,
    spellDmg: 9,
    dodge: 5,
    criticalChance: 3,
    activationManaCost: 4,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-30T00:00:00Z"),
  },
];

export const itemsSpellsSeedData: (typeof itemsSpells.$inferInsert)[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    itemId: "d0000000-0000-0000-0000-000000000001", // Iron Sword
    spellId: "b0000000-0000-0000-0000-000000000002", // Battle Cry
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    itemId: "d0000000-0000-0000-0000-000000000002", // Oak Staff
    spellId: "b0000000-0000-0000-0000-000000000001", // Fireball
  },
  {
    id: "e0000000-0000-0000-0000-000000000003",
    itemId: "d0000000-0000-0000-0000-000000000003", // Leather Shield
    spellId: "b0000000-0000-0000-0000-000000000003", // Healing Touch
  },
  {
    id: "e0000000-0000-0000-0000-000000000004",
    itemId: "d0000000-0000-0000-0000-000000000004", // Pearl Dagger
    spellId: "b0000000-0000-0000-0000-000000000004", // Arcane Shield
  },
  {
    id: "e0000000-0000-0000-0000-000000000005",
    itemId: "d0000000-0000-0000-0000-000000000005", // Quartz Staff
    spellId: "b0000000-0000-0000-0000-000000000005", // Chain Lightning
  },
  {
    id: "e0000000-0000-0000-0000-000000000006",
    itemId: "d0000000-0000-0000-0000-000000000006", // Ruby Wand
    spellId: "b0000000-0000-0000-0000-000000000006", // Dark Pact
  },
  {
    id: "e0000000-0000-0000-0000-000000000007",
    itemId: "d0000000-0000-0000-0000-000000000007", // Silver Shield
    spellId: "b0000000-0000-0000-0000-000000000007", // Earthquake
  },
  {
    id: "e0000000-0000-0000-0000-000000000008",
    itemId: "d0000000-0000-0000-0000-000000000008", // Thunder Hammer
    spellId: "b0000000-0000-0000-0000-000000000008", // Frost Nova
  },
  {
    id: "e0000000-0000-0000-0000-000000000009",
    itemId: "d0000000-0000-0000-0000-000000000009", // Unicorn Horn
    spellId: "b0000000-0000-0000-0000-000000000009", // Guardian Spirit
  },
  {
    id: "e0000000-0000-0000-0000-000000000010",
    itemId: "d0000000-0000-0000-0000-000000000010", // Venom Blade
    spellId: "b0000000-0000-0000-0000-000000000010", // Holy Light
  },
  {
    id: "e0000000-0000-0000-0000-000000000011",
    itemId: "d0000000-0000-0000-0000-000000000011", // Wyrm Scale
    spellId: "b0000000-0000-0000-0000-000000000011", // Ignite
  },
  {
    id: "e0000000-0000-0000-0000-000000000012",
    itemId: "d0000000-0000-0000-0000-000000000012", // Xiphos
    spellId: "b0000000-0000-0000-0000-000000000012", // Jade Tempest
  },
  {
    id: "e0000000-0000-0000-0000-000000000013",
    itemId: "d0000000-0000-0000-0000-000000000013", // Amber Amulet
    spellId: "b0000000-0000-0000-0000-000000000013", // Kindled Ward
  },
  {
    id: "e0000000-0000-0000-0000-000000000014",
    itemId: "d0000000-0000-0000-0000-000000000014", // Luminous Cape
    spellId: "b0000000-0000-0000-0000-000000000014", // Lunar Spear
  },
  {
    id: "e0000000-0000-0000-0000-000000000015",
    itemId: "d0000000-0000-0000-0000-000000000015", // Moonsteel Helm
    spellId: "b0000000-0000-0000-0000-000000000015", // Mirror Veil
  },
  {
    id: "e0000000-0000-0000-0000-000000000016",
    itemId: "d0000000-0000-0000-0000-000000000016", // Nightglass Orb
    spellId: "b0000000-0000-0000-0000-000000000016", // Nether Bloom
  },
  {
    id: "e0000000-0000-0000-0000-000000000017",
    itemId: "d0000000-0000-0000-0000-000000000017", // Onyx Pike
    spellId: "b0000000-0000-0000-0000-000000000017", // Obsidian Lance
  },
  {
    id: "e0000000-0000-0000-0000-000000000018",
    itemId: "d0000000-0000-0000-0000-000000000018", // Phoenix Mail
    spellId: "b0000000-0000-0000-0000-000000000018", // Prism Surge
  },
  {
    id: "e0000000-0000-0000-0000-000000000019",
    itemId: "d0000000-0000-0000-0000-000000000019", // Quillblade
    spellId: "b0000000-0000-0000-0000-000000000019", // Quicksilver Aura
  },
  {
    id: "e0000000-0000-0000-0000-000000000020",
    itemId: "d0000000-0000-0000-0000-000000000020", // Yew Longbow
    spellId: "b0000000-0000-0000-0000-000000000020", // Rune Cascade
  },
];
