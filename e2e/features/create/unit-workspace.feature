Feature: Unit workspace create and edit
  As a game master
  I want to create and edit units with explicit targeting
  So that every item activation uses the unit's target configuration

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Units" tab

  # Linked items on units are ordered by priority and may repeat.

  Scenario: Create a new unit with default stats and targeting
    When I create a new unit named "Bronze Sentinel"
    Then the unit workspace should save the unit in edit mode
    And the URL should contain the created "unit_id"
    And reloading the unit by URL should show target side "enemies" and target policy "highest_health"
    And reloading the unit by URL should show one target row, one target per row, non-adjacent targeting, and all rows eligible

  Scenario: Name is required
    When I start creating a new unit without filling in a name
    Then saving should remain blocked

  Scenario: Mana defaults to 100 and other stat fields default to zero
    When I create a new unit named "Blank Recruit"
    Then reloading the unit by URL should show all stat fields as 0

  Scenario: Create a unit with saved stats
    When I create a new unit named "Storm Lancer" with the following stats:
      | meleeDmg       | 18   |
      | health         | 95   |
      | mana           | 200  |
      | rangedDmg      | 6    |
      | manaRegen      | 2    |
      | spellDmg       | 4    |
      | speed          | 1.1  |
      | dodge          | 7    |
      | criticalChance | 12   |
    Then reloading the unit by URL should show the saved stat values

  Scenario: Stat fields accept decimal values
    When I create a new unit named "Glass Runner" with the following stats:
      | health | 82.25 |
      | speed  | 1.35  |
      | dodge  | 6.5   |
    Then reloading the unit by URL should show the saved stat values

  Scenario: Edit an existing unit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I update the unit name to "Barbarian Updated"
    Then reloading the unit by URL should show "Barbarian Updated"

  Scenario: Edit stat values on an existing unit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I update the unit health to 120
    Then reloading the unit by URL should show health as 120

  Scenario: Each target side is explicit and persists
    When I create a new unit named "Ally Vanguard" targeting "allies" using "lowest_health"
    Then reloading the unit by URL should show target side "allies"
    When I create a new unit named "Enemy Hunter" targeting "enemies" using "highest_damage"
    Then reloading the unit by URL should show target side "enemies"
    When I create a new unit named "Self Warder" targeting "self" using "self"
    Then reloading the unit by URL should show target side "self"

  Scenario: Target policy offers all five options
    When I start creating a new unit
    Then the target policy dropdown should offer "highest_health", "lowest_health", "highest_damage", "random", and "self"

  Scenario: Self policy is invalid for enemies
    When I create a new unit targeting "enemies" using "self"
    Then saving should remain blocked

  Scenario: Targeting summary comes only from the unit configuration
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I choose target side "allies" and target policy "lowest_health"
    Then the targeting summary should identify allies and "lowest_health"
    And the targeting summary should not infer a side from any item effects

  Scenario: Damage effects can apply to allies
    Given unit "Barbarian" targets "allies" using "highest_health"
    And item "Iron Sword" has damage effect "Arcane Damage"
    When "Barbarian" activates item "Iron Sword"
    Then "Arcane Damage" should apply to a distinct ally

  Scenario: Healing effects can apply to enemies
    Given unit "Ranger" targets "enemies" using "lowest_health"
    And item "Leather Shield" has healing effect "Mend"
    When "Ranger" activates item "Leather Shield"
    Then "Mend" should apply to an enemy

  Scenario: Target row count supports one through four rows
    When I start creating a new unit
    Then the target row count control should offer 1, 2, 3, and 4

  Scenario: Whole-row and limited per-row controls persist
    When I create a new unit targeting "enemies" using "random"
    And I choose 2 target rows
    And I click the "All" per-row toggle segment
    Then reloading the unit by URL should show target row count as 2 and max targets per row as "whole row"

  Scenario: Adjacent targeting requires a limited count of at least two
    When I start creating a new unit
    And I set max targets per row to 1
    Then the "Adjacent" position rule should be disabled
    When I set max targets per row to 3
    Then the "Adjacent" position rule should be enabled
    When I click the "All" per-row toggle segment
    Then the "Adjacent" position rule should be disabled

  Scenario: Allowed row controls default to all and persist restrictions
    When I start creating a new unit
    Then all row type controls should show as eligible
    And the targeting summary should explain that all rows are eligible
    When I create a new unit named "Tank Buster" targeting "enemies" using "highest_health"
    And I make only the "melee" and "tank" rows eligible
    Then reloading the unit by URL should show row restrictions "melee" and "tank"
    And the targeting summary should explain that only Tank and Melee are eligible

  Scenario: Open an item linked to a unit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I edit linked item at position 1
    Then the "Items" tab should be active
    And item "Iron Sword" should be open in the item workspace

  Scenario: Cancel or discard linked-item navigation with unsaved unit changes
    Given I have loaded the unit "Barbarian" in the unit workspace
    And I have changed the unit name to "Barbarian Updated" without saving
    When I edit linked item at position 1
    Then I should be warned about unsaved changes
    When I cancel the linked-item navigation
    Then unit "Barbarian Updated" should remain open in the unit workspace
    When I edit linked item at position 1
    And I choose to discard my unsaved changes
    Then item "Iron Sword" should be open in the item workspace

  Scenario: Duplicate name shows a save error
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I rename the unit to "Mage"
    Then I should see a duplicate-name save error

  Scenario: Linked items are optional on create
    When I create a new unit named "Barehand Adept" without linking any items
    Then the unit workspace should save the unit in edit mode
    And reloading the unit by URL should show no linked items

  Scenario: Add, search, reorder, remove, and duplicate item links
    When I create a new unit named "Twinblade Adept"
    Then the link-item picker should allow searching for "Iron Sword"
    And opening the link-item picker should show no more than 5 items
    And the link-item picker should use "Search items..." as input placeholder only
    When I link item "Iron Sword" to the unit
    And I link item "Iron Sword" to the unit
    And I link item "Leather Shield" to the unit
    And I reorder the linked items so that position 1 becomes position 2 and position 2 becomes position 1
    And I remove the item at position 3
    And I save the unit
    Then reloading the unit by URL should show "Iron Sword" at both positions
