import type { scenariosRows } from "../schema";

export const scenariosRowsSeedData: (typeof scenariosRows.$inferInsert)[] = [
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
    id: "a3000000-0000-0000-0000-000000000002",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000001",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "tank" as const,
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
  {
    id: "a3000000-0000-0000-0000-000000000006",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000005",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "tank" as const,
  },
  // Bridge Defense
  {
    id: "a3000000-0000-0000-0000-000000000009",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000010",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000011",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000012",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "tank" as const,
  },
  // Dragon's Lair
  {
    id: "a3000000-0000-0000-0000-000000000013",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000014",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000015",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000016",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "tank" as const,
  },
  // Eclipse Ritual
  {
    id: "a3000000-0000-0000-0000-000000000017",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000018",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000019",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000020",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "tank" as const,
  },
  // Forest Ambush
  {
    id: "a3000000-0000-0000-0000-000000000021",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000022",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000023",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000024",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "tank" as const,
  },
  // Goblin Raid
  {
    id: "a3000000-0000-0000-0000-000000000025",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000026",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000027",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000028",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "tank" as const,
  },
  // Harbor Assault
  {
    id: "a3000000-0000-0000-0000-000000000029",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000030",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000031",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000032",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "tank" as const,
  },
  // Ice Cavern
  {
    id: "a3000000-0000-0000-0000-000000000033",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000034",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000035",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000036",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "tank" as const,
  },
  // Jungle Trek
  {
    id: "a3000000-0000-0000-0000-000000000037",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000038",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000039",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000040",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "tank" as const,
  },
  // Zombie Horde
  {
    id: "a3000000-0000-0000-0000-000000000041",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000042",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000043",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000044",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "tank" as const,
  },
  // Kraken Depths
  {
    id: "a3000000-0000-0000-0000-000000000045",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000046",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000047",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000048",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "tank" as const,
  },
  // Lunar Outpost
  {
    id: "a3000000-0000-0000-0000-000000000049",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000050",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000051",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000052",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "tank" as const,
  },
  // Molten Crossing
  {
    id: "a3000000-0000-0000-0000-000000000053",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000054",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000055",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000056",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "tank" as const,
  },
  // Nightfall Bastion
  {
    id: "a3000000-0000-0000-0000-000000000057",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000058",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000059",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000060",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "tank" as const,
  },
  // Obsidian Pass
  {
    id: "a3000000-0000-0000-0000-000000000061",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000062",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000063",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000064",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "tank" as const,
  },
  // Phantom Encampment
  {
    id: "a3000000-0000-0000-0000-000000000065",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000066",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000067",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000068",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "tank" as const,
  },
  // Runic Stronghold
  {
    id: "a3000000-0000-0000-0000-000000000069",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000070",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000071",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000072",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "tank" as const,
  },
  // Sunken Vault
  {
    id: "a3000000-0000-0000-0000-000000000073",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000074",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000075",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000076",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "tank" as const,
  },
  // Titan's Wake
  {
    id: "a3000000-0000-0000-0000-000000000077",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000078",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000079",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000080",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "tank" as const,
  },
  // Zorath Keep
  {
    id: "a3000000-0000-0000-0000-000000000081",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000082",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000083",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000084",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "tank" as const,
  },
];
