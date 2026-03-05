Feature: Login
  As a pre-seeded user
  I want to log in with my username and password
  So that I can access the application

  Background:
    Given I am an unauthenticated visitor

  Scenario: Visitor sees the login form
    When I navigate to "/login"
    Then I should see a username field
    And I should see a password field
    And I should see a "Remember me" checkbox
    And I should see a submit button

  Scenario: Game master is redirected to /create after login
    When I log in with valid game master credentials
    Then I should be on "/create"

  Scenario: Player is redirected to /play after login
    When I log in with valid player credentials
    Then I should be on "/play"

  Scenario: Return path is honoured after login when allowed, regardless of role
    Given I navigate to "/login?next=/play"
    When I log in with valid game master credentials
    Then I should be on "/play"

  Scenario: Invalid credentials show an error
    When I submit the login form with invalid credentials
    Then I should remain on "/login"
    And I should see a form error message "Invalid credentials"

  Scenario: Submit button is disabled while login request is in flight
    When I submit the login form with valid game master credentials
    Then the submit button should be disabled until the response is received

  Scenario: Already authenticated game master visiting /login without next is redirected to default
    Given I am logged in as a game master
    When I navigate to "/login"
    Then I should be on "/create"

  Scenario: Already authenticated player visiting /login without next is redirected to default
    Given I am logged in as a player
    When I navigate to "/login"
    Then I should be on "/play"

  Scenario: Authenticated user visiting /login with next is redirected to next when allowed
    Given I am logged in as a game master
    When I navigate to "/login?next=/play"
    Then I should be on "/play"

  Scenario: Player logging in with next to a forbidden route sees 403
    Given I navigate to "/login?next=/create"
    When I log in with valid player credentials
    Then I should see the 403 forbidden page
    And the URL should be "/403"
    And I should see a link to my default page "/play"

  Scenario: Authenticated player visiting /login with next to a forbidden route sees 403
    Given I am logged in as a player
    When I navigate to "/login?next=/create"
    Then I should see the 403 forbidden page
    And the URL should be "/403"
    And I should see a link to my default page "/play"

  Scenario: External next parameter is rejected
    Given I navigate to "/login?next=https://example.com"
    When I log in with valid game master credentials
    Then I should be on "/create"
    And I should see a notice "Invalid return URL"