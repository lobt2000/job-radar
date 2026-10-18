import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, type Company } from "@/db/schema";
import type { ParsedCompany } from "@/lib/scrape/dou-companies";

export function upsertCompanyFromDou(c: ParsedCompany): number {
  const existing = db
    .select()
    .from(companies)
    .where(eq(companies.slug, c.slug))
    .get();

  if (existing) {
    db.update(companies)
      .set({
        name: c.name,
        description: c.description,
        douUrl: c.douUrl,
        douVacanciesUrl: c.douVacanciesUrl,
        douVacancyCount: c.douVacancyCount,
        // Keep careers/both if already discovered
        vacancySource:
          existing.vacancySource === "careers" ||
          existing.vacancySource === "both"
            ? existing.vacancySource
            : "dou",
      })
      .where(eq(companies.id, existing.id))
      .run();
    return existing.id;
  }

  const row = db
    .insert(companies)
    .values({
      slug: c.slug,
      name: c.name,
      description: c.description,
      douUrl: c.douUrl,
      douVacanciesUrl: c.douVacanciesUrl,
      douVacancyCount: c.douVacancyCount,
      vacancySource: "dou",
    })
    .returning()
    .get();
  return row.id;
}

export function updateCompanyWiki(
  id: number,
  patch: Partial<{
    websiteUrl: string | null;
    careersUrl: string | null;
    vacancySource: "dou" | "careers" | "both";
    scrapeNotes: string | null;
    lastScrapedAt: Date;
    douVacancyCount: number;
    vacancyFetchStatus: string | null;
    lastVacancyError: string | null;
  }>,
): void {
  db.update(companies).set(patch).where(eq(companies.id, id)).run();
}

export function listCompaniesBySlugs(slugs: string[]): Company[] {
  if (slugs.length === 0) return [];
  // Preserve catalog order
  const rows = db
    .select()
    .from(companies)
    .where(inArray(companies.slug, slugs))
    .all();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((c): c is Company => Boolean(c));
}

export function countCompanies(): number {
  const row = db
    .select({ value: sql<number>`count(*)` })
    .from(companies)
    .get();
  return Number(row?.value ?? 0);
}
