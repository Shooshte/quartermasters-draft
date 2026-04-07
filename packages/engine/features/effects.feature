Feature: Spell effect system
  Spells apply effects that can be instant or interval-based.
  Effects can deal damage, heal, buff, or debuff targets.
  Multi-effect spells apply effects in sequenceOrder.

  All timing values in this feature are measured in battle ticks.

  Effect types:
    directMeleeDmg   — instant melee damage
    directRangedDmg  — instant ranged damage
    directSpellDmg   — instant spell damage
    directHealing    — instant healing
    buff             — temporarily increase a stat for durationTicks ticks
    debuff           — temporarily decrease a stat for durationTicks ticks

  Interval effects trigger triggerCount times, once every intervalTicks ticks.

  Background:
    Given two armies "alpha" and "bravo"
    And "alpha" has a unit "mage" with the following stats:
      | stat          | value |
      | health        | 200   |
      | meleeDmg      | 10    |
      | rangedDmg     | 15    |
      | spellDmg      | 40    |
      | speed         | 5     |
      | dodge         | 10    |
      | criticalChance| 5     |
      | manaRegen     | 3     |
    And "bravo" has a unit "warrior" with the following stats:
      | stat          | value |
      | health        | 300   |
      | meleeDmg      | 30    |
      | rangedDmg     | 10    |
      | spellDmg      | 5     |
      | speed         | 4     |
      | dodge         | 5     |
      | criticalChance| 8     |
      | manaRegen     | 1     |
    And "alpha" has a unit "cleric" with the following stats:
      | stat          | value |
      | health        | 150   |
      | meleeDmg      | 5     |
      | rangedDmg     | 5     |
      | spellDmg      | 20    |
      | speed         | 3     |
      | dodge         | 8     |
      | criticalChance| 2     |
      | manaRegen     | 5     |

  # --- Instant effects ---

  Scenario: Instant direct spell damage reduces target health immediately
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value |
      | 1             | directSpellDmg | 50    |
    When "mage" casts the spell on enemy "warrior"
    Then "warrior" health should be 250

  Scenario: Instant direct healing restores target health immediately
    Given "mage" has current health 120
    And a spell with the following effects:
      | sequenceOrder | effectType    | value |
      | 1             | directHealing | 60    |
    When "cleric" casts the spell on ally "mage"
    Then "mage" health should be 180

  Scenario: Healing does not exceed maximum health
    Given "mage" has current health 190
    And a spell with the following effects:
      | sequenceOrder | effectType    | value |
      | 1             | directHealing | 30    |
    When "cleric" casts the spell on ally "mage"
    Then "mage" health should be 200

  Scenario: Instant directMeleeDmg applies as melee damage
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value |
      | 1             | directMeleeDmg | 25    |
    When "warrior" casts the spell on enemy "mage"
    Then "mage" health should be 175

  Scenario: Instant directRangedDmg applies as ranged damage
    Given a spell with the following effects:
      | sequenceOrder | effectType      | value |
      | 1             | directRangedDmg | 35    |
    When "mage" casts the spell on enemy "warrior"
    Then "warrior" health should be 265

  # --- Interval effects ---

  Scenario: Interval damage effect triggers the correct number of times
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value | intervalTicks | triggerCount |
      | 1             | directSpellDmg | 20    | 1000          | 3            |
    When "mage" casts the spell on enemy "warrior"
    And 3000 ticks elapse
    Then "warrior" should have received 3 damage ticks of 20 each
    And "warrior" health should be 240

  Scenario: Interval effect triggers at correct tick intervals
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value | intervalTicks | triggerCount |
      | 1             | directSpellDmg | 10    | 500           | 4            |
    When "mage" casts the spell on enemy "warrior"
    And 500 ticks elapse
    Then "warrior" health should be 290
    When 500 ticks elapse
    Then "warrior" health should be 280
    When 500 ticks elapse
    Then "warrior" health should be 270
    When 500 ticks elapse
    Then "warrior" health should be 260

  Scenario: Interval effect stops after exhausting trigger count
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value | intervalTicks | triggerCount |
      | 1             | directSpellDmg | 15    | 1000          | 2            |
    When "mage" casts the spell on enemy "warrior"
    And 2000 ticks elapse
    Then "warrior" health should be 270
    When 1000 ticks elapse
    Then "warrior" health should be 270

  # --- Buff effects ---

  Scenario: Buff increases target stat for specified duration
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | buff       | speed  | 3     | 2000          |
    When "cleric" casts the spell on ally "mage"
    Then "mage" speed should be 8

  Scenario: Buff expires and stat returns to base value
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | buff       | speed  | 3     | 2000          |
    When "cleric" casts the spell on ally "mage"
    Then "mage" speed should be 8
    When 2000 ticks elapse
    Then "mage" speed should be 5

  Scenario Outline: Buff applies to each supported stat modifier
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | buff       | <stat> | 10    | 3000          |
    When "cleric" casts the spell on ally "mage"
    Then "mage" <stat> should be <buffed_value>
    When 3000 ticks elapse
    Then "mage" <stat> should be <base_value>

    Examples:
      | stat          | base_value | buffed_value |
      | meleeDmg      | 10         | 20           |
      | rangedDmg     | 15         | 25           |
      | spellDmg      | 40         | 50           |
      | speed         | 5          | 15           |
      | dodge         | 10         | 20           |
      | criticalChance| 5          | 15           |
      | manaRegen     | 3          | 13           |

  # --- Debuff effects ---

  Scenario: Debuff decreases target stat for specified duration
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | debuff     | speed  | 2     | 3000          |
    When "mage" casts the spell on enemy "warrior"
    Then "warrior" speed should be 2

  Scenario: Debuff expires and stat returns to base value
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | debuff     | speed  | 2     | 3000          |
    When "mage" casts the spell on enemy "warrior"
    Then "warrior" speed should be 2
    When 3000 ticks elapse
    Then "warrior" speed should be 4

  Scenario Outline: Debuff applies to each supported stat modifier
    Given a spell with the following effects:
      | sequenceOrder | effectType | stat   | value | durationTicks |
      | 1             | debuff     | <stat> | 5     | 2000          |
    When "mage" casts the spell on enemy "warrior"
    Then "warrior" <stat> should be <debuffed_value>
    When 2000 ticks elapse
    Then "warrior" <stat> should be <base_value>

    Examples:
      | stat          | base_value | debuffed_value |
      | meleeDmg      | 30         | 25             |
      | rangedDmg     | 10         | 5              |
      | spellDmg      | 5          | 0              |
      | speed         | 4          | 0              |
      | dodge         | 5          | 0              |
      | criticalChance| 8          | 3              |
      | manaRegen     | 1          | 0              |

  # --- Multi-effect spells ---

  Scenario: Multi-effect spell applies effects in sequence order
    Given a spell with the following effects:
      | sequenceOrder | effectType     | value |
      | 1             | directSpellDmg | 30    |
      | 2             | directSpellDmg | 20    |
      | 3             | directSpellDmg | 10    |
    When "mage" casts the spell on enemy "warrior"
    Then the effects should apply in order 1, 2, 3
    And "warrior" health should be 240

  Scenario: Killing target mid-sequence stops remaining effects on dead target
    Given "warrior" has current health 40
    And a spell with the following effects:
      | sequenceOrder | effectType     | value |
      | 1             | directSpellDmg | 30    |
      | 2             | directSpellDmg | 25    |
      | 3             | directSpellDmg | 20    |
    When "mage" casts the spell on enemy "warrior"
    Then effect 1 should apply and deal 30 damage
    And effect 2 should apply and deal 25 damage
    And "warrior" health should be 0
    And "warrior" should be dead
    And effect 3 should be skipped
