import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  applications,
  companies,
  profile,
  vacancies,
  type Vacancy,
} from "@/db/schema";
import {
  matchesBoardFilters,
  parseJsonStringArray,
  scoreVacancy,
  type BoardFilters,
  type ProfileTokens,
} from "@/lib/score";
import type { BoardVacancy } from "@/lib/types";

export type { BoardVacancy };

export type UpsertVacancyInput = {
  companySlug: string;
  externalId: string;
  source: "dou" | "careers";
  title: string;
  shortDescription: string;
  url: string;
};

export type UpsertVacancyFields = Omit<UpsertVacancyInput, "companySlug">;

/** Fast path when company id is already known (scrape runner). */
export function upsertVacancyForCompany(
  companyId: number,
  input: UpsertVacancyFields,
): Vacancy {
  const now = new Date();
  const existing = db
    .select()
    .from(vacancies)
    .where(
      and(
        eq(vacancies.externalId, input.externalId),
        eq(vacancies.source, input.source),
      ),
    )
    .get();

  if (existing) {
    db.update(vacancies)
      .set({
        title: input.title,
        shortDescription: input.shortDescription,
        url: input.url,
        companyId,
        lastSeenAt: now,
        isActive: true,
      })
      .where(eq(vacancies.id, existing.id))
      .run();
    return (
      db.select().from(vacancies).where(eq(vacancies.id, existing.id)).get()!
    );
  }

  return db
    .insert(vacancies)
    .values({
      companyId,
      externalId: input.externalId,
      source: input.source,
      title: input.title,
      shortDescription: input.shortDescription,
      url: input.url,
      firstSeenAt: now,
      lastSeenAt: now,
      isActive: true,
    })
    .returning()
    .get();
}

/** Shared upsert contract for Node scrapers and a future Python worker. */
export function upsertVacancy(input: UpsertVacancyInput): Vacancy {
  const company = db
    .select()
    .from(companies)
    .where(eq(companies.slug, input.companySlug))
    .get();
  if (!company) {
    throw new Error(`Unknown company slug: ${input.companySlug}`);
  }
  return upsertVacancyForCompany(company.id, input);
}

export function getProfileTokens(): ProfileTokens {
  const row = db.select().from(profile).limit(1).get();
  return {
    roles: parseJsonStringArray(row?.roles),
    keywords: parseJsonStringArray(row?.keywords),
    excludeKeywords: parseJsonStringArray(row?.excludeKeywords),
    cities: parseJsonStringArray(row?.cities),
    englishLevel: row?.englishLevel ?? null,
    experienceMin: row?.experienceMin ?? null,
    preferRemote: Boolean(row?.preferRemote),
  };
}

function loadActiveWithCompany() {
  return db
    .select({
      id: vacancies.id,
      title: vacancies.title,
      shortDescription: vacancies.shortDescription,
      url: vacancies.url,
      firstSeenAt: vacancies.firstSeenAt,
      companyName: companies.name,
      companySlug: companies.slug,
      applicationStatus: applications.status,
    })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .leftJoin(applications, eq(applications.vacancyId, vacancies.id))
    .where(eq(vacancies.isActive, true))
    .all();
}

function toBoard(
  rows: ReturnType<typeof loadActiveWithCompany>,
  tokens: ProfileTokens,
  opts?: { includeExcluded?: boolean },
): BoardVacancy[] {
  const out: BoardVacancy[] = [];
  for (const row of rows) {
    const score = scoreVacancy(row.title, row.shortDescription, tokens);
    if (score === null && !opts?.includeExcluded) continue;
    out.push({
      id: row.id,
      title: row.title,
      shortDescription: row.shortDescription,
      url: row.url,
      companyName: row.companyName,
      companySlug: row.companySlug,
      firstSeenAt: row.firstSeenAt,
      score: score ?? 0,
      applied: Boolean(row.applicationStatus),
      applicationStatus: row.applicationStatus ?? null,
    });
  }
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = a.firstSeenAt?.getTime() ?? 0;
    const bt = b.firstSeenAt?.getTime() ?? 0;
    return bt - at;
  });
  return out;
}

function applyFilters(
  items: BoardVacancy[],
  filters?: BoardFilters,
): BoardVacancy[] {
  if (!filters) return items;
  return items.filter((v) =>
    matchesBoardFilters(
      v.title,
      v.shortDescription,
      v.companyName,
      filters,
    ),
  );
}

export function listAllVacancies(filters?: BoardFilters): BoardVacancy[] {
  return applyFilters(
    toBoard(loadActiveWithCompany(), getProfileTokens()),
    filters,
  );
}

export function listNewVacancies(filters?: BoardFilters): BoardVacancy[] {
  const row = db.select().from(profile).limit(1).get();
  const watermark = row?.newSeenWatermark;
  const tokens = getProfileTokens();
  const rows = loadActiveWithCompany().filter((r) => {
    if (!watermark) return true;
    if (!r.firstSeenAt) return false;
    return r.firstSeenAt.getTime() > watermark.getTime();
  });
  return applyFilters(toBoard(rows, tokens), filters);
}

export function listAppliedVacancies(filters?: BoardFilters): BoardVacancy[] {
  const tokens = getProfileTokens();
  const rows = db
    .select({
      id: vacancies.id,
      title: vacancies.title,
      shortDescription: vacancies.shortDescription,
      url: vacancies.url,
      firstSeenAt: vacancies.firstSeenAt,
      companyName: companies.name,
      companySlug: companies.slug,
      applicationStatus: applications.status,
    })
    .from(applications)
    .innerJoin(vacancies, eq(applications.vacancyId, vacancies.id))
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(
      or(
        eq(applications.status, "applied"),
        eq(applications.status, "interested"),
      ),
    )
    .orderBy(desc(applications.appliedAt))
    .all();

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    shortDescription: row.shortDescription,
    url: row.url,
    companyName: row.companyName,
    companySlug: row.companySlug,
    firstSeenAt: row.firstSeenAt,
    score: scoreVacancy(row.title, row.shortDescription, tokens) ?? 0,
    applied: true,
    applicationStatus: row.applicationStatus,
  }));
  return applyFilters(items, filters);
}

export function countNewVacancies(): number {
  return listNewVacancies().length;
}

export function advanceNewWatermark(): void {
  const row = db.select().from(profile).limit(1).get();
  if (!row) return;
  db.update(profile)
    .set({ newSeenWatermark: new Date() })
    .where(eq(profile.id, row.id))
    .run();
}

export function markApplied(vacancyId: number): void {
  const existing = db
    .select()
    .from(applications)
    .where(eq(applications.vacancyId, vacancyId))
    .get();
  if (existing) {
    db.update(applications)
      .set({ status: "applied", appliedAt: new Date() })
      .where(eq(applications.id, existing.id))
      .run();
    return;
  }
  db.insert(applications)
    .values({ vacancyId, status: "applied", appliedAt: new Date() })
    .run();
}

export function unmarkApplied(vacancyId: number): void {
  db.delete(applications).where(eq(applications.vacancyId, vacancyId)).run();
}

export function archiveApplication(vacancyId: number): void {
  db.update(applications)
    .set({ status: "archived" })
    .where(eq(applications.vacancyId, vacancyId))
    .run();
}

export function listCompaniesWiki() {
  return db.select().from(companies).orderBy(companies.name).all();
}

export function updateProfile(input: {
  roles: string[];
  keywords: string[];
  excludeKeywords: string[];
  cities: string[];
  englishLevel: string | null;
  experienceMin: number | null;
  preferRemote: boolean;
}): void {
  const payload = {
    roles: JSON.stringify(input.roles),
    keywords: JSON.stringify(input.keywords),
    excludeKeywords: JSON.stringify(input.excludeKeywords),
    cities: JSON.stringify(input.cities),
    englishLevel: input.englishLevel,
    experienceMin: input.experienceMin,
    preferRemote: input.preferRemote,
  };
  const row = db.select().from(profile).limit(1).get();
  if (!row) {
    db.insert(profile).values(payload).run();
    return;
  }
  db.update(profile).set(payload).where(eq(profile.id, row.id)).run();
}

export function getProfileRow() {
  return db.select().from(profile).limit(1).get();
}
