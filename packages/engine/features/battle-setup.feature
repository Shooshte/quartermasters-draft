Feature: Battle initialization and validation
  As the battle engine
  I want to correctly initialize battle state from two scenarios, a seed, and optional targeting overrides
  So that every battle starts with a consistent, predictable, and valid game state

  Background:
    Given a unit "Templar" with base stats:
      | meleeDmg       | 20   |
      | health         | 150  |
      | rangedDmg      | 0    |
      | manaRegen      | 1    |
      | spellDmg       | 0    |
      | speed          | 0.8  |
      | dodge          | 5    |
      | criticalChance | 10   |
    And a unit "Archer" with base stats:
      | meleeDmg       | 5    |
      | health         | 80   |
      | rangedDmg      | 25   |
      | manaRegen      | 2    |
      | spellDmg       | 0    |
      | speed          | 1.2  |
      | dodge          | 12   |
      | criticalChance | 18   |
    And a unit "Mage" with base stats:
      | meleeDmg       | 3    |
      | health         | 60   |
      | rangedDmg      | 0    |
      | manaRegen      | 5    |
      | spellDmg       | 30   |
      | speed          | 1.0  |
      | dodge          | 8    |
      | criticalChance | 6    |
    And a unit "Cleric" with base stats:
      | meleeDmg       | 2    |
      | health         | 70   |
      | rangedDmg      | 0    |
      | manaRegen      | 6    |
      | spellDmg       | 15   |
      | speed          | 0.9  |
      | dodge          | 4    |
      | criticalChance | 3    |
    And a unit "Barbarian" with base stats:
      | meleeDmg       | 28   |
      | health         | 120  |
      | rangedDmg      | 0    |
      | manaRegen      | 0    |
      | spellDmg       | 0    |
      | speed          | 1.1  |
      | dodge          | 6    |
      | criticalChance | 15   |
    And an item "Iron Sword" with stats:
      | meleeDmg       | 10   |
      | rangedDmg      | 0    |
      | spellDmg       | 0    |
      | manaRegen      | 0    |
      | dodge          | 0    |
      | criticalChance | 5    |
    And an item "Oak Shield" with stats:
      | meleeDmg       | 0    |
      | rangedDmg      | 0    |
      | spellDmg       | 0    |
      | manaRegen      | 0    |
      | dodge          | 8    |
      | criticalChance | 0    |
    And an item "Crystal Staff" with stats:
      | meleeDmg       | 0    |
      | rangedDmg      | 0    |
      | spellDmg       | 12   |
      | manaRegen      | 3    |
      | dodge          | 0    |
      | criticalChance | 2    |

  # ── Full initialization ──────────────────────────────────────────────

  Rule: Two scenarios with units in all four rows initialize correctly

    Scenario: Full battle initialization with all rows populated
      Given scenario "Alpha" with rows:
        | row     | slot | unit    |
        | tank    | 1    | Templar |
        | melee   | 1    | Barbarian |
        | ranged  | 1    | Archer  |
        | support | 1    | Cleric  |
      And scenario "Bravo" with rows:
        | row     | slot | unit    |
        | tank    | 1    | Templar |
        | melee   | 1    | Barbarian |
        | ranged  | 1    | Archer  |
        | support | 1    | Mage    |
      When the battle is initialized with seed 42
      Then the battle state should contain scenario "Alpha" with 4 rows and 4 total units
      And the battle state should contain scenario "Bravo" with 4 rows and 4 total units

  # ── Action bar starts at zero ────────────────────────────────────────

  Rule: All units start with action bar at 0

    Scenario: Action bar is zero for every unit at initialization
      Given scenario "Alpha" with rows:
        | row     | slot | unit      |
        | tank    | 1    | Templar   |
        | melee   | 1    | Barbarian |
        | ranged  | 1    | Archer    |
        | support | 1    | Cleric    |
      And scenario "Bravo" with rows:
        | row     | slot | unit      |
        | melee   | 1    | Barbarian |
      When the battle is initialized with seed 7
      Then every unit in the battle state should have actionBar equal to 0

  # ── Mana starts at zero ─────────────────────────────────────────────

  Rule: All units start with mana at 0

    Scenario: Mana is zero for every unit at initialization
      Given scenario "Alpha" with rows:
        | row     | slot | unit      |
        | tank    | 1    | Templar   |
        | ranged  | 1    | Archer    |
        | support | 1    | Cleric    |
      And scenario "Bravo" with rows:
        | row     | slot | unit   |
        | support | 1    | Mage   |
      When the battle is initialized with seed 99
      Then every unit in the battle state should have mana equal to 0

  # ── Health equals base stat ─────────────────────────────────────────

  Rule: Units start with health equal to their base health stat

    Scenario: Each unit's current health matches its base health
      Given scenario "Alpha" with rows:
        | row     | slot | unit      |
        | tank    | 1    | Templar   |
        | melee   | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row     | slot | unit   |
        | ranged  | 1    | Archer |
        | support | 1    | Mage   |
      When the battle is initialized with seed 1
      Then "Templar" in scenario "Alpha" should have currentHealth equal to 150
      And "Barbarian" in scenario "Alpha" should have currentHealth equal to 120
      And "Archer" in scenario "Bravo" should have currentHealth equal to 80
      And "Mage" in scenario "Bravo" should have currentHealth equal to 60

  # ── Partially filled rows ───────────────────────────────────────────

  Rule: Scenarios with partially filled rows initialize correctly

    Scenario: A scenario with only melee and support rows populated
      Given scenario "Alpha" with rows:
        | row     | slot | unit      |
        | melee   | 1    | Barbarian |
        | support | 1    | Cleric    |
      And scenario "Bravo" with rows:
        | row     | slot | unit   |
        | ranged  | 1    | Archer |
      When the battle is initialized with seed 55
      Then the battle state should contain scenario "Alpha" with 2 rows and 2 total units
      And the battle state should contain scenario "Bravo" with 1 rows and 1 total units
      And the "tank" row in scenario "Alpha" should be empty
      And the "ranged" row in scenario "Alpha" should be empty

  # ── Empty rows ──────────────────────────────────────────────────────

  Rule: Scenarios with empty rows are represented correctly

    Scenario: Empty rows are preserved in battle state
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed 12
      Then the "tank" row in scenario "Alpha" should be empty
      And the "ranged" row in scenario "Alpha" should be empty
      And the "support" row in scenario "Alpha" should be empty
      And the "tank" row in scenario "Bravo" should be empty
      And the "melee" row in scenario "Bravo" should be empty
      And the "support" row in scenario "Bravo" should be empty

  # ── Multiple units in the same row ──────────────────────────────────

  Rule: Multiple units in the same row occupy distinct slots

    Scenario: Three units in the melee row occupy slots 1, 2, and 3
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
        | melee | 2    | Templar   |
        | melee | 3    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
        | ranged | 2    | Archer |
      When the battle is initialized with seed 77
      Then the "melee" row in scenario "Alpha" should contain 3 units
      And slot 1 in the "melee" row of scenario "Alpha" should be "Barbarian"
      And slot 2 in the "melee" row of scenario "Alpha" should be "Templar"
      And slot 3 in the "melee" row of scenario "Alpha" should be "Barbarian"
      And the "ranged" row in scenario "Bravo" should contain 2 units
      And slot 1 in the "ranged" row of scenario "Bravo" should be "Archer"
      And slot 2 in the "ranged" row of scenario "Bravo" should be "Archer"

  # ── Item stat bonuses are additive ──────────────────────────────────

  Rule: Item stat bonuses are additive with unit base stats at initialization

    Scenario: A unit with one item has base stats plus item bonuses
      Given unit "Templar" has items in priority order:
        | priority | item       |
        | 1        | Iron Sword |
      And scenario "Alpha" with rows:
        | row  | slot | unit    |
        | tank | 1    | Templar |
      And scenario "Bravo" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      When the battle is initialized with seed 5
      Then "Templar" in scenario "Alpha" should have effective meleeDmg equal to 30
      And "Templar" in scenario "Alpha" should have effective criticalChance equal to 15
      And "Templar" in scenario "Alpha" should have effective dodge equal to 5

    Scenario: A unit with multiple items accumulates all bonuses additively
      Given unit "Templar" has items in priority order:
        | priority | item        |
        | 1        | Iron Sword  |
        | 2        | Oak Shield  |
      And scenario "Alpha" with rows:
        | row  | slot | unit    |
        | tank | 1    | Templar |
      And scenario "Bravo" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      When the battle is initialized with seed 8
      Then "Templar" in scenario "Alpha" should have effective meleeDmg equal to 30
      And "Templar" in scenario "Alpha" should have effective dodge equal to 13
      And "Templar" in scenario "Alpha" should have effective criticalChance equal to 15

    Scenario: A unit with no items uses only base stats
      Given unit "Barbarian" has no items
      And scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed 3
      Then "Barbarian" in scenario "Alpha" should have effective meleeDmg equal to 28
      And "Barbarian" in scenario "Alpha" should have effective dodge equal to 6
      And "Barbarian" in scenario "Alpha" should have effective criticalChance equal to 15

    Scenario: Item bonuses apply per-unit independently across scenarios
      Given unit "Mage" has items in priority order:
        | priority | item          |
        | 1        | Crystal Staff |
      And scenario "Alpha" with rows:
        | row     | slot | unit |
        | support | 1    | Mage |
      And scenario "Bravo" with rows:
        | row     | slot | unit |
        | support | 1    | Mage |
      When the battle is initialized with seed 21
      Then "Mage" in scenario "Alpha" should have effective spellDmg equal to 42
      And "Mage" in scenario "Alpha" should have effective manaRegen equal to 8
      And "Mage" in scenario "Alpha" should have effective criticalChance equal to 8
      And "Mage" in scenario "Bravo" should have effective spellDmg equal to 42
      And "Mage" in scenario "Bravo" should have effective manaRegen equal to 8

  # ── Per-unit targeting overrides ────────────────────────────────────

  Rule: Per-unit targeting policy overrides are stored at initialization

    Scenario: Targeting override is stored for a specific unit
      Given scenario "Alpha" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      And scenario "Bravo" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And a targeting override for "Archer" in scenario "Alpha" row "ranged" slot 1 with policy "lowest_health"
      When the battle is initialized with seed 10
      Then "Archer" at row "ranged" slot 1 in scenario "Alpha" should have targetingOverride "lowest_health"

    Scenario: Units without targeting overrides use no override
      Given scenario "Alpha" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      And scenario "Bravo" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      When the battle is initialized with seed 10
      Then "Archer" at row "ranged" slot 1 in scenario "Alpha" should have no targetingOverride
      And "Barbarian" at row "melee" slot 1 in scenario "Bravo" should have no targetingOverride

    Scenario: Multiple targeting overrides across both scenarios
      Given scenario "Alpha" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
        | ranged | 2    | Archer |
      And scenario "Bravo" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And a targeting override for "Archer" in scenario "Alpha" row "ranged" slot 1 with policy "highest_health"
      And a targeting override for "Archer" in scenario "Alpha" row "ranged" slot 2 with policy "highest_damage"
      And a targeting override for "Barbarian" in scenario "Bravo" row "melee" slot 1 with policy "random"
      When the battle is initialized with seed 33
      Then "Archer" at row "ranged" slot 1 in scenario "Alpha" should have targetingOverride "highest_health"
      And "Archer" at row "ranged" slot 2 in scenario "Alpha" should have targetingOverride "highest_damage"
      And "Barbarian" at row "melee" slot 1 in scenario "Bravo" should have targetingOverride "random"

  # ── Validation: at least one living unit ────────────────────────────

  Rule: Battle requires at least one living unit across both scenarios

    Scenario: Both scenarios have zero units
      Given scenario "Alpha" with rows:
        | row | slot | unit |
      And scenario "Bravo" with rows:
        | row | slot | unit |
      When the battle is initialized with seed 1
      Then initialization should fail with an error indicating at least one living unit is required

    Scenario: One scenario has units and the other is empty initializes successfully
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row | slot | unit |
      When the battle is initialized with seed 1
      Then the battle should initialize successfully
      # Single-sided battles are valid — win-conditions handles them as immediate wins

    Scenario: Both scenarios have at least one unit
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed 1
      Then the battle should initialize successfully

  # ── Validation: seed must be a finite number ────────────────────────

  Rule: Seed must be a finite number

    Scenario: A valid integer seed is accepted
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed 42
      Then the battle should initialize successfully

    Scenario: A valid negative seed is accepted
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed -100
      Then the battle should initialize successfully

    Scenario: A valid decimal seed is accepted
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed 3.14
      Then the battle should initialize successfully

    Scenario: NaN seed is rejected
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed NaN
      Then initialization should fail with an error indicating the seed must be a finite number

    Scenario: Positive infinity seed is rejected
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed Infinity
      Then initialization should fail with an error indicating the seed must be a finite number

    Scenario: Negative infinity seed is rejected
      Given scenario "Alpha" with rows:
        | row   | slot | unit      |
        | melee | 1    | Barbarian |
      And scenario "Bravo" with rows:
        | row    | slot | unit   |
        | ranged | 1    | Archer |
      When the battle is initialized with seed -Infinity
      Then initialization should fail with an error indicating the seed must be a finite number
