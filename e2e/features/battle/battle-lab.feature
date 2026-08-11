Feature: Game master Battle Lab
  Rule: Only game masters can use saved battle replays
    Scenario: A player opens the Battle Lab
      When the player navigates to "/battle"
      Then the player should see the forbidden page

    Scenario: A player opens a replay URL
      When the player navigates to a saved replay URL
      Then the player should see the forbidden page

  Rule: A game master can run and revisit a battle
    Scenario: Run two different scenarios with a named seed
      Given both selected scenarios contain living units
      When the game master runs them with seed "balance-pass-3"
      Then the URL should contain a persisted replay ID
      And the winner or draw and resolved action count should be visible
      And every final unit state should be visible
      And the action-batch battle log should be visible
      And actions from the same batch should be grouped as simultaneous

    Scenario: Refresh a replay
      Given the game master has run a saved battle
      When the game master refreshes the replay URL
      Then the same scenario IDs and seed should remain selected
      And the regenerated result should be visible

    Scenario: Regenerate from an edited scenario
      Given the game master has run a saved battle
      When one selected scenario is renamed through the scenario builder API
      And the game master reopens the same replay URL
      Then the replay should show the new scenario name

    Scenario: An adjacent multi-target spell uses its unit targeting definition
      Given "Templar" targets enemies by highest damage with 3 adjacent targets
      When the battle resolves Templar's item activation
      Then the activation log lists "Mage", "Samurai", and "Ranger" as 3 contiguous targets
