import { EntityLibraryList, formatLibraryDate } from "./entity-library-list";
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
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => void;
}

export function ScenarioLibraryList(props: ScenarioLibraryListProps) {
  return (
    <EntityLibraryList
      entityLabel="scenario"
      getRowLabel={(item) => item.name}
      columns={[
        {
          key: "name",
          label: "Name",
          renderCell: (item) => item.name,
        },
        {
          key: "updatedAt",
          label: "Last Update",
          className: "text-sm text-muted-foreground",
          renderCell: (item) => formatLibraryDate(item.updatedAt),
        },
      ]}
      {...props}
    />
  );
}
