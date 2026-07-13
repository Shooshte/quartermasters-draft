Feature: Action resolution
  When a unit's action bar reaches 100, it acts. The engine iterates through
  equipped items in priority order and casts every affordable spell. If no
  spells were cast, the unit falls back to a free basic attack. A spell with
  no valid target is ignored: it consumes no item activation cost and creates
  no spell-cast log entry. allowedRowTypes restricts target rows, not the
  caster's row.

  Background:
    Given a battle with two opposing scenarios
    And the acting unit "Warrior" has the following base stats:
      | health | meleeDmg | rangedDmg | speed | manaRegen | spellDmg | dodge | criticalChance |
      | 100    | 15       | 5         | 1.0   | 2         | 0        | 0     | 0              |
    And "Warrior" has accumulated 50 mana

  # ---------------------------------------------------------------------------
  # Basic attack scenarios
  # ---------------------------------------------------------------------------

  Scenario: Unit with no items performs basic attack
    Given "Warrior" has no equipped items
    And "Warrior" is placed in the "tank" row
    When "Warrior" acts
    Then "Warrior" performs a basic attack
    And the basic attack deals 15 damage using meleeDmg

  Scenario: Basic attack from tank row uses meleeDmg
    Given "Warrior" has no equipped items
    And "Warrior" is placed in the "tank" row
    When "Warrior" acts
    Then the basic attack deals damage equal to "Warrior" meleeDmg of 15

  Scenario: Basic attack from melee row uses meleeDmg
    Given "Warrior" has no equipped items
    And "Warrior" is placed in the "melee" row
    When "Warrior" acts
    Then the basic attack deals damage equal to "Warrior" meleeDmg of 15

  Scenario: Basic attack from ranged row uses rangedDmg
    Given "Warrior" has no equipped items
    And "Warrior" is placed in the "ranged" row
    When "Warrior" acts
    Then the basic attack deals damage equal to "Warrior" rangedDmg of 5

  Scenario: Basic attack from support row uses rangedDmg
    Given "Warrior" has no equipped items
    And "Warrior" is placed in the "support" row
    When "Warrior" acts
    Then the basic attack deals damage equal to "Warrior" rangedDmg of 5

  # ---------------------------------------------------------------------------
  # Single item casting
  # ---------------------------------------------------------------------------

  Scenario: Unit casts spell from item when it can afford the mana cost
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName    | priority | activationManaCost | activationHealthCost | linkedSpell   |
      | Fire Sword  | 1        | 10                 | 0                    | Flame Strike  |
    And the spell "Flame Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Flame Strike"
    And "Warrior" mana is reduced by 10
    And "Warrior" does not perform a basic attack

  # ---------------------------------------------------------------------------
  # Skipping unaffordable items
  # ---------------------------------------------------------------------------

  Scenario: Unit skips unaffordable item and tries next item
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName      | priority | activationManaCost | activationHealthCost | linkedSpell     |
      | Arcane Staff  | 1        | 999                | 0                    | Arcane Blast    |
      | Short Sword   | 2        | 5                  | 0                    | Quick Slash     |
    And the spell "Arcane Blast" has no row restrictions
    And the spell "Quick Slash" has no row restrictions
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Arcane Blast"
    And "Warrior" casts the spell "Quick Slash"
    And "Warrior" mana is reduced by 5

  # ---------------------------------------------------------------------------
  # Multiple items in a single action
  # ---------------------------------------------------------------------------

  Scenario: Unit casts multiple items in the same action if all are affordable
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName      | priority | activationManaCost | activationHealthCost | linkedSpell     |
      | Fire Sword    | 1        | 10                 | 0                    | Flame Strike    |
      | Ice Dagger    | 2        | 15                 | 0                    | Frost Bite      |
      | Thunder Ring  | 3        | 20                 | 0                    | Lightning Bolt  |
    And the spell "Flame Strike" has no row restrictions
    And the spell "Frost Bite" has no row restrictions
    And the spell "Lightning Bolt" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Flame Strike"
    And "Warrior" casts the spell "Frost Bite"
    And "Warrior" casts the spell "Lightning Bolt"
    And "Warrior" mana is reduced by 45
    And "Warrior" does not perform a basic attack

  # ---------------------------------------------------------------------------
  # Mana deducted per item affects subsequent affordability
  # ---------------------------------------------------------------------------

  Scenario: Mana deducted from earlier item makes later item unaffordable
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName      | priority | activationManaCost | activationHealthCost | linkedSpell     |
      | Fire Sword    | 1        | 30                 | 0                    | Flame Strike    |
      | Ice Dagger    | 2        | 25                 | 0                    | Frost Bite      |
    And the spell "Flame Strike" has no row restrictions
    And the spell "Frost Bite" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Flame Strike"
    And "Warrior" does not cast the spell "Frost Bite"
    And "Warrior" mana is reduced by 30
    And "Warrior" does not perform a basic attack

  # ---------------------------------------------------------------------------
  # Fallback to basic attack
  # ---------------------------------------------------------------------------

  Scenario: Fallback to basic attack only when no items were cast
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName      | priority | activationManaCost | activationHealthCost | linkedSpell     |
      | Arcane Staff  | 1        | 999                | 0                    | Arcane Blast    |
      | Grand Tome    | 2        | 999                | 0                    | Meteor Shower   |
    And the spell "Arcane Blast" has no row restrictions
    And the spell "Meteor Shower" has no row restrictions
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Arcane Blast"
    And "Warrior" does not cast the spell "Meteor Shower"
    And "Warrior" performs a basic attack
    And the basic attack deals damage equal to "Warrior" meleeDmg of 15

  # ---------------------------------------------------------------------------
  # Health cost scenarios
  # ---------------------------------------------------------------------------

  Scenario: Item with health cost deducts health from caster
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName       | priority | activationManaCost | activationHealthCost | linkedSpell    |
      | Blood Blade    | 1        | 0                  | 20                   | Blood Strike   |
    And the spell "Blood Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Blood Strike"
    And "Warrior" health is reduced by 20
    And "Warrior" does not perform a basic attack

  Scenario: Unit cannot afford item when health is too low
    Given "Warrior" is placed in the "melee" row
    And "Warrior" current health is 10
    And "Warrior" has the following equipped items:
      | itemName       | priority | activationManaCost | activationHealthCost | linkedSpell    |
      | Blood Blade    | 1        | 0                  | 20                   | Blood Strike   |
    And the spell "Blood Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Blood Strike"
    And "Warrior" performs a basic attack

  # ---------------------------------------------------------------------------
  # Stat-only items (no linked spell)
  # ---------------------------------------------------------------------------

  Scenario: Item with no linked spell is skipped
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName        | priority | activationManaCost | activationHealthCost | linkedSpell |
      | Steel Gauntlet  | 1        | 0                  | 0                    |             |
      | Fire Sword      | 2        | 10                 | 0                    | Flame Strike|
    And the spell "Flame Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Flame Strike"
    And "Warrior" mana is reduced by 10
    And "Warrior" does not perform a basic attack

  Scenario: All items are stat-only so unit falls back to basic attack
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName        | priority | activationManaCost | activationHealthCost | linkedSpell |
      | Steel Gauntlet  | 1        | 0                  | 0                    |             |
      | Iron Shield     | 2        | 0                  | 0                    |             |
    When "Warrior" acts
    Then "Warrior" performs a basic attack
    And the basic attack deals damage equal to "Warrior" meleeDmg of 15

  # ---------------------------------------------------------------------------
  # Target row restriction scenarios
  # ---------------------------------------------------------------------------

  Scenario: Spell with no living units in its allowed target rows is ignored
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName       | priority | activationManaCost | activationHealthCost | linkedSpell   |
      | Sniper Bow     | 1        | 10                 | 0                    | Aimed Shot    |
    And the spell "Aimed Shot" is restricted to the following rows:
      | rowType |
      | ranged  |
      | support |
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Aimed Shot"
    And "Warrior" mana is not reduced
    And "Warrior" performs a basic attack

  Scenario: Spell with no row restrictions can be cast from any row
    Given "Warrior" is placed in the "tank" row
    And "Warrior" has the following equipped items:
      | itemName    | priority | activationManaCost | activationHealthCost | linkedSpell   |
      | Fire Sword  | 1        | 10                 | 0                    | Flame Strike  |
    And the spell "Flame Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" casts the spell "Flame Strike"
    And "Warrior" mana is reduced by 10
    And "Warrior" does not perform a basic attack

  Scenario: Target-row-restricted spell is cast when an allowed target row has a living unit
    Given "Warrior" is placed in the "melee" row
    And the opposing scenario has a living unit in the "ranged" row
    And "Warrior" has the following equipped items:
      | itemName       | priority | activationManaCost | activationHealthCost | linkedSpell   |
      | Sniper Bow     | 1        | 10                 | 0                    | Aimed Shot    |
    And the spell "Aimed Shot" is restricted to the following rows:
      | rowType |
      | ranged  |
      | support |
    When "Warrior" acts
    Then "Warrior" casts the spell "Aimed Shot"
    And "Warrior" mana is reduced by 10
    And "Warrior" does not perform a basic attack

  Scenario: Targetless spell is skipped but later unrestricted item is still cast
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has the following equipped items:
      | itemName       | priority | activationManaCost | activationHealthCost | linkedSpell     |
      | Sniper Bow     | 1        | 10                 | 0                    | Aimed Shot      |
      | Fire Sword     | 2        | 10                 | 0                    | Flame Strike    |
    And the spell "Aimed Shot" is restricted to the following rows:
      | rowType |
      | ranged  |
    And the spell "Flame Strike" has no row restrictions
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Aimed Shot"
    And "Warrior" casts the spell "Flame Strike"
    And "Warrior" mana is reduced by 10
    And "Warrior" does not perform a basic attack

  Scenario: Targetless spell on an item is skipped before a valid later spell on that item
    Given "Warrior" is placed in the "melee" row
    And "Warrior" has an item costing 10 mana and 15 health with spells "Aimed Shot" then "Fireball"
    And the spell "Aimed Shot" targets only the "ranged" row, which has no living enemies
    And the spell "Fireball" has no row restrictions
    When "Warrior" acts
    Then "Warrior" does not cast the spell "Aimed Shot"
    And "Warrior" casts the spell "Fireball"
    And "Warrior" mana is reduced by 10
    And "Warrior" health is reduced by 15

  Scenario: Later spell is ignored after an earlier spell eliminates its final target
    Given "Warrior" has an item costing 10 mana with spells "Alpha Blast" then "Beta Follow-up"
    And "Alpha Blast" eliminates the only valid enemy target
    When "Warrior" acts
    Then "Warrior" casts the spell "Alpha Blast"
    And "Warrior" does not cast the spell "Beta Follow-up"
    And the spell log contains no entry for "Beta Follow-up"
