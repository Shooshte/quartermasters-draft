Feature: Item effect resolution
  Reusable effects are activated by items and resolved in their saved sequence.

  Scenario: An item applies its ordered effects to one unit-selected target set
    Given "Warrior" has an item "Fire Sword" costing 10 mana with effects "Flame Strike" then "Burn"
    And "Warrior" targets enemies using "highest_health"
    When "Warrior" acts
    Then "Warrior" activates item "Fire Sword"
    And "Warrior" mana is reduced by 10
    And the effects apply in the listed order

  Scenario: Repeated links apply a reusable effect repeatedly
    Given "Warrior" has an item "Echo Blade" with effects "Flame Strike" then "Flame Strike"
    And "Warrior" targets enemies using "highest_health"
    When "Warrior" acts
    Then "Flame Strike" applies twice in order

  Scenario: A stat-only item does not activate
    Given "Warrior" has a stat-only item "Steel Gauntlet"
    When "Warrior" acts
    Then "Warrior" does not activate item "Steel Gauntlet"

  Scenario: Item target side does not come from an effect category
    Given "Warrior" targets allies using "highest_health"
    And "Warrior" has an item "Fire Sword" with damage effect "Flame Strike"
    When "Warrior" acts
    Then "Flame Strike" applies to an ally

  Scenario: A healing effect can apply to an enemy
    Given "Warrior" targets enemies using "lowest_health"
    And "Warrior" has an item "Mercy Staff" with healing effect "Restoration"
    When "Warrior" acts
    Then "Restoration" applies to an enemy

  Scenario: An interval effect retains its item and effect attribution
    Given "Warrior" activates item "Venom Blade" with interval effect "Poison"
    When "Poison" triggers later
    Then the outcome identifies item "Venom Blade" and effect "Poison"
