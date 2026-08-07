Feature: Unit target selection
  A unit supplies one scope, priority, count, and shape for every effect-bearing item it activates.

  Scenario Outline: Target scope determines which living units are candidates
    Given a ranged "Knight" and living units on both sides
    And "Knight" has target scope "<scope>"
    When "Knight" selects targets
    Then only units admitted by "<scope>" are candidates

    Examples:
      | scope        |
      | self         |
      | self_allies  |
      | self_enemies |
      | allies       |
      | enemies      |
      | both         |

  Scenario Outline: Target priority ranks all reachable candidates
    Given a ranged "Knight" can reach candidates with different health, damage, and rows
    And "Knight" uses "<priority>" priority
    When "Knight" selects a target
    Then the selected target follows "<priority>" with deterministic fallback ordering

    Examples:
      | priority       |
      | highest_health |
      | lowest_health  |
      | highest_damage |
      | support        |
      | random         |

  Scenario Outline: Front-line reach uses the globally nearest occupied eligible row
    Given a <caster_row> caster can target an allied <caster_row> row and an enemy ranged row
    And a nearer enemy tank row contains only dead units
    When the caster selects targets
    Then only the allied <caster_row> row is reachable

    Examples:
      | caster_row |
      | tank       |
      | melee      |

  Scenario: Equal-distance sides use a reproducible seeded tie break
    Given a melee caster can target allied and enemy tank rows
    When the caster selects targets twice with the same seed
    Then both selections choose the same single side

  Scenario Outline: Back-row casters can reach every eligible row
    Given a caster is deployed in the "<caster_row>" row
    When the caster selects the highest-health enemy
    Then an enemy support can be selected over an enemy tank

    Examples:
      | caster_row |
      | ranged     |
      | support    |

  Scenario: Individual random selection returns multiple unique targets
    Given a ranged caster selects 3 individual random enemies
    When the caster selects targets twice with the same seed
    Then each selection contains the same 3 distinct targets

  Scenario: Adjacent selection stays contiguous around one primary target
    Given a ranged caster selects 3 adjacent enemies by highest health
    When the caster selects targets
    Then the primary target and its contiguous row neighbors are selected
    And no selected target is from another row or side

  Scenario: Ordered item effects retain their original target IDs without retargeting
    Given an item has multiple ordered effects
    And its owner selects 2 targets
    When the item activates
    Then every ordered effect shares the original 2 target IDs for targeting and activation purposes
    And each later effect applies only to living members of that original group
    And no effect retargets another unit
