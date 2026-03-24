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

import type { EffectSortBy, EffectSortDir } from "./types";

interface EffectLibraryListProps {
  items: { id: string; name: string; timingType: string; effectType: string }[];
  isLoading: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: EffectSortBy;
  sortDir: EffectSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: EffectSortBy, sortDir: EffectSortDir) => void;
}

function SortIndicator({ active, dir }: { active: boolean; dir: EffectSortDir }) {
  if (!active) return null;
  return dir === "asc" ? (
    <ArrowUp className="ml-1 h-3 w-3 inline" />
  ) : (
    <ArrowDown className="ml-1 h-3 w-3 inline" />
  );
}

export function EffectLibraryList({
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
}: EffectLibraryListProps) {
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
          <p className="text-sm text-muted-foreground">No effect records yet</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew}>
          Create the first effect
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`p-4 text-sm text-muted-foreground`}>
        Loading...
      </div>
    );
  }

  const handleSort = (column: EffectSortBy) => {
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
          New Effect
        </Button>
      </div>
      <div className={`overflow-y-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => handleSort("name")}>
                  Name
                  <SortIndicator active={sortBy === "name"} dir={sortDir} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => handleSort("timingType")}>
                  Timing Type
                  <SortIndicator active={sortBy === "timingType"} dir={sortDir} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => handleSort("effectType")}>
                  Effect Type
                  <SortIndicator active={sortBy === "effectType"} dir={sortDir} />
                </Button>
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
                  {item.timingType}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.effectType}
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
