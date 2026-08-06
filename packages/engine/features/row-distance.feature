Feature: Row distance damage penalty
  Basic attacks suffer a distance penalty based on how far apart the
  attacker and target rows are. Item effects are unaffected by distance.

  Row depths:
    tank    = 0
    melee   = 1
    ranged  = 2
    support = 3

  Distance           = attacker_depth + target_depth
  Damage multiplier  = max(0, 1 - 0.25 * distance)

  Background:
    Given a unit with 100 meleeDmg and 100 rangedDmg

  Scenario Outline: Basic attack damage across all row combinations
    When the unit in the <attacker_row> row basic-attacks a target in the <target_row> row
    Then the attack should deal <expected_damage> damage

    Examples:
      | attacker_row | target_row | expected_damage |
      | tank         | tank       | 100             |
      | tank         | melee      | 75              |
      | tank         | ranged     | 50              |
      | tank         | support    | 25              |
      | melee        | tank       | 75              |
      | melee        | melee      | 50              |
      | melee        | ranged     | 25              |
      | melee        | support    | 0               |
      | ranged       | tank       | 50              |
      | ranged       | melee      | 25              |
      | ranged       | ranged     | 0               |
      | ranged       | support    | 0               |
      | support      | tank       | 25              |
      | support      | melee      | 0               |
      | support      | ranged     | 0               |
      | support      | support    | 0               |

  Scenario: Zero-damage basic attack deals no damage
    When the unit in the melee row basic-attacks a target in the support row
    Then the attack should deal 0 damage
    And no damage event is emitted

  Scenario: Item effects ignore row distance entirely
    Given an item effect that deals 100 damage before distance modifiers
    When the unit in the support row activates the item against a target in the support row
    Then the item effect should deal 100 damage
    And row distance should not reduce item-effect damage
