const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type FetchResult = {
  status: number;
  body: string;
  cookies: string;
};

function mergeCookies(existing: string, setCookie: string[] | undefined): string {
  const map = new Map<string, string>();
  for (const part of existing.split(";").map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf("=");
    if (eq > 0) map.set(part.slice(0, eq), part.slice(eq + 1));
  }
  for (const raw of setCookie ?? []) {
    const first = raw.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) map.set(first.slice(0, eq), first.slice(eq + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function extractCsrf(cookies: string, body: string): string | undefined {
  const fromBody = body.match(
    /name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)/,
  )?.[1];
  if (fromBody) return fromBody;
  return cookies.match(/csrftoken=([^;]+)/)?.[1];
}

export async function douFetch(
  url: string,
  opts: {
    method?: "GET" | "POST";
    cookie?: string;
    body?: string;
    referer?: string;
    csrf?: string;
  } = {},
): Promise<FetchResult> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    Accept: "text/html,application/json,*/*",
  };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.referer) headers.Referer = opts.referer;
  if (opts.method === "POST") {
    headers["Content-Type"] =
      "application/x-www-form-urlencoded; charset=UTF-8";
    headers["X-Requested-With"] = "XMLHttpRequest";
    headers.Origin = "https://jobs.dou.ua";
    if (opts.csrf) headers["X-CSRFToken"] = opts.csrf;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body,
    });
  } catch (err) {
    const cause =
      err instanceof Error && "cause" in err
        ? String((err as Error & { cause?: unknown }).cause)
        : "";
    throw new Error(
      `fetch failed for ${url}: ${err instanceof Error ? err.message : String(err)}${cause ? ` (${cause})` : ""}`,
    );
  }

  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookies = mergeCookies(opts.cookie ?? "", setCookie);
  const body = await res.text();
  return { status: res.status, body, cookies };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
