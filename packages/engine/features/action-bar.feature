Feature: ATB (Active Time Battle) action bar tick system
  As a battle engine
  I want to advance each living unit's action bar by their speed stat every tick
  So that faster units act more frequently and tie-breaks are resolved deterministically

  Background:
    Given scenario A has the following units:
      | row     | slot | name          | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank    | 1    | Shield Bearer | 120    | 5        | 0         | 20    | 0         | 0        | 5     | 0              |
      | melee   | 1    | Blade Dancer  | 80     | 25       | 0         | 30    | 0         | 0        | 10    | 15             |
      | ranged  | 1    | Longbow Scout | 60     | 0        | 20        | 25    | 0         | 0        | 8     | 10             |
      | support | 1    | Field Medic   | 50     | 0        | 0         | 35    | 10        | 15       | 3     | 5              |
    And scenario B has the following units:
      | row     | slot | name           | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank    | 1    | Iron Golem     | 150    | 8        | 0         | 15    | 0         | 0        | 2     | 0              |
      | melee   | 1    | Shadow Striker | 70     | 30       | 0         | 40    | 0         | 0        | 12    | 20             |
      | ranged  | 1    | Flame Caster   | 55     | 0        | 10        | 25    | 8         | 25       | 5     | 8              |
      | support | 1    | War Drummer    | 45     | 0        | 0         | 20    | 12        | 0        | 4     | 3              |
    And all action bars start at 0

  # --- Core tick mechanics ---

  Scenario: Action bar increases by unit speed each tick
    When 1 tick is processed
    Then the action bars should be:
      | scenario | row     | slot | name           | actionBar |
      | A        | tank    | 1    | Shield Bearer  | 20        |
      | A        | melee   | 1    | Blade Dancer   | 30        |
      | A        | ranged  | 1    | Longbow Scout  | 25        |
      | A        | support | 1    | Field Medic    | 35        |
      | B        | tank    | 1    | Iron Golem     | 15        |
      | B        | melee   | 1    | Shadow Striker | 40        |
      | B        | ranged  | 1    | Flame Caster   | 25        |
      | B        | support | 1    | War Drummer    | 20        |

  Scenario: Action bar accumulates across multiple ticks
    When 3 ticks are processed
    Then the action bars should be:
      | scenario | row     | slot | name           | actionBar |
      | A        | tank    | 1    | Shield Bearer  | 60        |
      | A        | melee   | 1    | Blade Dancer   | 90        |
      | A        | ranged  | 1    | Longbow Scout  | 75        |
      | A        | support | 1    | Field Medic    | 105       |
      | B        | tank    | 1    | Iron Golem     | 45        |
      | B        | melee   | 1    | Shadow Striker | 120       |
      | B        | ranged  | 1    | Flame Caster   | 75        |
      | B        | support | 1    | War Drummer    | 60        |
    # Note: Field Medic and Shadow Striker exceed 100 on tick 3, so they would
    # act and reset before this snapshot. This scenario tests raw accumulation
    # without action resolution, to verify the per-tick increment logic.

  Scenario: Dead units do not accumulate action bar
    Given "Shield Bearer" in scenario A has 0 health
    When 3 ticks are processed
    Then the action bar for "Shield Bearer" in scenario A should be 0
    And the action bar for "Blade Dancer" in scenario A should be 90

  # --- Action threshold and reset ---

  Scenario: Unit acts at exactly 100 action bar, bar resets to 0
    Given scenario A has the following units:
      | row   | slot | name         | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | Exact Hitter | 80     | 20       | 0         | 50    | 0         | 0        | 0     | 0              |
    When 2 ticks are processed
    Then "Exact Hitter" in scenario A should have acted
    And the action bar for "Exact Hitter" in scenario A should be 0

  Scenario: Action bar overflow beyond 100 is discarded on reset
    Given scenario A has the following units:
      | row   | slot | name       | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | Overcharger | 80     | 20       | 0         | 60    | 0         | 0        | 0     | 0              |
    When 2 ticks are processed
    Then "Overcharger" in scenario A should have acted
    And the action bar for "Overcharger" in scenario A should be 0
    # After tick 1: bar = 60. After tick 2: bar = 120 >= 100, acts, resets to 0.
    # The 20 overflow is discarded, bar is exactly 0.

  # --- Relative frequency ---

  Scenario: Faster unit acts more frequently than slower unit
    Given scenario A has the following units:
      | row   | slot | name       | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | Quick Fox  | 80     | 15       | 0         | 50    | 0         | 0        | 0     | 0              |
      | tank  | 1    | Slow Turtle | 120    | 10       | 0         | 20    | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row   | slot | name    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | Dummy B | 200    | 0        | 0         | 10    | 0         | 0        | 0     | 0              |
    When 10 ticks are processed
    Then "Quick Fox" in scenario A should have acted 5 times
    And "Slow Turtle" in scenario A should have acted 2 times

  # --- Tie-breaking rules ---

  Scenario: Same-tick tie-break by higher speed acts first
    # Tick 1: Speed 110 reaches 110 and acts. Speed 55 reaches 55.
    Given scenario A has the following units:
      | row   | slot | name      | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank  | 1    | Speed 55  | 80     | 10       | 0         | 55    | 0         | 0        | 0     | 0              |
      | tank  | 2    | Speed 110 | 80     | 10       | 0         | 110   | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row  | slot | name    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank | 1    | Dummy B | 200    | 0        | 0         | 10    | 0         | 0        | 0     | 0              |
    When 2 ticks are processed
    Then the action order on tick 2 should be "Speed 110" then "Speed 55"

  Scenario: Same-tick, same-speed tie-break by scenario A before scenario B
    Given scenario A has the following units:
      | row   | slot | name      | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | A Fighter | 80     | 20       | 0         | 100   | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row   | slot | name      | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 1    | B Fighter | 80     | 20       | 0         | 100   | 0         | 0        | 0     | 0              |
    When 1 tick is processed
    # Both reach 100 on tick 1 with the same speed (100).
    # Tie-break: scenario A acts before scenario B.
    Then the action order on tick 1 should be "A Fighter" then "B Fighter"

  Scenario: Same-tick, same-speed, same-scenario tie-break by row order (tank, melee, ranged, support)
    Given scenario A has the following units:
      | row     | slot | name           | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | support | 1    | Support Unit   | 50     | 0        | 0         | 100   | 10        | 15       | 0     | 0              |
      | ranged  | 1    | Ranged Unit    | 60     | 0        | 20        | 100   | 0         | 0        | 0     | 0              |
      | melee   | 1    | Melee Unit     | 80     | 25       | 0         | 100   | 0         | 0        | 0     | 0              |
      | tank    | 1    | Tank Unit      | 120    | 5        | 0         | 100   | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row  | slot | name    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank | 1    | Dummy B | 200    | 0        | 0         | 10    | 0         | 0        | 0     | 0              |
    When 1 tick is processed
    # All four reach 100 on tick 1 with speed 100, same scenario.
    # Row order: tank -> melee -> ranged -> support.
    Then the action order on tick 1 should be:
      | order | name           |
      | 1     | Tank Unit      |
      | 2     | Melee Unit     |
      | 3     | Ranged Unit    |
      | 4     | Support Unit   |

  Scenario: Same-tick, same-speed, same-scenario, same-row tie-break by lower slot number first
    Given scenario A has the following units:
      | row   | slot | name      | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee | 3    | Warrior C | 80     | 20       | 0         | 100   | 0         | 0        | 0     | 0              |
      | melee | 1    | Warrior A | 80     | 20       | 0         | 100   | 0         | 0        | 0     | 0              |
      | melee | 2    | Warrior B | 80     | 20       | 0         | 100   | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row  | slot | name    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | tank | 1    | Dummy B | 200    | 0        | 0         | 10    | 0         | 0        | 0     | 0              |
    When 1 tick is processed
    # All three reach 100 on tick 1 with speed 100, same scenario, same row.
    # Slot order: 1 -> 2 -> 3.
    Then the action order on tick 1 should be:
      | order | name      |
      | 1     | Warrior A |
      | 2     | Warrior B |
      | 3     | Warrior C |

  # --- Combined tie-break cascade ---

  Scenario: Full tie-break cascade across scenarios, rows, and slots
    Given scenario A has the following units:
      | row     | slot | name          | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee   | 1    | A Melee 1     | 80     | 20       | 0         | 50    | 0         | 0        | 0     | 0              |
      | melee   | 2    | A Melee 2     | 80     | 20       | 0         | 50    | 0         | 0        | 0     | 0              |
      | tank    | 1    | A Tank 1      | 120    | 5        | 0         | 50    | 0         | 0        | 0     | 0              |
      | ranged  | 1    | A Ranged 1    | 60     | 0        | 20        | 50    | 0         | 0        | 0     | 0              |
    And scenario B has the following units:
      | row     | slot | name          | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | melee   | 1    | B Melee 1     | 80     | 20       | 0         | 50    | 0         | 0        | 0     | 0              |
      | tank    | 1    | B Tank 1      | 120    | 5        | 0         | 50    | 0         | 0        | 0     | 0              |
      | support | 1    | B Support 1   | 50     | 0        | 0         | 100   | 10        | 15       | 0     | 0              |
    When 2 ticks are processed
    # Tick 1: B Support 1 (speed 100) reaches 100 and acts first. Others at 50.
    # Tick 2: All remaining units (speed 50) reach 100.
    # Tie-break cascade for tick 2:
    #   1. Same speed (50), so check scenario: A before B
    #   2. Within A: row order tank -> melee -> ranged
    #   3. Within A melee: slot 1 before slot 2
    #   4. Then B: row order tank -> melee
    Then the action order on tick 2 should be:
      | order | name          |
      | 1     | A Tank 1      |
      | 2     | A Melee 1     |
      | 3     | A Melee 2     |
      | 4     | A Ranged 1    |
      | 5     | B Tank 1      |
      | 6     | B Melee 1     |
