import { BoardFilters } from "@/components/BoardFilters";
import { Pagination } from "@/components/Pagination";
import { VacancyCard } from "@/components/VacancyCard";
import type { BoardFilters as Filters } from "@/lib/score";
import type { BoardVacancy } from "@/lib/types";

export function VacancyBoard({
  basePath,
  filters,
  items,
  page,
  totalPages,
  total,
  limit,
  empty,
  mode = "board",
  header,
}: {
  basePath: string;
  filters: Filters;
  items: BoardVacancy[];
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  empty: React.ReactNode;
  mode?: "board" | "applied";
  header?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <BoardFilters basePath={basePath} filters={filters} />
      {header}
      {total === 0 ? (
        empty
      ) : (
        <>
          {items.map((v) => (
            <VacancyCard key={v.id} vacancy={v} mode={mode} />
          ))}
          <Pagination
            basePath={basePath}
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            filters={filters}
          />
        </>
      )}
    </section>
  );
}
