Feature: Route Protection
  As a product stakeholder
  I want all non-login routes to be protected
  So that unauthenticated users cannot access the application

  Background:
    Given I am an unauthenticated visitor

  Scenario Outline: Unauthenticated user is redirected to login from protected routes
    When I navigate to "<route>"
    Then I should be redirected to "/login" with query params:
      | next | <route> |

    Examples:
      | route          |
      | /              |
      | /403           |
      | /create        |
      | /play          |
      | /replay/abc123 |