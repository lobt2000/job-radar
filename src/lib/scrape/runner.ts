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
    errors: [],
  };
}

function pushError(stats: ScrapeStats, msg: string) {
  stats.errors.push(msg);
  if (stats.errors.length > 40) stats.errors.shift();
}

function publish(partial: Partial<ScrapeStatus> & { stats: ScrapeStats }) {
  current = { ...current, ...partial };
  if (partial.message) {
    console.log(`[scrape] ${partial.message}`);
  }
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
  });

  return parsed.length;
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
        publish({
          stats,
          message: `Catalog: ${total} companies…`,
        });
      },
    });

    for (const c of catalog) {
      upsertCompanyFromDou(c);
      stats.companiesUpserted += 1;
    }

    publish({
      stats,
      message: `Upserted ${stats.companiesUpserted} companies. Processing…`,
    });

    const limited = listCompaniesBySlugs(catalog.map((c) => c.slug));
    const total = limited.length;

    for (let i = 0; i < limited.length; i++) {
      const company = limited[i];
      publish({
        stats,
        message: `[${i + 1}/${total}] ${company.name}`,
      });

      try {
        const enrich = await enrichCompanyWikiFields(company, options);
        if (enrich.websiteEnriched) stats.websitesEnriched += 1;
        if (enrich.careersDiscovered) stats.careersDiscovered += 1;

        if (company.douVacancyCount === 0) {
          updateCompanyWiki(company.id, { lastScrapedAt: new Date() });
          continue;
        }

        const n = await syncVacanciesForCompany(company, options.delayMs);
        stats.vacanciesUpserted += n;
      } catch (err) {
        stats.companiesFailed += 1;
        pushError(
          stats,
          `${company.slug}: ${err instanceof Error ? err.message : String(err)}`,
        );
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
      message: `Done. ${stats.companiesUpserted} companies, ${stats.vacanciesUpserted} vacancies, ${stats.careersDiscovered} careers, ${stats.companiesFailed} failures.`,
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
