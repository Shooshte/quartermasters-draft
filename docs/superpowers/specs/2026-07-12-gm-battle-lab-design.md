# GM Battle Lab Design

## Purpose

Game master users need a testing workbench where they can select two different saved scenarios, supply a human-readable seed, resolve a battle, inspect the complete result, and return to that battle through a stable URL.

Saved replay URLs represent reproducible battle definitions rather than historical snapshots. Each visit regenerates the battle from the latest versions of both scenarios and the saved seed.

## Scope

Version one includes:

- a game-master-only Battle Lab setup page;
- selection of any two distinct scenarios;
- a non-empty string seed chosen by the game master;
- server-side battle resolution using the existing engine;
- a persisted battle definition with a stable replay URL;
- automatic regeneration from current scenario data whenever the replay is opened;
- a result summary, final state for every unit, and the complete chronological battle log;
- route-level and API-level game master authorization.

Version one does not include historical result snapshots, comparisons between runs, player access, live battle animation, or a general replay library.

## Persistence Model

Add a `battle_replays` table with:

- `id`: UUID primary key;
- `scenario_a_id`: required foreign key to `scenarios.id`;
- `scenario_b_id`: required foreign key to `scenarios.id`;
- `seed`: required text;
- `created_at`: required timestamp.

The two scenario IDs must differ. Both the API and a database check constraint enforce this invariant. Both foreign keys use cascading deletion because a replay cannot be regenerated after either source scenario is deleted. No result, log, final state, or scenario snapshot is persisted.

The application trims surrounding whitespace from the seed and persists the resulting canonical string. An empty canonical seed is invalid.

## Engine Seed Contract

Extend the engine seed type from `number` to `number | string`. Existing numeric callers remain compatible. String seeds are trimmed before validation and hashing. The seeded random-number generator canonicalizes the seed to text and applies deterministic FNV-1a hashing before initializing Mulberry32, so identical canonical string seeds produce identical random sequences.

Engine validation accepts finite numbers and strings that remain non-empty after trimming. It rejects non-finite numbers and blank strings. The engine feature acceptance criteria and unit tests must document both forms.

## Server Architecture

Add `@qd/engine` as an internal dependency of `@qd/api` and add a GM-only `battleLab` router to the root tRPC router.

The router exposes three operations:

1. `scenarioOptions` returns all scenario IDs and names in name order for the two searchable selectors.
2. `create` accepts `scenarioAId`, `scenarioBId`, and `seed`. It validates the input, loads both current scenario graphs, resolves the battle, and persists the definition only after successful resolution. It returns the replay definition and generated result.
3. `get` accepts a replay ID, loads its saved definition, reloads both current scenario graphs, and resolves the battle again. It returns the definition and regenerated result.

The API owns a focused DB-to-engine mapper. It assembles each scenario through the full relationship graph:

```text
scenario
  -> rows and ordered unit assignments
    -> unit base stats and target policy
      -> ordered items
        -> linked spells
          -> allowed rows and ordered effects
```

The mapper preserves scenario row/slot order, unit item priority, spell effect sequence order, and the optional links represented in the schema. It produces the existing engine `ScenarioInput` shape without exposing database records directly to the browser.

Battle resolution remains synchronous and server-side. A resolution failure never creates a replay row.

## Routes and Authorization

Use `/battle` for new Battle Lab setup and `/replay/:id` for a saved definition and regenerated result. Both routes require the game master role. Player users are redirected to the existing forbidden page, and unauthenticated users continue through the existing login flow.

Every `battleLab` procedure uses `gmProcedure`, so direct API calls receive the same authorization enforcement as browser navigation.

The authenticated header displays `Create` and `Battle Lab` navigation for game masters alongside logout. Player navigation does not expose the feature.

## One-Page Workbench

The selected layout is a one-page workbench.

On `/battle`, the setup area contains:

- a searchable Scenario A selector;
- a searchable Scenario B selector;
- a text seed field;
- a `Run & save battle` button.

The action remains disabled until the user selects two different scenarios and enters a non-empty seed. Client validation provides immediate feedback, while the API repeats all invariants authoritatively.

After a successful create mutation, the browser navigates to `/replay/:id`. The same workbench remains visible with its fields populated from the saved definition. Changing a scenario or seed and running again creates a new definition and URL; it does not mutate the currently viewed replay.

Opening `/replay/:id` automatically regenerates the result from the latest source data. The page clearly states that results use the latest scenario versions.

## Result Presentation

The result area contains three parts:

1. A summary showing the winning scenario name or `Draw`, plus elapsed ticks.
2. Final unit-state tables grouped by scenario. Every row shows unit name, battlefield row, slot, current and base health, alive/dead status, final mana, actions taken, and remaining active effects.
3. The complete battle log in chronological order. Every entry shows its tick, event type, and human-readable engine message.

The structured engine result remains the source of truth. The browser derives display rows from `finalState` and does not reconstruct combat state from log messages.

## Errors and Edge Cases

- Identical scenario IDs return an invalid-input error.
- A blank seed after trimming returns an invalid-input error.
- A missing scenario returns a not-found error and creates no replay.
- A replay removed through scenario cascade deletion returns a replay not-found state.
- A scenario graph rejected by engine validation returns an explicit resolution error and creates no replay.
- A failed database insert returns an explicit server error rather than displaying an unsaved replay URL.
- The setup remains populated after a create failure so the game master can correct it and retry.
- Loading and resolution states disable repeated submissions.

## Acceptance Criteria and Testing

Treat `.feature` files as acceptance criteria and implement all changed behavior test-first.

Engine coverage includes:

- identical string seeds generate identical random sequences and logs;
- distinct string seeds can produce distinct random sequences;
- finite numeric seeds remain supported;
- blank string and non-finite numeric seeds are rejected.

API coverage includes:

- every procedure rejects unauthenticated and player callers;
- `create` rejects identical scenarios and blank seeds;
- the mapper includes ordered rows, units, items, spells, allowed rows, and effects;
- successful resolution is persisted and returned;
- failed resolution is not persisted;
- `get` resolves from current DB data on every request;
- missing scenarios and replays return explicit errors.

Web unit coverage includes:

- setup validation and disabled action state;
- successful navigation to the returned replay URL;
- loading and API error states;
- winner/draw and elapsed-tick summary rendering;
- final unit-state rendering;
- chronological battle-log rendering.

Add a Battle Lab feature file and Playwright tests proving:

- a game master can select two scenarios, enter a string seed, run a battle, and receive a replay URL;
- refreshing that URL retains the definition and regenerated output;
- the page shows the result summary, each unit's final state, and the complete log;
- editing a source scenario and reopening the same replay URL changes the regenerated output accordingly;
- a player cannot access either Battle Lab route.

Completion requires `pnpm run test` and `pnpm run test:e2e` to pass without errors.
