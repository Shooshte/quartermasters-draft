# Linked Entity Edit Navigation Design

## Goal

Let a game master open a linked entity directly from the `/create` editor without losing the current scenario context.

## Behavior

- Scenario unit rows open the linked Unit in the shared entity workspace and retain the scenario workspace.
- Unit items, item spells, and spell effects replace the shared entity workspace with the linked record.
- Every link uses an accessible pencil button labelled `Edit <entity name>`.
- Each successful jump activates its destination library tab and replaces the entity-specific URL search parameter while retaining `scenario_id`.
- The existing unsaved-changes dialog protects a dirty shared entity workspace. Cancelling leaves it untouched; discarding completes the jump.

## Design

`LinkedEntityPicker` provides the reusable edit row control. Its containing forms supply the destination-specific callback. Scenario rows retain their custom layout and forward a unit-edit callback through `ScenarioWorkspace`. `CreatePage` routes all callbacks through `selectRecord`, preserving the existing load, dirty-state, and URL behavior in one place.

No API, schema, migration, dependency, or authorization changes are required.
