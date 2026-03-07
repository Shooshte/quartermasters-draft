Feature: Scenario builder page shell
  As a game master
  I want a scenario builder page with an entity workspace, a scenario workspace,
  and tabbed library lists
  So that I can manage reusable entities and scenarios from one place

  Background:
    Given I am authenticated as a game master

  Rule: The builder page displays the core shell layout

    Scenario: Open the builder page
      When I navigate to /create
      Then I should see an entity workspace
      And I should see a scenario workspace
      And the entity workspace and scenario workspace should be displayed side by side
      And the entity workspace and scenario workspace should have equal width
      And I should see a tabbed library below the two workspaces
      And the library should contain tabs for "Effects", "Spells", "Items", "Units", and "Scenarios"
      And the "Scenarios" tab should be selected by default

    Scenario: Open the builder page with no record selected
      Given no record is currently selected
      When I navigate to the scenario builder page
      Then the entity workspace should show an empty state
      And the scenario workspace should show an empty state
      And the entity workspace should prompt me to select or create an entity
      And the scenario workspace should prompt me to select or create a scenario

  Rule: The game master can browse records by tab

    Scenario Outline: View records for a selected tab
      Given the following <record_type> records exist:
        | name         |
        | <name>       |
      And I am on the scenario builder page
      When I click the "<tab_name>" tab
      Then I should see a list of <record_type> records
      And the list should include "<name>"
      And I should see an action to create a new <record_type_singular>

      Examples:
        | tab_name  | record_type | record_type_singular | name            |
        | Effects   | effect      | effect               | Burn            |
        | Spells    | spell       | spell                | Fireball        |
        | Items     | item        | item                 | Fire Rune       |
        | Units     | unit        | unit                 | Goblin Guard    |
        | Scenarios | scenario    | scenario             | Forest Ambush   |

  Rule: Selecting a record loads it into the correct workspace

    Scenario Outline: Select an entity record for editing
      Given a <entity_type> named "<record_name>" exists
      And I am on the scenario builder page
      And I have opened the "<tab_name>" tab
      When I select the <entity_type> "<record_name>"
      Then the entity workspace should load the <entity_type> "<record_name>"
      And the entity workspace should be in edit mode
      And the scenario workspace should remain visible

      Examples:
        | tab_name | entity_type | record_name   |
        | Effects  | effect      | Burn          |
        | Spells   | spell       | Fireball      |
        | Items    | item        | Fire Rune     |
        | Units    | unit        | Goblin Guard  |

    Scenario: Select a scenario record for editing
      Given a scenario named "Forest Ambush" exists
      And I am on the scenario builder page
      And I have opened the "Scenarios" tab
      When I select the scenario "Forest Ambush"
      Then the scenario workspace should load the scenario "Forest Ambush"
      And the scenario workspace should be in edit mode
      And the entity workspace should remain visible

  Rule: Create actions open the correct workspace in create mode

    Scenario Outline: Start creating a new entity from the selected tab
      Given I am on the scenario builder page
      And I have opened the "<tab_name>" tab
      When I click "New <entity_label>"
      Then the entity workspace should open in create mode
      And the entity workspace should be ready to enter <entity_type> details
      And no existing <entity_type> should be loaded

      Examples:
        | tab_name | entity_label | entity_type |
        | Effects  | Effect       | effect      |
        | Spells   | Spell        | spell       |
        | Items    | Item         | item        |
        | Units    | Unit         | unit        |

    Scenario: Start creating a new scenario
      Given I am on the scenario builder page
      And I have opened the "Scenarios" tab
      When I click "New Scenario"
      Then the scenario workspace should open in create mode
      And the scenario workspace should be ready to enter scenario details
      And the scenario workspace should display 4 empty rows
      And no existing scenario should be loaded

  Rule: Unsaved changes are protected during shell navigation

    Scenario: Warn before switching tabs with unsaved entity changes
      Given a spell named "Fireball" exists
      And I am on the scenario builder page
      And I have opened the "Spells" tab
      And I am editing the spell "Fireball" in the entity workspace
      And I have unsaved changes in the entity workspace
      When I click the "Items" tab
      Then I should be warned about unsaved changes
      And I should be able to cancel the tab switch
      And the "Spells" tab should remain selected
      And the entity workspace should continue editing the spell "Fireball"

    Scenario: Discard unsaved entity changes and switch tabs
      Given a spell named "Fireball" exists
      And I am on the scenario builder page
      And I have opened the "Spells" tab
      And I am editing the spell "Fireball" in the entity workspace
      And I have unsaved changes in the entity workspace
      When I click the "Items" tab
      And I choose to discard my unsaved changes
      Then the "Items" tab should become selected
      And I should see a list of item records
      And the entity workspace should no longer show unsaved changes for "Fireball"

    Scenario: Warn before loading a different scenario with unsaved scenario changes
      Given a scenario named "Forest Ambush" exists
      And a scenario named "Castle Siege" exists
      And I am on the scenario builder page
      And I have opened the "Scenarios" tab
      And I am editing the scenario "Forest Ambush" in the scenario workspace
      And I have unsaved changes in the scenario workspace
      When I select the scenario "Castle Siege"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different scenario
      And the scenario workspace should continue editing the scenario
    "Forest Ambush"

    Scenario: Discard unsaved scenario changes and load a different scenario
      Given a scenario named "Forest Ambush" exists
      And a scenario named "Castle Siege" exists
      And I am on the scenario builder page
      And I have opened the "Scenarios" tab
      And I am editing the scenario "Forest Ambush" in the scenario workspace
      And I have unsaved changes in the scenario workspace
      When I select the scenario "Castle Siege"
      And I choose to discard my unsaved changes
      Then the scenario workspace should load the scenario "Castle Siege"
      And the scenario workspace should be in edit mode