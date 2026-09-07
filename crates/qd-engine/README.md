# qd-engine

A standalone deterministic Rust battle engine. It depends only on serde and
serde_json and has no database, network, Node.js, or rendering dependency.

```rust
use qd_engine::{BattleEngine, resolve_json};
use serde_json::{Value, json};
# fn example(input: Value) -> Result<(), qd_engine::EngineError> {
let result = resolve_json(input.clone(), json!({}))?;
let mut battle = BattleEngine::new(input, json!({"fatigueActionThreshold": 500}))?;
let initial = battle.get_state();
let next = battle.resolve_next_batch();
let result = battle.resolve();
# Ok(())
# }
```

The input and output JSON follows the original engine contract. Optional fields
stay optional in snapshots and logs. `EngineError` implements `Display` and
`std::error::Error`. Snapshots are detached values; changing them cannot mutate
the running battle.

Units ready at the same scheduling event act from a common snapshot. Their
ordered operations commit together. Random draws and effect IDs are allocated
from one shared stream across plans. Timed modifiers expire after the affected
unit's covered actions; intervals fire before its action opportunity. Shield
layers absorb damage in order, while grants in another simultaneous plan do not
retroactively protect a target. Fatigue counts resolved actions and applies to
all surviving units after each batch.

All arithmetic uses `f64`, with ECMAScript rounding and UTF-16 FNV-1a/Mulberry32
seed semantics. serde_json's `float_roundtrip` feature is required: its default
parser can round decimal input to a neighboring float and change later batches.

## Verification

From the workspace root:

```sh
cargo test -p qd-engine
cargo clippy -p qd-engine --all-targets -- -D warnings
cargo build -p qd-engine --bin qd-engine-parity
node --import ./scripts/engine-parity/register.mjs scripts/engine-parity/differential.mjs 1000
```

Checked-in fixtures do not require Node.js to test. They include 92 full battle
traces, 158 inputs captured from the original engine regression tests with up to
eight batches each, and exact RNG vectors. Tests compare every field and every
log entry, including exact numerical equality without tolerance.

The live differential harness takes a case count and starting seed (default
`1000 1000`). It generates deterministic armies, items, effects, targeting rules,
and initial action bars. A mismatch writes a complete reproduction to
`/tmp/qd-engine-parity-failure.json` and fails. Node.js is used only for the
original TypeScript oracle and fixture regeneration:

```sh
node --import ./scripts/engine-parity/register.mjs scripts/engine-parity/generate.mjs
node --import ./scripts/engine-parity/register.mjs scripts/engine-parity/capture-tests.mjs
```

`capture-tests.mjs` runs all original engine tests unchanged using a temporary
Vitest transform to capture valid initialization inputs. For tests that directly
mutate their private TypeScript state later, these fixtures cover the initialized
battle; directed fixtures and randomized full battles cover integrated behavior.
