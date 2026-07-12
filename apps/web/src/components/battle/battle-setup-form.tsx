import type { FormEvent } from "react";
import { EntityPickerPopover } from "~/components/create/entity-picker-popover";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export interface BattleSetup {
  scenarioAId: string;
  scenarioBId: string;
  seed: string;
}

interface ScenarioOption {
  id: string;
  name: string;
}

interface BattleSetupFormProps {
  options: ScenarioOption[];
  value: BattleSetup;
  onChange: (value: BattleSetup) => void;
  onSubmit: (value: BattleSetup) => void;
  pending: boolean;
  error?: string;
}

const pickerClassName =
  "flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background/40 px-3 text-base outline-none transition-[border-color,box-shadow] hover:border-primary/45 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";

export function BattleSetupForm({
  options,
  value,
  onChange,
  onSubmit,
  pending,
  error,
}: BattleSetupFormProps) {
  const canSubmit =
    value.scenarioAId.length > 0 &&
    value.scenarioBId.length > 0 &&
    value.scenarioAId !== value.scenarioBId &&
    value.seed.trim().length > 0 &&
    !pending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    onSubmit({ ...value, seed: value.seed.trim() });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label className="font-display text-xs tracking-[0.16em] uppercase">Scenario A</Label>
            <span className="text-xs text-muted-foreground">First company</span>
          </div>
          <EntityPickerPopover
            pickerTestId="battle-scenario-a-picker"
            searchTestId="battle-scenario-a-search"
            emptyTestId="battle-scenario-a-empty"
            optionTestIdPrefix="battle-scenario-a-option"
            options={options.filter((option) => option.id !== value.scenarioBId)}
            selectedId={value.scenarioAId}
            onSelect={(scenarioAId) => onChange({ ...value, scenarioAId })}
            searchPlaceholder="Search scenarios…"
            triggerPlaceholder="Choose Scenario A"
            listboxLabel="Scenario A options"
            emptyMessage="No scenarios found."
            triggerClassName={pickerClassName}
            popoverClassName="p-2"
          />
        </div>

        <div
          aria-hidden="true"
          className="mx-auto flex size-9 items-center justify-center rounded-full border border-primary/35 bg-primary/10 font-display text-[10px] tracking-[0.12em] text-primary md:mb-0.5"
        >
          VS
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label className="font-display text-xs tracking-[0.16em] uppercase">Scenario B</Label>
            <span className="text-xs text-muted-foreground">Second company</span>
          </div>
          <EntityPickerPopover
            pickerTestId="battle-scenario-b-picker"
            searchTestId="battle-scenario-b-search"
            emptyTestId="battle-scenario-b-empty"
            optionTestIdPrefix="battle-scenario-b-option"
            options={options.filter((option) => option.id !== value.scenarioAId)}
            selectedId={value.scenarioBId}
            onSelect={(scenarioBId) => onChange({ ...value, scenarioBId })}
            searchPlaceholder="Search scenarios…"
            triggerPlaceholder="Choose Scenario B"
            listboxLabel="Scenario B options"
            emptyMessage="No scenarios found."
            triggerClassName={pickerClassName}
            popoverClassName="p-2"
          />
        </div>
      </div>

      <div className="grid items-end gap-4 border-t border-border/70 pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-2">
          <Label htmlFor="battle-seed">Battle seed</Label>
          <Input
            id="battle-seed"
            value={value.seed}
            placeholder="Enter a reproducible seed"
            autoComplete="off"
            onChange={(event) => onChange({ ...value, seed: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Reuse a seed to reproduce the same resolution.
          </p>
        </div>
        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full md:w-auto">
          {pending ? "Resolving battle…" : "Run & save battle"}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-foreground"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
