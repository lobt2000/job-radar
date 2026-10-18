import { enrichCompanyWebsite } from "./dou-companies";
import { discoverCareersUrl } from "./careers-discover";
import { sleep } from "./http";
import { updateCompanyWiki } from "@/lib/companies";

export type EnrichResult = {
  websiteUrl: string | null;
  careersUrl: string | null;
  websiteEnriched: boolean;
  careersDiscovered: boolean;
};

/** Fill website (from DOU) and/or careers URL (from company homepage). */
export async function enrichCompanyWikiFields(
  company: {
    id: number;
    slug: string;
    websiteUrl: string | null;
    careersUrl: string | null;
  },
  opts: {
    enrichWebsites: boolean;
    discoverCareers: boolean;
    delayMs: number;
  },
): Promise<EnrichResult> {
  let websiteUrl = company.websiteUrl;
  let careersUrl = company.careersUrl;
  let websiteEnriched = false;
  let careersDiscovered = false;

  if (opts.enrichWebsites && !websiteUrl) {
    await sleep(opts.delayMs);
    const website = await enrichCompanyWebsite(company.slug);
    if (website) {
      websiteUrl = website;
      updateCompanyWiki(company.id, { websiteUrl: website });
      websiteEnriched = true;
    }
  }

  if (opts.discoverCareers && websiteUrl && !careersUrl) {
    await sleep(opts.delayMs);
    const found = await discoverCareersUrl(websiteUrl);
    if (found.careersUrl) {
      careersUrl = found.careersUrl;
      updateCompanyWiki(company.id, {
        careersUrl: found.careersUrl,
        vacancySource: "both",
        scrapeNotes: found.note,
      });
      careersDiscovered = true;
    } else if (found.note) {
      updateCompanyWiki(company.id, { scrapeNotes: found.note });
    }
  }

  return { websiteUrl, careersUrl, websiteEnriched, careersDiscovered };
}
