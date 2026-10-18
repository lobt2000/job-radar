import { VacancyBoard } from "@/components/VacancyBoard";
import { ensureDb } from "@/db/ensure";
import { parseBoardFilters } from "@/lib/filters";
import { paginate, parsePageParams } from "@/lib/pagination";
import { listAllVacancies } from "@/lib/vacancies";

ensureDb();

export const dynamic = "force-dynamic";

export default async function AllPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { page, limit } = parsePageParams(params);
  const filters = parseBoardFilters(params);
  const { items, total, totalPages } = paginate(
    listAllVacancies(filters),
    page,
    limit,
  );

  return (
    <VacancyBoard
      basePath="/"
      filters={filters}
      items={items}
      page={page}
      totalPages={totalPages}
      total={total}
      limit={limit}
      header={
        <p className="text-sm text-[var(--muted)]">
          {total} active vacancies ranked by your profile.
        </p>
      }
      empty={
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--muted)]">
          No vacancies match. Adjust filters or hit <strong>Refresh</strong>.
        </div>
      }
    />
  );
}
