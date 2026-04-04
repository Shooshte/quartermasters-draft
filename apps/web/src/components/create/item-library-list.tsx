import { EntityLibraryList, formatLibraryDate } from "./entity-library-list";
import type { ItemSortBy, ItemSortDir } from "./types";

interface ItemLibraryListProps {
  items: { id: string; name: string; updatedAt: Date }[];
  isLoading: boolean;
  isFetching: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: ItemSortBy;
  sortDir: ItemSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: ItemSortBy, sortDir: ItemSortDir) => void;
}

export function ItemLibraryList(props: ItemLibraryListProps) {
  return (
    <EntityLibraryList
      entityLabel="item"
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
