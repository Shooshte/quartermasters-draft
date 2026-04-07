Feature: Battle log output
  The engine produces a complete chronological log of all events as part of
  the BattleResult. Each log entry is a structured object with event-specific
  fields and a human-readable "message" string. The engine is fully
  deterministic: the same inputs and seed produce identical logs.

  Background:
    Given two opposing scenarios with seed 42
    And scenario "alpha" has the following units:
      | id       | row    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | alpha-1  | tank   | 200    | 30       | 0         | 10    | 0         | 0        | 0     | 0              |
      | alpha-2  | ranged | 100    | 0        | 25        | 15    | 5         | 40       | 0     | 0              |
    And scenario "bravo" has the following units:
      | id       | row    | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | bravo-1  | melee  | 150    | 20       | 0         | 12    | 0         | 0        | 0     | 0              |
      | bravo-2  | support| 80     | 0        | 10        | 8     | 10        | 50       | 0     | 0              |

  Scenario: Battle result contains a log array
    When the battle is resolved
    Then the result should contain a "log" property that is an array

  Scenario: Log has at least one entry for a battle with actions
    When the battle is resolved
    Then the log should contain at least 1 entry

  Scenario: Basic attack is logged with attacker, target, damage, and tick
    When the battle is resolved
    Then the log should contain an entry whose "message" matches "Tick <tick>: <attacker> attacks <target> for <damage> damage"
    And the basic attack entry should include:
      | field    | present |
      | tick     | yes     |
      | attacker | yes     |
      | target   | yes     |
      | damage   | yes     |
      | message  | yes     |

  Scenario: Spell cast is logged with caster, spell name, targets, and effects
    Given scenario "bravo" unit "bravo-2" has spell "Fireball" that deals damage and applies "Burning" for 3 ticks
    When the battle is resolved
    Then the log should contain an entry whose "message" matches "Tick <tick>: <caster> casts <spell> on <targets>"
    And the spell log entry should include:
      | field   | present |
      | tick    | yes     |
      | caster  | yes     |
      | spell   | yes     |
      | targets | yes     |
      | effects | yes     |
      | message | yes     |

  Scenario: Unit death is logged
    Given scenario "bravo" unit "bravo-2" has 1 health
    When the battle is resolved
    Then the log should contain an entry whose "message" matches "Tick <tick>: <unit> dies"
    And the death entry should reference unit "bravo-2"
    And the death entry should include the tick number

  Scenario: Buff application and expiration are logged
    Given scenario "bravo" unit "bravo-2" has spell "Shield" that applies buff "Fortified" modifying "health" for 3 ticks
    When the battle is resolved
    Then the log should contain an entry whose "message" matches "Tick <tick>: <target> gains <effect> (<stat> modified)"
    And the buff application entry should include:
      | field  | present |
      | tick   | yes     |
      | target | yes     |
      | effect | yes     |
      | stat   | yes     |
      | message | yes     |
    And the log should contain a later entry whose "message" matches "Tick <tick>: <effect> expires on <target>"
    And the buff expiration entry should include:
      | field  | present |
      | tick   | yes     |
      | target | yes     |
      | effect | yes     |
      | message | yes     |

  Scenario: Battle outcome is the final log entry
    When the battle is resolved
    Then the last log entry should declare a winner or a draw
    And the last log entry "message" should match "Battle ends: <outcome>"
    And no log entries should follow the outcome entry

  Scenario: All log entries are in chronological tick order
    When the battle is resolved
    Then each log entry should reference a tick number
    And the tick numbers should be in non-decreasing order

  Scenario: Same inputs and seed produce identical log output (deterministic replay)
    When the battle is resolved as "run1"
    And the battle is resolved again with the same inputs and seed as "run2"
    Then "run1" log should be identical to "run2" log
    And every entry at each index should match exactly
