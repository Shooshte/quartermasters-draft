Feature: Rust hosts the browser application
  Scenario: A protected editor deep link survives a refresh
    Given I am logged in as a game master
    When I open the units editor tab through its URL
    And I refresh the browser
    Then the units tab remains selected

  Scenario: Unknown API routes remain API errors
    When I request an unknown API route
    Then the response is a 404 JSON error
    And the response is not the application HTML

  Scenario: Unknown assets are not application routes
    When I request an unknown JavaScript asset
    Then the response is a 404

  Scenario: Production runs without Node
    When the production image is inspected
    Then neither Node nor pnpm is installed
    And the Rust server serves the application
