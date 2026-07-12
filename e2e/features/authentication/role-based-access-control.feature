Feature: Role-Based Access Control
  As a product stakeholder
  I want route access to be enforced by role
  So that players cannot access game master routes

  Scenario: Default page for game master is /create
    Given I am logged in as a game master
    When I navigate to "/"
    Then I should be redirected to "/create"

  Scenario: Default page for player is /play
    Given I am logged in as a player
    When I navigate to "/"
    Then I should be redirected to "/play"

  Scenario Outline: Game master can access all routes
    Given I am logged in as a game master
    When I navigate to "<route>"
    Then I should see the page content for "<route>"

    Examples:
      | route          |
      | /create        |
      | /play          |
      | /replay/abc123 |

  Scenario Outline: Player can access permitted routes
    Given I am logged in as a player
    When I navigate to "<route>"
    Then I should see the page content for "<route>"

    Examples:
      | route |
      | /play |

  Scenario Outline: Player is shown a 403 page when accessing a game master route
    Given I am logged in as a player
    When I navigate to "<route>"
    Then I should see the 403 forbidden page
    And the URL should be "/403"
    And I should see a link to my default page "/play"

    Examples:
      | route          |
      | /create        |
      | /battle        |
      | /replay/abc123 |
