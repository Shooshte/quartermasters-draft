import { EntityLibraryList, formatLibraryDate } from "./entity-library-list";
import type { UnitSortBy, UnitSortDir } from "./types";

interface UnitLibraryListProps {
  items: { id: string; name: string; updatedAt: Date }[];
  isLoading: boolean;
  isFetching: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: UnitSortBy;
  sortDir: UnitSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: UnitSortBy, sortDir: UnitSortDir) => void;
}

export function UnitLibraryList(props: UnitLibraryListProps) {
  return (
    <EntityLibraryList
      entityLabel="unit"
      getRowLabel={(item) => item.name}
      columns={[
        {
          key: "name",
          label: "Name",
          renderCell: (item) => item.name,
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
