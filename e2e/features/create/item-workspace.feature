Feature: Item workspace create and edit
  As a game master
  I want to create and edit items inside the entity builder on the "/create" page
  So that item records and their linked spells can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Items" tab

  # Linked spells on items are treated as an unordered set.
  # Scenarios that assert multiple linked spells verify membership only, not sequence.

  Scenario: Create a new item with default stats
    When I create a new item named "Bronze Buckler"
    Then the item workspace should save the item in edit mode
    And the URL should contain the created "item_id"

  Scenario: Name is required
    When I start creating a new item without filling in a name
    Then saving should remain blocked

  Scenario: Stat fields default to zero
    When I create a new item named "Empty Hilt"
    Then reloading the item by URL should show all stat fields as 0

  Scenario: Create an item with combat stats
    When I create a new item named "Obsidian Blade" with the following stats:
      | meleeDmg       | 18 |
      | rangedDmg      | 0  |
      | spellDmg       | 5  |
      | criticalChance | 12 |
    Then reloading the item by URL should show the saved stat values

  Scenario: Create an item with utility stats
    When I create a new item named "Shade Charm" with the following stats:
      | mana      | -25 |
      | manaRegen | 4.5 |
      | dodge     | 6   |
    Then reloading the item by URL should show the saved stat values

  Scenario: Create an item with activation costs
    When I create a new item named "Mana Gauntlet" with the following stats:
      | activationManaCost   | 8 |
      | activationHealthCost | 3 |
    Then reloading the item by URL should show the saved stat values

  Scenario: Stat fields accept decimal values
    When I create a new item named "Precise Blade" with the following stats:
      | meleeDmg       | 12.5 |
      | criticalChance | 7.25 |
    Then reloading the item by URL should show the saved decimal values

  Scenario: Stat fields accept negative values
    When I create a new item named "Cursed Sigil" with the following stats:
      | spellDmg | -3.5 |
      | dodge    | -1   |
    Then reloading the item by URL should show the saved negative stat values

  Scenario: Edit an existing item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I update the item name to "Oak Staff Updated"
    Then reloading the item by URL should show "Oak Staff Updated"

  Scenario: Edit stat values on an existing item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I update the item spellDmg to 20
    Then reloading the item by URL should show spellDmg as 20

  Scenario: Open a spell linked to an item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I edit linked spell at position 1
    Then the "Spells" tab should be active
    And spell "Fireball" should be open in the spell workspace

  Scenario: Duplicate name shows a save error
    Given I have loaded the item "Oak Staff" in the item workspace
    When I rename the item to "Iron Sword"
    Then I should see a duplicate-name save error

  Scenario: Linked spells are optional on create
    When I create a new item named "Spell-less Relic" without linking any spells
    Then the item workspace should save the item in edit mode
    And reloading the item by URL should show no linked spells

  Scenario: Activation costs cannot be negative
    When I start creating a new item named "Broken Relay" with the following stats:
      | activationManaCost   | -1 |
      | activationHealthCost | -2 |
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

  Scenario: Removing the final linked spell is allowed on edit
    Given I have loaded the item "Oak Staff" in the item workspace
    When I remove the linked spell "Fireball"
    And I save the item
    Then reloading the item by URL should show no linked spells

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
