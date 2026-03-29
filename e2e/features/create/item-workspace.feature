Feature: Item workspace create and edit
  As a game master
  I want to create and edit items inside the entity builder on the "/create" page
  So that item records and their linked spells can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Items" tab

  Scenario: Create a new item with default stats
    When I create a new item named "Bronze Buckler"
    And I link spell "Fireball" to the item
    Then the item workspace should save the item in edit mode
    And the URL should contain the created "item_id"

  Scenario: Name is required
    When I start creating a new item without filling in a name
    Then saving should remain blocked

  Scenario: Stat fields default to zero
    When I create a new item named "Empty Hilt"
    And I link spell "Fireball" to the item
    Then reloading the item by URL should show all stat fields as 0

  Scenario: Create an item with combat stats
    When I create a new item named "Obsidian Blade" with the following stats:
      | meleeDmg       | 18 |
      | rangedDmg      | 0  |
      | spellDmg       | 5  |
      | criticalChance | 12 |
    And I link spell "Fireball" to the item
    Then reloading the item by URL should show the saved stat values

  Scenario: Create an item with activation costs
    When I create a new item named "Mana Gauntlet" with the following stats:
      | activationManaCost   | 8 |
      | activationHealthCost | 3 |
    And I link spell "Fireball" to the item
    Then reloading the item by URL should show the saved stat values

  Scenario: Stat fields accept decimal values
    When I create a new item named "Precise Blade" with the following stats:
      | meleeDmg       | 12.5 |
      | criticalChance | 7.25 |
    And I link spell "Fireball" to the item
    Then reloading the item by URL should show the saved decimal values

  Scenario: Edit an existing item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I update the item name to "Oak Staff Updated"
    Then reloading the item by URL should show "Oak Staff Updated"

  Scenario: Edit stat values on an existing item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I update the item spellDmg to 20
    Then reloading the item by URL should show spellDmg as 20

  Scenario: Duplicate name shows a save error
    Given I have loaded the item "Oak Staff" in the item workspace
    When I rename the item to "Iron Sword"
    Then I should see a duplicate-name save error

  Scenario: At least one linked spell is required on create
    When I start creating a new item without linking any spells
    Then saving should remain blocked

  Scenario: Add a spell to an item
    When I create a new item named "Flame Rod"
    And I link spell "Fireball" to the item
    And I save the item
    Then reloading the item by URL should show spell "Fireball" linked

  Scenario: Add multiple spells to an item
    When I create a new item named "Arcane Focus"
    And I link spell "Fireball" to the item
    And I link spell "Healing Touch" to the item
    And I save the item
    Then reloading the item by URL should show spells "Fireball" and "Healing Touch" linked

  Scenario: Remove a linked spell while at least one remains
    Given I have loaded the item "Oak Staff" in the item workspace
    And I link spell "Healing Touch" to the item
    And I save the item
    When I remove the linked spell "Fireball"
    And I save the item
    Then reloading the item by URL should show only spell "Healing Touch" linked

  Scenario: At least one linked spell is required on edit
    Given I have loaded the item "Oak Staff" in the item workspace
    When I remove the linked spell "Fireball"
    Then saving should remain blocked

  Scenario: Edit linked spells on an existing item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I link spell "Battle Cry" to the item
    And I save the item
    Then reloading the item by URL should show spells "Fireball" and "Battle Cry" linked

  Scenario: Search for a specific spell before linking it
    When I start creating a new item
    Then the link-spell picker should allow searching for "Fireball"

  Scenario: Link-spell picker shows at most five options
    When I start creating a new item
    Then opening the link-spell picker should show no more than 5 spells

  Scenario: Link-spell picker does not include the search prompt as an option
    When I start creating a new item
    Then the link-spell picker should use "Search spells..." as input placeholder only

  Scenario: Duplicate spell links are not allowed
    When I create a new item named "Echo Crystal"
    And I link spell "Fireball" to the item
    Then the link-spell picker should not offer "Fireball" as an option
