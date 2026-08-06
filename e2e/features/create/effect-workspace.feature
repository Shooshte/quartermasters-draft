Feature: Effect workspace CRUD
  As a game master
  I want to create and edit reusable effects inside the entity builder
  So that items can activate them in ordered sequences

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Effects" tab

  Scenario: Create a new instant effect with dropdown enums
    When I create a new effect named "Alpha Pulse"
    Then the effect workspace should save the effect in edit mode
    And the URL should contain the created "effect_id"

  Scenario: Tick interval fields are visible but disabled for instant timing
    When I start creating a new effect
    Then the interval timing fields should remain visible
    And the interval timing fields should be disabled for instant timing

  Scenario: Create a new interval effect with required tick timing fields
    When I create a new interval effect named "Battle Rhythm"
    Then the saved effect should retain its tick timing values

  Scenario: Create a signed mana capacity modifier
    When I create a new effect named "Mana Drain" with mana -40
    Then reloading the effect by URL should show mana as -40

  Scenario: Validation blocks save when tick interval fields are missing
    When I select interval timing for a new effect without tick interval values
    Then saving should remain blocked

  Scenario: Edit an existing effect
    Given I have loaded the effect "Barbarian Roar" in the effect workspace
    When I update the effect name to "Barbarian Roar Updated"
    Then reloading the effect by URL should show "Barbarian Roar Updated"

  Scenario: Duplicate name shows a save error
    Given I have loaded the effect "Barbarian Roar" in the effect workspace
    When I rename the effect to "Exhaust"
    Then I should see a duplicate-name save error

  Scenario: Cannot delete an effect that is linked to an item
    Given effect "Barbarian Roar" is linked to at least one item
    When I try to delete the effect "Barbarian Roar"
    Then I should see a linked-item dependency delete error

  Scenario: Deleting an effect with no item links succeeds
    Given effect "Zodiac Burst" is not linked to any items
    When I delete the effect "Zodiac Burst"
    Then the effect should be removed from the library
