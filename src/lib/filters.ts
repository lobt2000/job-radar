import type { BoardFilters } from "@/lib/score";

export function parseBoardFilters(
  searchParams: Record<string, string | string[] | undefined>,
): BoardFilters {
  const get = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const remoteRaw = get("remote");
  return {
    q: get("q")?.trim() || undefined,
    city: get("city")?.trim() || undefined,
    remote: remoteRaw === "1" || remoteRaw === "true",
  };
}

export function filtersToSearchParams(
  filters: BoardFilters,
  page?: number,
  limit?: number,
): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.q) q.set("q", filters.q);
  if (filters.city) q.set("city", filters.city);
  if (filters.remote) q.set("remote", "1");
  if (page && page > 1) q.set("page", String(page));
  if (limit && limit !== 20) q.set("limit", String(limit));
  return q;
}
