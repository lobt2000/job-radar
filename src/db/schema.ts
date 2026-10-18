import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const companies = sqliteTable(
  "companies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    douUrl: text("dou_url").notNull(),
    douVacanciesUrl: text("dou_vacancies_url").notNull(),
    websiteUrl: text("website_url"),
    careersUrl: text("careers_url"),
    vacancySource: text("vacancy_source", {
      enum: ["dou", "careers", "both"],
    })
      .notNull()
      .default("dou"),
    scrapeNotes: text("scrape_notes"),
    douVacancyCount: integer("dou_vacancy_count"),
    lastScrapedAt: integer("last_scraped_at", { mode: "timestamp_ms" }),
  },
  (t) => [uniqueIndex("companies_slug_idx").on(t.slug)],
);

export const vacancies = sqliteTable(
  "vacancies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    externalId: text("external_id").notNull(),
    source: text("source", { enum: ["dou", "careers"] })
      .notNull()
      .default("dou"),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    url: text("url").notNull(),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [
    uniqueIndex("vacancies_external_source_idx").on(t.externalId, t.source),
  ],
);

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roles: text("roles").notNull().default("[]"),
  keywords: text("keywords").notNull().default("[]"),
  excludeKeywords: text("exclude_keywords").notNull().default("[]"),
  newSeenWatermark: integer("new_seen_watermark", { mode: "timestamp_ms" }),
});

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    vacancyId: integer("vacancy_id")
      .notNull()
      .references(() => vacancies.id),
    status: text("status", {
      enum: ["interested", "applied", "rejected", "archived"],
    })
      .notNull()
      .default("applied"),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("applications_vacancy_idx").on(t.vacancyId)],
);

export const scrapeRuns = sqliteTable("scrape_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  status: text("status", {
    enum: ["running", "done", "error"],
  })
    .notNull()
    .default("running"),
  errorSummary: text("error_summary"),
  statsJson: text("stats_json"),
});

export type Company = typeof companies.$inferSelect;
export type Vacancy = typeof vacancies.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
