Feature: Battle win conditions
  A battle runs tick-by-tick until one of these conditions is met:
    - All units on one side reach 0 HP (last army standing).
    - All units on both sides reach 0 HP on the same tick (draw).
    - A fatigue threshold is reached and escalating damage forces termination.
  Additional rules:
    - A unit killed during simultaneous resolution within a tick does NOT act
      later in that same tick.
    - If one side starts with no units, the other side wins immediately
      (no ticks are simulated).

  Background:
    Given the fatigue tick threshold is 100
    And fatigue damage starts at 1 and increases by 1 each tick after the threshold

  # ──────────────────────────────────────────────
  # Scenario 1 — Army A wins when all Army B units die
  # ──────────────────────────────────────────────
  Scenario: Army A wins when all Army B units are eliminated
    Given army A has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank  | 200    | 50       | 0         | 10    | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank  | 100    | 10       | 0         | 5     | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And all army B units should have 0 HP
    And at least one army A unit should have HP greater than 0

  # ──────────────────────────────────────────────
  # Scenario 2 — Army B wins when all Army A units die
  # ──────────────────────────────────────────────
  Scenario: Army B wins when all Army A units are eliminated
    Given army A has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank  | 100    | 10       | 0         | 5     | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank  | 200    | 50       | 0         | 10    | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be "B"
    And all army A units should have 0 HP
    And at least one army B unit should have HP greater than 0

  # ──────────────────────────────────────────────
  # Scenario 3 — Draw when both armies die on the same tick
  # ──────────────────────────────────────────────
  Scenario: Both armies eliminated on the same tick results in a draw
    Given army A has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank  | 50     | 50       | 0         | 10    | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank  | 50     | 50       | 0         | 10    | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be null
    And all army A units should have 0 HP
    And all army B units should have 0 HP

  # ──────────────────────────────────────────────
  # Scenario 4 — Army A has no units, Army B wins immediately
  # ──────────────────────────────────────────────
  Scenario: Army B wins immediately when Army A has no units
    Given army A has no units
    And army B has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank  | 100    | 30       | 0         | 10    | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be "B"
    And the battle should end on tick 0

  # ──────────────────────────────────────────────
  # Scenario 5 — Army B has no units, Army A wins immediately
  # ──────────────────────────────────────────────
  Scenario: Army A wins immediately when Army B has no units
    Given army A has the following units:
      | id  | row   | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank  | 100    | 30       | 0         | 10    | 0         | 0        | 0     | 0              |
    And army B has no units
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And the battle should end on tick 0

  # ──────────────────────────────────────────────
  # Scenario 6 — Fatigue damage begins after the tick threshold
  # ──────────────────────────────────────────────
  Scenario: Fatigue damage begins after the tick threshold
    Given the fatigue tick threshold is 100
    And army A has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | support | 9999   | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | support | 9999   | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    When the battle is simulated to tick 99
    Then unit "a-1" should have 9999 HP
    And unit "b-1" should have 9999 HP
    When the battle is simulated to tick 100
    Then unit "a-1" should have 9998 HP
    And unit "b-1" should have 9998 HP

  # ──────────────────────────────────────────────
  # Scenario 7 — Fatigue damage escalates over time
  # ──────────────────────────────────────────────
  Scenario: Fatigue damage escalates each tick after the threshold
    Given the fatigue tick threshold is 100
    And army A has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | support | 9999   | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | support | 9999   | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    When the battle is simulated to tick 103
    Then the fatigue damage applied on tick 100 should be 1
    And the fatigue damage applied on tick 101 should be 2
    And the fatigue damage applied on tick 102 should be 3
    And the fatigue damage applied on tick 103 should be 4
    And unit "a-1" should have 9989 HP
    And unit "b-1" should have 9989 HP

  # ──────────────────────────────────────────────
  # Scenario 8 — Fatigue guarantees battle termination
  # ──────────────────────────────────────────────
  Scenario: Fatigue eventually kills all units guaranteeing battle termination
    Given the fatigue tick threshold is 100
    And army A has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | support | 500    | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | support | 500    | 0        | 0         | 1     | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be null
    And the battle should have ended
    And all army A units should have 0 HP
    And all army B units should have 0 HP

  # ──────────────────────────────────────────────
  # Scenario 9 — Dead unit does not act later in the same tick
  # ──────────────────────────────────────────────
  Scenario: Unit killed mid-tick does not act later in the same tick
    Given army A has the following units:
      | id  | row  | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank | 200    | 100      | 0         | 20    | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row  | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank | 100    | 5        | 0         | 15    | 0         | 0        | 0     | 0              |
      | b-2 | tank | 100    | 50       | 0         | 1     | 0         | 0        | 0     | 0              |
    When the battle simulates tick 1
    Then unit "b-1" should have been killed by unit "a-1"
    And unit "b-1" should not have acted after being killed
    And the battle log should not contain a damage event from "b-1" after "b-1" was killed in the same tick

  # ──────────────────────────────────────────────
  # Scenario 10 — Multiple units dying across different rows
  # ──────────────────────────────────────────────
  Scenario: Multiple units dying across different rows still determines correct winner
    Given army A has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | a-1 | tank    | 300    | 40       | 0         | 10    | 0         | 0        | 0     | 0              |
      | a-2 | melee   | 150    | 60       | 0         | 12    | 0         | 0        | 0     | 0              |
      | a-3 | ranged  | 100    | 0        | 80        | 8     | 0         | 0        | 0     | 0              |
    And army B has the following units:
      | id  | row     | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | b-1 | tank    | 100    | 20       | 0         | 5     | 0         | 0        | 0     | 0              |
      | b-2 | melee   | 80     | 25       | 0         | 6     | 0         | 0        | 0     | 0              |
      | b-3 | support | 60     | 0        | 0         | 3     | 0         | 0        | 0     | 0              |
    When the battle is resolved
    Then the battle result winnerId should be "A"
    And all army B units should have 0 HP
    And at least one army A unit should have HP greater than 0
