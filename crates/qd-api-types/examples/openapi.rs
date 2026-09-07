fn main() {
    println!(
        "{}",
        serde_json::to_string_pretty(&qd_api_types::openapi()).unwrap()
    );
}
