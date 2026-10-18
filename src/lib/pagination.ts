export const DEFAULT_PAGE_SIZE = 20;

export type PageParams = {
  page: number;
  limit: number;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export function parsePageParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults: { page?: number; limit?: number } = {},
): PageParams {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const page = Math.max(1, Number(get("page") ?? defaults.page ?? 1) || 1);
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(get("limit") ?? defaults.limit ?? DEFAULT_PAGE_SIZE) ||
        DEFAULT_PAGE_SIZE,
    ),
  );
  return { page, limit };
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    items: slice,
    page: safePage,
    limit,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function serializeVacancy<T extends { firstSeenAt: Date | null }>(
  v: T,
) {
  return {
    ...v,
    firstSeenAt: v.firstSeenAt ? v.firstSeenAt.toISOString() : null,
  };
}
