# Session policy correction

Implement the existing session-management.feature contract: unchecked logins have a one-hour inactivity timeout and session-only cookies; remembered logins have a 30-day inactivity timeout and persistent cookies; successful activity extends the appropriate timeout; expired and revoked sessions cannot be renewed.

Use Better Auth's supported creation hook and a small session-policy plugin/hook. Persist rememberMe as a non-input boolean on the session row. Disable built-in session refresh and cookie caching, validate with Better Auth first, then renew validated sessions according to the stored flag. Forward renewal cookies from server functions and tRPC responses. Authentication, role checks, logout, and expired-session notice semantics remain covered by the existing stories.

Alternatives considered: changing expiresIn alone cannot fix the non-remembered 24-hour special case or refresh bypass; deriving the policy from the optional signed cookie permits removal of that cookie to change the policy; inferring it from timestamps makes persistence ambiguous. A server-owned boolean is the smallest durable representation and needs a migration but no new dependencies.

Existing sessions have no reliable stored preference. Migrate them conservatively as non-remembered, clamping expiry to no later than updated_at plus one hour and never extending an expired session. Users can sign in again to opt into remembered sessions. Do not delete account or other application data.

Tests use the installed Better Auth runtime with a memory adapter and server clock control for exact boundaries, cookie behavior, sliding expiry, removal of remember cookies, and revocation. PostgreSQL-backed E2E tests assert actual issued lifetimes and simulate elapsed inactivity by moving both updated_at and expires_at backwards by the same duration. They must assert persisted expiry and actual redirects instead of forcing expiry alone. Cookie persistence and renewal are asserted on browser/server responses.

Implementation is authorized by the user's request to plan, execute with subagents, then commit and push. No additional design approval checkpoint is required. Branch starts at 247bf8b on a separate worktree. Push the completed branch without merging develop.
