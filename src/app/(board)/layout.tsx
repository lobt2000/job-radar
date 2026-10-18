import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import { ensureDb } from "@/db/ensure";
import { countNewVacancies } from "@/lib/vacancies";

ensureDb();

const tabs = [
  { href: "/", label: "All" },
  { href: "/new", label: "New" },
  { href: "/applied", label: "Applied" },
  { href: "/profile", label: "Profile" },
] as const;

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const newCount = countNewVacancies();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            Local board
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Job Radar
          </h1>
        </div>
        <RefreshButton />
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--accent-soft)]"
          >
            {tab.label}
            {tab.href === "/new" && newCount > 0 ? (
              <span className="ml-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-xs text-white">
                {newCount}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
