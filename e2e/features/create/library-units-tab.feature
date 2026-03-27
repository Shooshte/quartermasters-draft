Feature: Scenario builder units library tab
  As a game master
  I want the units library tab to display a paginated, sortable list of saved units
  So that I can browse, open, and manage my units from one place

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Units" tab

  # ─────────────────────────────────────────────
  # Rule: Each unit row displays its name and updated at
  # ─────────────────────────────────────────────

  Rule: Each unit row displays its name and updated at

    Scenario: Units are displayed with name and updated at
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000003 | Ranger    |
      Then I should see a row for "Barbarian" showing its name and updated at
      And I should see a row for "Ranger" showing its name and updated at

    Scenario: Empty state is shown when no units exist
      Given no unit records exist
      Then I should see an empty state message in the units list

  # ─────────────────────────────────────────────
  # Rule: The list is paginated
  # ─────────────────────────────────────────────

  Rule: The units list is paginated

    # The seeded dataset now exceeds one page at the default 20-row page size.
    Scenario: Units are displayed one page at a time
      Given the seed units exist
      And enough additional units exist to exceed one page
      Then I should see only the first page of units
      And I should see pagination controls

    Scenario: Navigate to the next page
      Given the seed units exist
      And enough additional units exist to exceed one page
      And I am viewing the first page
      When I click "Next page"
      Then I should see the second page of units
      And the previously visible units should no longer be shown

    Scenario: Navigate to the previous page
      Given the seed units exist
      And enough additional units exist to exceed one page
      And I am viewing the second page
      When I click "Previous page"
      Then I should see the first page of units

    Scenario: Previous page control is disabled on the first page
      Given the seed units exist
      And enough additional units exist to exceed one page
      And I am viewing the first page
      Then the "Previous page" control should be disabled

    Scenario: Next page control is disabled on the last page
      Given the seed units exist
      And enough additional units exist to exceed one page
      And I am viewing the last page
      Then the "Next page" control should be disabled

    Scenario: Pagination resets when sort order changes
      Given the seed units exist
      And enough additional units exist to exceed one page
      And I am viewing the second page
      When I change the sort order
      Then I should be returned to the first page

  # ─────────────────────────────────────────────
  # Rule: The list can be sorted
  # ─────────────────────────────────────────────

  Rule: The game master can sort units by name or updated at

    Scenario: Default sort order is by name ascending
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      Then the list should be sorted by name in ascending order
      And "Barbarian" should appear before "Mage"

    Scenario: Sort by name descending
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      When I sort by "Name" descending
      Then "Mage" should appear before "Barbarian"

    Scenario: Sort by updated at ascending
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      And "Barbarian" was updated before "Mage"
      When I sort by "Updated At" ascending
      Then "Barbarian" should appear before "Mage"

    Scenario: Sort by updated at descending
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      And "Barbarian" was updated before "Mage"
      When I sort by "Updated At" descending
      Then "Mage" should appear before "Barbarian"

    Scenario: Clicking the active sort column toggles direction
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      And the list is sorted by "Name" ascending
      When I click the "Name" sort control
      Then the list should be sorted by name in descending order

  # ─────────────────────────────────────────────
  # Rule: Selecting a unit opens it in the unit workspace
  # ─────────────────────────────────────────────

  Rule: Selecting a unit opens it in the unit workspace

    Scenario: Select a unit from the list
      Given the seed unit "Barbarian" exists with id "f0000000-0000-0000-0000-000000000001"
      When I select the unit "Barbarian"
      Then the "Barbarian" record should be selected in the units list
      And the unit workspace should load the unit "Barbarian" in edit mode
      And the URL should contain "unit_id=f0000000-0000-0000-0000-000000000001"

    Scenario: Warn before opening a different unit with unsaved changes
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      And I have loaded the unit "Barbarian" in the unit workspace
      When I change the unit name field to "Barbarian Updated"
      And I select the unit "Mage"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different unit
      And the "Barbarian" record should remain selected in the units list
      And the unit workspace should continue showing "Barbarian Updated"

    Scenario: Discard unsaved changes and open a different unit
      Given the seed units exist:
        | id                                   | name      |
        | f0000000-0000-0000-0000-000000000001 | Barbarian |
        | f0000000-0000-0000-0000-000000000002 | Mage      |
      And I have loaded the unit "Barbarian" in the unit workspace
      When I change the unit name field to "Barbarian Updated"
      And I select the unit "Mage"
      And I choose to discard my unsaved changes
      Then the "Mage" record should be selected in the units list
      And the unit workspace should load the unit "Mage" in edit mode

  # ─────────────────────────────────────────────
  # Rule: An individual unit can be deleted from the list
  # ─────────────────────────────────────────────

  Rule: An individual unit can be deleted from the list

    Scenario: Delete a unit that is not currently open
      Given the seed unit "Ranger" exists with id "f0000000-0000-0000-0000-000000000003"
      And no unit is loaded in the unit workspace
      When I delete the unit "Ranger"
      Then I should be asked to confirm the deletion
      When I confirm the deletion
      Then the unit "Ranger" should no longer appear in the list
      And the unit workspace should remain empty

    Scenario: Cancel deletion of a unit
      Given the seed unit "Ranger" exists with id "f0000000-0000-0000-0000-000000000003"
      When I delete the unit "Ranger"
      And I cancel the deletion
      Then the unit "Ranger" should still appear in the list

    Scenario: Delete the currently open unit
      Given the seed unit "Barbarian" exists with id "f0000000-0000-0000-0000-000000000001"
      And I have loaded the unit "Barbarian" in the unit workspace
      When I delete the unit "Barbarian"
      And I confirm the deletion
      Then the unit "Barbarian" should no longer appear in the list
      And the unit workspace should be cleared
      And the URL should not contain "unit_id"

    Scenario: Deleting the last unit on a page returns to the previous page
      Given the seed units exist
      And enough additional units exist to fill exactly two pages
      And I am viewing the second page
      And only one unit is visible on the second page
      When I delete that unit
      And I confirm the deletion
      Then I should be returned to the first page
      And the deleted unit should not appear
