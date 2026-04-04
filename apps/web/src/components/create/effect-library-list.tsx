import { EntityLibraryList } from "./entity-library-list";
import type { EffectSortBy, EffectSortDir } from "./types";

interface EffectLibraryListProps {
  items: { id: string; name: string; timingType: string; effectType: string }[];
  isLoading: boolean;
  isFetching: boolean;
  selectedId: string | null;
  page: number;
  totalPages: number;
  sortBy: EffectSortBy;
  sortDir: EffectSortDir;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: EffectSortBy, sortDir: EffectSortDir) => void;
}

export function EffectLibraryList(props: EffectLibraryListProps) {
  return (
    <EntityLibraryList
      entityLabel="effect"
      getRowLabel={(item) => item.name}
      columns={[
        {
          key: "name",
          label: "Name",
          renderCell: (item) => item.name,
        },
        {
          key: "timingType",
          label: "Timing Type",
          className: "text-sm text-muted-foreground",
          renderCell: (item) => item.timingType,
        },
        {
          key: "effectType",
          label: "Effect Type",
          className: "text-sm text-muted-foreground",
          renderCell: (item) => item.effectType,
        },
      ]}
      {...props}
    />
  );
}
