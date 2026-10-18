import { markNewSeenAction } from "@/app/actions";
import { VacancyBoard } from "@/components/VacancyBoard";
import { ensureDb } from "@/db/ensure";
import { parseBoardFilters } from "@/lib/filters";
import { paginate, parsePageParams } from "@/lib/pagination";
import { listNewVacancies } from "@/lib/vacancies";

ensureDb();

export const dynamic = "force-dynamic";

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { page, limit } = parsePageParams(params);
  const filters = parseBoardFilters(params);
  const { items, total, totalPages } = paginate(
    listNewVacancies(filters),
    page,
    limit,
  );

  return (
    <VacancyBoard
      basePath="/new"
      filters={filters}
      items={items}
      page={page}
      totalPages={totalPages}
      total={total}
      limit={limit}
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {total} vacancies first seen since your last “mark seen”.
          </p>
          {total > 0 ? (
            <form action={markNewSeenAction}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)]"
              >
                Mark all as seen
              </button>
            </form>
          ) : null}
        </div>
      }
      empty={
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--muted)]">
          Nothing new right now. Refresh later.
        </div>
      }
    />
  );
}
