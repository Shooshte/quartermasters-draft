Feature: Mana regeneration and item activation spending
  Mana regenerates for living units and is spent once for every successful item activation.

  Background:
    Given the unit starts with 100 mana and 100 mana capacity
    And the unit has 5 mana regeneration

  Scenario: Mana regeneration is capped by capacity
    Given the unit has 90 mana
    When 2 ticks pass
    Then the unit has 100 mana

  Scenario: Dead units do not regenerate mana
    Given the unit is dead
    When 5 ticks pass
    Then the unit has 100 mana

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
