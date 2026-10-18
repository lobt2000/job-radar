import { markNewSeenAction } from "@/app/actions";
import { Pagination } from "@/components/Pagination";
import { VacancyCard } from "@/components/VacancyCard";
import { ensureDb } from "@/db/ensure";
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
  const all = listNewVacancies();
  const { items, total, totalPages } = paginate(all, page, limit);

  return (
    <section className="space-y-4">
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
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center text-[var(--muted)]">
          Nothing new right now. Refresh later.
        </div>
      ) : (
        <>
          {items.map((v) => (
            <VacancyCard key={v.id} vacancy={v} />
          ))}
          <Pagination
            basePath="/new"
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
