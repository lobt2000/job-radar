import Link from "next/link";

export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  limit,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const q = new URLSearchParams();
    q.set("page", String(p));
    if (limit !== 20) q.set("limit", String(limit));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-sm">
      <p className="text-[var(--muted)]">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--accent-soft)]"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-lg border border-[var(--line)] px-3 py-1.5 opacity-40">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--accent-soft)]"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-lg border border-[var(--line)] px-3 py-1.5 opacity-40">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
