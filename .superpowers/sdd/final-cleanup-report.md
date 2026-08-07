# Final cleanup verification report

All commands below were run from
`/Users/shooshte/projects/quartermasters-draft/.worktrees/battle-targeting-item-placement`.

## TDD evidence

### Red

Command:

```text
pnpm --filter @qd/engine test -- effects.test.ts
```

Exact failing assertion output:

```text
FAIL  src/effects.test.ts > effects > discards an interval effect when its own trigger kills the target
AssertionError: expected [ { id: 'active-effect-1', …(11) } ] to have a length of +0 but got 1

- Expected
+ Received

- 0
+ 1

Test Files  1 failed | 13 passed (14)
Tests  1 failed | 126 passed (127)
Exit status 1
```

### Green

Command:

```text
pnpm --filter @qd/engine test -- effects.test.ts && pnpm --filter @qd/engine typecheck
```

Exact result summary:

```text
Test Files  14 passed (14)
Tests  127 passed (127)
> @qd/engine@0.0.0 typecheck
> tsc --noEmit
```

## Verification commands

Every command emitted this environment warning before its output:

```text
WARN Unsupported engine: wanted: {"node":">=24 <26"} (current: {"node":"v22.20.0","pnpm":"10.28.2"})
```

### Affected engine suite

```text
$ pnpm --filter @qd/engine test && pnpm --filter @qd/engine typecheck

Test Files  14 passed (14)
Tests  126 passed (126)
> @qd/engine@0.0.0 typecheck
> tsc --noEmit
```

### Full unit suite

```text
$ pnpm run test

Tasks:    10 successful, 10 total
Cached:    5 cached, 10 total
Time:    15.602s
```

The engine portion of that command reported:

```text
Test Files  14 passed (14)
Tests  126 passed (126)
```

### End-to-end suite

```text
$ pnpm run test:e2e

Running 290 tests using 4 workers
290 passed (1.6m)
Tearing down...
```

The final isolated E2E terminal session exited with code `0`. An earlier retry encountered stale worker-database connections after two detached runner processes; those exact E2E-only processes and containers were stopped before the successful isolated run above.

### Lint

```text
$ pnpm run lint

Checked 283 files in 255ms. No fixes applied.
Tasks:    9 successful, 9 total
Cached:    6 cached, 9 total
Time:    7.821s
```

### Typecheck

```text
$ pnpm run typecheck

Tasks:    9 successful, 9 total
Cached:    9 cached, 9 total
Time:    220ms >>> FULL TURBO
```
