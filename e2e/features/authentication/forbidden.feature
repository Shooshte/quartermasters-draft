Feature: 403 Forbidden Page
  As an authenticated user who has navigated to an unauthorised route
  I want to see a clear error page
  So that I understand I do not have access and know where to go

  Scenario: Forbidden route redirects to /403 and displays an access denied message
    Given I am logged in as a player
    When I navigate to "/create"
    Then I should see the 403 forbidden page
    And the URL should be "/403"
    And I should see an access denied message
    And I should see a link labeled "Go to Play" pointing to "/play"

  Scenario Outline: /403 is accessible to any authenticated user
    Given I am logged in as a "<role>"
    When I navigate to "/403"
    Then the page should render without error
    And I should see the 403 forbidden page
    And I should see an access denied message
    And I should see a link labeled "<linkText>" pointing to "<default>"

    Examples:
      | role        | default | linkText      |
      | player      | /play   | Go to Play    |
      | game master | /create | Go to Create  |