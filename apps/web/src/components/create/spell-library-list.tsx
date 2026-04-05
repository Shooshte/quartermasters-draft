import { EntityLibraryList, formatLibraryDate } from "./entity-library-list";
import type { SpellSortBy, SpellSortDir } from "./types";

interface SpellLibraryListProps {
  items: { id: string; name: string; targetPolicy: string; updatedAt: Date }[];
  isLoading: boolean;
  isFetching: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: SpellSortBy;
  sortDir: SpellSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: SpellSortBy, sortDir: SpellSortDir) => void;
}

export function SpellLibraryList(props: SpellLibraryListProps) {
  return (
    <EntityLibraryList
      entityLabel="spell"
      getRowLabel={(item) => item.name}
      columns={[
        {
          key: "name",
          label: "Name",
          renderCell: (item) => item.name,
        },
        {
          key: "targetPolicy",
          label: "Target Policy",
          className: "text-sm text-muted-foreground",
          renderCell: (item) => item.targetPolicy,
        },
        {
          key: "updatedAt",
          label: "Updated At",
          className: "text-sm text-muted-foreground",
          renderCell: (item) => formatLibraryDate(item.updatedAt),
        },
      ]}
      {...props}
    />
  );
}
