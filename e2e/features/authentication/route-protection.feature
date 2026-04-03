Feature: Route Protection
  As a product stakeholder
  I want all non-login routes to be protected
  So that unauthenticated users cannot access the application

  Background:
    Given I am an unauthenticated visitor

  # "/403" is protected, but it intentionally does not preserve `next`.
  # Sending users back to an access-denied page is not useful and this matches
  # the logout flow's treatment of "/403".
  Scenario Outline: Unauthenticated user is redirected to login from protected routes that preserve next
    When I navigate to "<route>"
    Then I should be redirected to "/login" with query params:
      | next | <route> |

    Examples:
      | route          |
      | /              |
      | /create        |
      | /play          |
      | /replay/abc123 |

  Scenario: Unauthenticated user is redirected to login from /403 without next
    When I navigate to "/403"
    Then I should be on "/login"
    And the "next" query param should not be present
