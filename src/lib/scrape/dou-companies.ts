import * as cheerio from "cheerio";
import { douFetch, extractCsrf, sleep } from "./http";

export type ParsedCompany = {
  slug: string;
  name: string;
  description: string | null;
  douUrl: string;
  douVacanciesUrl: string;
  douVacancyCount: number | null;
};

const COMPANIES_URL = "https://jobs.dou.ua/companies/";
const XHR_URL = "https://jobs.dou.ua/companies/xhr-load/?";

export function parseCompanyBlocks(html: string): ParsedCompany[] {
  const $ = cheerio.load(html);
  const results: ParsedCompany[] = [];
  const seen = new Set<string>();

  const blocks = $("li.l-company .company, .company").toArray();
  for (const el of blocks) {
    const root = $(el);
    const cn = root.find("a.cn-a").first();
    const link = cn.length ? cn : root.find('a[href*="/companies/"]').first();
    const href = link.attr("href");
    if (!href) continue;
    const match = href.match(/\/companies\/([^/]+)\/?/);
    if (!match) continue;
    const slug = decodeURIComponent(match[1]);
    if (seen.has(slug)) continue;
    // Skip non-company subpaths
    if (["xhr-load", "photos", "reviews", "offices", "poll"].includes(slug)) {
      continue;
    }
    seen.add(slug);

    const name = link.text().trim() || slug;
    const description =
      root.find(".descr").first().text().replace(/\s+/g, " ").trim() || null;

    let douVacancyCount: number | null = null;
    root.find(".site a").each((_, a) => {
      const text = $(a).text().replace(/\s+/g, " ");
      if (/Вакансії/i.test(text)) {
        const n = text.match(/(\d+)/);
        if (n) douVacancyCount = Number(n[1]);
      }
    });

    const douUrl = `https://jobs.dou.ua/companies/${slug}/`;
    results.push({
      slug,
      name,
      description,
      douUrl,
      douVacanciesUrl: `${douUrl}vacancies/`,
      douVacancyCount,
    });
  }

  return results;
}

export function parseCompanyWebsite(html: string): string | null {
  const $ = cheerio.load(html);
  const href = $(".b-company-head .site a").first().attr("href")?.trim();
  if (!href) return null;
  if (href.includes("jobs.dou.ua")) return null;
  try {
    const u = new URL(href);
    return u.toString();
  } catch {
    return href.startsWith("http") ? href : `https://${href}`;
  }
}

export type CompanySession = {
  cookie: string;
  csrf?: string;
};

export async function fetchCompaniesFirstPage(): Promise<{
  companies: ParsedCompany[];
  session: CompanySession;
}> {
  const res = await douFetch(COMPANIES_URL);
  if (res.status >= 400) {
    throw new Error(`DOU companies page failed: HTTP ${res.status}`);
  }
  const csrf = extractCsrf(res.cookies, res.body);
  return {
    companies: parseCompanyBlocks(res.body),
    session: { cookie: res.cookies, csrf },
  };
}

/** Load next batch via DOU xhr-load. `count` = companies already loaded. */
export async function fetchCompaniesXhrBatch(
  session: CompanySession,
  count: number,
): Promise<{ html: string; companies: ParsedCompany[]; done: boolean }> {
  const body = `count=${count}`;
  const res = await douFetch(`${XHR_URL}count=${count}`, {
    method: "POST",
    cookie: session.cookie,
    csrf: session.csrf,
    referer: COMPANIES_URL,
    body,
  });
  if (res.status >= 400) {
    throw new Error(`DOU companies xhr failed: HTTP ${res.status}`);
  }

  let html = res.body;
  try {
    const json = JSON.parse(res.body) as { html?: string; finished?: boolean };
    html = json.html ?? "";
    const companies = parseCompanyBlocks(
      html.includes("l-company") ? html : `<ul>${html}</ul>`,
    );
    return {
      html,
      companies,
      done: Boolean(json.finished) || companies.length === 0 || !html.trim(),
    };
  } catch {
    const companies = parseCompanyBlocks(res.body);
    return {
      html: res.body,
      companies,
      done: companies.length === 0,
    };
  }
}

export async function fetchAllCompanies(opts?: {
  delayMs?: number;
  maxPages?: number;
  maxCompanies?: number;
  onBatch?: (companies: ParsedCompany[], total: number) => void;
}): Promise<ParsedCompany[]> {
  const delayMs = opts?.delayMs ?? 400;
  const maxPages = opts?.maxPages ?? 200;
  const maxCompanies = opts?.maxCompanies;

  const { companies: first, session } = await fetchCompaniesFirstPage();
  const bySlug = new Map(first.map((c) => [c.slug, c]));
  opts?.onBatch?.(first, bySlug.size);

  if (maxCompanies && bySlug.size >= maxCompanies) {
    return [...bySlug.values()].slice(0, maxCompanies);
  }

  let count = first.length;
  for (let page = 0; page < maxPages; page++) {
    await sleep(delayMs);
    const batch = await fetchCompaniesXhrBatch(session, count);
    if (batch.done || batch.companies.length === 0) break;
    for (const c of batch.companies) bySlug.set(c.slug, c);
    count += batch.companies.length;
    opts?.onBatch?.(batch.companies, bySlug.size);
    if (maxCompanies && bySlug.size >= maxCompanies) break;
  }

  const all = [...bySlug.values()];
  return maxCompanies ? all.slice(0, maxCompanies) : all;
}

export async function enrichCompanyWebsite(
  slug: string,
  session?: CompanySession,
): Promise<string | null> {
  const res = await douFetch(`https://jobs.dou.ua/companies/${slug}/`, {
    cookie: session?.cookie,
    referer: COMPANIES_URL,
  });
  if (res.status >= 400) return null;
  return parseCompanyWebsite(res.body);
}
