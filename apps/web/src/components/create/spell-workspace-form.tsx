import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import {
  hasSpellFormErrors,
  validateSpellForm,
  type SpellFormValues,
  type EffectOption,
} from "./spell-form";

interface SpellWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: SpellFormValues;
  effectOptions: EffectOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function getEffectBadgeClass(effectType: string): string {
  switch (effectType) {
    case "damage":
      return "spell-effect-badge spell-effect-badge-damage";
    case "healing":
      return "spell-effect-badge spell-effect-badge-healing";
    case "buff":
      return "spell-effect-badge spell-effect-badge-buff";
    case "debuff":
      return "spell-effect-badge spell-effect-badge-debuff";
    default:
      return "spell-effect-badge";
  }
}

export function SpellWorkspaceForm({
  mode,
  formValues,
  effectOptions,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: SpellWorkspaceFormProps) {
  const targetPolicySelectRef = useRef<HTMLSelectElement>(null);
  const effectSearchInputRef = useRef<HTMLInputElement>(null);
  const errors = validateSpellForm(formValues);
  const saveLabel = mode === "create" ? "Create Spell" : "Save Changes";
  const [isEffectPickerOpen, setIsEffectPickerOpen] = useState(false);
  const [effectSearch, setEffectSearch] = useState("");
  const [selectedEffectId, setSelectedEffectId] = useState("");
  const effectPickerListboxId = useId();

  const handleChipMouseDown =
    (selectRef: RefObject<HTMLSelectElement | null>) =>
    (event: MouseEvent<HTMLLabelElement>) => {
      if (event.target instanceof HTMLSelectElement) {
        return;
      }

      event.preventDefault();

      const select = selectRef.current;

      if (!select) {
        return;
      }

      select.focus();
      try {
        select.showPicker?.();
      } catch {
        // Focus remains on the native select, so keyboard interaction still works.
      }
    };

  useEffect(() => {
    if (!isEffectPickerOpen) {
      setEffectSearch("");
      return;
    }

    effectSearchInputRef.current?.focus();
  }, [isEffectPickerOpen]);

  const filteredEffectOptions = useMemo(() => {
    const searchTerm = effectSearch.trim().toLowerCase();
    const matchingOptions = searchTerm
      ? effectOptions.filter((effect) => effect.name.toLowerCase().includes(searchTerm))
      : effectOptions;

    return matchingOptions.slice(0, 5);
  }, [effectOptions, effectSearch]);

  const selectedEffect = effectOptions.find((effect) => effect.id === selectedEffectId);

  const handleAddEffect = () => {
    if (!selectedEffectId) return;

    const newEffectIds = [...formValues.effectIds, selectedEffectId];
    onFieldChange("effectIds", newEffectIds);
    setSelectedEffectId("");
    setEffectSearch("");
    setIsEffectPickerOpen(false);
  };

  const handleRemoveEffect = (index: number) => {
    const newEffectIds = formValues.effectIds.filter((_, i) => i !== index);
    onFieldChange("effectIds", newEffectIds);
  };

  const handleMoveEffect = (index: number, direction: "up" | "down") => {
    const newEffectIds = [...formValues.effectIds];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEffectIds.length) return;
    [newEffectIds[index], newEffectIds[targetIndex]] = [
      newEffectIds[targetIndex],
      newEffectIds[index],
    ];
    onFieldChange("effectIds", newEffectIds);
  };

  // Build a lookup map for effect details
  const effectMap = new Map(effectOptions.map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-4" data-testid="spell-form-fields">
      {/* Name cell */}
      <div className="ws-cell-neutral">
        <label htmlFor="entity-name" className="ws-cell-label">
          Name
        </label>
        <input
          id="entity-name"
          data-testid="entity-name-input"
          className="ws-cell-input ws-name-input"
          value={formValues.name}
          placeholder="—"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Description cell */}
      <div className="ws-cell-neutral">
        <label htmlFor="spell-description" className="ws-cell-label">
          Description{" "}
          <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>
            (optional)
          </span>
        </label>
        <textarea
          id="spell-description"
          data-testid="spell-description-input"
          className="ws-cell-input"
          style={{ minHeight: 48, resize: "vertical", lineHeight: 1.5 }}
          value={formValues.description}
          placeholder="—"
          onChange={(e) => onFieldChange("description", e.target.value)}
        />
      </div>

      {/* Target Selection section */}
      <div>
        <div className="ws-section-header">Target Selection</div>
        <div className="flex gap-2 items-center flex-wrap">
          <label
            className="ws-chip"
            style={{
              background: "oklch(0.78 0.15 75 / 12%)",
              color: "oklch(0.78 0.15 75)",
              border: "1px solid oklch(0.78 0.15 75 / 18%)",
            }}
            data-testid="spell-target-policy-chip"
            onMouseDown={handleChipMouseDown(targetPolicySelectRef)}
          >
            <select
              ref={targetPolicySelectRef}
              data-testid="spell-target-policy-select"
              className="ws-chip-select"
              value={formValues.targetPolicy}
              onChange={(e) => onFieldChange("targetPolicy", e.target.value)}
            >
              <option value="" disabled hidden />
              <option value="highest_health">highest_health</option>
              <option value="lowest_health">lowest_health</option>
              <option value="highest_damage">highest_damage</option>
              <option value="random">random</option>
            </select>
            <span className="ws-chip-arrow">▼</span>
          </label>
        </div>
        {errors.targetPolicy && (
          <p className="text-sm text-destructive mt-1">{errors.targetPolicy}</p>
        )}
      </div>

      {/* Spell Effects section */}
      <div>
        <div className="ws-section-header">Spell Effects</div>

        {/* Effect picker */}
        <div className="flex gap-2 items-center mb-2.5">
          <Popover open={isEffectPickerOpen} onOpenChange={setIsEffectPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-testid="spell-effect-picker"
                role="combobox"
                aria-expanded={isEffectPickerOpen}
                aria-controls={effectPickerListboxId}
                className="ws-cell-input"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid oklch(0.91 0.03 70 / 12%)",
                  borderRadius: 6,
                  padding: "7px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "left",
                  }}
                >
                  {selectedEffect?.name ?? "Select effect"}
                </span>
                <ChevronsUpDown className="size-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-2"
              style={{
                width: "var(--radix-popover-trigger-width)",
                background: "oklch(0.21 0.012 55)",
                borderColor: "oklch(0.91 0.03 70 / 12%)",
              }}
            >
              <div className="flex flex-col gap-2">
                <input
                  ref={effectSearchInputRef}
                  data-testid="spell-effect-picker-search"
                  value={effectSearch}
                  placeholder="Search effects..."
                  className="ws-cell-input"
                  onChange={(e) => setEffectSearch(e.target.value)}
                />
                <div
                  id={effectPickerListboxId}
                  role="listbox"
                  className="flex flex-col gap-1"
                  aria-label="Spell effect options"
                >
                  {filteredEffectOptions.length === 0 ? (
                    <div
                      data-testid="spell-effect-picker-empty"
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground"
                    >
                      No effects found.
                    </div>
                  ) : (
                    filteredEffectOptions.map((effect) => {
                      const isSelected = effect.id === selectedEffectId;

                      return (
                        <button
                          key={effect.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-testid={`spell-effect-picker-option-${effect.id}`}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          style={{
                            background: isSelected ? "oklch(0.78 0.15 75 / 12%)" : undefined,
                            color: isSelected ? "oklch(0.78 0.15 75)" : undefined,
                          }}
                          onClick={() => {
                            setSelectedEffectId(effect.id);
                            setIsEffectPickerOpen(false);
                          }}
                        >
                          <span>{effect.name}</span>
                          <Check className={`size-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            data-testid="spell-add-effect-button"
            onClick={handleAddEffect}
          >
            + Add
          </Button>
        </div>

        {/* Effect list */}
        <div className="flex flex-col gap-1">
          {formValues.effectIds.map((effectId, index) => {
            const effect = effectMap.get(effectId);
            const isFirst = index === 0;
            const isLast = index === formValues.effectIds.length - 1;

            return (
              <div
                key={`${effectId}-${index}`}
                className="flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid oklch(0.91 0.03 70 / 12%)",
                  borderRadius: 6,
                  padding: "6px 8px",
                }}
                data-testid={`spell-effect-row-${index}`}
              >
                {/* Sequence badge */}
                <span
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 12,
                    color: "oklch(0.78 0.15 75)",
                    background: "oklch(0.78 0.15 75 / 10%)",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>

                {/* Effect name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 15,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {effect?.name ?? effectId}
                </span>

                {/* Type badge */}
                {effect && (
                  <span className={getEffectBadgeClass(effect.effectType)}>
                    {effect.effectType}
                  </span>
                )}

                {/* Controls */}
                <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
                  <button
                    data-testid={`spell-effect-move-up-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    style={{ width: 24, height: 24, fontSize: 12, opacity: isFirst ? 0.2 : 1 }}
                    disabled={isFirst}
                    onClick={() => handleMoveEffect(index, "up")}
                  >
                    ↑
                  </button>
                  <button
                    data-testid={`spell-effect-move-down-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    style={{ width: 24, height: 24, fontSize: 12, opacity: isLast ? 0.2 : 1 }}
                    disabled={isLast}
                    onClick={() => handleMoveEffect(index, "down")}
                  >
                    ↓
                  </button>
                  <button
                    data-testid={`spell-effect-remove-${index}`}
                    className="inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                    style={{ width: 24, height: 24, fontSize: 12 }}
                    onClick={() => handleRemoveEffect(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {errors.effectIds && (
          <p className="text-sm text-destructive mt-1">{errors.effectIds}</p>
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          onClick={onSave}
          disabled={isSaving || hasSpellFormErrors(formValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
