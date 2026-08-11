Feature: Battle log output
  The engine produces deterministic chronological structured log entries.

  Scenario: Battle result contains chronological entries and ends with the outcome
    Given two opposing scenarios with seed 42
    When the battle is resolved
    Then the result contains a "log" array with at least 1 entry
    And every entry references a non-decreasing batchNumber
    And the last entry declares a winner or draw
    And no entry follows the outcome

  Scenario: Basic attacks include attacker, target, damage, and batch number
    Given two opposing scenarios with seed 42
    When the battle is resolved
    Then the log contains "<attacker> attacks <target> for <damage> damage"
    And the basic attack entry includes batchNumber, attacker, target, damage, and message

  Scenario: Item activation is attributed to its item and ordered effects
    Given a unit activates item "Fire Sword" with effects "Flame Strike" then "Burn"
    When the effects resolve
    Then the log contains "<caster> activates <item> on <targets>"
    And the activation entry includes batchNumber, caster, item, targets, effects, and message
    And the effects are recorded in their activation order
    And every activation origin identifies an item and its effect

  Scenario: Delayed effects retain item and effect attribution
    Given item "Venom Blade" applies interval effect "Poison"
    When "Poison" triggers later in the battle
    Then the delayed outcome identifies item "Venom Blade" and effect "Poison"
    And the delayed outcome remains in chronological log order

  Scenario: Unit death and effect expiration are logged
    Given a unit dies after receiving an effect that later expires
    When the battle is resolved
    Then the log records the unit death and the effect expiration with their batchNumber values

  Scenario: Same inputs and seed produce identical log output
    Given two opposing scenarios with seed 42
    When the battle is resolved twice
    Then the logs are identical at every index
