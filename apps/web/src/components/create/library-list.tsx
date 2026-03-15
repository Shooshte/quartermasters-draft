import { Button } from "~/components/ui/button";


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
      <div className={`p-4 text-sm text-muted-foreground`} data-testid="library-list-area">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-4`} data-testid="library-list-area">
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
      <ul className={`flex flex-col gap-0.5 overflow-y-auto px-2 pb-2`} role="listbox">
        {items.map((item) => (
          <li
            key={item.id}
            role="option"
            aria-selected={item.id === selectedId}
            className={`cursor-pointer rounded px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
              item.id === selectedId
                ? "bg-accent font-medium text-accent-foreground"
                : ""
            }`}
            onClick={() => onSelect(item.id)}
          >
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
