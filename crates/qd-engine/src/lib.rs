//! Deterministic, renderer-independent battle simulation.
//!
//! The JSON boundary follows the original TypeScript engine's wire format. The
//! engine owns its state and returns detached snapshots, so callers cannot alter
//! subsequent batches. No database, JavaScript runtime, or renderer is required.
mod effects;
mod model;
mod operations;
mod resolution;
mod targeting;
mod validation;

pub use model::{BattleEngine, EngineError, random_sequence};
use serde_json::Value;

pub fn resolve_json(input: Value, options: Value) -> Result<Value, EngineError> {
    Ok(BattleEngine::new(input, options)?.resolve())
}
