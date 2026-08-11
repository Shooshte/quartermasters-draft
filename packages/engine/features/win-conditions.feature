Feature: Battle win conditions
  A battle advances directly to the next ready action batch until one army survives or action-limit
  fatigue eliminates the remaining units. Every action planned from the same snapshot commits.

  Background:
    Given the default fatigue action threshold is 500 resolved actions
    And fatigue damage starts at 1 and increases by 1 for each resolved action after the threshold

  Scenario: Army A wins when all Army B units are eliminated
    Given army A has the following units:
      | id  | row | health | meleeDmg | speed |
      | a-1 | tank | 200 | 50 | 10 |
    And army B has the following units:
      | id  | row | health | meleeDmg | speed |
      | b-1 | tank | 100 | 10 | 5 |
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And all army B units should have 0 HP
    And at least one army A unit should have HP greater than 0

  Scenario: Army B wins when all Army A units are eliminated
    Given army A has the following units:
      | id  | row | health | meleeDmg | speed |
      | a-1 | tank | 100 | 10 | 5 |
    And army B has the following units:
      | id  | row | health | meleeDmg | speed |
      | b-1 | tank | 200 | 50 | 10 |
    When the battle is resolved
    Then the battle result winnerId should be "B"
    And all army A units should have 0 HP
    And at least one army B unit should have HP greater than 0

  Scenario: Equal-readiness lethal actions both complete and produce a draw
    Given army A has unit "a-1" with 50 health, 50 melee damage, and 10 speed
    And army B has unit "b-1" with 50 health, 50 melee damage, and 10 speed
    When the next ready batch is resolved
    Then both units should have acted once
    And actionCount should be 2
    And both units should have 0 HP
    And the battle result winnerId should be null

  Scenario: A due periodic effect removes a ready unit before planning
    Given unit "b-1" is ready to act
    And a due periodic effect will reduce "b-1" to 0 HP
    When the next ready batch is resolved
    Then unit "b-1" should not perform a normal action
    And actionCount should not include an action for "b-1"

  Scenario: A scenario with no units loses immediately
    Given army A has no units
    And army B has one living unit
    When the battle is resolved
    Then the battle result winnerId should be "B"
    And actionsResolved should be 0
    And batchCount should be 0

  Scenario: Army B with no units loses immediately
    Given army A has one living unit
    And army B has no units
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And actionsResolved should be 0
    And batchCount should be 0

  Scenario: Fatigue starts only after the configured action threshold
    Given the fatigue action threshold is 2
    And two zero-damage units become ready together in every batch
    When the first ready batch is resolved
    Then actionCount should be 2
    And no fatigue damage should be applied
    When the second ready batch is resolved
    Then actionCount should be 4
    And each survivor should take 3 aggregate fatigue damage for action ordinals 3 and 4

  Scenario: The default action limit is 500 resolved actions
    Given two zero-damage units become ready together in every batch
    When 500 total actions have resolved
    Then no fatigue damage should be applied
    When the next two actions resolve
    Then each survivor should take 3 aggregate action-limit fatigue damage

  Scenario: Action-limit fatigue guarantees termination for zero-speed units
    Given army A has one zero-speed and zero-damage unit
    And army B has one zero-speed and zero-damage unit
    And the fatigue action threshold is 2
    When the battle is resolved
    Then the battle should finish as a draw
    And the terminal output should describe the action limit, not a tick limit

  Scenario: Multiple units across rows still determine the correct winner
    Given army A has the following units:
      | id  | row | health | meleeDmg | rangedDmg | speed |
      | a-1 | tank | 300 | 40 | 0 | 10 |
      | a-2 | melee | 150 | 60 | 0 | 12 |
      | a-3 | ranged | 100 | 0 | 80 | 8 |
    And army B has the following units:
      | id  | row | health | meleeDmg | rangedDmg | speed |
      | b-1 | tank | 100 | 20 | 0 | 5 |
      | b-2 | melee | 80 | 25 | 0 | 6 |
      | b-3 | support | 60 | 0 | 0 | 3 |
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And all army B units should have 0 HP
    And at least one army A unit should have HP greater than 0
