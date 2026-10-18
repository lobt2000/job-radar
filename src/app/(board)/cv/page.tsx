import { uploadCvAction, applyCvToProfileAction } from "@/app/actions";
import { ensureDb } from "@/db/ensure";
import { listCvDocuments, type ParsedCv } from "@/lib/cv";

ensureDb();

export const dynamic = "force-dynamic";

export default function CvPage() {
  const docs = listCvDocuments();

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">CV / Resume (v2)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload a <strong>.txt</strong> CV for now. We extract roles, stack,
          cities, English, and years, then you can push them into your matching
          profile. PDF/DOCX parsers come next.
        </p>
        <form action={uploadCvAction} className="mt-4 space-y-3">
          <input
            type="file"
            name="cv"
            accept=".txt,.md,text/plain"
            required
            className="block w-full text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Upload &amp; parse
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Uploaded files</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No CV uploaded yet.</p>
        ) : (
          docs.map((doc) => {
            const parsed = doc.parsedJson
              ? (JSON.parse(doc.parsedJson) as ParsedCv)
              : null;
            return (
              <article
                key={doc.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{doc.fileName}</p>
                  <span className="text-[var(--muted)]">{doc.status}</span>
                </div>
                {doc.errorMessage ? (
                  <p className="mt-2 text-[var(--warn)]">{doc.errorMessage}</p>
                ) : null}
                {parsed ? (
                  <div className="mt-3 space-y-1 text-[var(--muted)]">
                    <p>Roles: {parsed.roles.join(", ") || "—"}</p>
                    <p>Keywords: {parsed.keywords.join(", ") || "—"}</p>
                    <p>Cities: {parsed.cities.join(", ") || "—"}</p>
                    <p>
                      English: {parsed.englishLevel ?? "—"} · Exp:{" "}
                      {parsed.experienceMin ?? "—"}
                    </p>
                    <p className="line-clamp-2">{parsed.summary}</p>
                    <form action={applyCvToProfileAction.bind(null, doc.id)}>
                      <button
                        type="submit"
                        className="mt-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                      >
                        Apply to matching profile
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
