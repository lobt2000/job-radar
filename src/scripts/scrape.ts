import { runRefresh } from "@/lib/scrape/runner";

async function main() {
  const max = process.env.JOB_RADAR_MAX_COMPANIES
    ? Number(process.env.JOB_RADAR_MAX_COMPANIES)
    : undefined;

  const result = await runRefresh({
    maxCompanies: max,
    enrichWebsites: process.env.JOB_RADAR_ENRICH_WEBSITES !== "0",
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === "error" ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
