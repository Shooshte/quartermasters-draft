# Engine port report

## Delivered

`crates/qd-engine` provides a standalone native Rust implementation with only
serde and serde_json dependencies. Public API:

- `resolve_json(input: Value, options: Value) -> Result<Value, EngineError>`
- `BattleEngine::new(input, options) -> Result<BattleEngine, EngineError>`
- `BattleEngine::default()` matches the original zero-argument constructor.
- `get_state()`, `resolve_next_batch()`, and `resolve()` return detached JSON.
- `EngineError` implements Display and std::error::Error.

Implements input validation, deterministic IDs, all unit and item stats, target
scopes/priorities/shapes, row range rules, UTF-16 FNV-1a/Mulberry32 randomness,
proportional scheduling, same-snapshot action planning, shared RNG/effect ID
allocation, simultaneous operation commitment, item costs and ordered effects,
instant and interval effects, persistent/timed taunts, shield layers and bypass,
health/mana reconciliation, modifier expiry, fatigue, victories/draws, and every
structured log field and message.

The crate enables serde_json `float_roundtrip`. Without this feature, serde_json
parsed some reference decimals as an adjacent f64, changing action bars and RNG
comparison. This feature unifies across workspace dependencies and should remain
enabled for the API boundary.

## Red/green evidence

1. Wrote and generated the TypeScript oracle fixtures before implementation.
2. Ran `cargo test -p qd-engine` against the initial skeleton. Both parity tests
   failed: no RNG values returned, and engine construction returned the explicit
   "engine not yet implemented" error.
3. Implemented the complete simulation; the first parity run exposed the f64 JSON
   parser issue. Enabling precise parsing made the full fixture suite pass.
4. Added a default-constructor regression against a placeholder Default impl;
   observed `default battle is not implemented`, then implemented the default.
5. Added native regression coverage for validation, targeting restrictions,
   source-defined timing rules, JS rounding, shield absorption, RNG, snapshot
   detachment, simultaneous attacks, and fatigue.

## Verification

- `cargo test -p qd-engine`: **31 passed** (5 internal unit tests, 2 differential
  fixture tests, 24 native boundary/rule tests).
- `cargo clippy -p qd-engine --all-targets -- -D warnings`: **passed**.
- `cargo fmt -p qd-engine`: applied; no warnings.
- `pnpm --filter @qd/engine test`: **222 passed**, 16 test files.
- Live differential harness: **1,000 complete randomized battles**, seeds
  1000–1999, matched every field in every batch, including complete logs, with
  exact numeric equality and no tolerance.
- Checked-in oracle fixtures: **92 complete battles**, **158 inputs captured from
  the existing engine tests with up to eight batches each**, and **9 RNG vectors**.
- Reference-test fixture regeneration verified byte-for-byte deterministic.
  SHA-256: `1c0e628a74925d64963cf866c0c2c4bed79530c9f4d92ca62e0f35aa4c0bec3d`.

## Commits

- `613d0d5` — test(engine): capture TypeScript batch parity fixtures before Rust port
- `123ee75` — feat(engine): port deterministic battle simulation to standalone Rust

## Integration notes and limits

- Parent agent owns complete workspace `pnpm run test` and `pnpm run test:e2e`
  integration; they were not rerun here while API/web/DB work was concurrent.
- Source oracle imports currently use `packages/engine/src`; parent plans to move
  that test-only source to `reference/engine`. Update scripts/engine-parity import
  paths, the Vitest filter/config relative path, and README commands together.
- Captured inputs from tests that subsequently mutate private TypeScript state
  cover their initialized battle. Native tests, directed fixtures, and randomized
  full battles cover integrated behavior; the Rust crate does not expose the
  original TypeScript module-private state mutation functions.
- Public state/results are JSON values rather than schema-generator DTOs. This
  preserves optional item/effect/log fields exactly and avoids a renderer/server
  dependency in the standalone engine. Web/OpenAPI DTOs are owned by the web/API
  agents.
- No known parity gaps for valid public battle inputs. Randomized comparison is
  strong regression evidence, not exhaustive proof for all possible numbers and
  armies.
