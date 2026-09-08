use qd_api_types::ReplayInput;
use qd_server::battle::normalize_replay_input;

#[test]
fn replay_input_is_trimmed_and_uuid_normalized() {
    let normalized = normalize_replay_input(ReplayInput {
        scenario_a_id: "A2000000-0000-4000-8000-000000000001".into(),
        scenario_b_id: "A2000000-0000-4000-8000-000000000002".into(),
        seed: "  fixed-seed  ".into(),
    })
    .unwrap();
    assert_eq!(
        normalized.scenario_a_id,
        "a2000000-0000-4000-8000-000000000001"
    );
    assert_eq!(
        normalized.scenario_b_id,
        "a2000000-0000-4000-8000-000000000002"
    );
    assert_eq!(normalized.seed, "fixed-seed");
}

#[test]
fn replay_input_requires_distinct_scenarios() {
    let error = normalize_replay_input(ReplayInput {
        scenario_a_id: "a2000000-0000-4000-8000-000000000001".into(),
        scenario_b_id: "A2000000-0000-4000-8000-000000000001".into(),
        seed: "seed".into(),
    })
    .unwrap_err();
    assert_eq!(error.message, "Choose two different scenarios.");
}

#[test]
fn replay_input_rejects_blank_seed() {
    let error = normalize_replay_input(ReplayInput {
        scenario_a_id: "a2000000-0000-4000-8000-000000000001".into(),
        scenario_b_id: "a2000000-0000-4000-8000-000000000002".into(),
        seed: " \t ".into(),
    })
    .unwrap_err();
    assert_eq!(error.message, "Battle seed must not be blank.");
}
