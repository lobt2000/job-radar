export type ProfileTokens = {
  roles: string[];
  keywords: string[];
  excludeKeywords: string[];
  cities: string[];
  englishLevel: string | null;
  experienceMin: number | null;
  preferRemote: boolean;
};

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  } catch {
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

function normalize(text: string): string {
  return text.toLowerCase();
}

function tokenMatches(haystack: string, token: string): boolean {
  const t = token.toLowerCase().trim();
  if (!t) return false;
  return haystack.includes(t);
}

const REMOTE_RE =
  /\b(remote|віддален|удалён|удален|hybrid|гібрид|гибрид)\b/i;

const ENGLISH_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
  "elementary",
  "pre-intermediate",
  "intermediate",
  "upper-intermediate",
  "advanced",
  "fluent",
] as const;

function englishRank(level: string | null | undefined): number {
  if (!level) return -1;
  const n = level.toLowerCase().trim();
  const idx = ENGLISH_LEVELS.findIndex((l) => n.includes(l));
  return idx;
}

/** Score vacancy text; returns null when exclude keywords match (hide from All). */
export function scoreVacancy(
  title: string,
  shortDescription: string | null | undefined,
  profile: ProfileTokens,
): number | null {
  const haystack = normalize(`${title} ${shortDescription ?? ""}`);
  const excludes = profile.excludeKeywords;
  if (excludes.some((ex) => tokenMatches(haystack, ex))) {
    return null;
  }

  const hasSignals =
    profile.roles.length > 0 ||
    profile.keywords.length > 0 ||
    profile.cities.length > 0 ||
    Boolean(profile.englishLevel) ||
    profile.experienceMin != null ||
    profile.preferRemote;

  if (!hasSignals) return 0;

  let score = 0;
  for (const role of profile.roles) {
    if (tokenMatches(haystack, role)) score += 3;
  }
  for (const kw of profile.keywords) {
    if (tokenMatches(haystack, kw)) score += 1;
  }

  if (profile.cities.length > 0) {
    const cityHit = profile.cities.some((c) => tokenMatches(haystack, c));
    if (cityHit) score += 2;
    else if (!REMOTE_RE.test(haystack)) {
      // Prefer not hiding entirely — soft demote
      score -= 1;
    }
  }

  if (profile.preferRemote) {
    if (REMOTE_RE.test(haystack)) score += 2;
  }

  if (profile.englishLevel) {
    const want = englishRank(profile.englishLevel);
    if (want >= 0) {
      const mentioned = ENGLISH_LEVELS.some((l) => haystack.includes(l));
      if (mentioned) {
        // Boost if vacancy mentions English at or below our level (we can meet it)
        const vacancyMentionsOk = ENGLISH_LEVELS.some(
          (l, i) => i <= want && haystack.includes(l),
        );
        if (vacancyMentionsOk) score += 1;
      }
    }
  }

  if (profile.experienceMin != null && profile.experienceMin > 0) {
    const years = haystack.match(/(\d+)\+?\s*(\+|years?|рок|год)/i);
    if (years) {
      const required = Number(years[1]);
      if (!Number.isNaN(required) && profile.experienceMin >= required) {
        score += 1;
      } else if (!Number.isNaN(required) && profile.experienceMin < required) {
        score -= 1;
      }
    }
  }

  return Math.max(score, 0);
}

export type BoardFilters = {
  q?: string;
  city?: string;
  remote?: boolean;
};

export function matchesBoardFilters(
  title: string,
  shortDescription: string | null | undefined,
  companyName: string,
  filters: BoardFilters,
): boolean {
  const haystack = normalize(
    `${title} ${shortDescription ?? ""} ${companyName}`,
  );
  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    if (q && !haystack.includes(q)) return false;
  }
  if (filters.city) {
    const city = filters.city.toLowerCase().trim();
    if (city && !haystack.includes(city)) return false;
  }
  if (filters.remote) {
    if (!REMOTE_RE.test(haystack)) return false;
  }
  return true;
}
