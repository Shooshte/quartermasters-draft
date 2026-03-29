Feature: Scenario workspace create and edit
  As a game master
  I want to create and edit scenarios inside the scenario builder on the "/create" page
  So that scenario records and their row-based unit assignments can be managed without leaving the builder workflow

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Scenarios" tab

  # Saved scenarios always include the four fixed rows: tank, melee, ranged, and support.
  # Units in a row are ordered by 1-based slot.
  # The same unit may be assigned more than once in the same row and across multiple rows.

  Rule: Create and validate scenarios

    Scenario: Create a new empty scenario
      When I create a new scenario named "Frontier Watch"
      Then the scenario workspace should save the scenario in edit mode
      And the URL should contain the created "scenario_id"

    Scenario: Name is required
      When I start creating a new scenario without filling in a name
      Then saving should remain blocked

    Scenario: Duplicate name shows a save error
      When I create a new scenario named "Ambush at Dawn"
      Then I should see a duplicate-name save error

    Scenario: A new scenario starts with four fixed empty rows
      When I create a new scenario named "Silent Outpost"
      Then reloading the scenario by URL should show the "tank" row empty
      And reloading the scenario by URL should show the "melee" row empty
      And reloading the scenario by URL should show the "ranged" row empty
      And reloading the scenario by URL should show the "support" row empty

    Scenario: Create a scenario with units assigned across rows
      When I create a new scenario named "Siege Breakers"
      And I assign unit "Barbarian" to the "melee" row at slot 1
      And I assign unit "Mage" to the "ranged" row at slot 1
      And I assign unit "Ranger" to the "support" row at slot 1
      And I save the scenario
      Then reloading the scenario by URL should show unit "Barbarian" in the "melee" row at slot 1
      And reloading the scenario by URL should show unit "Mage" in the "ranged" row at slot 1
      And reloading the scenario by URL should show unit "Ranger" in the "support" row at slot 1
      And reloading the scenario by URL should show the "tank" row empty

  Rule: Edit existing scenarios

    Scenario: Edit an existing scenario name
      Given I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I update the scenario name to "Ambush at Dusk"
      And I save the scenario
      Then reloading the scenario by URL should show "Ambush at Dusk"

    Scenario: Edit row assignments on an existing scenario
      Given I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I assign unit "Templar" to the "tank" row at slot 1
      And I save the scenario
      Then reloading the scenario by URL should show unit "Templar" in the "tank" row at slot 1
      And reloading the scenario by URL should show unit "Barbarian" in the "melee" row at slot 1
      And reloading the scenario by URL should show unit "Mage" in the "ranged" row at slot 1
      And reloading the scenario by URL should show unit "Ranger" in the "support" row at slot 1

    Scenario: Add multiple units to the same row in slot order
      Given I have loaded the scenario "Castle Siege" in the scenario workspace
      When I assign unit "Barbarian" to the "melee" row at slot 1
      And I assign unit "Samurai" to the "melee" row at slot 2
      And I assign unit "Undead Knight" to the "melee" row at slot 3
      And I save the scenario
      Then reloading the scenario by URL should show units "Barbarian", "Samurai", and "Undead Knight" in the "melee" row in slot order

    Scenario: Reorder units within a row
      Given I have loaded the scenario "Castle Siege" in the scenario workspace
      And I assign unit "Barbarian" to the "melee" row at slot 1
      And I assign unit "Samurai" to the "melee" row at slot 2
      And I save the scenario
      When I reorder the "melee" row so that slot 1 becomes slot 2 and slot 2 becomes slot 1
      And I save the scenario
      Then reloading the scenario by URL should show units "Samurai" and "Barbarian" in the "melee" row in slot order

    Scenario: Remove a unit while other assignments remain
      Given I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      And I assign unit "Samurai" to the "melee" row at slot 2
      And I save the scenario
      When I remove the unit at slot 2 from the "melee" row
      And I save the scenario
      Then reloading the scenario by URL should show only unit "Barbarian" in the "melee" row

    Scenario: Removing the final unit from a row is allowed
      Given I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I remove the unit at slot 1 from the "support" row
      And I save the scenario
      Then reloading the scenario by URL should show the "support" row empty
      And reloading the scenario by URL should show the "tank" row empty
      And reloading the scenario by URL should show unit "Barbarian" in the "melee" row at slot 1
      And reloading the scenario by URL should show unit "Mage" in the "ranged" row at slot 1

  Rule: Scenario assignment model and picker behavior

    Scenario: Duplicate units in the same row are allowed
      When I create a new scenario named "Mirror Line"
      And I assign unit "Barbarian" to the "melee" row at slot 1
      And I assign unit "Barbarian" to the "melee" row at slot 2
      And I save the scenario
      Then reloading the scenario by URL should show "Barbarian" at slot 1 and slot 2 in the "melee" row

    Scenario: The same unit can appear in multiple rows
      When I create a new scenario named "Flexible Vanguard"
      And I assign unit "Templar" to the "tank" row at slot 1
      And I assign unit "Templar" to the "support" row at slot 1
      And I save the scenario
      Then reloading the scenario by URL should show unit "Templar" in the "tank" row at slot 1
      And reloading the scenario by URL should show unit "Templar" in the "support" row at slot 1

    Scenario: Search for a specific unit before assigning it
      When I start creating a new scenario
      Then the row-unit picker should allow searching for "Samurai"

    Scenario: Row unit picker shows at most five options
      When I start creating a new scenario
      Then opening a row-unit picker should show no more than 5 units

    Scenario: Row unit picker uses its search prompt as placeholder only
      When I start creating a new scenario
      Then the row-unit picker should use "Search units..." as input placeholder only
