Feature: Scenario builder spells library tab
  As a game master
  I want the spells library tab to display a paginated, sortable list of saved spells
  So that I can browse, open, and manage my spells from one place

  Background:
    Given I am authenticated as a game master
    And I am on the "/create" page
    And I have opened the "Spells" tab

  # ─────────────────────────────────────────────
  # Rule: Each spell row displays its name, description, target policy, and updated at
  # ─────────────────────────────────────────────

  Rule: Each spell row displays its name, description, and target policy, and updated at

    Scenario: Spells are displayed with name, description, target policy, and updated at
      Given the seed spells exist:
        | id                                   | name     | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000003 | Healing Touch | Gently mends wounds, restoring health over time.                          | lowest_health  |
      Then I should see a row for "Fireball" showing its name, description, target policy, and updated at
      And I should see a row for "Healing Touch" showing its name, description, target policy, and updated at

    Scenario: Empty state is shown when no spells exist
      Given no spell records exist
      Then I should see an empty state message in the spells list

  # ─────────────────────────────────────────────
  # Rule: The list is paginated
  # ─────────────────────────────────────────────

  Rule: The spells list is paginated

    # The seeded dataset now exceeds one page at the default 20-row page size.
    Scenario: Spells are displayed one page at a time
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      Then I should see only the first page of spells
      And I should see pagination controls

    Scenario: Navigate to the next page
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      And I am viewing the first page
      When I click "Next page"
      Then I should see the second page of spells
      And the previously visible spells should no longer be shown

    Scenario: Navigate to the previous page
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      And I am viewing the second page
      When I click "Previous page"
      Then I should see the first page of spells

    Scenario: Previous page control is disabled on the first page
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      And I am viewing the first page
      Then the "Previous page" control should be disabled

    Scenario: Next page control is disabled on the last page
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      And I am viewing the last page
      Then the "Next page" control should be disabled

    Scenario: Pagination resets when sort order changes
      Given the seed spells exist
      And enough additional spells exist to exceed one page
      And I am viewing the second page
      When I change the sort order
      Then I should be returned to the first page

  # ─────────────────────────────────────────────
  # Rule: The list can be sorted
  # ─────────────────────────────────────────────

  Rule: The game master can sort spells by name, target policy, or updated at

    Scenario: Default sort order is by name ascending
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
      Then the list should be sorted by name in ascending order
      And "Battle Cry" should appear before "Fireball"

    Scenario: Sort by name descending
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
      When I sort by "Name" descending
      Then "Fireball" should appear before "Battle Cry"

    Scenario: Sort by target policy ascending
      # highest_health < lowest_health < random alphabetically
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000003 | Healing Touch | Gently mends wounds, restoring health over time.                               | lowest_health  |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      When I sort by "Target Policy" ascending
      Then "Fireball" should appear before "Healing Touch"
      And "Healing Touch" should appear before "Battle Cry"

    Scenario: Sort by target policy descending
      # random sorts after lowest_health, which sorts after highest_health,
      # so random records appear first when descending
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000003 | Healing Touch | Gently mends wounds, restoring health over time.                               | lowest_health  |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      When I sort by "Target Policy" descending
      Then "Battle Cry" should appear before "Healing Touch"
      And "Healing Touch" should appear before "Fireball"

    Scenario: Sort by updated at ascending
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      And "Fireball" was updated before "Battle Cry"
      When I sort by "Updated At" ascending
      Then "Fireball" should appear before "Battle Cry"

    Scenario: Sort by updated at descending
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      And "Fireball" was updated before "Battle Cry"
      When I sort by "Updated At" descending
      Then "Battle Cry" should appear before "Fireball"

    Scenario: Clicking the active sort column toggles direction
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
      And the list is sorted by "Name" ascending
      When I click the "Name" sort control
      Then the list should be sorted by name in descending order

  # ─────────────────────────────────────────────
  # Rule: Selecting a spell opens it in the spell workspace
  # ─────────────────────────────────────────────

  Rule: Selecting a spell opens it in the spell workspace

    Scenario: Select a spell from the list
      Given the seed spell "Fireball" exists with id "b0000000-0000-0000-0000-000000000001"
      When I select the spell "Fireball"
      Then the "Fireball" record should be selected in the spells list
      And the spell workspace should load the spell "Fireball" in edit mode
      And the URL should contain "spell_id=b0000000-0000-0000-0000-000000000001"

    Scenario: Warn before opening a different spell with unsaved changes
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      And I have loaded the spell "Fireball" in the spell workspace
      When I change the spell name field to "Fireball Updated"
      And I select the spell "Battle Cry"
      Then I should be warned about unsaved changes
      And I should be able to cancel loading the different spell
      And the "Fireball" record should remain selected in the spells list
      And the spell workspace should continue showing "Fireball Updated"

    Scenario: Discard unsaved changes and open a different spell
      Given the seed spells exist:
        | id                                   | name          | description                                                                    | target_policy  |
        | b0000000-0000-0000-0000-000000000001 | Fireball      | Hurls a ball of fire at the target, dealing instant arcane damage followed by burning. | highest_health |
        | b0000000-0000-0000-0000-000000000002 | Battle Cry    | A mighty roar that buffs the caster with increased melee damage.               | random         |
      And I have loaded the spell "Fireball" in the spell workspace
      When I change the spell name field to "Fireball Updated"
      And I select the spell "Battle Cry"
      And I choose to discard my unsaved changes
      Then the "Battle Cry" record should be selected in the spells list
      And the spell workspace should load the spell "Battle Cry" in edit mode

  # ─────────────────────────────────────────────
  # Rule: An individual spell can be deleted from the list
  # ─────────────────────────────────────────────

  Rule: An individual spell can be deleted from the list

    Scenario: Delete an unlinked spell that is not currently open
      Given the seed spell "Zenith Bloom" exists with id "b0000000-0000-0000-0000-000000000021"
      And no spell is loaded in the spell workspace
      When I delete the spell "Zenith Bloom"
      Then I should be asked to confirm the deletion
      When I confirm the deletion
      Then the spell "Zenith Bloom" should no longer appear in the list
      And the spell workspace should remain empty

    Scenario: Cancel deletion of a spell
      Given the seed spell "Zenith Bloom" exists with id "b0000000-0000-0000-0000-000000000021"
      When I delete the spell "Zenith Bloom"
      And I cancel the deletion
      Then the spell "Zenith Bloom" should still appear in the list

    Scenario: Cannot delete a spell that is linked to an item
      Given the seed spell "Fireball" exists with id "b0000000-0000-0000-0000-000000000001"
      And I have loaded the spell "Fireball" in the spell workspace
      When I delete the spell "Fireball"
      And I confirm the deletion
      Then I should see a linked-item dependency delete error
      And the spell "Fireball" should still appear in the list
      And the spell workspace should remain loaded

    Scenario: Delete the currently open unlinked spell
      Given the seed spell "Zenith Bloom" exists with id "b0000000-0000-0000-0000-000000000021"
      And I have loaded the spell "Zenith Bloom" in the spell workspace
      When I delete the spell "Zenith Bloom"
      And I confirm the deletion
      Then the spell "Zenith Bloom" should no longer appear in the list
      And the spell workspace should be cleared
      And the URL should not contain "spell_id"

    Scenario: Deleting the last spell on a page returns to the previous page
      Given the seed spells exist
      And enough additional spells exist to fill exactly two pages
      And I am viewing the second page
      And only one spell is visible on the second page
      When I delete that spell
      And I confirm the deletion
      Then I should be returned to the first page
      And the deleted spell should not appear
