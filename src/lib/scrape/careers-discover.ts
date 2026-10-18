import * as cheerio from "cheerio";

const CAREER_PATH_RE =
  /career|careers|jobs?|vacancies|vacancy|opportunit|openings?|join[-_]?us|work[-_]?with|hiring|recruit|ваканс|кар.?єр|карьера|робота/i;

const CAREER_TEXT_RE =
  /career|careers|jobs?|vacancies|join\s*(us|our\s*team)|we'?re\s*hiring|open\s*positions?|ваканс|кар.?єр|долучай|приєдну|робота\s*в/i;

const SKIP_HOST_RE =
  /facebook\.com|linkedin\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|t\.me|dou\.ua|github\.com|glassdoor|djinni\.co/i;

export type CareersCandidate = {
  url: string;
  score: number;
  reason: string;
};

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (!/^https?:$/i.test(u.protocol)) return null;
    if (SKIP_HOST_RE.test(u.hostname)) return null;
    u.hash = "";
    return u.toString().replace(/\/$/, "") + (u.pathname === "/" ? "/" : "");
  } catch {
    return null;
  }
}

function scoreLink(href: string, text: string, baseHost: string): CareersCandidate | null {
  const url = normalizeUrl(href, `https://${baseHost}/`);
  if (!url) return null;

  let host: string;
  let path: string;
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname.toLowerCase();
  } catch {
    return null;
  }

  const base = baseHost.replace(/^www\./, "");
  const sameSite =
    host === base || host.endsWith(`.${base}`) || base.endsWith(`.${host}`);
  if (!sameSite) return null;

  const blob = `${path} ${text}`.toLowerCase();
  const pathHit = CAREER_PATH_RE.test(path);
  const textHit = CAREER_TEXT_RE.test(text);

  if (!pathHit && !textHit) return null;

  let score = 0;
  let reason = "";
  if (pathHit) {
    score += 5;
    reason = "path";
  }
  if (textHit) {
    score += 3;
    reason = reason ? `${reason}+text` : "text";
  }
  if (/\/(careers?|jobs?|vacancies)(\/|$)/i.test(path)) score += 3;
  if (path.split("/").filter(Boolean).length <= 2) score += 1;

  return { url: url.replace(/\/$/, "") || url, score, reason };
}

/** Parse HTML for best careers/jobs link on the same site. */
export function parseCareersCandidates(
  html: string,
  pageUrl: string,
): CareersCandidate[] {
  const $ = cheerio.load(html);
  let baseHost: string;
  try {
    baseHost = new URL(pageUrl).hostname;
  } catch {
    return [];
  }

  const best = new Map<string, CareersCandidate>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const candidate = scoreLink(href, text, baseHost);
    if (!candidate) return;
    // Re-resolve against real page URL for relative links
    const absolute = normalizeUrl(href, pageUrl);
    if (!absolute) return;
    const keyed = {
      ...candidate,
      url: absolute.replace(/\/$/, ""),
    };
    const prev = best.get(keyed.url);
    if (!prev || keyed.score > prev.score) best.set(keyed.url, keyed);
  });

  return [...best.values()].sort((a, b) => b.score - a.score);
}

export function pickBestCareersUrl(
  html: string,
  pageUrl: string,
): string | null {
  const [top] = parseCareersCandidates(html, pageUrl);
  return top?.url ?? null;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function discoverCareersUrl(
  websiteUrl: string,
  opts?: { timeoutMs?: number },
): Promise<{ careersUrl: string | null; note: string | null }> {
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  let pageUrl = websiteUrl;
  try {
    const u = new URL(websiteUrl);
    if (!u.pathname || u.pathname === "") u.pathname = "/";
    pageUrl = u.toString();
  } catch {
    return { careersUrl: null, note: "invalid website url" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return { careersUrl: null, note: `homepage HTTP ${res.status}` };
    }
    const html = await res.text();
    const finalUrl = res.url || pageUrl;
    const candidates = parseCareersCandidates(html, finalUrl);
    if (candidates.length === 0) {
      return { careersUrl: null, note: "no careers link found on homepage" };
    }
    const top = candidates[0];
    return {
      careersUrl: top.url,
      note: `best-effort: ${top.reason} score=${top.score}; candidates=${candidates.length}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { careersUrl: null, note: `fetch failed: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}
