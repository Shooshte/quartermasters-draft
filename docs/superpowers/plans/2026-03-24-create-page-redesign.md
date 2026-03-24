# Create Page UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the `/create` page from a 3-panel grid layout to a sidebar library + stacked workspaces layout, unify library tab presentation, and improve visual polish.

**Architecture:** The page switches from vertical flex (2-col top + full-width bottom) to horizontal flex (library sidebar left 42% + workspaces column right 58%). Items/Units LibraryList converts from a simple `<ul>` to a `<Table>` matching the existing Effects/Spells/Scenarios pattern. No state management, tRPC, or functionality changes.

**Tech Stack:** React 19, TanStack Start, Tailwind CSS v4, shadcn/ui (Card, Table, Tabs, Button), Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-24-create-page-redesign-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/web/src/components/create/create-page.tsx` | Modify | Layout: horizontal flex container |
| `apps/web/src/components/create/library-panel.tsx` | Modify | Sidebar wrapper: full-height, border-r, section header |
| `apps/web/src/components/create/library-list.tsx` | Modify | Convert from `<ul>` list to `<Table>` with edit button |
| `apps/web/src/components/create/effect-library-list.tsx` | Modify | `gap-1` → `gap-2`, selected row accent border |
| `apps/web/src/components/create/spell-library-list.tsx` | Modify | `gap-1` → `gap-2`, selected row accent border |
| `apps/web/src/components/create/scenario-library-list.tsx` | Modify | `gap-1` → `gap-2`, selected row accent border |
| `apps/web/src/components/create/entity-workspace.tsx` | Modify | Minor spacing tweaks |
| `apps/web/src/components/create/scenario-workspace.tsx` | Modify | Minor spacing tweaks |
| `apps/web/tests/unit/create/library-list.test.tsx` | Modify | Update assertions from listbox/option to table/row roles |
| `e2e/features/create/create-shell.feature` | Modify | Remove fixed 10-row height rule |

---

### Task 1: Update Feature File — Remove Fixed 10-Row Height Rule

**Files:**
- Modify: `e2e/features/create/create-shell.feature:383-396`

- [ ] **Step 1: Update the feature file**

Replace lines 383-396 in `e2e/features/create/create-shell.feature`:

Old (remove):
```gherkin
  Rule: The library list always displays a fixed-height area for exactly 10 rows

    Scenario: The library list area has a fixed height and scrolls when content overflows
      Given I am on the "/create" page
      When I view the library panel
      Then the list area should have a fixed height for exactly 10 rows
      And the list area should scroll vertically when more than 10 records exist

    Scenario: Loading and empty states occupy the same fixed-height area
      Given no effect records exist
      And I am on the "/create" page
      When I click the "Effects" tab
      Then the empty state should be displayed inside the fixed-height list area
```

New (replace with):
```gherkin
  Rule: The library list fills available space and scrolls on overflow

    Scenario: The library list area fills the available sidebar height
      Given I am on the "/create" page
      When I view the library panel
      Then the list area should fill available vertical space
      And the list area should scroll vertically when content overflows
```

- [ ] **Step 2: Commit**

```bash
git add e2e/features/create/create-shell.feature
git commit -m "feat(create): update feature file to allow flexible library height"
```

---

### Task 2: Convert LibraryList to Table-Based Component (TDD)

**Files:**
- Modify: `apps/web/tests/unit/create/library-list.test.tsx`
- Modify: `apps/web/src/components/create/library-list.tsx`

- [ ] **Step 1: Update tests to expect table-based structure**

Rewrite `apps/web/tests/unit/create/library-list.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryList } from "~/components/create/library-list";

const items = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

describe("LibraryList", () => {
  it("shows loading state", () => {
    render(
      <LibraryList
        items={[]}
        isLoading={true}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state with create button", () => {
    render(
      <LibraryList
        items={[]}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByText("No effect records yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create the first effect" })).toBeInTheDocument();
  });

  it("renders items with New button", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "New Effect" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("marks selected item with aria-selected on table row", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId="1"
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByRole("row", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("row", { name: /Beta/ })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect when clicking a table row", async () => {
    const onSelect = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onSelect when clicking the edit button", async () => {
    const onSelect = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Edit Alpha/ }));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateNew when clicking the New button", async () => {
    const onCreateNew = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "New Effect" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("calls onCreateNew from empty state button", async () => {
    const onCreateNew = vi.fn();
    render(
      <LibraryList
        items={[]}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Create the first effect" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("shows edit button per row", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const editButtons = screen.getAllByRole("button", { name: /Edit/ });
    expect(editButtons).toHaveLength(2);
  });

  it("applies overflow-y-auto to the table container", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const tableContainer = screen.getByRole("table").parentElement;
    expect(tableContainer?.className).toContain("overflow-y-auto");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && pnpm vitest run tests/unit/create/library-list.test.tsx`
Expected: Multiple FAIL — current component uses listbox/option, not table/row

- [ ] **Step 3: Rewrite LibraryList component to table-based**

Rewrite `apps/web/src/components/create/library-list.tsx`:

```tsx
import { Pencil } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface LibraryListProps {
  items: { id: string; name: string }[];
  isLoading: boolean;
  selectedId: string | null;
  singularLabel: string;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export function LibraryList({
  items,
  isLoading,
  selectedId,
  singularLabel,
  onSelect,
  onCreateNew,
}: LibraryListProps) {
  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground" data-testid="library-list-area">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4" data-testid="library-list-area">
        <div data-testid="empty-list">
          <p className="text-sm text-muted-foreground">
            No {singularLabel.toLowerCase()} records yet
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          Create the first {singularLabel.toLowerCase()}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="px-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          New {singularLabel}
        </Button>
      </div>
      <div className="overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs font-medium">
                Name
              </TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                aria-label={item.name}
                aria-selected={item.id === selectedId}
                className={`cursor-pointer hover:bg-transparent ${
                  item.id === selectedId
                    ? "bg-accent border-l-3 border-primary font-medium"
                    : ""
                }`}
                onClick={() => onSelect(item.id)}
              >
                <TableCell className="text-sm">{item.name}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    aria-label={`Edit ${item.name}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && pnpm vitest run tests/unit/create/library-list.test.tsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/create/library-list.tsx apps/web/tests/unit/create/library-list.test.tsx
git commit -m "feat(create): convert LibraryList from simple list to table layout"
```

---

### Task 3: Action Button Spacing + Selected Row Accent Border

**Files:**
- Modify: `apps/web/src/components/create/effect-library-list.tsx`
- Modify: `apps/web/src/components/create/spell-library-list.tsx`
- Modify: `apps/web/src/components/create/scenario-library-list.tsx`

- [ ] **Step 1: Update effect-library-list.tsx**

In `apps/web/src/components/create/effect-library-list.tsx`:

Change the action button container (line 139):
```tsx
// Old
<div className="flex gap-1">
// New
<div className="flex gap-2">
```

Change the selected row style (line 127-129):
```tsx
// Old
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent font-medium" : ""
}`}
// New
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent border-l-3 border-primary font-medium" : ""
}`}
```

- [ ] **Step 2: Update spell-library-list.tsx**

In `apps/web/src/components/create/spell-library-list.tsx`:

Change the action button container (line 149):
```tsx
// Old
<div className="flex gap-1">
// New
<div className="flex gap-2">
```

Change the selected row style (line 134-136):
```tsx
// Old
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent font-medium" : ""
}`}
// New
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent border-l-3 border-primary font-medium" : ""
}`}
```

- [ ] **Step 3: Update scenario-library-list.tsx**

In `apps/web/src/components/create/scenario-library-list.tsx`:

Change the action button container (line 138):
```tsx
// Old
<div className="flex gap-1">
// New
<div className="flex gap-2">
```

Change the selected row style (line 129-131):
```tsx
// Old
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent font-medium" : ""
}`}
// New
className={`hover:bg-transparent ${
  item.id === selectedId ? "bg-accent border-l-3 border-primary font-medium" : ""
}`}
```

- [ ] **Step 4: Run all create tests to verify nothing breaks**

Run: `cd apps/web && pnpm vitest run tests/unit/create/`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/create/effect-library-list.tsx apps/web/src/components/create/spell-library-list.tsx apps/web/src/components/create/scenario-library-list.tsx
git commit -m "feat(create): increase action button spacing and add selected row accent border"
```

---

### Task 4: Restructure Layout — Sidebar Library + Stacked Workspaces

**Files:**
- Modify: `apps/web/src/components/create/create-page.tsx`
- Modify: `apps/web/src/components/create/library-panel.tsx`

- [ ] **Step 1: Update create-page.tsx layout**

Rewrite the `return` JSX in `apps/web/src/components/create/create-page.tsx` (lines 23-98):

```tsx
  return (
    <main className="flex h-[calc(100vh-60px)]">
      <div className="w-[42%] border-r flex flex-col">
        <LibraryPanel
          activeTab={state.activeTab}
          perTabSelection={state.perTabSelection}
          listData={state.listData}
          listLoading={state.listLoading}
          onTabChange={state.setActiveTab}
          onSelectRecord={state.selectRecord}
          onCreateNew={state.createNew}
          scenarioListItems={state.scenarioListItems}
          scenarioPage={state.scenarioPage}
          scenarioTotalPages={state.scenarioTotalPages}
          scenarioSortBy={state.scenarioSortBy}
          scenarioSortDir={state.scenarioSortDir}
          onScenarioPageChange={state.setScenarioPage}
          onScenarioSortChange={state.setScenarioSort}
          onDeleteScenario={state.requestDeleteScenario}
          effectListItems={state.effectListItems}
          effectPage={state.effectPage}
          effectTotalPages={state.effectTotalPages}
          effectSortBy={state.effectSortBy}
          effectSortDir={state.effectSortDir}
          onEffectPageChange={state.setEffectPage}
          onEffectSortChange={state.setEffectSort}
          onDeleteEffect={state.requestDeleteEffect}
          spellListItems={state.spellListItems}
          spellPage={state.spellPage}
          spellTotalPages={state.spellTotalPages}
          spellSortBy={state.spellSortBy}
          spellSortDir={state.spellSortDir}
          onSpellPageChange={state.setSpellPage}
          onSpellSortChange={state.setSpellSort}
          onDeleteSpell={state.requestDeleteSpell}
        />
      </div>
      <div className="flex-1 flex flex-col gap-4 p-4 min-h-0">
        <EntityWorkspace
          workspace={state.entityWorkspace}
          onFieldChange={state.updateEntityField}
        />
        <ScenarioWorkspace
          workspace={state.scenarioWorkspace}
          onFieldChange={state.updateScenarioField}
        />
      </div>
      <UnsavedChangesDialog
        open={state.isDialogOpen}
        onCancel={state.cancelDiscard}
        onDiscard={state.confirmDiscard}
      />
      <DeleteConfirmDialog
        open={state.isDeleteDialogOpen}
        entityName={state.deleteTarget?.name ?? ""}
        entityLabel="scenario"
        errorMessage={state.deleteError}
        onCancel={state.cancelDeleteScenario}
        onConfirm={state.confirmDeleteScenario}
      />
      <DeleteConfirmDialog
        open={state.isDeleteEffectDialogOpen}
        entityName={state.deleteEffectTarget?.name ?? ""}
        entityLabel="effect"
        errorMessage={state.deleteEffectError}
        onCancel={state.cancelDeleteEffect}
        onConfirm={state.confirmDeleteEffect}
      />
      <DeleteConfirmDialog
        open={state.isDeleteSpellDialogOpen}
        entityName={state.deleteSpellTarget?.name ?? ""}
        entityLabel="spell"
        errorMessage={state.deleteSpellError}
        onCancel={state.cancelDeleteSpell}
        onConfirm={state.confirmDeleteSpell}
      />
    </main>
  );
```

- [ ] **Step 2: Update library-panel.tsx for sidebar layout**

Rewrite `apps/web/src/components/create/library-panel.tsx` — remove the Card wrapper, make it a flex column that fills the sidebar:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { LibraryList } from "./library-list";
import { ScenarioLibraryList } from "./scenario-library-list";
import { EffectLibraryList } from "./effect-library-list";
import { SpellLibraryList } from "./spell-library-list";
import { TABS, ENTITY_TABS, TAB_TO_SINGULAR, type TabName, type EntityTab, type ScenarioSortBy, type ScenarioSortDir, type EffectSortBy, type EffectSortDir, type SpellSortBy, type SpellSortDir } from "./types";

const GENERIC_ENTITY_TABS = ENTITY_TABS.filter((t) => t !== "Effects" && t !== "Spells") as readonly EntityTab[];

interface LibraryPanelProps {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  listData: Record<EntityTab, { items: { id: string; name: string }[] } | undefined>;
  listLoading: Record<TabName, boolean>;
  onTabChange: (tab: TabName) => void;
  onSelectRecord: (tab: TabName, id: string) => void;
  onCreateNew: (tab: TabName) => void;
  // Scenario-specific props
  scenarioListItems: { id: string; name: string; updatedAt: Date; createdAt: Date }[];
  scenarioPage: number;
  scenarioTotalPages: number;
  scenarioSortBy: ScenarioSortBy;
  scenarioSortDir: ScenarioSortDir;
  onScenarioPageChange: (page: number) => void;
  onScenarioSortChange: (sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => void;
  onDeleteScenario: (id: string, name: string) => void;
  // Effect-specific props
  effectListItems: { id: string; name: string; timingType: string; effectType: string }[];
  effectPage: number;
  effectTotalPages: number;
  effectSortBy: EffectSortBy;
  effectSortDir: EffectSortDir;
  onEffectPageChange: (page: number) => void;
  onEffectSortChange: (sortBy: EffectSortBy, sortDir: EffectSortDir) => void;
  onDeleteEffect: (id: string, name: string) => void;
  // Spell-specific props
  spellListItems: { id: string; name: string; description: string | null; targetPolicy: string; updatedAt: Date }[];
  spellPage: number;
  spellTotalPages: number;
  spellSortBy: SpellSortBy;
  spellSortDir: SpellSortDir;
  onSpellPageChange: (page: number) => void;
  onSpellSortChange: (sortBy: SpellSortBy, sortDir: SpellSortDir) => void;
  onDeleteSpell: (id: string, name: string) => void;
}

export function LibraryPanel({
  activeTab,
  perTabSelection,
  listData,
  listLoading,
  onTabChange,
  onSelectRecord,
  onCreateNew,
  scenarioListItems,
  scenarioPage,
  scenarioTotalPages,
  scenarioSortBy,
  scenarioSortDir,
  onScenarioPageChange,
  onScenarioSortChange,
  onDeleteScenario,
  effectListItems,
  effectPage,
  effectTotalPages,
  effectSortBy,
  effectSortDir,
  onEffectPageChange,
  onEffectSortChange,
  onDeleteEffect,
  spellListItems,
  spellPage,
  spellTotalPages,
  spellSortBy,
  spellSortDir,
  onSpellPageChange,
  onSpellSortChange,
  onDeleteSpell,
}: LibraryPanelProps) {
  return (
    <div data-testid="library-panel" className="flex flex-1 flex-col p-4 overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(val) => onTabChange(val as TabName)}
        className="flex flex-1 flex-col min-h-0"
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="Effects" className="flex-1 min-h-0 overflow-auto">
          <EffectLibraryList
            items={effectListItems}
            isLoading={listLoading.Effects}
            selectedId={perTabSelection.Effects}
            page={effectPage}
            totalPages={effectTotalPages}
            sortBy={effectSortBy}
            sortDir={effectSortDir}
            onSelect={(id) => onSelectRecord("Effects", id)}
            onCreateNew={() => onCreateNew("Effects")}
            onDelete={(id) => {
              const item = effectListItems.find((e) => e.id === id);
              onDeleteEffect(id, item?.name ?? "");
            }}
            onPageChange={onEffectPageChange}
            onSortChange={onEffectSortChange}
          />
        </TabsContent>
        <TabsContent value="Spells" className="flex-1 min-h-0 overflow-auto">
          <SpellLibraryList
            items={spellListItems}
            isLoading={listLoading.Spells}
            selectedId={perTabSelection.Spells}
            page={spellPage}
            totalPages={spellTotalPages}
            sortBy={spellSortBy}
            sortDir={spellSortDir}
            onSelect={(id) => onSelectRecord("Spells", id)}
            onCreateNew={() => onCreateNew("Spells")}
            onDelete={(id) => {
              const item = spellListItems.find((s) => s.id === id);
              onDeleteSpell(id, item?.name ?? "");
            }}
            onPageChange={onSpellPageChange}
            onSortChange={onSpellSortChange}
          />
        </TabsContent>
        {GENERIC_ENTITY_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="flex-1 min-h-0 overflow-auto">
            <LibraryList
              items={listData[tab]?.items ?? []}
              isLoading={listLoading[tab]}
              selectedId={perTabSelection[tab]}
              singularLabel={TAB_TO_SINGULAR[tab]}
              onSelect={(id) => onSelectRecord(tab, id)}
              onCreateNew={() => onCreateNew(tab)}
            />
          </TabsContent>
        ))}
        <TabsContent value="Scenarios" className="flex-1 min-h-0 overflow-auto">
          <ScenarioLibraryList
            items={scenarioListItems}
            isLoading={listLoading.Scenarios}
            selectedId={perTabSelection.Scenarios}
            page={scenarioPage}
            totalPages={scenarioTotalPages}
            sortBy={scenarioSortBy}
            sortDir={scenarioSortDir}
            onSelect={(id) => onSelectRecord("Scenarios", id)}
            onCreateNew={() => onCreateNew("Scenarios")}
            onDelete={(id) => {
              const item = scenarioListItems.find((s) => s.id === id);
              onDeleteScenario(id, item?.name ?? "");
            }}
            onPageChange={onScenarioPageChange}
            onSortChange={onScenarioSortChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Run all create tests**

Run: `cd apps/web && pnpm vitest run tests/unit/create/`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/create/create-page.tsx apps/web/src/components/create/library-panel.tsx
git commit -m "feat(create): restructure layout to sidebar library + stacked workspaces"
```

---

### Task 5: Full Test Suite Verification

- [ ] **Step 1: Run full unit test suite**

Run: `pnpm test`
Expected: All PASS

- [ ] **Step 2: Run full project build**

Run: `pnpm build`
Expected: Build succeeds without errors

- [ ] **Step 3: Verify in browser (manual)**

Start the dev server and navigate to `/create`:
- Library sidebar on left (~42% width) with border separator
- Entity workspace and Scenario workspace stacked vertically on right
- All 5 tabs show table-style rows
- Items/Units tabs show Name column + edit button (no sort/pagination/delete)
- Effects/Spells/Scenarios tabs show their columns + sort/pagination/edit/delete
- Selected row has left accent border + background highlight
- Edit/Delete buttons have visible spacing between them
- Library fills available sidebar height, scrolls on overflow
