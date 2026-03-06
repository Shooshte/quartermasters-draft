Feature: Logout
  As an authenticated user
  I want to be able to log out
  So that my session is cleared and my account is protected

  Scenario: Game master can log out
    Given I am logged in as a game master
    When I log out
    Then I should be on "/login"
    And my session should be cleared

  Scenario: Player can log out
    Given I am logged in as a player
    When I log out
    Then I should be on "/login"
    And my session should be cleared

  Scenario: Regardless of user role, after logout I should be redirected to "/login" with next pointing to the current route (game master)
    Given I am logged in as a game master
    And I am on "/replay/abc445"
    When I log out
    Then I should be redirected to "/login" with query params:
      | next | /replay/abc445 |
    And my session should be cleared

  Scenario: Regardless of user role, after logout I should be redirected to "/login" with next pointing to the current route (player)
    Given I am logged in as a player
    And I am on "/replay/abc445"
    When I log out
    Then I should be redirected to "/login" with query params:
      | next | /replay/abc445 |
    And my session should be cleared

  Scenario: If I log out when on route "/403" the next query param should not be added (game master)
    Given I am logged in as a game master
    And I am on "/403"
    When I log out
    Then I should be on "/login"
    And the "next" query param should not be present
    And my session should be cleared

  Scenario: If I log out when on route "/403" the next query param should not be added (player)
    Given I am logged in as a player
    And I am on "/403"
    When I log out
    Then I should be on "/login"
    And the "next" query param should not be present
    And my session should be cleared

  Scenario: Logged out user cannot access protected routes
    Given I am logged in as a game master
    When I log out
    And I navigate to "/play"
    Then I should be redirected to "/login" with query params:
      | next | /play |