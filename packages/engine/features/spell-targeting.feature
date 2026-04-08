Feature: Spell target selection
  As the battle engine
  I want to select targets for spells and basic attacks according to policies and constraints
  So that each ability hits the correct units based on targeting rules

  # Row types ordered front-to-back: tank, melee, ranged, support
  # When targetRowCount < 4, targeting starts from the frontmost occupied row and moves backward.
  # Healing effects target allies (same army); damage effects target enemies.

  Background:
    Given two opposing armies "Alpha" and "Bravo"
    And army "Alpha" has the following formation:
      | row    | slot | name   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank   | 1    | Knight |    120 |       25 |         0 |     3 |         1 |        0 |     5 |             10 |
      | melee  | 1    | Cleric |     80 |        5 |         0 |     2 |         8 |       15 |     3 |              5 |
      | ranged | 1    | Archer |     70 |        5 |        30 |     4 |         2 |        0 |    10 |             15 |
      | ranged | 2    | Mage   |     60 |        0 |         0 |     2 |        10 |       40 |     8 |             12 |
    And army "Bravo" has the following formation:
      | row     | slot | name     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank    | 1    | Warrior  |    150 |       30 |         0 |     3 |         0 |        0 |     4 |              8 |
      | tank    | 2    | Paladin  |    130 |       20 |         0 |     2 |         5 |       10 |     6 |              7 |
      | ranged  | 1    | Ranger   |     75 |        8 |        28 |     5 |         3 |        0 |    12 |             18 |
      | support | 1    | Sorcerer |     55 |        0 |         0 |     2 |        12 |       45 |     7 |             10 |

  # ---------------------------------------------------------------------------
  # Target policy: highest_health
  # ---------------------------------------------------------------------------
  Scenario: highest_health targets the enemy with the most current HP
    Given a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name    |
      | Warrior |
    # Warrior has 150 HP (highest among Bravo units)

  # ---------------------------------------------------------------------------
  # Target policy: lowest_health
  # ---------------------------------------------------------------------------
  Scenario: lowest_health targets the enemy with the least current HP
    Given a spell with targetPolicy "lowest_health" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name     |
      | Sorcerer |
    # Sorcerer has 55 HP (lowest among Bravo units)

  # ---------------------------------------------------------------------------
  # Target policy: highest_damage
  # ---------------------------------------------------------------------------
  Scenario: highest_damage targets the enemy with the highest combined damage
    Given a spell with targetPolicy "highest_damage" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name     |
      | Sorcerer |
    # Sorcerer: 0 + 0 + 45 = 45 total damage (highest)
    # Ranger:   8 + 28 + 0 = 36
    # Warrior: 30 +  0 + 0 = 30
    # Paladin: 20 +  0 + 10 = 30

  # ---------------------------------------------------------------------------
  # Target policy: random (deterministic with same seed)
  # ---------------------------------------------------------------------------
  Scenario: random targeting is deterministic with the same seed
    Given a spell with targetPolicy "random" and targetRowCount 1 and maxTargetsPerRow 1
    And the battle uses seed 42
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be the same on every run with seed 42

  Scenario: random targeting is reproducible for each seed
    Given a spell with targetPolicy "random" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo" with seed 42 as "run42a"
    And army "Alpha" unit "Knight" casts the spell against army "Bravo" with seed 42 as "run42b"
    And army "Alpha" unit "Knight" casts the spell against army "Bravo" with seed 99 as "run99a"
    And army "Alpha" unit "Knight" casts the spell against army "Bravo" with seed 99 as "run99b"
    Then "run42a" target selection should be identical to "run42b"
    And "run99a" target selection should be identical to "run99b"

  # ---------------------------------------------------------------------------
  # Basic attack uses unit targeting policy
  # ---------------------------------------------------------------------------
  Scenario: Basic attack uses the unit's targeting policy
    Given army "Alpha" unit "Archer" has targetPolicy "lowest_health"
    When army "Alpha" unit "Archer" performs a basic attack against army "Bravo"
    Then the selected targets should be:
      | name     |
      | Sorcerer |
    # Sorcerer has 55 HP (lowest)

  # ---------------------------------------------------------------------------
  # Per-unit override replaces spell default
  # ---------------------------------------------------------------------------
  Scenario: Per-unit targeting override replaces the spell's default targetPolicy
    Given a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow 1
    And army "Alpha" unit "Knight" has targetPolicy override "lowest_health"
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name     |
      | Sorcerer |
    # Override lowest_health selects Sorcerer (55 HP) instead of Warrior (150 HP)

  # ---------------------------------------------------------------------------
  # targetRowCount: 1 row — selects the frontmost occupied row
  # ---------------------------------------------------------------------------
  Scenario: targetRowCount 1 hits only the frontmost occupied enemy row
    Given a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should all belong to the "tank" row
    And the selected targets should be:
      | name    | row  |
      | Warrior | tank |
      | Paladin | tank |
    # Bravo's frontmost occupied row is "tank"

  # ---------------------------------------------------------------------------
  # targetRowCount: 4 rows (all)
  # ---------------------------------------------------------------------------
  Scenario: targetRowCount 4 hits all occupied enemy rows
    Given a spell with targetPolicy "highest_health" and targetRowCount 4 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should span all occupied enemy rows
    And the selected targets should be:
      | name     | row     |
      | Warrior  | tank    |
      | Paladin  | tank    |
      | Ranger   | ranged  |
      | Sorcerer | support |

  # ---------------------------------------------------------------------------
  # Spell targets more rows than occupied
  # ---------------------------------------------------------------------------
  Scenario: Spell targeting more rows than occupied hits only occupied rows
    Given army "Bravo" has units only in the "tank" row:
      | slot | name    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | 1    | Warrior |    150 |       30 |         0 |     3 |         0 |        0 |     4 |              8 |
    And a spell with targetPolicy "highest_health" and targetRowCount 3 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name    | row  |
      | Warrior | tank |

  # ---------------------------------------------------------------------------
  # targetRowCount row selection order: front to back
  # ---------------------------------------------------------------------------
  Scenario: targetRowCount selects rows front-to-back starting from tank
    Given army "Bravo" has the following formation:
      | row     | slot | name     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank    | 1    | Warrior  |    150 |       30 |         0 |     3 |         0 |        0 |     4 |              8 |
      | melee   | 1    | Brawler  |    100 |       25 |         0 |     3 |         0 |        0 |     2 |              5 |
      | ranged  | 1    | Ranger   |     75 |        8 |        28 |     5 |         3 |        0 |    12 |             18 |
      | support | 1    | Sorcerer |     55 |        0 |         0 |     2 |        12 |       45 |     7 |             10 |
    And a spell with targetPolicy "highest_health" and targetRowCount 2 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be from the 2 frontmost rows:
      | name    | row   |
      | Warrior | tank  |
      | Brawler | melee |

  # ---------------------------------------------------------------------------
  # maxTargetsPerRow: 1
  # ---------------------------------------------------------------------------
  Scenario: maxTargetsPerRow 1 hits only one unit per row
    Given a spell with targetPolicy "highest_health" and targetRowCount 2 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name    | row     |
      | Warrior | tank    |
      | Ranger  | ranged  |
    # highest_health picks Warrior (150 HP) from tank row, Ranger (75 HP) from ranged row
    # Bravo's frontmost 2 occupied rows: tank and ranged (melee is empty)

  # ---------------------------------------------------------------------------
  # maxTargetsPerRow: null (all)
  # ---------------------------------------------------------------------------
  Scenario: maxTargetsPerRow null hits all units in the row
    Given a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name    | row  |
      | Warrior | tank |
      | Paladin | tank |

  # ---------------------------------------------------------------------------
  # targetOnlyAdjacent: contiguous selection
  # ---------------------------------------------------------------------------
  Scenario: targetOnlyAdjacent selects contiguous targets around the primary target
    Given army "Bravo" has the following units in the "tank" row:
      | slot | name   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | 1    | Guard  |    100 |       20 |         0 |     3 |         0 |        0 |     5 |             10 |
      | 2    | Tank   |    140 |       15 |         0 |     2 |         0 |        0 |     4 |              6 |
      | 3    | Brute  |     90 |       35 |         0 |     4 |         0 |        0 |     3 |              9 |
      | 4    | Shield |    110 |       10 |         0 |     2 |         1 |        0 |     6 |              5 |
    And a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow 3 and targetOnlyAdjacent true
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the primary target should be "Tank" with the highest health in the "tank" row
    And the selected targets should be contiguous by slot:
      | name  | slot |
      | Guard |    1 |
      | Tank  |    2 |
      | Brute |    3 |

  # ---------------------------------------------------------------------------
  # Dead units excluded
  # ---------------------------------------------------------------------------
  Scenario: Dead units are not eligible targets
    Given army "Bravo" unit "Warrior" has 0 health and is dead
    And a spell with targetPolicy "highest_health" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be:
      | name    |
      | Paladin |
    And "Warrior" should not appear in the selected targets

  # ---------------------------------------------------------------------------
  # Empty row skipped
  # ---------------------------------------------------------------------------
  Scenario: Empty enemy row is skipped when selecting target rows
    Given army "Bravo" "melee" row has no living units
    And a spell with targetPolicy "highest_health" and targetRowCount 2 and maxTargetsPerRow null
    When army "Alpha" unit "Knight" casts the spell against army "Bravo"
    Then the selected targets should be from the 2 frontmost occupied rows:
      | name     | row     |
      | Warrior  | tank    |
      | Paladin  | tank    |
      | Ranger   | ranged  |
    # tank is the frontmost, then ranged (melee is skipped because empty)

  # ---------------------------------------------------------------------------
  # Healing targets allies
  # ---------------------------------------------------------------------------
  Scenario: Healing effect targets allies instead of enemies
    Given army "Alpha" unit "Cleric" has current health 60 out of max health 80
    And army "Alpha" unit "Knight" has current health 100 out of max health 120
    And a healing spell with targetPolicy "lowest_health" and targetRowCount 1 and maxTargetsPerRow 1
    When army "Alpha" unit "Cleric" casts the healing spell
    Then the selected targets should be allies from army "Alpha":
      | name   |
      | Cleric |
    # Cleric (60 HP) is the lowest-health ally
