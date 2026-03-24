# Create Page UI Redesign

## Context

The `/create` route currently uses a 3-panel layout (two workspaces top, library bottom) with inconsistent component patterns — Items/Units use simple lists while Effects/Spells/Scenarios use sortable tables. The layout feels cramped, visually disconnected, and has poor hierarchy. This redesign restructures the page into a sidebar library + stacked workspaces layout, unifies all library tabs to use a consistent table component, and improves spacing and visual polish throughout.

## Design

### 1. Layout: Sidebar Library + Stacked Workspaces

Replace the current vertical arrangement with a horizontal split:

```
┌──────────────────────┬─────────────────────────────┐
│                      │                             │
│   Library Panel      │   Entity Workspace          │
│   (left, ~42%)       │   (Card with form)          │
│                      │                             │
│   [Tabs]             ├─────────────────────────────┤
│   [Table rows...]    │                             │
│   [Pagination]       │   Scenario Workspace        │
│                      │   (Card with form + rows)   │
│                      │                             │
└──────────────────────┴─────────────────────────────┘
```

- **Container**: `flex h-[calc(100vh-60px)]` (horizontal flex instead of vertical)
- **Library panel**: `w-[42%] border-r flex flex-col` — full viewport height, internal scroll on table body
- **Workspaces column**: `flex-1 flex flex-col gap-4 p-4` — entity workspace and scenario workspace split equally

### 2. Consistent Library Table Presentation

Restyle the Items/Units `LibraryList` to use a table-based visual presentation matching the existing Effects/Spells/Scenarios tables. This is a **visual-only change** — Items/Units keep their current behavior (no sorting, no pagination, no delete) since no backend support exists for those features.

**Per-tab column configuration:**

| Tab | Columns | Sortable | Pagination | Delete |
|-----|---------|----------|------------|--------|
| Effects | Name, Timing Type, Effect Type, Actions | Yes | Yes | Yes |
| Spells | Name, Target Policy, Updated At, Actions | Yes | Yes | Yes |
| Items | Name, Actions (edit only) | No | No | No |
| Units | Name, Actions (edit only) | No | No | No |
| Scenarios | Name, Last Update, Actions | Yes | Yes | Yes |

**Shared visual features across all tabs:**
- Row selection highlighting with left accent border (`border-l-3 border-primary bg-accent`)
- Table-style row layout (even for Items/Units which only have a Name column)
- Edit action button (pencil icon) on all rows
- Empty state and loading state
- "New [Entity]" button in header area

**Effects/Spells/Scenarios only (already existing):**
- Sortable column headers (click to toggle asc/desc)
- Delete (trash) action button per row
- Pagination footer (Previous / Page X of Y / Next)

### 3. Action Button Spacing

Change edit/delete button container from `gap-1` to `gap-2` (8px) in table components that have both edit and delete buttons:
- `effect-library-list.tsx`
- `spell-library-list.tsx`
- `scenario-library-list.tsx`

### 4. Library Fills Available Space

Remove the fixed 10-row height constraint. The library table fills the sidebar height via `flex-1 overflow-y-auto` on the table body container. Pagination page size remains 10 (unchanged server-side), but the display area uses all available vertical space.

**Feature file change**: Update `create-shell.feature` lines 383-396 — remove the "fixed height for exactly 10 rows" rule and replace with a rule that the library list area fills available space and scrolls when content overflows.

### 5. Visual Polish

- **Spacing**: Consistent `p-4 gap-4` throughout. Library panel uses `p-4` internal padding.
- **Tab bar**: Use existing shadcn `TabsList` with pill variant. Add section title below tabs showing active tab name + "New [Entity]" button.
- **Workspace cards**: Keep existing `Card` component. Ensure consistent `CardHeader` with title showing mode (idle/create/edit) and entity type/name.
- **Selected row**: `bg-accent border-l-3 border-primary font-medium` for the active library row.
- **Typography**: Table header text uses `text-muted-foreground text-xs font-medium`. Row text uses default `text-sm`. Metadata columns use `text-muted-foreground`.
- **Borders**: Library panel separated from workspaces by `border-r` (single right border on the sidebar).

## Files to Modify

### Components (modify)
- `apps/web/src/components/create/create-page.tsx` — layout restructure
- `apps/web/src/components/create/library-panel.tsx` — sidebar layout, section header
- `apps/web/src/components/create/library-list.tsx` — convert to table-based component or replace
- `apps/web/src/components/create/effect-library-list.tsx` — action button spacing
- `apps/web/src/components/create/spell-library-list.tsx` — action button spacing
- `apps/web/src/components/create/scenario-library-list.tsx` — action button spacing
- `apps/web/src/components/create/entity-workspace.tsx` — no functional changes, spacing tweaks
- `apps/web/src/components/create/scenario-workspace.tsx` — no functional changes, spacing tweaks

### Feature files (modify)
- `e2e/features/create/create-shell.feature` — update fixed-height rule (lines 383-396)

### Tests (modify)
- Existing unit tests for create components may need layout-related assertion updates
- E2E tests may need selector updates if DOM structure changes

### Files to reuse (no changes)
- `apps/web/src/components/ui/table.tsx` — existing shadcn table components
- `apps/web/src/components/ui/tabs.tsx` — existing tab components with pill variant
- `apps/web/src/components/ui/card.tsx` — workspace containers
- `apps/web/src/components/ui/button.tsx` — action buttons
- `apps/web/src/components/create/types.ts` — all types remain unchanged
- `apps/web/src/components/create/use-create-page-state.ts` — state hook unchanged

## What This Does NOT Change

- No new functionality (no Save/Cancel buttons, no new features)
- No changes to URL parameter handling or state management
- No changes to tRPC queries or data fetching
- No changes to the dialog overlays (unsaved changes, delete confirm)
- Pagination page size stays at 10 server-side

## Verification

1. `pnpm test` — all unit tests pass
2. `pnpm test:e2e` — all E2E tests pass (after feature file update)
3. Manual check: navigate to `/create`, verify sidebar library + stacked workspaces layout
4. Manual check: all 5 tabs show consistent table-style row layout (Items/Units without sort/pagination, Effects/Spells/Scenarios with full features)
5. Manual check: selecting a row shows left accent border and loads in workspace
6. Manual check: edit/delete buttons have visible spacing between them
7. Manual check: library table fills available sidebar height, scrolls on overflow
