# Task 1 Report: Include item modifiers in the item-list contract

## Outcome

Updated `scenarioBuilder.items.list` so each returned row projects and exposes all seven item modifier fields: `meleeDmg`, `rangedDmg`, `mana`, `manaRegen`, `spellDmg`, `dodge`, and `criticalChance`, in addition to `id`, `name`, and `updatedAt`.

## TDD evidence

- Added the projection contract assertion and modifier fields to the existing list test.
- Ran the focused test before the implementation; it failed because the projection contained only `id`, `name`, and `updatedAt`.
- Added the minimal projection fields to `items.ts`.
- Re-ran the complete item router test file; all 20 tests passed.

## Verification

Command:

```text
pnpm --filter @qd/api exec vitest run src/__tests__/scenarioBuilder/items.test.ts --pool=threads --maxWorkers=1
```

Result: 1 test file passed, 20 tests passed.

The repository requests Node.js 24+, while this environment reports Node.js 22.20.0; pnpm emitted the existing unsupported-engine warning. The focused Vitest run itself passed.

## Files changed

- `packages/api/src/__tests__/scenarioBuilder/items.test.ts`
- `packages/api/src/routers/scenarioBuilder/items.ts`
