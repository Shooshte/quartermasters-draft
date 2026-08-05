Feature: Unit target selection
  A unit supplies targeting for every effect-bearing item it activates.

  Scenario: Target side selects allies, enemies, or only self
    Given "Knight" targets allies using "lowest_health"
    When "Knight" selects targets
    Then all selected targets are allies
    Given "Knight" targets enemies using "highest_health"
    When "Knight" selects targets
    Then all selected targets are enemies
    Given "Knight" targets self using "self"
    When "Knight" selects targets
    Then the only selected target is "Knight"

  Scenario Outline: Each target policy chooses candidates deterministically
    Given "Knight" targets enemies using "<policy>"
    When "Knight" selects targets with seed 42
    Then targets follow the "<policy>" policy

    Examples:
      | policy         |
      | highest_health |
      | lowest_health  |
      | highest_damage |
      | random         |
      | self           |

  Scenario: Self policy is not valid for enemy targeting
    Given "Knight" targets enemies using "self"
    Then the targeting configuration is invalid

  Scenario: Target rows are selected front to back and skip empty rows
    Given "Knight" targets enemies using "highest_health" across 2 rows
    When "Knight" selects targets
    Then targets come from the two frontmost occupied eligible rows

  Scenario: A whole-row policy selects every living unit in each selected row
    Given "Knight" targets enemies using "highest_health" across 2 rows with no per-row limit
    When "Knight" selects targets
    Then every living unit in the selected rows is targeted

  Scenario: A limited per-row policy selects only its allowed count
    Given "Knight" targets enemies using "highest_health" across 2 rows with 1 target per row
    When "Knight" selects targets
    Then exactly one target is selected from each selected row

  Scenario: Adjacent targeting selects contiguous positions around the primary target
    Given "Knight" targets enemies using "highest_health" with 3 adjacent targets per row
    When "Knight" selects targets
    Then targets are contiguous around the primary target

  Scenario: Allowed rows restrict selection and an empty allowed-row list means all rows
    Given "Knight" targets enemies using "highest_health" with only "tank" and "melee" eligible
    When "Knight" selects targets
    Then every selected target is in an eligible row
    Given "Knight" has no allowed-row restrictions
    When "Knight" selects targets
    Then every row is eligible

  Scenario: Dead units are never eligible targets
    Given a dead enemy is in an otherwise eligible row
    When "Knight" selects targets
    Then the dead enemy is not selected

  Scenario: Random targeting is reproducible for the same seed
    Given "Knight" targets enemies using "random"
    When "Knight" selects targets twice with seed 42
    Then both selections are identical
