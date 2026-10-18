import { Pagination } from "@/components/Pagination";
import { VacancyCard } from "@/components/VacancyCard";
import { ensureDb } from "@/db/ensure";
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
  const all = listAppliedVacancies();
  const { items, total, totalPages } = paginate(all, page, limit);

  return (
    <section className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {total} tracked applications.
      </p>
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--muted)]">
          Mark vacancies as applied from the All or New boards.
        </div>
      ) : (
        <>
          {items.map((v) => (
            <VacancyCard key={v.id} vacancy={v} mode="applied" />
          ))}
          <Pagination
            basePath="/applied"
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
          />
        </>
      )}
    </section>
  );
}
