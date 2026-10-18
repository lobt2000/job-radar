import { db, sqlite } from "@/db/client";
import { ensureDb } from "@/db/ensure";
import { companies } from "@/db/schema";
import { enrichCompanyWikiFields } from "@/lib/scrape/company-enrich";
import { resolveScrapeOptions } from "@/lib/scrape/config";

async function main() {
  ensureDb();
  const options = resolveScrapeOptions({
    enrichWebsites: process.env.JOB_RADAR_ENRICH_WEBSITES !== "0",
    discoverCareers: true,
  });

  let rows = db.select().from(companies).all();
  if (options.maxCompanies) {
    rows = rows.slice(0, options.maxCompanies);
  }

  let websites = 0;
  let careers = 0;
  let failed = 0;

  for (const company of rows) {
    try {
      if (company.careersUrl && company.websiteUrl) {
        console.log(`[have] ${company.slug} — ${company.careersUrl}`);
        continue;
      }
      const result = await enrichCompanyWikiFields(company, options);
      if (result.websiteEnriched) {
        websites += 1;
        console.log(`[site] ${company.slug} → ${result.websiteUrl}`);
      }
      if (result.careersDiscovered) {
        careers += 1;
        console.log(`[careers] ${company.slug} → ${result.careersUrl}`);
      } else if (!company.careersUrl) {
        console.log(`[none] ${company.slug}`);
      }
    } catch (err) {
      failed += 1;
      console.error(
        `[fail] ${company.slug}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    JSON.stringify({ websites, careers, failed, total: rows.length }, null, 2),
  );
  sqlite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
