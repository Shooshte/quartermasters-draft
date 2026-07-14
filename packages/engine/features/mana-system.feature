Feature: Mana regeneration and spending
  Mana fuels item activations during battle. It regenerates continuously
  each tick for living units and is spent when items are cast.

  Rules:
    - All units start with mana equal to their effective mana stat
    - Each tick: every living unit's mana increases by their manaRegen stat
    - Mana cannot exceed the unit's effective mana stat
    - Item and effect mana modifiers change that capacity
    - Capacity changes preserve the unit's missing mana
    - Dead units do NOT regenerate mana
    - Items have activationManaCost and activationHealthCost
    - When a unit acts, it tries ALL items in priority order; each affordable
      item is cast and its costs deducted immediately
    - Mana is deducted as each item fires, so it affects affordability of
      later items in the same action
    - If an item requires both mana AND health, both must be affordable

  Background:
    Given the following unit stats:
      | stat           | value |
      | health         | 100   |
      | mana           | 100   |
      | meleeDmg       | 10    |
      | rangedDmg      | 10    |
      | speed          | 50    |
      | manaRegen      | 5     |
      | spellDmg       | 20    |
      | dodge          | 0     |
      | criticalChance | 0     |
    And the unit starts with 100 mana

  Scenario: A full unit does not regenerate past its capacity
    When 1 tick passes
    Then the unit should have 100 mana

  Scenario: Mana regeneration is capped after mana is spent
    Given the unit has 90 mana
    And the unit has the following stats:
      | stat      | value |
      | mana      | 100   |
      | manaRegen | 20    |
    When 1 tick passes
    Then the unit should have 100 mana

  Scenario: Unit with zero manaRegen never gains mana
    Given the unit has the following stats:
      | stat      | value |
      | manaRegen | 0     |
    When 10 ticks pass
    Then the unit should have 100 mana

  Scenario: Dead units do not regenerate mana
    Given the unit is dead
    When 5 ticks pass
    Then the unit should have 100 mana

  Scenario: Capacity buffs preserve missing mana
    Given the unit has 70 mana
    When a 50 mana capacity buff is applied
    Then the unit should have 120 mana out of 150
    When the mana capacity buff expires
    Then the unit should have 70 mana out of 100

  Scenario: Casting deducts mana when spell is cast
    Given the unit has 30 mana
    And the unit has the following items:
      | name      | priority | activationManaCost | activationHealthCost |
      | Fireball  | 1        | 20                 | 0                    |
    When the unit acts
    Then the unit should have 10 mana

  Scenario: Multiple items in one action deduct cumulative mana
    Given the unit has 50 mana
    And the unit has the following items:
      | name       | priority | activationManaCost | activationHealthCost |
      | Fireball   | 1        | 15                 | 0                    |
      | Ice Shard  | 2        | 10                 | 0                    |
    When the unit acts
    Then "Fireball" should be cast
    And "Ice Shard" should be cast
    And the unit should have 25 mana

  Scenario: Second item becomes unaffordable after first item drains mana
    Given the unit has 30 mana
    And the unit has the following items:
      | name       | priority | activationManaCost | activationHealthCost |
      | Fireball   | 1        | 25                 | 0                    |
      | Ice Shard  | 2        | 10                 | 0                    |
    When the unit acts
    Then "Fireball" should be cast
    And "Ice Shard" should not be cast
    And the unit should have 5 mana

  Scenario: Item requiring both mana and health cost — both are deducted
    Given the unit has 40 mana
    And the unit has the following stats:
      | stat   | value |
      | health | 80    |
    And the unit has the following items:
      | name       | priority | activationManaCost | activationHealthCost |
      | Blood Hex  | 1        | 20                 | 15                   |
    When the unit acts
    Then "Blood Hex" should be cast
    And the unit should have 20 mana
    And the unit should have 65 health

  Scenario: Item is unaffordable when mana is insufficient but health is sufficient
    Given the unit has 5 mana
    And the unit has the following stats:
      | stat   | value |
      | health | 100   |
    And the unit has the following items:
      | name       | priority | activationManaCost | activationHealthCost |
      | Blood Hex  | 1        | 20                 | 15                   |
    When the unit acts
    Then "Blood Hex" should not be cast
    And the unit should have 5 mana
    And the unit should have 100 health

  Scenario: Item is unaffordable when health is insufficient but mana is sufficient
    Given the unit has 50 mana
    And the unit has the following stats:
      | stat   | value |
      | health | 10    |
    And the unit has the following items:
      | name       | priority | activationManaCost | activationHealthCost |
      | Blood Hex  | 1        | 20                 | 15                   |
    When the unit acts
    Then "Blood Hex" should not be cast
    And the unit should have 50 mana
    And the unit should have 10 health
