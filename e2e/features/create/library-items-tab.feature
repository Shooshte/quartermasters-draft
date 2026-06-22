Feature: Scenario builder items library tab
  As a game master
  I want the items library tab to display a paginated, sortable list of saved items
  So that I can browse, open, and manage my items from one place

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Items" tab

  # ─────────────────────────────────────────────
  # Rule: Each item row displays its name and updated at
  # ─────────────────────────────────────────────

  Rule: Each item row displays its name and updated at

    Scenario: Items are displayed with name and updated at
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000002 | Oak Staff      |
      Then I should see a row for "Iron Sword" showing its name and updated at
      And I should see a row for "Oak Staff" showing its name and updated at

    Scenario: Empty state is shown when no items exist
      Given no item records exist
      Then I should see an empty state message in the items list

  Rule: The items list is paginated

    Scenario: Items are displayed one page at a time
      Given the seed items exist
      And enough additional items exist to exceed one page
      Then I should see only the first page of items
      And I should see pagination controls

    Scenario: Navigate to the next page
      Given the seed items exist
      And enough additional items exist to exceed one page
      And I am viewing the first page
      When I click "Next page"
      Then I should see the second page of items
      And the previously visible items should no longer be shown

    Scenario: Navigate to the previous page
      Given the seed items exist
      And enough additional items exist to exceed one page
      And I am viewing the second page
      When I click "Previous page"
      Then I should see the first page of items

    Scenario: Previous page control is disabled on the first page
      Given the seed items exist
      And enough additional items exist to exceed one page
      And I am viewing the first page
      Then the "Previous page" control should be disabled

    Scenario: Next page control is disabled on the last page
      Given the seed items exist
      And enough additional items exist to exceed one page
      And I am viewing the last page
      Then the "Next page" control should be disabled

    Scenario: Pagination resets when sort order changes
      Given the seed items exist
      And enough additional items exist to exceed one page
      And I am viewing the second page
      When I change the sort order
      Then I should be returned to the first page

  Rule: The game master can sort items by name or updated at

    Scenario: Default sort order is by name ascending
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      Then the list should be sorted by name in ascending order
      And "Iron Sword" should appear before "Leather Shield"

    Scenario: Sort by name descending
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      When I sort by "Name" descending
      Then "Leather Shield" should appear before "Iron Sword"

    Scenario: Sort by updated at ascending
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000002 | Oak Staff      |
      And "Iron Sword" was updated before "Oak Staff"
      When I sort by "Updated At" ascending
      Then "Iron Sword" should appear before "Oak Staff"

    Scenario: Sort by updated at descending
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000002 | Oak Staff      |
      And "Iron Sword" was updated before "Oak Staff"
      When I sort by "Updated At" descending
      Then "Oak Staff" should appear before "Iron Sword"

    Scenario: Clicking the active sort column toggles direction
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      And the list is sorted by "Name" ascending
      When I click the "Name" sort control
      Then the list should be sorted by name in descending order

  Rule: The game master can filter items by scenario linkage

    Scenario: Show all items when no linkage filter is enabled
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      When I show all entities in the entities explorer
      Then I should see the item "Iron Sword"
      And I should see the item "Leather Shield"

    Scenario: Show only items linked to a selected scenario through units
      Given scenario "Ambush at Dawn" has unit "Barbarian" assigned to the "melee" row
      And unit "Barbarian" links item "Iron Sword"
      And item "Leather Shield" is not linked to any unit
      When I filter the entities explorer to scenario "Ambush at Dawn"
      Then I should see the item "Iron Sword"
      And I should not see the item "Leather Shield"

    Scenario: Show only items that are not linked anywhere
      Given unit "Barbarian" links item "Iron Sword"
      And item "Leather Shield" is not linked to any unit
      When I filter the entities explorer to unlinked entities
      Then I should see the item "Leather Shield"
      And I should not see the item "Iron Sword"

    Scenario: Filtering only affects selectable rows in the entities explorer
      Given I have loaded the item "Iron Sword" in the item workspace
      And item "Leather Shield" is not linked to any unit
      When I filter the entities explorer to unlinked entities
      Then I should see the item "Leather Shield"
      And I should not see the item "Iron Sword"
      And the item workspace should remain loaded with "Iron Sword"

  Rule: Selecting an item opens it in the item workspace

    Scenario: Select an item from the list
      Given the seed item "Iron Sword" exists with id "d0000000-0000-0000-0000-000000000001"
      When I select the item "Iron Sword"
      Then the "Iron Sword" record should be selected in the items list
      And the item workspace should load the item "Iron Sword" in edit mode
      And the URL should contain "item_id=d0000000-0000-0000-0000-000000000001"

    Scenario: Warn before opening a different item with unsaved changes
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      And I have loaded the item "Iron Sword" in the item workspace
      When I change the item name field to "Iron Sword Updated"
      And I select the item "Leather Shield"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different item
      And the "Iron Sword" record should remain selected in the items list
      And the item workspace should continue showing "Iron Sword Updated"

    Scenario: Discard unsaved changes and open a different item
      Given the seed items exist:
        | id                                   | name           |
        | d0000000-0000-0000-0000-000000000001 | Iron Sword     |
        | d0000000-0000-0000-0000-000000000003 | Leather Shield |
      And I have loaded the item "Iron Sword" in the item workspace
      When I change the item name field to "Iron Sword Updated"
      And I select the item "Leather Shield"
      And I choose to discard my unsaved changes
      Then the "Leather Shield" record should be selected in the items list
      And the item workspace should load the item "Leather Shield" in edit mode

  Rule: An individual item can be deleted from the list

    Scenario: Delete an item that is not currently open
      Given the seed item "Leather Shield" exists with id "d0000000-0000-0000-0000-000000000003"
      And no item is loaded in the item workspace
      When I delete the item "Leather Shield"
      Then I should be asked to confirm the deletion
      When I confirm the deletion
      Then the item "Leather Shield" should no longer appear in the list
      And the item workspace should remain empty

    Scenario: Cancel deletion of an item
      Given the seed item "Leather Shield" exists with id "d0000000-0000-0000-0000-000000000003"
      When I delete the item "Leather Shield"
      And I cancel the deletion
      Then the item "Leather Shield" should still appear in the list

    Scenario: Delete the currently open item
      Given the seed item "Iron Sword" exists with id "d0000000-0000-0000-0000-000000000001"
      And I have loaded the item "Iron Sword" in the item workspace
      When I delete the item "Iron Sword"
      And I confirm the deletion
      Then the item "Iron Sword" should no longer appear in the list
      And the item workspace should be cleared
      And the URL should not contain "item_id"

    Scenario: Deleting the last item on a page returns to the previous page
      Given the seed items exist
      And enough additional items exist to fill exactly two pages
      And I am viewing the second page
      And only one item is visible on the second page
      When I delete that item
      And I confirm the deletion
      Then I should be returned to the first page
      And the deleted item should not appear
