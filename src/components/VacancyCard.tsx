import {
  archiveAppliedAction,
  markAppliedAction,
  unmarkAppliedAction,
} from "@/app/actions";
import type { BoardVacancy } from "@/lib/vacancies";

export function VacancyCard({
  vacancy,
  mode = "board",
}: {
  vacancy: BoardVacancy;
  mode?: "board" | "applied";
}) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug">{vacancy.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {vacancy.companyName}
            {vacancy.score > 0 ? (
              <span className="ml-2 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                match {vacancy.score}
              </span>
            ) : null}
            {vacancy.applied && mode === "board" ? (
              <span className="ml-2 text-[var(--warn)]">applied</span>
            ) : null}
          </p>
        </div>
        <a
          href={vacancy.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)]"
        >
          Open
        </a>
      </div>
      {vacancy.shortDescription ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
          {vacancy.shortDescription}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "board" ? (
          vacancy.applied ? (
            <form action={unmarkAppliedAction.bind(null, vacancy.id)}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
              >
                Unmark applied
              </button>
            </form>
          ) : (
            <form action={markAppliedAction.bind(null, vacancy.id)}>
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
              >
                Mark applied
              </button>
            </form>
          )
        ) : (
          <>
            <form action={unmarkAppliedAction.bind(null, vacancy.id)}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
              >
                Unmark
              </button>
            </form>
            <form action={archiveAppliedAction.bind(null, vacancy.id)}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
              >
                Archive
              </button>
            </form>
          </>
        )}
      </div>
    </article>
  );
}
