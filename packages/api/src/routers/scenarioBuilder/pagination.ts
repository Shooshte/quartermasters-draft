export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  totalCount: number;
}

export function toPaginatedResult<T>(
  items: T[],
  countResult: readonly { count: number }[],
  page: number,
  limit: number,
): PaginatedResult<T> {
  const countRow = countResult[0];
  if (!countRow) {
    throw new Error("Pagination count query returned no rows.");
  }

  return {
    items,
    page,
    limit,
    totalCount: countRow.count,
  };
}
