import * as cheerio from "cheerio";
import { douFetch, extractCsrf, sleep } from "./http";

export type ParsedVacancy = {
  externalId: string;
  title: string;
  shortDescription: string | null;
  url: string;
};

export function parseVacancyBlocks(html: string): ParsedVacancy[] {
  const $ = cheerio.load(html);
  const results: ParsedVacancy[] = [];
  const seen = new Set<string>();

  $("li.l-vacancy").each((_, el) => {
    const root = $(el);
    const a = root.find("a.vt").first();
    const href = a.attr("href");
    if (!href) return;
    const idMatch = href.match(/\/vacancies\/(\d+)\//);
    if (!idMatch) return;
    const externalId = idMatch[1];
    if (seen.has(externalId)) return;
    seen.add(externalId);

    const title = a.text().replace(/\s+/g, " ").trim();
    const shortDescription =
      root.find(".sh-info").first().text().replace(/\s+/g, " ").trim() || null;
    const url = href.startsWith("http")
      ? href.split("?")[0]
      : `https://jobs.dou.ua${href.split("?")[0]}`;

    results.push({ externalId, title, shortDescription, url });
  });

  return results;
}

export async function fetchCompanyVacancies(
  slug: string,
  opts?: { delayMs?: number; maxPages?: number; cookie?: string },
): Promise<ParsedVacancy[]> {
  const delayMs = opts?.delayMs ?? 350;
  const maxPages = opts?.maxPages ?? 50;
  const listUrl = `https://jobs.dou.ua/companies/${slug}/vacancies/`;

  const first = await douFetch(listUrl, { cookie: opts?.cookie });
  if (first.status >= 400) {
    throw new Error(`Vacancies page for ${slug} failed: HTTP ${first.status}`);
  }

  const csrf = extractCsrf(first.cookies, first.body);
  const byId = new Map(
    parseVacancyBlocks(first.body).map((v) => [v.externalId, v]),
  );

  let count = byId.size;
  const xhrBase = `https://jobs.dou.ua/vacancies/${slug}/xhr-load/?`;

  for (let page = 0; page < maxPages; page++) {
    // No more button / empty list → stop early if first page was small and no xhr needed
    if (!first.body.includes("more-btn") && page === 0 && count < 20) break;

    await sleep(delayMs);
    const body = `count=${count}`;
    const res = await douFetch(`${xhrBase}count=${count}`, {
      method: "POST",
      cookie: first.cookies,
      csrf,
      referer: listUrl,
      body,
    });
    if (res.status >= 400) break;

    let html = res.body;
    let finished = false;
    try {
      const json = JSON.parse(res.body) as { html?: string; finished?: boolean };
      html = json.html ?? "";
      finished = Boolean(json.finished);
    } catch {
      // raw html
    }

    const wrapped = html.includes("l-vacancy")
      ? html
      : `<ul class="lt">${html}</ul>`;
    const batch = parseVacancyBlocks(wrapped);
    if (batch.length === 0 || finished) break;
    for (const v of batch) byId.set(v.externalId, v);
    count += batch.length;
  }

  return [...byId.values()];
}
