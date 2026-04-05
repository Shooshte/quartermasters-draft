import { Button } from "~/components/ui/button";

interface WorkspaceSaveFooterProps {
  saveLabel: string;
  isSaving: boolean;
  isDisabled: boolean;
  saveError: string | null;
  onSave: () => void;
}

export function WorkspaceSaveFooter({
  saveLabel,
  isSaving,
  isDisabled,
  saveError,
  onSave,
}: WorkspaceSaveFooterProps) {
  return (
    <>
      {saveError ? (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          type="button"
          disabled={isSaving || isDisabled}
          onClick={onSave}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </>
  );
}
