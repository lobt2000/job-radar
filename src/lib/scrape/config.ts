export type ScrapeOptions = {
  maxCompanies?: number;
  enrichWebsites: boolean;
  discoverCareers: boolean;
  delayMs: number;
  /** Skip companies marked not_found / recently scraped (resume mode). */
  resume: boolean;
  /** Hours — skip vacancy re-fetch if lastScrapedAt is newer (resume). */
  resumeSkipHours: number;
  /** Force re-fetch even for not_found companies. */
  force: boolean;
};

function envFlag(name: string, defaultOn: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultOn;
  return v !== "0" && v.toLowerCase() !== "false";
}

export function resolveScrapeOptions(
  overrides: Partial<ScrapeOptions> = {},
): ScrapeOptions {
  return {
    maxCompanies:
      overrides.maxCompanies ??
      (process.env.JOB_RADAR_MAX_COMPANIES
        ? Number(process.env.JOB_RADAR_MAX_COMPANIES)
        : undefined),
    enrichWebsites:
      overrides.enrichWebsites ?? envFlag("JOB_RADAR_ENRICH_WEBSITES", true),
    discoverCareers:
      overrides.discoverCareers ?? envFlag("JOB_RADAR_DISCOVER_CAREERS", true),
    delayMs:
      overrides.delayMs ?? Number(process.env.JOB_RADAR_DELAY_MS ?? 400),
    resume: overrides.resume ?? envFlag("JOB_RADAR_RESUME", true),
    resumeSkipHours:
      overrides.resumeSkipHours ??
      Number(process.env.JOB_RADAR_RESUME_SKIP_HOURS ?? 24),
    force: overrides.force ?? envFlag("JOB_RADAR_FORCE", false),
  };
}
