use qd_engine::{BattleEngine, random_sequence};
use serde_json::{Value,json};

fn compare(actual:&Value,expected:&Value,path:&str) {
    match (actual,expected) {
        (Value::Number(a),Value::Number(b))=>assert_eq!(a.as_f64(),b.as_f64(),"number at {path}"),
        (Value::Array(a),Value::Array(b))=>{assert_eq!(a.len(),b.len(),"array length at {path}");for(i,(a,b))in a.iter().zip(b).enumerate(){compare(a,b,&format!("{path}/{i}"));}},
        (Value::Object(a),Value::Object(b))=>{assert_eq!(a.keys().collect::<Vec<_>>(),b.keys().collect::<Vec<_>>(),"keys at {path}");for(k,v)in b{compare(&a[k],v,&format!("{path}/{k}"));}},
        _=>assert_eq!(actual,expected,"at {path}"),
    }
}
#[test]
fn reference_battles_match_every_batch_and_log_entry() {
    for line in include_str!("../../../fixtures/engine-parity/battles.jsonl").lines() {
        let case:Value=serde_json::from_str(line).unwrap();
        let name=case["name"].as_str().unwrap();
        let mut engine=BattleEngine::new(case["input"].clone(),case["options"].clone()).unwrap();
        compare(&engine.get_state(),&case["expected"]["initial"],&format!("{name}/initial"));
        let mut log_len=engine.get_state()["log"].as_array().unwrap().len();
        for (i,batch) in case["expected"]["batches"].as_array().unwrap().iter().enumerate(){
            let mut actual=engine.resolve_next_batch();
            let logs=actual["log"].as_array().unwrap();
            let new_logs=json!(logs[log_len..]);log_len=logs.len();actual["log"]=new_logs;
            compare(&actual,batch,&format!("{name}/batch-{i}"));
        }
        assert_eq!(engine.get_state()["status"],"finished","{name}");
        let final_state=engine.get_state();
        compare(&engine.resolve_next_batch(),&final_state,&format!("{name}/finished-step"));
        let result=engine.resolve();
        compare(&result["finalState"],&final_state,&format!("{name}/result"));
        compare(&result["log"],&final_state["log"],&format!("{name}/result-log"));
    }
}
#[test]
fn utf16_seed_hash_and_mulberry32_match_typescript() {
    let cases:Vec<Value>=serde_json::from_str(include_str!("../../../fixtures/engine-parity/rng.json")).unwrap();
    for case in cases {
        compare(&json!(random_sequence(&case["seed"],20).unwrap()),&case["values"],&format!("seed {}",case["seed"]));
    }
}
