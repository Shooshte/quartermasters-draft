Feature: Spell workspace create and edit
  As a game master
  I want to create and edit spells inside the entity builder on the "/create" page
  So that spell records and their linked effects can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Spells" tab

  Scenario: Create a new spell with a dropdown enum
    When I create a new spell named "Arcane Volley" with target policy "highest_health"
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
    Then the spell should save successfully

  Scenario: Description persists on edit
    When I create a new spell named "Ember Wave" with description "A rolling wave of fire"
    Then reloading the spell by URL should show description "A rolling wave of fire"

  Scenario: Name is required
    When I start creating a new spell without filling in a name
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

  Scenario: Reorder linked effects
    Given I have loaded the spell "Fireball" in the spell workspace
    When I reorder the linked effects so that position 1 becomes position 2 and position 2 becomes position 1
    And I save the spell
    Then reloading the spell by URL should show the effects in the new order

  Scenario: Remove a linked effect
    Given I have loaded the spell "Fireball" in the spell workspace
    When I remove the effect at position 2
    And I save the spell
    Then reloading the spell by URL should show only the remaining effect

  Scenario: Duplicate effects are allowed
    When I create a new spell named "Echo Blast" with target policy "random"
    And I add effect "Barbarian Roar" at sequence position 1
    And I add effect "Barbarian Roar" at sequence position 2
    And I save the spell
    Then reloading the spell by URL should show "Barbarian Roar" at both positions
