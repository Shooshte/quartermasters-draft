Feature: Scenario builder scenarios library tab
  As a game master
  I want the scenarios library tab to display a paginated, sortable list of saved scenarios
  So that I can browse, open, and manage my scenarios from one place

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Scenarios" tab

  # ─────────────────────────────────────────────
  # Rule: Each scenario row displays its name and last update date
  # ─────────────────────────────────────────────

  Rule: Each scenario row displays its name and last update date

    Scenario: Scenarios are displayed with name and last update date
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      Then I should see a row for "Ambush at Dawn" showing its name and last update date
      And I should see a row for "Castle Siege" showing its name and last update date

    Scenario: Empty state is shown when no scenarios exist
      Given no scenario records exist
      Then I should see an empty state message in the scenarios list

  # ─────────────────────────────────────────────
  # Rule: The list is paginated
  # ─────────────────────────────────────────────

  Rule: The scenarios list is paginated

    # The seeded dataset now exceeds one page at the default 20-row page size.
    Scenario: Scenarios are displayed one page at a time
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      Then I should see only the first page of scenarios
      And I should see pagination controls

    Scenario: Navigate to the next page
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      And I am viewing the first page
      When I click "Next page"
      Then I should see the second page of scenarios
      And the previously visible scenarios should no longer be shown

    Scenario: Navigate to the previous page
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      And I am viewing the second page
      When I click "Previous page"
      Then I should see the first page of scenarios

    Scenario: Previous page control is disabled on the first page
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      And I am viewing the first page
      Then the "Previous page" control should be disabled

    Scenario: Next page control is disabled on the last page
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      And I am viewing the last page
      Then the "Next page" control should be disabled

    Scenario: Pagination resets when sort order changes
      Given the seed scenarios exist
      And enough additional scenarios exist to exceed one page
      And I am viewing the second page
      When I change the sort order
      Then I should be returned to the first page

  # ─────────────────────────────────────────────
  # Rule: The list can be sorted
  # ─────────────────────────────────────────────

  Rule: The game master can sort scenarios by name or last update date

    Scenario: Default sort order is by name ascending
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      Then the list should be sorted by name in ascending order
      And "Ambush at Dawn" should appear before "Castle Siege"

    Scenario: Sort by name descending
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      When I sort by "Name" descending
      Then "Castle Siege" should appear before "Ambush at Dawn"

    Scenario: Sort by last update date ascending
      # Seed scenarios share the same DB-assigned updatedAt timestamp.
      # This scenario requires scenarios with distinct update dates,
      # so additional records are created with explicit timestamps.
      Given the following scenarios exist with explicit update dates:
        | name              | updated_at           |
        | Ambush at Dawn    | 2025-04-01T00:00:00Z |
        | Castle Siege      | 2025-05-01T00:00:00Z |
        | Zombie Horde      | 2025-06-01T00:00:00Z |
      When I sort by "Last Update" ascending
      Then "Ambush at Dawn" should appear before "Castle Siege"
      And "Castle Siege" should appear before "Zombie Horde"

    Scenario: Sort by last update date descending
      Given the following scenarios exist with explicit update dates:
        | name              | updated_at           |
        | Ambush at Dawn    | 2025-04-01T00:00:00Z |
        | Castle Siege      | 2025-05-01T00:00:00Z |
        | Zombie Horde      | 2025-06-01T00:00:00Z |
      When I sort by "Last Update" descending
      Then "Zombie Horde" should appear before "Castle Siege"
      And "Castle Siege" should appear before "Ambush at Dawn"

    Scenario: Clicking the active sort column toggles direction
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      And the list is sorted by "Name" ascending
      When I click the "Name" sort control
      Then the list should be sorted by name in descending order

  # ─────────────────────────────────────────────
  # Rule: The game master can filter scenarios by linkage
  # ─────────────────────────────────────────────

  Rule: The game master can filter scenarios by linkage

    Scenario: Show all scenarios when no linkage filter is enabled
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      When I show all entities in the entities explorer
      Then I should see the scenario "Ambush at Dawn"
      And I should see the scenario "Castle Siege"

    Scenario: Show only scenarios that have linked units
      Given scenario "Ambush at Dawn" has unit "Barbarian" assigned to the "melee" row
      And scenario "Silent Outpost" has no assigned units
      When I filter the entities explorer to linked entities
      Then I should see the scenario "Ambush at Dawn"
      And I should not see the scenario "Silent Outpost"

    Scenario: Show only scenarios that have no linked units
      Given scenario "Ambush at Dawn" has unit "Barbarian" assigned to the "melee" row
      And scenario "Silent Outpost" has no assigned units
      When I filter the entities explorer to unlinked entities
      Then I should see the scenario "Silent Outpost"
      And I should not see the scenario "Ambush at Dawn"

    Scenario: Filtering only affects selectable rows in the entities explorer
      Given I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      And scenario "Silent Outpost" has no assigned units
      When I filter the entities explorer to unlinked entities
      Then I should see the scenario "Silent Outpost"
      And I should not see the scenario "Ambush at Dawn"
      And the scenario workspace should remain loaded with "Ambush at Dawn"

  # ─────────────────────────────────────────────
  # Rule: Selecting a scenario opens it in the scenario workspace
  # ─────────────────────────────────────────────

  Rule: Selecting a scenario opens it in the scenario workspace

    Scenario: Select a scenario from the list
      Given the seed scenario "Ambush at Dawn" exists with id "a2000000-0000-0000-0000-000000000001"
      When I click the edit button for the scenario "Ambush at Dawn"
      Then the "Ambush at Dawn" record should be selected in the scenarios list
      And the scenario workspace should load the scenario "Ambush at Dawn" in edit mode
      And the URL should contain "scenario_id=a2000000-0000-0000-0000-000000000001"

    Scenario: Warn before opening a different scenario with unsaved changes
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click the edit button for the scenario "Castle Siege"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different scenario
      And the "Ambush at Dawn" record should remain selected in the scenarios list
      And the scenario workspace should continue showing "Ambush at Dawn Updated"

    Scenario: Discard unsaved changes and open a different scenario
      Given the seed scenarios exist:
        | id                                   | name           |
        | a2000000-0000-0000-0000-000000000001 | Ambush at Dawn |
        | a2000000-0000-0000-0000-000000000002 | Castle Siege   |
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I change the scenario name field to "Ambush at Dawn Updated"
      And I click the edit button for the scenario "Castle Siege"
      And I choose to discard my unsaved changes
      Then the "Castle Siege" record should be selected in the scenarios list
      And the scenario workspace should load the scenario "Castle Siege" in edit mode

  # ─────────────────────────────────────────────
  # Rule: An individual scenario can be deleted from the list
  # ─────────────────────────────────────────────

  Rule: An individual scenario can be deleted from the list

    Scenario: Delete a scenario that is not currently open
      Given the seed scenario "Castle Siege" exists with id "a2000000-0000-0000-0000-000000000002"
      And no scenario is loaded in the scenario workspace
      When I delete the scenario "Castle Siege"
      Then I should be asked to confirm the deletion
      When I confirm the deletion
      Then the scenario "Castle Siege" should no longer appear in the list
      And the scenario workspace should remain empty

    Scenario: Cancel deletion of a scenario
      Given the seed scenario "Castle Siege" exists with id "a2000000-0000-0000-0000-000000000002"
      When I delete the scenario "Castle Siege"
      And I cancel the deletion
      Then the scenario "Castle Siege" should still appear in the list

    Scenario: Delete the currently open scenario
      Given the seed scenario "Ambush at Dawn" exists with id "a2000000-0000-0000-0000-000000000001"
      And I have loaded the scenario "Ambush at Dawn" in the scenario workspace
      When I delete the scenario "Ambush at Dawn"
      And I confirm the deletion
      Then the scenario "Ambush at Dawn" should no longer appear in the list
      And the scenario workspace should be cleared
      And the URL should not contain "scenario_id"

    Scenario: Deleting the last scenario on a page returns to the previous page
      Given the seed scenarios exist
      And enough additional scenarios exist to fill exactly two pages
      And I am viewing the second page
      And only one scenario is visible on the second page
      When I delete that scenario
      And I confirm the deletion
      Then I should be returned to the first page
      And the deleted scenario should not appear
