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
  return {
    items,
    page,
    limit,
    totalCount: countResult[0]?.count ?? 0,
  };
}
