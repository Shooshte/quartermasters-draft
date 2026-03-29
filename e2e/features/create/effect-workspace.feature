Feature: Effect workspace CRUD
  As a game master
  I want to create and edit effects inside the entity builder on the "/create" page
  So that effect records can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Effects" tab

  Scenario: Create a new instant effect with dropdown enums
    When I create a new effect named "Alpha Pulse"
    Then the effect workspace should save the effect in edit mode
    And the URL should contain the created "effect_id"

  Scenario: Interval fields are visible but disabled for instant timing
    When I start creating a new effect
    Then the interval timing fields should remain visible
    And the interval timing fields should be disabled for instant timing

  Scenario: Create a new interval effect with required interval fields
    When I create a new interval effect named "Battle Rhythm"
    Then the saved effect should retain its interval timing values

  Scenario: Validation blocks save when interval fields are missing
    When I select interval timing for a new effect without interval values
    Then saving should remain blocked

  Scenario: Edit an existing effect
    Given I have loaded the effect "Barbarian Roar" in the effect workspace
    When I update the effect name to "Barbarian Roar Updated"
    Then reloading the effect by URL should show "Barbarian Roar Updated"

  Scenario: Duplicate name shows a save error
    Given I have loaded the effect "Barbarian Roar" in the effect workspace
    When I rename the effect to "Exhaust"
    Then I should see a duplicate-name save error

  Scenario: Cannot delete an effect that is linked to a spell
    Given effect "Barbarian Roar" is linked to at least one spell
    When I try to delete the effect "Barbarian Roar"
    Then I should see a linked-spell dependency delete error

  Scenario: Deleting an unlinked effect still succeeds
    Given effect "Zodiac Burst" is not linked to any spells
    When I delete the effect "Zodiac Burst"
    Then the effect should be removed from the library
