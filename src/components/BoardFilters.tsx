import Link from "next/link";
import type { BoardFilters as Filters } from "@/lib/score";

export function BoardFilters({
  basePath,
  filters,
}: {
  basePath: string;
  filters: Filters;
}) {
  return (
    <form
      method="get"
      action={basePath}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3"
    >
      <label className="min-w-[10rem] flex-1 text-sm">
        <span className="mb-1 block text-[var(--muted)]">Search</span>
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="title, stack, company…"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-1.5"
        />
      </label>
      <label className="w-36 text-sm">
        <span className="mb-1 block text-[var(--muted)]">City</span>
        <input
          name="city"
          defaultValue={filters.city ?? ""}
          placeholder="Київ, Lviv…"
          className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-1.5"
        />
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          name="remote"
          value="1"
          defaultChecked={Boolean(filters.remote)}
          className="size-4"
        />
        Remote / hybrid
      </label>
      <button
        type="submit"
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
      >
        Apply
      </button>
      {filters.q || filters.city || filters.remote ? (
        <Link
          href={basePath}
          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}
