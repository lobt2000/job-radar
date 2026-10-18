import { saveProfileAction } from "@/app/actions";
import { Pagination } from "@/components/Pagination";
import { ensureDb } from "@/db/ensure";
import { paginate, parsePageParams } from "@/lib/pagination";
import { parseJsonStringArray } from "@/lib/score";
import { getProfileRow, listCompaniesWiki } from "@/lib/vacancies";

ensureDb();

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { page, limit } = parsePageParams(params, { limit: 20 });
  const row = getProfileRow();
  const allCompanies = listCompaniesWiki();
  const {
    items: companies,
    total,
    totalPages,
  } = paginate(allCompanies, page, limit);
  const roles = parseJsonStringArray(row?.roles).join(", ");
  const keywords = parseJsonStringArray(row?.keywords).join(", ");
  const exclude = parseJsonStringArray(row?.excludeKeywords).join(", ");

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Matching profile</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Comma-separated tokens. Roles weigh more than keywords. Exclude hides
          matches from All.
        </p>
        <form action={saveProfileAction} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Roles</span>
            <input
              name="roles"
              defaultValue={roles}
              placeholder="frontend, fullstack"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Keywords</span>
            <input
              name="keywords"
              defaultValue={keywords}
              placeholder="react, typescript, next.js"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Exclude</span>
            <input
              name="excludeKeywords"
              defaultValue={exclude}
              placeholder="php, 1c"
              className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Company wiki</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {total} companies indexed (Refresh loads the full DOU catalog).
            Careers URL is filled later / manually when known.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Website</th>
                <th className="px-3 py-2 font-medium">Careers</th>
                <th className="px-3 py-2 font-medium">DOU</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-[var(--line)]/60">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.vacancySource}</td>
                  <td className="px-3 py-2">
                    {c.websiteUrl ? (
                      <a
                        className="text-[var(--accent)] underline"
                        href={c.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        site
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.careersUrl ? (
                      <a
                        className="text-[var(--accent)] underline"
                        href={c.careersUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        careers
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      className="text-[var(--accent)] underline"
                      href={c.douUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      dou
                    </a>
                  </td>
                </tr>
              ))}
              {total === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-[var(--muted)]"
                  >
                    Run Refresh to populate the wiki.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          basePath="/profile"
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
        />
      </section>
    </div>
  );
}
