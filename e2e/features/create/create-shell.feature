Feature: Scenario builder page shell
  As a game master
  I want a scenario builder page with an entity workspace, a scenario workspace,
  and a tabbed library
  So that I can manage reusable entities and scenarios from one place

  The "/create" route accepts the optional query parameters "scenario_id",
  "entity_id", "effect_id", "spell_id", "item_id", "unit_id", and "tab".
  The "scenario_id", "entity_id", "effect_id", "spell_id", "item_id", and "unit_id" parameters are UUIDs.
  The "effect_id" and "spell_id" parameters are type-specific alternatives to
  "entity_id" for effects and spells respectively.
  The "item_id" and "unit_id" parameters are type-specific alternatives to
  "entity_id" for items and units respectively.
  The "tab" parameter accepts the exact tab labels "Effects", "Spells",
  "Items", "Units", and "Scenarios".

  "Visible library" refers to the list displayed under the currently active tab.

  Background:
    Given I am authenticated as a game master

  Rule: The builder page shows the core shell layout

    Scenario: Open the create page shell
      When I navigate to "/create" without selection parameters
      Then I should see an entity workspace
      And I should see a scenario workspace
      And I should see a tabbed library
      And the library should contain tabs for "Effects", "Spells", "Items", "Units", and "Scenarios"

  Rule: URL parameters determine the initial page state

    Scenario: Open the page without URL parameters
      When I navigate to "/create" without selection parameters
      Then the "Scenarios" tab should be selected by default
      And no record should be selected in the visible library
      And no entity should be loaded in the entity workspace
      And the entity fields should be empty
      And no scenario should be loaded in the scenario workspace
      And the scenario fields should be empty

    Scenario: Open the page with only a tab parameter
      When I navigate to "/create" with the "tab" parameter "Spells"
      Then the "Spells" tab should be selected
      And no record should be selected in the visible library
      And no entity should be loaded in the entity workspace
      And no scenario should be loaded in the scenario workspace

    Scenario: Open the page with only a scenario_id parameter
      Given a scenario named "Ambush at Dawn" exists
      When I navigate to "/create" with the "scenario_id" parameter for the scenario "Ambush at Dawn"
      Then the "Scenarios" tab should be selected by default
      And the "Ambush at Dawn" record should be selected in the visible library
      And the scenario workspace should load the scenario "Ambush at Dawn" in edit mode
      And no entity should be loaded in the entity workspace

    Scenario Outline: Open the page with only an entity_id parameter
      Given a <entity_type> named "<record_name>" exists
      When I navigate to "/create" with the "entity_id" parameter for the <entity_type> "<record_name>"
      Then the "<tab_name>" tab should be selected
      And the "<record_name>" record should be selected in the visible library
      And the entity workspace should load the <entity_type> "<record_name>" in edit mode
      And no scenario should be loaded in the scenario workspace

      Examples:
        | tab_name | entity_type | record_name    |
        | Effects  | effect      | Barbarian Roar |
        | Spells   | spell       | Fireball       |
        | Items    | item        | Iron Sword     |
        | Units    | unit        | Barbarian      |

    Scenario: Open the page with a tab parameter and a scenario_id parameter
      Given a scenario named "Ambush at Dawn" exists
      When I navigate to "/create" with the "tab" parameter "Spells" and the "scenario_id" parameter for the scenario "Ambush at Dawn"
      Then the "Spells" tab should be selected
      And no record should be selected in the visible library
      And the scenario workspace should load the scenario "Ambush at Dawn" in edit mode
      And no entity should be loaded in the entity workspace

    Scenario Outline: Open the page with matching tab and entity_id parameters
      Given a <entity_type> named "<record_name>" exists
      When I navigate to "/create" with the "tab" parameter "<tab_name>" and the "entity_id" parameter for the <entity_type> "<record_name>"
      Then the "<tab_name>" tab should be selected
      And the "<record_name>" record should be selected in the visible library
      And the entity workspace should load the <entity_type> "<record_name>" in edit mode
      And no scenario should be loaded in the scenario workspace

      Examples:
        | tab_name | entity_type | record_name    |
        | Effects  | effect      | Barbarian Roar |
        | Spells   | spell       | Fireball       |
        | Items    | item        | Iron Sword     |
        | Units    | unit        | Barbarian      |

    Scenario Outline: Open the page with tab, entity_id, and scenario_id parameters
      Given a <entity_type> named "<record_name>" exists
      And a scenario named "Ambush at Dawn" exists
      When I navigate to "/create" with the "tab" parameter "<tab_name>", the "entity_id" parameter for the <entity_type> "<record_name>", and the "scenario_id" parameter for the scenario "Ambush at Dawn"
      Then the "<tab_name>" tab should be selected
      And the "<record_name>" record should be selected in the visible library
      And the entity workspace should load the <entity_type> "<record_name>" in edit mode
      And the scenario workspace should load the scenario "Ambush at Dawn" in edit mode

      Examples:
        | tab_name | entity_type | record_name    |
        | Effects  | effect      | Barbarian Roar |
        | Spells   | spell       | Fireball       |
        | Items    | item        | Iron Sword     |
        | Units    | unit        | Barbarian      |

    Scenario: Open the page with a tab that does not match the entity type
      # The tab parameter controls which tab is active and therefore what the visible library shows.
      # The entity_id parameter independently controls what is loaded in the entity workspace.
      # A mismatch means the entity is loaded in the workspace but is not listed in the visible library.
      Given a spell named "Battle Cry" exists
      When I navigate to "/create" with the "tab" parameter "Items" and the "entity_id" parameter for the spell "Battle Cry"
      Then the "Items" tab should be selected
      And no record should be selected in the visible library
      And the entity workspace should load the spell "Battle Cry" in edit mode

    Scenario: Invalid tab parameter falls back to the default tab
      When I navigate to "/create" with the "tab" parameter "Unknown"
      Then the "Scenarios" tab should be selected by default
      And no record should be selected in the visible library
      And no entity should be loaded in the entity workspace
      And no scenario should be loaded in the scenario workspace

    Scenario: Unknown entity_id leaves the entity workspace empty
      When I navigate to "/create" with the "tab" parameter "Spells" and an unknown "entity_id" parameter
      Then the "Spells" tab should be selected
      And no record should be selected in the visible library
      And no entity should be loaded in the entity workspace
      And I should see an entity not-found state

    Scenario: Unknown scenario_id leaves the scenario workspace empty
      When I navigate to "/create" with an unknown "scenario_id" parameter
      Then the "Scenarios" tab should be selected by default
      And no record should be selected in the visible library
      And no scenario should be loaded in the scenario workspace
      And I should see a scenario not-found state

  Rule: The game master can browse records by tab

    Scenario Outline: View records for a selected tab
      Given the following <record_type> records exist:
        | name         |
        | <first_name> |
        | <second_name> |
      And I am on the "/create" page
      When I click the "<tab_name>" tab
      Then the "<tab_name>" tab should be selected
      And I should see a list of <record_type> records in the library
      And the list should include "<first_name>"
      And the list should include "<second_name>"
      And I should see a button to create a new <record_type_singular>

      Examples:
        | tab_name  | record_type | record_type_singular | first_name     | second_name    |
        | Effects   | effect      | effect               | Barbarian Roar | Rage           |
        | Spells    | spell       | spell                | Fireball       | Battle Cry     |
        | Items     | item        | item                 | Iron Sword     | Oak Staff      |
        | Units     | unit        | unit                 | Barbarian      | Mage           |
        | Scenarios | scenario    | scenario             | Ambush at Dawn | Castle Siege   |

    Scenario: Open a tab with no records
      Given no effect records exist
      And I am on the "/create" page
      When I click the "Effects" tab
      Then the "Effects" tab should be selected
      And I should see an empty list state for effects
      And I should see a button to create the first effect
      And no record should be selected in the visible library

    Scenario: Switching back to a tab restores the previously selected record
      Given a spell named "Fireball" exists
      And an item named "Iron Sword" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I select the spell "Fireball"
      And I have opened the "Items" tab
      And I select the item "Iron Sword"
      When I click the "Spells" tab
      Then the "Spells" tab should be selected
      And the "Fireball" record should be selected in the visible library

    Scenario: Switching back to a second tab restores the previously selected record
      Given a spell named "Fireball" exists
      And an item named "Iron Sword" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I select the spell "Fireball"
      And I have opened the "Items" tab
      And I select the item "Iron Sword"
      When I click the "Items" tab
      Then the "Items" tab should be selected
      And the "Iron Sword" record should be selected in the visible library

    Scenario: Switching tabs does not clear loaded workspaces
      Given a spell named "Fireball" exists
      And a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I click the "Items" tab
      Then the "Items" tab should be selected
      And the entity workspace should continue showing the spell "Fireball"
      And the scenario workspace should continue showing the scenario "Ambush at Dawn"

  Rule: Selecting a record loads it into the correct workspace only

    Scenario Outline: Select an entity record for editing
      Given a scenario named "Ambush at Dawn" exists
      And a <entity_type> named "<record_name>" exists
      And I am on the "/create" page
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      And I have opened the "<tab_name>" tab
      When I select the <entity_type> "<record_name>"
      Then the "<record_name>" record should be selected in the visible library
      And the entity workspace should load the <entity_type> "<record_name>" in edit mode
      And the scenario workspace should continue showing the scenario "Ambush at Dawn"

      Examples:
        | tab_name | entity_type | record_name    |
        | Effects  | effect      | Barbarian Roar |
        | Spells   | spell       | Fireball       |
        | Items    | item        | Iron Sword     |
        | Units    | unit        | Barbarian      |

    Scenario: Select a scenario record for editing
      Given a spell named "Fireball" exists
      And a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have loaded the spell "Fireball" in the entity workspace
      And I have opened the "Scenarios" tab
      When I click the edit button for the scenario "Ambush at Dawn"
      Then the "Ambush at Dawn" record should be selected in the visible library
      And the scenario workspace should load the scenario "Ambush at Dawn" in edit mode
      And the entity workspace should continue showing the spell "Fireball"

  Rule: Create actions open the correct workspace and clear the visible selection

    Scenario Outline: Start creating a new entity
      Given a scenario named "Ambush at Dawn" exists
      And a <entity_type> named "<record_name>" exists
      And I am on the "/create" page
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      And I have opened the "<tab_name>" tab
      And I select the <entity_type> "<record_name>"
      When I click "New <entity_label>"
      Then no record should be selected in the visible library
      And the entity workspace should open in create mode for a new <entity_type>
      And the entity fields should be empty
      And the scenario workspace should continue showing the scenario "Ambush at Dawn"

      Examples:
        | tab_name | entity_label | entity_type | record_name    |
        | Effects  | Effect       | effect      | Barbarian Roar |
        | Spells   | Spell        | spell       | Fireball       |
        | Items    | Item         | item        | Iron Sword     |
        | Units    | Unit         | unit        | Barbarian      |

    Scenario: Start creating a new scenario
      Given a spell named "Fireball" exists
      And a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have loaded the spell "Fireball" in the entity workspace
      And I have opened the "Scenarios" tab
      And I click the edit button for the scenario "Ambush at Dawn"
      When I click "New Scenario"
      Then no record should be selected in the visible library
      And the scenario workspace should open in create mode for a new scenario
      And the scenario fields should be empty
      And the scenario workspace should display 4 empty rows
      And the entity workspace should continue showing the spell "Fireball"

  Rule: Unsaved changes are protected only when a workspace would be replaced

    Scenario: Switching tabs does not warn when entity changes are unsaved
      Given a spell named "Fireball" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      When I change the entity name field to "Fireball Updated"
      And I click the "Items" tab
      Then I should not be warned about unsaved changes
      And the "Items" tab should be selected
      And the entity workspace should continue showing "Fireball Updated"

    Scenario: Switching tabs does not warn when scenario changes are unsaved
      Given a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click the "Spells" tab
      Then I should not be warned about unsaved changes
      And the "Spells" tab should be selected
      And the scenario workspace should continue showing "Ambush at Dawn Updated"

    Scenario: Warn before selecting a different entity with unsaved changes
      Given spells named "Fireball" and "Battle Cry" exist
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      When I change the entity name field to "Fireball Updated"
      And I select the spell "Battle Cry"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different spell
      And the "Fireball" record should remain selected in the visible library
      And the entity workspace should continue showing "Fireball Updated"

    Scenario: Discard unsaved entity changes and load a different entity
      Given spells named "Fireball" and "Battle Cry" exist
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      When I change the entity name field to "Fireball Updated"
      And I select the spell "Battle Cry"
      And I choose to discard my unsaved changes
      Then the "Battle Cry" record should be selected in the visible library
      And the entity workspace should load the spell "Battle Cry" in edit mode

    Scenario: Warn before starting a new entity with unsaved changes
      Given a spell named "Fireball" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      When I change the entity name field to "Fireball Updated"
      And I click "New Spell"
      Then I should be warned about unsaved changes
      And I should be able to cancel creating a new spell
      And the "Fireball" record should remain selected in the visible library
      And the entity workspace should continue showing "Fireball Updated"

    Scenario: Warn before starting a different entity type with unsaved changes
      # Switching the tab itself does not trigger a warning; the warning fires
      # when the create action would replace the entity workspace.
      Given a spell named "Fireball" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I have loaded the spell "Fireball" in the entity workspace
      When I change the entity name field to "Fireball Updated"
      And I click the "Items" tab
      And I click "New Item"
      Then I should be warned about unsaved changes
      And I should be able to cancel creating a new item
      And the entity workspace should continue showing "Fireball Updated"

    Scenario: Warn before selecting a different scenario with unsaved changes
      Given scenarios named "Ambush at Dawn" and "Castle Siege" exist
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click the edit button for the scenario "Castle Siege"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different scenario
      And the "Ambush at Dawn" record should remain selected in the visible library
      And the scenario workspace should continue showing "Ambush at Dawn Updated"

    Scenario: Discard unsaved scenario changes and load a different scenario
      Given scenarios named "Ambush at Dawn" and "Castle Siege" exist
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click the edit button for the scenario "Castle Siege"
      And I choose to discard my unsaved changes
      Then the "Castle Siege" record should be selected in the visible library
      And the scenario workspace should load the scenario "Castle Siege" in edit mode

    Scenario: Warn before starting a new scenario with unsaved changes
      Given a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click "New Scenario"
      Then I should be warned about unsaved changes
      And I should be able to cancel creating a new scenario
      And the "Ambush at Dawn" record should remain selected in the visible library
      And the scenario workspace should continue showing "Ambush at Dawn Updated"

  Rule: The library list fills available space and scrolls on overflow

    Scenario: The library list area fills the available sidebar height
      Given I am on the "/create" page
      When I view the library panel
      Then the list area should fill available vertical space
      And the list area should scroll vertically when content overflows

  Rule: User interactions update URL search parameters

    Scenario: Changing the active tab updates the tab URL parameter
      Given I am on the "/create" page
      When I click the "Spells" tab
      Then the URL should contain "tab=Spells"

    Scenario Outline: Selecting an entity updates the URL with the type-specific ID parameter
      Given a <entity_type> named "<record_name>" exists
      And I am on the "/create" page
      And I have opened the "<tab_name>" tab
      When I select the <entity_type> "<record_name>"
      Then the URL should contain "<url_param>=" followed by the <entity_type> "<record_name>" id

      Examples:
        | tab_name | entity_type | record_name    | url_param |
        | Effects  | effect      | Barbarian Roar | effect_id |
        | Spells   | spell       | Fireball       | spell_id  |
        | Items    | item        | Iron Sword     | item_id   |
        | Units    | unit        | Barbarian      | unit_id   |

    Scenario: Selecting a scenario updates the scenario_id URL parameter
      Given a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      When I click the edit button for the scenario "Ambush at Dawn"
      Then the URL should contain "scenario_id=" followed by the scenario "Ambush at Dawn" id

    Scenario: Creating a new entity removes the entity ID parameter from the URL
      Given a spell named "Fireball" exists
      And I am on the "/create" page
      And I have opened the "Spells" tab
      And I select the spell "Fireball"
      When I click "New Spell"
      Then the URL should not contain "spell_id"

    Scenario: Creating a new scenario removes scenario_id from the URL
      Given a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page
      And I have opened the "Scenarios" tab
      And I click the edit button for the scenario "Ambush at Dawn"
      When I click "New Scenario"
      Then the URL should not contain "scenario_id"

    Scenario: Tab changes preserve existing entity ID and scenario_id parameters
      Given a spell named "Fireball" exists
      And a scenario named "Ambush at Dawn" exists
      And I am on the "/create" page with the spell "Fireball" and scenario "Ambush at Dawn" loaded via entity_id
      When I click the "Items" tab
      Then the URL should contain "tab=Items"
      And the URL should still contain the entity ID parameter
      And the URL should still contain "scenario_id"

    Scenario: URL parameters are updated without adding browser history entries
      Given I am on the "/create" page
      When I click the "Spells" tab
      Then the URL should be updated using replace (no new history entry)
