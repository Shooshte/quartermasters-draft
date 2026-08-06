Feature: Item workspace create and edit
  As a game master
  I want to create and edit items with ordered reusable effects
  So that item activations can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Items" tab

  # Linked effects are ordered and may repeat. An item with no effects is stat-only.

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

  Scenario: Stat fields accept decimal and negative values
    When I create a new item named "Cursed Precision Blade" with the following stats:
      | meleeDmg       | 12.5 |
      | criticalChance | 7.25 |
      | spellDmg       | -3.5 |
      | dodge          | -1   |
    Then reloading the item by URL should show the saved stat values

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

  Scenario: A stat-only item is valid
    When I create a new item named "Stat-only Relic" without linking any effects
    Then the item workspace should save the item in edit mode
    And reloading the item by URL should show no linked effects

  Scenario: Activation costs cannot be negative
    When I start creating a new item named "Broken Relay" with the following stats:
      | activationManaCost   | -1 |
      | activationHealthCost | -2 |
    Then saving should remain blocked

  Scenario: Add an effect to an item
    When I create a new item named "Flame Rod"
    And I link effect "Arcane Damage" to the item at sequence position 1
    And I save the item
    Then reloading the item by URL should show effect "Arcane Damage" at position 1

  Scenario: Effects execute in the linked order
    When I create a new item named "Arcane Focus"
    And I link effect "Arcane Damage" to the item at sequence position 1
    And I link effect "Sizzling Flesh" to the item at sequence position 2
    And I save the item
    Then reloading the item by URL should show effects "Arcane Damage" and "Sizzling Flesh" in order

  Scenario: Search for a specific effect before linking it
    When I start creating a new item
    Then the link-effect picker should allow searching for "Tectonic Pulse"

  Scenario: Link-effect picker shows at most five options
    When I start creating a new item
    Then opening the link-effect picker should show no more than 5 effects

  Scenario: Link-effect picker does not include the search prompt as an option
    When I start creating a new item
    Then the link-effect picker should use "Search effects..." as input placeholder only

  Scenario: Open an effect linked to an item
    Given I have loaded the item "Iron Sword" in the item workspace
    When I edit linked effect at position 1
    Then the "Effects" tab should be active
    And effect "Arcane Damage" should be open in the effect workspace

  Scenario: Reorder linked effects
    Given I have loaded the item "Iron Sword" in the item workspace
    When I reorder the linked effects so that position 1 becomes position 2 and position 2 becomes position 1
    And I save the item
    Then reloading the item by URL should show the effects in the new order

  Scenario: Remove a linked effect while another remains
    Given I have loaded the item "Oak Staff" in the item workspace
    And I link effect "Sizzling Flesh" to the item at sequence position 2
    And I save the item
    When I remove the effect at position 1
    And I save the item
    Then reloading the item by URL should show only effect "Sizzling Flesh"

  Scenario: Removing the final linked effect leaves a valid stat-only item
    Given I have loaded the item "Oak Staff" in the item workspace
    When I remove the effect at position 1
    And I save the item
    Then reloading the item by URL should show no linked effects

  Scenario: Duplicate effect links are allowed
    When I create a new item named "Echo Crystal"
    And I link effect "Arcane Damage" to the item at sequence position 1
    And I link effect "Arcane Damage" to the item at sequence position 2
    And I save the item
    Then reloading the item by URL should show "Arcane Damage" at both positions
