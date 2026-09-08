use qd_server::auth::{
    CookieNames, cookie_names, sign_cookie_value, verify_cookie_value, verify_password,
};

#[test]
fn verifies_better_auth_scrypt_hash_with_nfkc_password() {
    let hash = "00112233445566778899aabbccddeeff:0030038f326f821eb6b90f71cd36170f0d89cdc23f559ca48c7fa1b39f25f3e61edaed1049d1e76a67d4963ac784190dbc3bab7f790c7f1b3f443c9d1f7cd453";
    assert!(verify_password(hash, "pa\u{308}ssword①").unwrap());
    assert!(!verify_password(hash, "wrong-password").unwrap());
}

#[test]
fn rejects_malformed_legacy_password_hashes() {
    assert!(verify_password("not-a-hash", "password").is_err());
    assert!(verify_password("00:11:22", "password").is_err());
}

#[test]
fn signs_and_verifies_better_call_cookie_values() {
    let token = "AbCd0123EfGh4567IjKl8901MnOp2345";
    let secret = "test-compatibility-secret";
    let encoded = sign_cookie_value(token, secret);
    assert_eq!(
        encoded,
        "AbCd0123EfGh4567IjKl8901MnOp2345.DXWjveeLzT9FEfclMJBcE5igOll6hSN2VGz8WgBIPtE%3D"
    );
    assert_eq!(
        verify_cookie_value(&encoded, secret).as_deref(),
        Some(token)
    );
    assert_eq!(verify_cookie_value(&encoded, "different-secret"), None);
}

#[test]
fn chooses_better_auth_cookie_names_from_public_url() {
    assert_eq!(
        cookie_names("http://localhost:3000"),
        CookieNames {
            session_token: "better-auth.session_token".into(),
            dont_remember: "better-auth.dont_remember".into(),
            session_data: "better-auth.session_data".into(),
            secure: false,
        }
    );
    assert_eq!(
        cookie_names("https://game.example"),
        CookieNames {
            session_token: "__Secure-better-auth.session_token".into(),
            dont_remember: "__Secure-better-auth.dont_remember".into(),
            session_data: "__Secure-better-auth.session_data".into(),
            secure: true,
        }
    );
}
