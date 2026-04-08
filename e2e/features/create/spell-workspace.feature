Feature: Spell workspace create and edit
  As a game master
  I want to create and edit spells inside the entity builder on the "/create" page
  So that spell records and their linked effects can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Spells" tab

  Scenario: Create a new spell with a target policy and linked effect
    When I create a new spell named "Arcane Volley" with target policy "highest_health"
    And I add effect "Barbarian Roar" at sequence position 1
    Then the spell workspace should save the spell in edit mode
    And the URL should contain the created "spell_id"

  Scenario: Target policy offers all four options
    When I start creating a new spell
    Then the target policy dropdown should offer "highest_health", "lowest_health", "highest_damage", and "random"

  Scenario: Target policy is required
    When I start creating a new spell without selecting a target policy
    Then saving should remain blocked

  Scenario: Description is optional
    When I create a new spell named "Silent Strike" without a description
    And I add effect "Barbarian Roar" at sequence position 1
    Then the URL should contain the created "spell_id"

  Scenario: Description persists after save and reload
    When I create a new spell named "Ember Wave" with description "A rolling wave of fire"
    Then reloading the spell by URL should show description "A rolling wave of fire"

  Scenario: Name is required
    When I start creating a new spell without filling in a name
    Then saving should remain blocked

  Scenario: At least one linked effect is required on create
    When I start creating a new spell without linking any effects
    Then saving should remain blocked

  Scenario: Edit an existing spell
    Given I have loaded the spell "Fireball" in the spell workspace
    When I update the spell name to "Fireball Updated"
    Then reloading the spell by URL should show "Fireball Updated"

  Scenario: Duplicate name shows a save error
    Given I have loaded the spell "Fireball" in the spell workspace
    When I rename the spell to "Battle Cry"
    Then I should see a duplicate-name save error

  Scenario: Add effects to a spell
    When I create a new spell named "Combo Strike" with target policy "random"
    And I add effect "Barbarian Roar" at sequence position 1
    And I add effect "Exhaust" at sequence position 2
    And I save the spell
    Then reloading the spell by URL should show effects "Barbarian Roar" and "Exhaust" in order

  Scenario: Search for a specific effect before linking it
    When I start creating a new spell
    Then the link-effect picker should allow searching for "Tectonic Pulse"

  Scenario: Link-effect picker shows at most five options
    When I start creating a new spell
    Then opening the link-effect picker should show no more than 5 effects

  Scenario: Link-effect picker does not include the search prompt as an option
    When I start creating a new spell
    Then the link-effect picker should use "Search effects..." as input placeholder only

  Scenario: Reorder linked effects
    Given I have loaded the spell "Fireball" in the spell workspace
    When I reorder the linked effects so that position 1 becomes position 2 and position 2 becomes position 1
    And I save the spell
    Then reloading the spell by URL should show the effects in the new order

  Scenario: Remove a linked effect while at least one remains
    Given I have loaded the spell "Fireball" in the spell workspace
    When I remove the effect at position 2
    And I save the spell
    Then reloading the spell by URL should show only the remaining effect

  Scenario: At least one linked effect is required on edit
    Given I have loaded the spell "Battle Cry" in the spell workspace
    When I remove the effect at position 1
    Then saving should remain blocked

  Scenario: Duplicate effects are allowed
    When I create a new spell named "Echo Blast" with target policy "random"
    And I add effect "Barbarian Roar" at sequence position 1
    And I add effect "Barbarian Roar" at sequence position 2
    And I save the spell
    Then reloading the spell by URL should show "Barbarian Roar" at both positions

  Scenario: Target scope defaults are set on new spell
    When I start creating a new spell
    Then the target row count should default to 1
    And the per-row toggle should default to "Limit" with value 1
    And target only adjacent should default to unchecked
    And no row type restriction pills should be active

  Scenario: Create a spell targeting a whole row
    When I create a new spell named "Inferno Wave" with target policy "random"
    And I click the "All" per-row toggle segment
    And I add effect "Barbarian Roar" at sequence position 1
    And I save the spell
    Then reloading the spell by URL should show max targets per row as "whole row"

  Scenario: Create a spell with adjacent targeting
    When I create a new spell named "Lightning Chain" with target policy "highest_damage"
    And I set max targets per row to 3
    And I check target only adjacent
    And I add effect "Barbarian Roar" at sequence position 1
    And I save the spell
    Then reloading the spell by URL should show target only adjacent as checked

  Scenario: Adjacent requires at least 2 targets per row
    When I start creating a new spell
    And I set max targets per row to 1
    Then the target only adjacent checkbox should be disabled

  Scenario: Adjacent is disabled for whole row targeting
    When I start creating a new spell
    And I click the "All" per-row toggle segment
    Then the target only adjacent checkbox should be disabled

  Scenario: Create a spell with row type restrictions
    When I create a new spell named "Tank Buster" with target policy "highest_health"
    And I click the "melee" and "tank" row type pills
    And I add effect "Barbarian Roar" at sequence position 1
    And I save the spell
    Then reloading the spell by URL should show row restrictions "melee" and "tank"

  Scenario: Create a spell targeting multiple rows
    When I create a new spell named "Earthquake II" with target policy "random"
    And I set target row count to 2
    And I click the "All" per-row toggle segment
    And I add effect "Barbarian Roar" at sequence position 1
    And I save the spell
    Then reloading the spell by URL should show target row count as 2

  Scenario: Cannot delete a spell that is linked to an item
    Given spell "Fireball" is linked to item "Oak Staff"
    When I try to delete the spell "Fireball"
    Then I should see a linked-item dependency delete error

  Scenario: Deleting an unlinked spell still succeeds
    Given spell "Zenith Bloom" is not linked to any items
    When I delete the spell "Zenith Bloom"
    Then the spell should be removed from the library
