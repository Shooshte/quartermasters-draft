Feature: Mana regeneration and item activation spending
  Mana regenerates once for each surviving ready actor immediately before affordability checks.

  Background:
    Given the unit starts with 100 mana and 100 mana capacity
    And the unit has 5 mana regeneration

  Scenario: Mana regeneration is capped by capacity
    Given the unit has 90 mana
    When the unit is ready to act
    Then the unit has 100 mana before item affordability is checked

  Scenario: Every surviving actor in a ready cohort regenerates once
    Given two living units become ready in the same batch
    And both units have spent mana
    When the ready batch is resolved
    Then each ready unit regenerates mana exactly once
    And no non-ready unit regenerates mana

  Scenario: A ready unit killed by a pre-action effect does not regenerate
    Given the unit is ready
    And a due periodic effect kills the unit before actions are planned
    When the ready batch is resolved
    Then the dead unit does not regenerate mana
    And the dead unit does not act

  Scenario: Capacity changes preserve missing mana
    Given the unit has 70 mana
    When a 50 mana capacity effect is applied
    Then the unit has 120 mana out of 150
    When the mana capacity effect expires
    Then the unit has 70 mana out of 100

  Scenario: Activating an item deducts mana once even with multiple effects
    Given the unit has 30 mana
    And the unit has item "Fire Sword" costing 20 mana with effects "Flame Strike" then "Burn"
    And the unit has valid targets
    When the unit acts
    Then item "Fire Sword" activates
    And the unit has 10 mana
    And "Flame Strike" then "Burn" apply in order

  Scenario: An item is unaffordable when mana or health is insufficient
    Given the unit has 5 mana and 100 health
    And the unit has item "Blood Hex" costing 20 mana and 15 health with effect "Drain"
    When the unit acts
    Then item "Blood Hex" does not activate
    And the unit has 5 mana and 100 health
    Given the unit has 50 mana and 10 health
    When the unit acts
    Then item "Blood Hex" does not activate
    And the unit has 50 mana and 10 health
