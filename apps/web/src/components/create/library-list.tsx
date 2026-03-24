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
