import { VacancyBoard } from "@/components/VacancyBoard";
import { ensureDb } from "@/db/ensure";
import { parseBoardFilters } from "@/lib/filters";
import { paginate, parsePageParams } from "@/lib/pagination";
import { listAppliedVacancies } from "@/lib/vacancies";

ensureDb();

export const dynamic = "force-dynamic";

export default async function AppliedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { page, limit } = parsePageParams(params);
  const filters = parseBoardFilters(params);
  const { items, total, totalPages } = paginate(
    listAppliedVacancies(filters),
    page,
    limit,
  );

  return (
    <VacancyBoard
      basePath="/applied"
      filters={filters}
      items={items}
      page={page}
      totalPages={totalPages}
      total={total}
      limit={limit}
      mode="applied"
      header={
        <p className="text-sm text-[var(--muted)]">
          {total} tracked applications.
        </p>
      }
      empty={
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--muted)]">
          Mark vacancies as applied from the All or New boards.
        </div>
      }
    />
  );
}
