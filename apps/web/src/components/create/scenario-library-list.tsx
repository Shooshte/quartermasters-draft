import { ArrowUp, ArrowDown, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import type { ScenarioSortBy, ScenarioSortDir } from "./types";

interface ScenarioLibraryListProps {
  items: { id: string; name: string; updatedAt: Date; createdAt: Date }[];
  isLoading: boolean;
  isFetching: boolean;
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
}: ScenarioLibraryListProps) {
  if (isLoading) {
    return (
      <div className={`p-4 text-sm text-muted-foreground`}>
        Loading...
      </div>
    );
  }

  if (items.length === 0 && page === 1) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-4`}>
        <div data-testid="empty-list">
          <p className="text-sm text-muted-foreground">No scenario records yet</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          Create the first scenario
        </Button>
      </div>
    );
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
      <div className={`overflow-y-auto transition-opacity duration-200 ${isFetching ? "opacity-60 pointer-events-none" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <button className="inline-flex items-center cursor-pointer bg-transparent border-none p-0 font-medium text-foreground" onClick={() => handleSort("name")}>
                  Name
                  <SortIndicator active={sortBy === "name"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead>
                <button className="inline-flex items-center cursor-pointer bg-transparent border-none p-0 font-medium text-foreground" onClick={() => handleSort("updatedAt")}>
                  Last Update
                  <SortIndicator active={sortBy === "updatedAt"} dir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                aria-label={item.name}
                aria-selected={item.id === selectedId}
                className={`hover:bg-transparent ${
                  item.id === selectedId ? "bg-accent border-l-3 border-primary font-medium" : ""
                }`}
              >
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => onSelect(item.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
