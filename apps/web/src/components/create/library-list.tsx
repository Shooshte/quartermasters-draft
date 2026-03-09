import { Button } from "~/components/ui/button";

// 10 rows × 32px (20px line-height + 12px padding) + 9 gaps × 2px = 338px
export const LIBRARY_LIST_HEIGHT = "h-[338px]";

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
      <div className={`${LIBRARY_LIST_HEIGHT} p-4 text-sm text-muted-foreground`} data-testid="library-list-area">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`${LIBRARY_LIST_HEIGHT} flex flex-col items-center justify-center gap-2 p-4`} data-testid="library-list-area">
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
      <ul className={`${LIBRARY_LIST_HEIGHT} flex flex-col gap-0.5 overflow-y-auto px-2 pb-2`} role="listbox">
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
