import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { companies, scrapeRuns, vacancies } from "@/db/schema";
import {
  listCompaniesBySlugs,
  upsertCompanyFromDou,
  updateCompanyWiki,
} from "@/lib/companies";
import { upsertVacancyForCompany } from "@/lib/vacancies";
import { fetchAllCompanies } from "./dou-companies";
import { fetchCompanyVacancies } from "./dou-vacancies";
import { enrichCompanyWikiFields } from "./company-enrich";
import { resolveScrapeOptions, type ScrapeOptions } from "./config";
import { sleep } from "./http";

export type ScrapeStats = {
  companiesUpserted: number;
  websitesEnriched: number;
  careersDiscovered: number;
  vacanciesUpserted: number;
  companiesFailed: number;
  companiesSkipped: number;
  progressCurrent: number;
  progressTotal: number;
  errors: string[];
};

export type ScrapeStatus = {
  runId: number | null;
  status: "idle" | "running" | "done" | "error";
  message: string;
  stats: ScrapeStats | null;
  startedAt: string | null;
  finishedAt: string | null;
};

let current: ScrapeStatus = {
  runId: null,
  status: "idle",
  message: "No scrape yet",
  stats: null,
  startedAt: null,
  finishedAt: null,
};

let running = false;

export function getScrapeStatus(): ScrapeStatus {
  return { ...current, stats: current.stats ? { ...current.stats } : null };
}

function emptyStats(): ScrapeStats {
  return {
    companiesUpserted: 0,
    websitesEnriched: 0,
    careersDiscovered: 0,
    vacanciesUpserted: 0,
    companiesFailed: 0,
    companiesSkipped: 0,
    progressCurrent: 0,
    progressTotal: 0,
    errors: [],
  };
}

function pushError(stats: ScrapeStats, msg: string) {
  stats.errors.push(msg);
  if (stats.errors.length > 40) stats.errors.shift();
}

function publish(partial: Partial<ScrapeStatus> & { stats: ScrapeStats }) {
  current = { ...current, ...partial };
  if (partial.message) console.log(`[scrape] ${partial.message}`);
}

function shouldSkipCompany(
  company: {
    vacancyFetchStatus: string | null;
    lastScrapedAt: Date | null;
    douVacancyCount: number | null;
  },
  options: ScrapeOptions,
): string | null {
  if (options.force) return null;
  if (!options.resume) return null;
  if (company.vacancyFetchStatus === "not_found") {
    return "known 404";
  }
  if (company.lastScrapedAt) {
    const ageMs = Date.now() - company.lastScrapedAt.getTime();
    const skipMs = options.resumeSkipHours * 60 * 60 * 1000;
    if (ageMs < skipMs) return `scraped <${options.resumeSkipHours}h ago`;
  }
  return null;
}

async function syncVacanciesForCompany(
  company: { id: number; slug: string },
  delayMs: number,
): Promise<number> {
  await sleep(delayMs);
  const parsed = await fetchCompanyVacancies(company.slug, { delayMs });
  const seenIds: string[] = [];

  for (const v of parsed) {
    upsertVacancyForCompany(company.id, {
      externalId: v.externalId,
      source: "dou",
      title: v.title,
      shortDescription: v.shortDescription ?? "",
      url: v.url,
    });
    seenIds.push(v.externalId);
  }

  const active = db
    .select({ id: vacancies.id, externalId: vacancies.externalId })
    .from(vacancies)
    .where(
      and(
        eq(vacancies.companyId, company.id),
        eq(vacancies.source, "dou"),
        eq(vacancies.isActive, true),
      ),
    )
    .all();

  const gone = active
    .filter((v) => !seenIds.includes(v.externalId))
    .map((v) => v.id);
  if (gone.length) {
    db.update(vacancies)
      .set({ isActive: false })
      .where(inArray(vacancies.id, gone))
      .run();
  }

  updateCompanyWiki(company.id, {
    lastScrapedAt: new Date(),
    douVacancyCount: parsed.length,
    vacancyFetchStatus: "ok",
    lastVacancyError: null,
  });

  return parsed.length;
}

function isNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /HTTP 404/i.test(msg);
}

export async function runRefresh(
  opts?: Partial<ScrapeOptions>,
): Promise<ScrapeStatus> {
  if (running) return getScrapeStatus();

  running = true;
  const options = resolveScrapeOptions(opts);
  const stats = emptyStats();
  const startedAt = new Date();
  const run = db
    .insert(scrapeRuns)
    .values({
      startedAt,
      status: "running",
      statsJson: JSON.stringify(stats),
    })
    .returning()
    .get();

  publish({
    runId: run.id,
    status: "running",
    message: "Fetching company catalog…",
    stats,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
  });

  try {
    const catalog = await fetchAllCompanies({
      delayMs: options.delayMs,
      maxCompanies: options.maxCompanies,
      onBatch: (_batch, total) => {
        publish({ stats, message: `Catalog: ${total} companies…` });
      },
    });

    for (const c of catalog) {
      upsertCompanyFromDou(c);
      stats.companiesUpserted += 1;
    }

    const limited = listCompaniesBySlugs(catalog.map((c) => c.slug));
    stats.progressTotal = limited.length;

    publish({
      stats,
      message: `Upserted ${stats.companiesUpserted}. Processing ${limited.length}…`,
    });

    for (let i = 0; i < limited.length; i++) {
      const company = limited[i];
      stats.progressCurrent = i + 1;
      const pct = Math.round(((i + 1) / limited.length) * 100);
      publish({
        stats,
        message: `[${i + 1}/${limited.length} · ${pct}%] ${company.name}`,
      });

      try {
        const skipReason = shouldSkipCompany(company, options);
        if (skipReason) {
          stats.companiesSkipped += 1;
          continue;
        }

        const enrich = await enrichCompanyWikiFields(company, options);
        if (enrich.websiteEnriched) stats.websitesEnriched += 1;
        if (enrich.careersDiscovered) stats.careersDiscovered += 1;

        if (company.douVacancyCount === 0) {
          updateCompanyWiki(company.id, {
            lastScrapedAt: new Date(),
            vacancyFetchStatus: "ok",
          });
          continue;
        }

        const n = await syncVacanciesForCompany(company, options.delayMs);
        stats.vacanciesUpserted += n;
      } catch (err) {
        stats.companiesFailed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        pushError(stats, `${company.slug}: ${msg}`);
        if (isNotFoundError(err)) {
          updateCompanyWiki(company.id, {
            vacancyFetchStatus: "not_found",
            lastVacancyError: msg,
            lastScrapedAt: new Date(),
          });
        } else {
          updateCompanyWiki(company.id, {
            vacancyFetchStatus: "error",
            lastVacancyError: msg,
          });
        }
      }
    }

    const finishedAt = new Date();
    db.update(scrapeRuns)
      .set({
        finishedAt,
        status: "done",
        errorSummary:
          stats.companiesFailed > 0
            ? `${stats.companiesFailed} companies failed`
            : null,
        statsJson: JSON.stringify(stats),
      })
      .where(eq(scrapeRuns.id, run.id))
      .run();

    publish({
      runId: run.id,
      status: "done",
      message: `Done. ${stats.vacanciesUpserted} vacancies, ${stats.careersDiscovered} careers, ${stats.companiesSkipped} skipped, ${stats.companiesFailed} failed.`,
      stats,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    });
    return getScrapeStatus();
  } catch (err) {
    const finishedAt = new Date();
    const message = err instanceof Error ? err.message : String(err);
    pushError(stats, message);
    db.update(scrapeRuns)
      .set({
        finishedAt,
        status: "error",
        errorSummary: message,
        statsJson: JSON.stringify(stats),
      })
      .where(eq(scrapeRuns.id, run.id))
      .run();
    publish({
      runId: run.id,
      status: "error",
      message,
      stats,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    });
    return getScrapeStatus();
  } finally {
    running = false;
  }
}
