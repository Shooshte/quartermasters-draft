Feature: Unit workspace create and edit
  As a game master
  I want to create and edit units inside the entity builder on the "/create" page
  So that unit records and their linked items can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Units" tab

  # Linked items on units are ordered by priority and may repeat.

  Scenario: Create a new unit with default stats
    When I create a new unit named "Bronze Sentinel"
    Then the unit workspace should save the unit in edit mode
    And the URL should contain the created "unit_id"

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
    Then reloading the unit by URL should show the saved decimal values

  Scenario: Edit an existing unit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I update the unit name to "Barbarian Updated"
    Then reloading the unit by URL should show "Barbarian Updated"

  Scenario: Edit stat values on an existing unit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I update the unit health to 120
    Then reloading the unit by URL should show health as 120

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

  Scenario: Add an item to a unit
    When I create a new unit named "Iron Vanguard"
    And I link item "Iron Sword" to the unit
    And I save the unit
    Then reloading the unit by URL should show item "Iron Sword" linked

  Scenario: Add multiple items to a unit in priority order
    When I create a new unit named "Field Captain"
    And I link item "Iron Sword" to the unit
    And I link item "Leather Shield" to the unit
    And I save the unit
    Then reloading the unit by URL should show items "Iron Sword" and "Leather Shield" in order

  Scenario: Search for a specific item before linking it
    When I start creating a new unit
    Then the link-item picker should allow searching for "Oak Staff"

  Scenario: Link-item picker shows at most five options
    When I start creating a new unit
    Then opening the link-item picker should show no more than 5 items

  Scenario: Link-item picker does not include the search prompt as an option
    When I start creating a new unit
    Then the link-item picker should use "Search items..." as input placeholder only

  Scenario: Reorder linked items
    Given I have loaded the unit "Barbarian" in the unit workspace
    And I link item "Leather Shield" to the unit
    And I save the unit
    When I reorder the linked items so that position 1 becomes position 2 and position 2 becomes position 1
    And I save the unit
    Then reloading the unit by URL should show the items in the new order

  Scenario: Remove a linked item while at least one remains
    Given I have loaded the unit "Barbarian" in the unit workspace
    And I link item "Leather Shield" to the unit
    And I save the unit
    When I remove the item at position 2
    And I save the unit
    Then reloading the unit by URL should show only the remaining item

  Scenario: Removing the final linked item is allowed on edit
    Given I have loaded the unit "Barbarian" in the unit workspace
    When I remove the item at position 1
    And I save the unit
    Then reloading the unit by URL should show no linked items

  Scenario: Duplicate item links are allowed
    When I create a new unit named "Twinblade Adept"
    And I link item "Iron Sword" to the unit
    And I link item "Iron Sword" to the unit
    And I save the unit
    Then reloading the unit by URL should show "Iron Sword" at both positions
