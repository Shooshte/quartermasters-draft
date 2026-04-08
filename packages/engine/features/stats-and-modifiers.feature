Feature: Stats and modifiers
  As a battle engine consumer
  I want critical chance, dodge, and item stat bonuses to apply deterministically
  So that outgoing and incoming damage is modified by flat percentage formulas

  Background:
    Given a unit "Attacker" with the following base stats:
      | health         | 100 |
      | meleeDmg       | 100 |
      | rangedDmg      | 0   |
      | speed          | 1   |
      | manaRegen      | 0   |
      | spellDmg       | 50  |
      | dodge          | 0   |
      | criticalChance | 0   |
    And a unit "Defender" with the following base stats:
      | health         | 200 |
      | meleeDmg       | 10  |
      | rangedDmg      | 0   |
      | speed          | 1   |
      | manaRegen      | 0   |
      | spellDmg       | 0   |
      | dodge          | 0   |
      | criticalChance | 0   |

  # ---------- Critical chance ----------

  Scenario: Critical chance adds percentage bonus to basic attack damage
    Given "Attacker" has a criticalChance of 25
    When "Attacker" performs a basic melee attack against "Defender"
    Then the outgoing damage should be 125
    # Formula: 100 * (1 + 25/100) = 125

  Scenario: Critical chance adds percentage bonus to spell direct damage
    Given "Attacker" has a criticalChance of 40
    When "Attacker" casts a direct damage spell against "Defender"
    Then the outgoing spell damage should be 70
    # Formula: 50 * (1 + 40/100) = 70

  Scenario: Zero critical chance means no damage bonus
    Given "Attacker" has a criticalChance of 0
    When "Attacker" performs a basic melee attack against "Defender"
    Then the outgoing damage should be 100
    # Formula: 100 * (1 + 0/100) = 100

  # ---------- Dodge ----------

  Scenario: Dodge reduces incoming basic attack damage
    Given "Defender" has a dodge of 30
    When "Attacker" performs a basic melee attack against "Defender"
    Then the incoming damage to "Defender" should be 70
    # Formula: 100 * (1 - 30/100) = 70

  Scenario: Dodge reduces incoming spell direct damage
    Given "Defender" has a dodge of 20
    When "Attacker" casts a direct damage spell against "Defender"
    Then the incoming spell damage to "Defender" should be 40
    # Formula: 50 * (1 - 20/100) = 40

  Scenario: Zero dodge means no damage reduction
    Given "Defender" has a dodge of 0
    When "Attacker" performs a basic melee attack against "Defender"
    Then the incoming damage to "Defender" should be 100
    # Formula: 100 * (1 - 0/100) = 100

  # ---------- Critical + Dodge composition ----------

  Scenario: Critical and dodge compose multiplicatively on a basic attack
    Given "Attacker" has a criticalChance of 50
    And "Defender" has a dodge of 20
    When "Attacker" performs a basic melee attack against "Defender"
    Then the incoming damage to "Defender" should be 120
    # Formula: 100 * (1 + 50/100) * (1 - 20/100) = 100 * 1.5 * 0.8 = 120

  Scenario: Critical and dodge compose multiplicatively on spell direct damage
    Given "Attacker" has a criticalChance of 60
    And "Defender" has a dodge of 25
    When "Attacker" casts a direct damage spell against "Defender"
    Then the incoming spell damage to "Defender" should be 60
    # Formula: 50 * (1 + 60/100) * (1 - 25/100) = 50 * 1.6 * 0.75 = 60

  # ---------- Item stat bonuses ----------

  Scenario: Multiple items stack stat bonuses additively with unit base stats
    Given "Attacker" has the following base stats:
      | meleeDmg       | 10 |
      | criticalChance | 5  |
    And "Attacker" is equipped with item "War Sword" with the following stats:
      | meleeDmg       | 8 |
      | criticalChance | 3 |
    And "Attacker" is equipped with item "Signet Ring" with the following stats:
      | meleeDmg       | 3 |
      | criticalChance | 2 |
    Then the effective meleeDmg for "Attacker" should be 21
    And the effective criticalChance for "Attacker" should be 10
    # meleeDmg: 10 + 8 + 3 = 21
    # criticalChance: 5 + 3 + 2 = 10

  Scenario: Item stat bonuses feed into damage formulas
    Given "Attacker" has the following base stats:
      | meleeDmg       | 10 |
      | criticalChance | 0  |
    And "Attacker" is equipped with item "War Sword" with the following stats:
      | meleeDmg       | 5 |
      | criticalChance | 0 |
    And "Defender" has the following base stats:
      | dodge | 0 |
    When "Attacker" performs a basic melee attack against "Defender"
    Then the outgoing damage should be 15
    # Effective meleeDmg: 10 + 5 = 15; crit 0 => 15 * 1.0 = 15

  Scenario: Item dodge bonus stacks additively and applies to incoming damage
    Given "Defender" has the following base stats:
      | dodge | 10 |
    And "Defender" is equipped with item "Leather Vest" with the following stats:
      | dodge | 15 |
    And "Defender" is equipped with item "Nimble Boots" with the following stats:
      | dodge | 5  |
    When "Attacker" performs a basic melee attack against "Defender"
    Then the incoming damage to "Defender" should be 70
    # Effective dodge: 10 + 15 + 5 = 30; 100 * (1 - 30/100) = 70
