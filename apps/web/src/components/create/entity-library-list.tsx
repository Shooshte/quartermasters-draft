import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface EntityLibraryListColumn<TItem, TSort extends string> {
  key: TSort;
  label: string;
  renderCell: (item: TItem) => ReactNode;
  className?: string;
}

interface EntityLibraryListProps<TItem extends { id: string }, TSort extends string> {
  entityLabel: string;
  items: TItem[];
  isLoading: boolean;
  isFetching: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: TSort;
  sortDir: "asc" | "desc";
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: TSort, sortDir: "asc" | "desc") => void;
  getRowLabel: (item: TItem) => string;
  getDeleteLabel?: (item: TItem) => string;
  columns: EntityLibraryListColumn<TItem, TSort>[];
}

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return null;
  }

  return dir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3" />
  );
}

function capitalizeEntityLabel(entityLabel: string) {
  return entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1);
}

export function formatLibraryDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EntityLibraryList<TItem extends { id: string }, TSort extends string>({
  entityLabel,
  items,
  isLoading,
  isFetching,
  selectedId,
  page,
  totalPages,
  sortBy,
  sortDir,
  onSelect,
  onCreateNew,
  onDelete,
  onPageChange,
  onSortChange,
  getRowLabel,
  getDeleteLabel = getRowLabel,
  columns,
}: EntityLibraryListProps<TItem, TSort>) {
  const entityLabelCapitalized = capitalizeEntityLabel(entityLabel);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }

  if (items.length === 0 && page === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4">
        <div data-testid="empty-list">
          <p className="text-sm text-muted-foreground">No {entityLabel} records yet</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          Create the first {entityLabel}
        </Button>
      </div>
    );
  }

  const handleSort = (column: TSort) => {
    if (column === sortBy) {
      onSortChange(sortBy, sortDir === "asc" ? "desc" : "asc");
      return;
    }

    onSortChange(column, "asc");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="px-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          New {entityLabelCapitalized}
        </Button>
      </div>
      <div
        className={`flex-1 min-h-0 overflow-y-auto px-2 pb-2 transition-opacity duration-200 ${isFetching ? "pointer-events-none opacity-60" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow disableHover>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center border-none bg-transparent p-0 font-medium text-foreground"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    <SortIndicator active={sortBy === column.key} dir={sortDir} />
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const rowLabel = getRowLabel(item);
              const deleteLabel = getDeleteLabel(item);

              return (
                <TableRow
                  disableHover
                  key={item.id}
                  aria-label={rowLabel}
                  aria-selected={item.id === selectedId}
                  className={item.id === selectedId ? "border-l-3 border-primary bg-accent font-medium" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.renderCell(item)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        aria-label={`Edit ${rowLabel}`}
                        onClick={() => onSelect(item.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 cursor-pointer"
                        aria-label={`Delete ${deleteLabel}`}
                        onClick={() => onDelete(item.id, deleteLabel)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-center gap-2 px-2 pb-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous page
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next page
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
