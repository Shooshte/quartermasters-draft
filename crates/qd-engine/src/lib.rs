use serde_json::Value;
#[derive(Debug)]
pub struct EngineError(pub String);
impl std::fmt::Display for EngineError { fn fmt(&self,f:&mut std::fmt::Formatter<'_>)->std::fmt::Result {f.write_str(&self.0)} }
impl std::error::Error for EngineError {}
pub struct BattleEngine;
impl BattleEngine {
    pub fn new(_input:Value,_options:Value)->Result<Self,EngineError>{Err(EngineError("engine not yet implemented".into()))}
    pub fn get_state(&self)->Value{Value::Null}
    pub fn resolve_next_batch(&mut self)->Value{Value::Null}
    pub fn resolve(&mut self)->Value{Value::Null}
}
pub fn resolve_json(input:Value, options:Value)->Result<Value,EngineError>{Ok(BattleEngine::new(input,options)?.resolve())}
pub fn random_sequence(_seed:&Value,_count:usize)->Result<Vec<f64>,EngineError>{Ok(vec![])}
