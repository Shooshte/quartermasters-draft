import type { spells, spellsAllowedRows, spellsEffects } from "../schema";

export const spellSeedData: (typeof spells.$inferInsert)[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "Fireball",
    description:
      "Hurls a ball of fire at the target, dealing instant arcane damage followed by burning.",
    targetPolicy: "highest_health" as const,
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Battle Cry",
    description: "A mighty roar that buffs the caster with increased melee damage.",
    targetPolicy: "random" as const,
    updatedAt: new Date("2025-02-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "Healing Touch",
    description: "Gently mends wounds, restoring health over time.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-03-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    name: "Arcane Shield",
    description: "Conjures a protective barrier of arcane energy around the caster.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000005",
    name: "Chain Lightning",
    description: "Unleashes a bolt of lightning that jumps between nearby enemies.",
    targetPolicy: "highest_damage" as const,
    maxTargetsPerRow: 3,
    targetOnlyAdjacent: true,
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000006",
    name: "Dark Pact",
    description: "Sacrifices health to deal devastating shadow damage to the target.",
    targetPolicy: "highest_health" as const,
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000007",
    name: "Earthquake",
    description: "Shakes the ground beneath all enemies, dealing area damage.",
    targetPolicy: "random" as const,
    targetRowCount: 2,
    maxTargetsPerRow: null,
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000008",
    name: "Frost Nova",
    description: "Releases a burst of frost that slows and damages nearby foes.",
    targetPolicy: "highest_damage" as const,
    maxTargetsPerRow: null,
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000009",
    name: "Guardian Spirit",
    description: "Summons a spirit to protect the weakest ally from fatal blows.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000010",
    name: "Holy Light",
    description: "Channels divine energy to restore a large amount of health.",
    targetPolicy: "lowest_health" as const,
    maxTargetsPerRow: 2,
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000011",
    name: "Ignite",
    description: "Sets the target ablaze, dealing fire damage over time.",
    targetPolicy: "highest_damage" as const,
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000012",
    name: "Jade Tempest",
    description: "Slices through the battlefield with a fast-moving storm of sharpened wind.",
    targetPolicy: "highest_damage" as const,
    updatedAt: new Date("2025-03-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000013",
    name: "Kindled Ward",
    description: "Wraps a weakened ally in embers that harden into a protective shell.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-04-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000014",
    name: "Lunar Spear",
    description: "Calls down a pale spear of moonlight to pierce the toughest foe.",
    targetPolicy: "highest_health" as const,
    updatedAt: new Date("2025-05-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000015",
    name: "Mirror Veil",
    description: "Creates flickering doubles around the caster to confuse enemy focus.",
    targetPolicy: "random" as const,
    updatedAt: new Date("2025-06-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000016",
    name: "Nether Bloom",
    description: "Detonates a shadowy blossom that erupts beneath the most dangerous foe.",
    targetPolicy: "highest_damage" as const,
    updatedAt: new Date("2025-07-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000017",
    name: "Obsidian Lance",
    description: "Launches a dark crystal shard to steady and protect an injured ally.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-08-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000018",
    name: "Prism Surge",
    description: "Refracts raw mana into a chaotic burst that picks a random opponent.",
    targetPolicy: "random" as const,
    updatedAt: new Date("2025-09-15T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000019",
    name: "Quicksilver Aura",
    description: "Bathes the healthiest enemy in unstable silver energy that soon erupts.",
    targetPolicy: "highest_health" as const,
    updatedAt: new Date("2025-03-20T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000020",
    name: "Rune Cascade",
    description: "Drops a chain of carved sigils that punish the fiercest attacker.",
    targetPolicy: "highest_damage" as const,
    updatedAt: new Date("2025-04-20T00:00:00Z"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000021",
    name: "Zenith Bloom",
    description: "Unfolds a radiant flower of mana to restore the ally in greatest danger.",
    targetPolicy: "lowest_health" as const,
    updatedAt: new Date("2025-05-20T00:00:00Z"),
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
  {
    id: "c0000000-0000-0000-0000-000000000006",
    spellId: "b0000000-0000-0000-0000-000000000004",
    effectTemplateId: "a0000000-0000-0000-0000-000000000009",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000007",
    spellId: "b0000000-0000-0000-0000-000000000005",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000008",
    spellId: "b0000000-0000-0000-0000-000000000006",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000009",
    spellId: "b0000000-0000-0000-0000-000000000007",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000010",
    spellId: "b0000000-0000-0000-0000-000000000008",
    effectTemplateId: "a0000000-0000-0000-0000-000000000008",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000011",
    spellId: "b0000000-0000-0000-0000-000000000009",
    effectTemplateId: "a0000000-0000-0000-0000-000000000017",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000012",
    spellId: "b0000000-0000-0000-0000-000000000010",
    effectTemplateId: "a0000000-0000-0000-0000-000000000015",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000013",
    spellId: "b0000000-0000-0000-0000-000000000011",
    effectTemplateId: "a0000000-0000-0000-0000-000000000016",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000014",
    spellId: "b0000000-0000-0000-0000-000000000012",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000015",
    spellId: "b0000000-0000-0000-0000-000000000013",
    effectTemplateId: "a0000000-0000-0000-0000-000000000013",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000016",
    spellId: "b0000000-0000-0000-0000-000000000014",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000017",
    spellId: "b0000000-0000-0000-0000-000000000015",
    effectTemplateId: "a0000000-0000-0000-0000-000000000009",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000018",
    spellId: "b0000000-0000-0000-0000-000000000016",
    effectTemplateId: "a0000000-0000-0000-0000-000000000014",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000019",
    spellId: "b0000000-0000-0000-0000-000000000017",
    effectTemplateId: "a0000000-0000-0000-0000-000000000015",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000020",
    spellId: "b0000000-0000-0000-0000-000000000018",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000021",
    spellId: "b0000000-0000-0000-0000-000000000019",
    effectTemplateId: "a0000000-0000-0000-0000-000000000016",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000022",
    spellId: "b0000000-0000-0000-0000-000000000020",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000023",
    spellId: "b0000000-0000-0000-0000-000000000021",
    effectTemplateId: "a0000000-0000-0000-0000-000000000019",
    sequenceOrder: 1,
  },
];

export const spellsAllowedRowsSeedData: (typeof spellsAllowedRows.$inferInsert)[] = [
  {
    id: "f0000000-0000-0000-0000-000000000001",
    spellId: "b0000000-0000-0000-0000-000000000005", // Chain Lightning
    rowType: "melee" as const,
  },
  {
    id: "f0000000-0000-0000-0000-000000000002",
    spellId: "b0000000-0000-0000-0000-000000000005", // Chain Lightning
    rowType: "tank" as const,
  },
  {
    id: "f0000000-0000-0000-0000-000000000003",
    spellId: "b0000000-0000-0000-0000-000000000008", // Frost Nova
    rowType: "ranged" as const,
  },
  {
    id: "f0000000-0000-0000-0000-000000000004",
    spellId: "b0000000-0000-0000-0000-000000000008", // Frost Nova
    rowType: "support" as const,
  },
];
