Feature: Scenario builder effects library tab
  As a game master
  I want the effects library tab to display a paginated, sortable list of saved effects
  So that I can browse, open, and manage my effects from one place

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Effects" tab

  # ─────────────────────────────────────────────
  # Rule: Each effect row displays its name, timing type, and effect type
  # ─────────────────────────────────────────────

  Rule: Each effect row displays its name, timing type, and effect type

    Scenario: Effects are displayed with name, timing type, and effect type
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      Then I should see a row for "Barbarian Roar" showing its name, timing type, and effect type
      And I should see a row for "Exhaust" showing its name, timing type, and effect type

    Scenario: Empty state is shown when no effects exist
      Given no effect records exist
      Then I should see an empty state message in the effects list

  # ─────────────────────────────────────────────
  # Rule: The list is paginated
  # ─────────────────────────────────────────────

  Rule: The effects list is paginated

    # The seed provides 7 effects. Pagination scenarios require more than one
    # page, so a factory generates additional records beyond the page size.
    Scenario: Effects are displayed one page at a time
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      Then I should see only the first page of effects
      And I should see pagination controls

    Scenario: Navigate to the next page
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      And I am viewing the first page
      When I click "Next page"
      Then I should see the second page of effects
      And the previously visible effects should no longer be shown

    Scenario: Navigate to the previous page
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      And I am viewing the second page
      When I click "Previous page"
      Then I should see the first page of effects

    Scenario: Previous page control is disabled on the first page
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      And I am viewing the first page
      Then the "Previous page" control should be disabled

    Scenario: Next page control is disabled on the last page
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      And I am viewing the last page
      Then the "Next page" control should be disabled

    Scenario: Pagination resets when sort order changes
      Given the seed effects exist
      And enough additional effects exist to exceed one page
      And I am viewing the second page
      When I change the sort order
      Then I should be returned to the first page

  # ─────────────────────────────────────────────
  # Rule: The list can be sorted
  # ─────────────────────────────────────────────

  Rule: The game master can sort effects by name, timing type, or effect type

    Scenario: Default sort order is by name ascending
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      Then the list should be sorted by name in ascending order
      And "Barbarian Roar" should appear before "Exhaust"

    Scenario: Sort by name descending
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      When I sort by "Name" descending
      Then "Exhaust" should appear before "Barbarian Roar"

    Scenario: Sort by timing type ascending
      # instant sorts before interval alphabetically
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000002 | Rage           | interval    | buff        |
        | a0000000-0000-0000-0000-000000000005 | Bandage        | interval    | healing     |
      When I sort by "Timing Type" ascending
      Then "Barbarian Roar" should appear before "Rage"
      And "Barbarian Roar" should appear before "Bandage"

    Scenario: Sort by timing type descending
      # interval sorts after instant, so interval records appear first when descending
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000002 | Rage           | interval    | buff        |
        | a0000000-0000-0000-0000-000000000005 | Bandage        | interval    | healing     |
      When I sort by "Timing Type" descending
      Then "Rage" should appear before "Barbarian Roar"
      And "Bandage" should appear before "Barbarian Roar"

    Scenario: Sort by effect type ascending
      # buff < damage < debuff < healing alphabetically
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
        | a0000000-0000-0000-0000-000000000004 | Mend           | instant     | healing     |
      When I sort by "Effect Type" ascending
      Then "Barbarian Roar" should appear before "Exhaust"
      And "Exhaust" should appear before "Mend"

    Scenario: Sort by effect type descending
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
        | a0000000-0000-0000-0000-000000000004 | Mend           | instant     | healing     |
      When I sort by "Effect Type" descending
      Then "Mend" should appear before "Exhaust"
      And "Exhaust" should appear before "Barbarian Roar"

    Scenario: Clicking the active sort column toggles direction
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      And the list is sorted by "Name" ascending
      When I click the "Name" sort control
      Then the list should be sorted by name in descending order

  # ─────────────────────────────────────────────
  # Rule: Selecting an effect opens it in the effect workspace
  # ─────────────────────────────────────────────

  Rule: Selecting an effect opens it in the effect workspace

    Scenario: Select an effect from the list
      Given the seed effect "Barbarian Roar" exists with id "a0000000-0000-0000-0000-000000000001"
      When I select the effect "Barbarian Roar"
      Then the "Barbarian Roar" record should be selected in the effects list
      And the effect workspace should load the effect "Barbarian Roar" in edit mode
      And the URL should contain "effect_id=a0000000-0000-0000-0000-000000000001"

    Scenario: Warn before opening a different effect with unsaved changes
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      And I have loaded the effect "Barbarian Roar" in the effect workspace
      When I change the effect name field to "Barbarian Roar Updated"
      And I select the effect "Exhaust"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different effect
      And the "Barbarian Roar" record should remain selected in the effects list
      And the effect workspace should continue showing "Barbarian Roar Updated"

    Scenario: Discard unsaved changes and open a different effect
      Given the seed effects exist:
        | id                                   | name           | timing_type | effect_type |
        | a0000000-0000-0000-0000-000000000001 | Barbarian Roar | instant     | buff        |
        | a0000000-0000-0000-0000-000000000003 | Exhaust        | instant     | debuff      |
      And I have loaded the effect "Barbarian Roar" in the effect workspace
      When I change the effect name field to "Barbarian Roar Updated"
      And I select the effect "Exhaust"
      And I choose to discard my unsaved changes
      Then the "Exhaust" record should be selected in the effects list
      And the effect workspace should load the effect "Exhaust" in edit mode

  # ─────────────────────────────────────────────
  # Rule: An individual effect can be deleted from the list
  # ─────────────────────────────────────────────

  Rule: An individual effect can be deleted from the list

    Scenario: Delete an effect that is not currently open
      Given the seed effect "Exhaust" exists with id "a0000000-0000-0000-0000-000000000003"
      And no effect is loaded in the effect workspace
      When I delete the effect "Exhaust"
      Then I should be asked to confirm the deletion
      When I confirm the deletion
      Then the effect "Exhaust" should no longer appear in the list
      And the effect workspace should remain empty

    Scenario: Cancel deletion of an effect
      Given the seed effect "Exhaust" exists with id "a0000000-0000-0000-0000-000000000003"
      When I delete the effect "Exhaust"
      And I cancel the deletion
      Then the effect "Exhaust" should still appear in the list

    Scenario: Delete the currently open effect
      Given the seed effect "Barbarian Roar" exists with id "a0000000-0000-0000-0000-000000000001"
      And I have loaded the effect "Barbarian Roar" in the effect workspace
      When I delete the effect "Barbarian Roar"
      And I confirm the deletion
      Then the effect "Barbarian Roar" should no longer appear in the list
      And the effect workspace should be cleared
      And the URL should not contain "effect_id"

    Scenario: Deleting the last effect on a page returns to the previous page
      Given the seed effects exist
      And enough additional effects exist to fill exactly two pages
      And I am viewing the second page
      And only one effect is visible on the second page
      When I delete that effect
      And I confirm the deletion
      Then I should be returned to the first page
      And the deleted effect should not appear
