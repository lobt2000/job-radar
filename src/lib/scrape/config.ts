export type ScrapeOptions = {
  maxCompanies?: number;
  enrichWebsites: boolean;
  discoverCareers: boolean;
  delayMs: number;
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
  };
}
