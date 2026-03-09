import { ArrowUp, ArrowDown, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { LIBRARY_LIST_HEIGHT } from "./library-list";
import type { ScenarioSortBy, ScenarioSortDir } from "./types";

interface ScenarioLibraryListProps {
  items: { id: string; name: string; updatedAt: Date; createdAt: Date }[];
  isLoading: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: ScenarioSortBy;
  sortDir: ScenarioSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => void;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SortIndicator({ active, dir }: { active: boolean; dir: ScenarioSortDir }) {
  if (!active) return null;
  return dir === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3 inline" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3 inline" />
  );
}

export function ScenarioLibraryList({
  items,
  isLoading,
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
}: ScenarioLibraryListProps) {
  if (isLoading) {
    return (
      <div className={`${LIBRARY_LIST_HEIGHT} p-4 text-sm text-muted-foreground`}>
        Loading...
      </div>
    );
  }

  if (items.length === 0 && page === 1) {
    return (
      <div className={`${LIBRARY_LIST_HEIGHT} flex flex-col items-center justify-center gap-2 p-4`}>
        <div data-testid="empty-list">
          <p className="text-sm text-muted-foreground">No scenario records yet</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          Create the first scenario
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const handleSort = (column: ScenarioSortBy) => {
    if (column === sortBy) {
      onSortChange(sortBy, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(column, "asc");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="px-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          New Scenario
        </Button>
      </div>
      <div className={`${LIBRARY_LIST_HEIGHT} overflow-y-auto`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("name")}>
                  Name
                  <SortIndicator active={sortBy === "name"} dir={sortDir} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort("updatedAt")}>
                  Last Update
                  <SortIndicator active={sortBy === "updatedAt"} dir={sortDir} />
                </Button>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                aria-label={item.name}
                aria-selected={item.id === selectedId}
                className={`cursor-pointer ${
                  item.id === selectedId ? "bg-accent font-medium" : ""
                }`}
                onClick={() => onSelect(item.id)}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Delete ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-2 pb-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
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
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
