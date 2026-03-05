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

  Scenario: Logged out user cannot access protected routes
    Given I am logged in as a game master
    When I log out
    And I navigate to "/play"
    Then I should be redirected to "/login" with query params:
      | next | /play |