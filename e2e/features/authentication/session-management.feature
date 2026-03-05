Feature: Session Management
  As an authenticated user
  I want my session to be managed securely
  So that I am not exposed to unauthorised access

  Scenario: Session expires after 1 hour of inactivity for a game master without remember me
    Given I am logged in as a game master without "Remember me"
    When 1 hour has passed without activity
    And I attempt to navigate to "/create"
    Then I should be redirected to "/login" with query params:
      | next   | /create  |
      | reason | expired  |
    And I should see the message "Session expired, please log in to continue"

  Scenario: Session expires after 1 hour of inactivity for a player without remember me
    Given I am logged in as a player without "Remember me"
    When 1 hour has passed without activity
    And I attempt to navigate to "/play"
    Then I should be redirected to "/login" with query params:
      | next   | /play    |
      | reason | expired  |
    And I should see the message "Session expired, please log in to continue"

  Scenario: Session persists for 30 days with remember me
    Given I am logged in as a user with "Remember me"
    When 1 hour has passed without activity
    And I attempt to navigate to "/play"
    Then I should remain on "/play"

  Scenario: Remember me session expires after 30 days of inactivity
    Given I am logged in as a user with "Remember me"
    When 30 days have passed without activity
    And I attempt to navigate to "/play"
    Then I should be redirected to "/login" with query params:
      | next   | /play    |
      | reason | expired  |

  Scenario: Session without remember me ends when the browser is closed
    Given I am logged in as a user without "Remember me"
    When I close and reopen the browser
    And I navigate to "/create"
    Then I should be redirected to "/login" with query params:
      | next | /create |

  Scenario: Remember me session persists after the browser is closed and reopened
    Given I am logged in as a user with "Remember me"
    When I close and reopen the browser
    And I navigate to "/create"
    Then I should remain on "/create"

  Scenario: Activity extends the session timeout (sliding expiration)
    Given I am logged in as a game master without "Remember me"
    When 59 minutes have passed without activity
    And I navigate to "/create"
    And 59 minutes have passed without activity
    And I navigate to "/create"
    Then I should remain on "/create"

  Scenario: Session token cannot be reused after logout
    Given I am logged in as a player
    When I log out
    And I attempt to navigate to "/play" using the previous session
    Then I should be redirected to "/login" with query params:
      | next | /play |