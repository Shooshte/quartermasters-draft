Feature: Event-driven ATB action scheduling
  Scenario: All living bars advance proportionally to the next ready unit
    Given "Quick Fox" has speed 60 and action bar 0
    And "Slow Turtle" has speed 30 and action bar 0
    When the next ready batch is scheduled
    Then "Quick Fox" has action bar 100
    And "Slow Turtle" has action bar 50
    And the ready batch contains only "Quick Fox"

  Scenario: Equal readiness moments form one batch
    Given "Fast" has speed 20 and action bar 0
    And "Head Start" has speed 10 and action bar 50
    When the next ready batch is scheduled
    Then the ready batch contains "Fast" and "Head Start"

  Scenario: Zero effective speed schedules at the minimum speed
    Given "Frozen" has effective speed 0
    When the next ready batch is scheduled
    Then "Frozen" uses scheduling speed 1

  # Speed, scenario, row, and slot ordering remain the deterministic order for seeded
  # RNG consumption and battle logs. Exact scheduler ties are emitted by
  # ascending unit instance ID.
