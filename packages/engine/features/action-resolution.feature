Feature: Item activation action resolution
  Units try effect-bearing items by priority and fall back to a basic attack only
  if no item activation succeeds.

  Scenario: An affordable item pays once for its entire ordered effect sequence
    Given "Warrior" has an item "Fire Sword" costing 10 mana and 15 health with effects "Flame Strike" then "Burn"
    And "Warrior" targets enemies using "highest_health"
    When "Warrior" acts
    Then "Warrior" activates item "Fire Sword"
    And "Warrior" mana is reduced by 10
    And "Warrior" health is reduced by 15
    And "Flame Strike" then "Burn" apply in order
    And "Warrior" does not perform a basic attack

  Scenario: Later item affordability reflects earlier successful activations
    Given "Warrior" has item "Fire Sword" at priority 1 costing 30 mana with effect "Flame Strike"
    And "Warrior" has item "Ice Dagger" at priority 2 costing 25 mana with effect "Frost Bite"
    And "Warrior" has 50 mana
    When "Warrior" acts
    Then "Warrior" activates item "Fire Sword"
    And "Warrior" does not activate item "Ice Dagger"
    And "Warrior" mana is reduced by 30

  Scenario: A stat-only item is skipped and does not prevent a later activation
    Given "Warrior" has stat-only item "Steel Gauntlet" at priority 1
    And "Warrior" has item "Fire Sword" at priority 2 costing 10 mana with effect "Flame Strike"
    When "Warrior" acts
    Then "Warrior" does not activate item "Steel Gauntlet"
    And "Warrior" activates item "Fire Sword"

  Scenario: No successful activation falls back to a basic attack
    Given "Warrior" has only stat-only or unaffordable items
    When "Warrior" acts
    Then "Warrior" performs a basic attack

  Scenario: An item with no valid targets is skipped without paying its cost
    Given "Warrior" has item "Sniper Bow" costing 10 mana with effect "Aimed Shot"
    And "Warrior" has no valid targets under its unit targeting configuration
    When "Warrior" acts
    Then "Warrior" does not activate item "Sniper Bow"
    And "Warrior" mana is not reduced
    And "Warrior" performs a basic attack

  Scenario: Later effects retain original target IDs and apply only to surviving members
    Given "Warrior" has item "Finisher" with effects "Alpha Blast" then "Beta Follow-up"
    And "Warrior" originally selects "Guard" and "Knight"
    And "Alpha Blast" eliminates "Guard" but "Knight" survives
    When "Warrior" acts
    Then the activation retains the original target IDs for "Guard" and "Knight"
    And "Beta Follow-up" applies only to living original target "Knight"
    And "Beta Follow-up" does not retarget another unit

  Scenario: An effect sequence stops after its final original target dies
    Given "Warrior" has item "Finisher" with effects "Alpha Blast" then "Beta Follow-up"
    And "Alpha Blast" eliminates the only selected target
    When "Warrior" acts
    Then "Alpha Blast" applies
    And "Beta Follow-up" does not apply
