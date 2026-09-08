//! Line-oriented development oracle for differential testing. Not a server.
use qd_engine::BattleEngine;
use serde_json::{Value, json};
use std::io::{self, BufRead, Write};
fn trace(case: Value) -> Result<Value, Box<dyn std::error::Error>> {
    let mut engine = BattleEngine::new(case["input"].clone(), case["options"].clone())?;
    let initial = engine.get_state();
    let mut previous = initial["log"].as_array().unwrap().len();
    let mut batches = vec![];
    while engine.get_state()["status"] != "finished" {
        let mut state = engine.resolve_next_batch();
        let logs = state["log"].as_array().unwrap();
        let new_logs = json!(logs[previous..]);
        previous = logs.len();
        state["log"] = new_logs;
        batches.push(state);
    }
    Ok(json!({"initial":initial,"batches":batches}))
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let result = serde_json::from_str(&line?)
            .map_err(Into::into)
            .and_then(trace);
        let result = match result {
            Ok(v) => v,
            Err(error) => json!({"error":error.to_string()}),
        };
        serde_json::to_writer(&mut stdout, &result)?;
        writeln!(stdout)?;
        stdout.flush()?;
    }
    Ok(())
}
