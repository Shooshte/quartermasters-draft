# Linked Entity Edit Navigation Implementation Plan

**Goal:** Add accessible linked-entity edit navigation to the `/create` editor.

1. Add red component and state tests for linked edit controls, duplicate rows, scenario slot IDs, destination routing, URL updates, and dirty confirmation.
2. Add reusable pencil controls to linked rows and scenario unit slots.
3. Forward destination callbacks through the form, workspace, and page layers into the existing selection controller.
4. Synchronize accepted cross-entity navigation to the destination tab and type-specific URL parameter.
5. Add matching `.feature` acceptance scenarios, Playwright page-object helpers, and browser tests.
6. Verify lint, unit tests, and E2E tests; push the feature branch and open a PR to `develop`.
