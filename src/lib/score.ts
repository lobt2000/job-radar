export type ProfileTokens = {
  roles: string[];
  keywords: string[];
  excludeKeywords: string[];
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

  const roles = profile.roles;
  const keywords = profile.keywords;
  if (roles.length === 0 && keywords.length === 0) {
    return 0;
  }

  let score = 0;
  for (const role of roles) {
    if (tokenMatches(haystack, role)) score += 3;
  }
  for (const kw of keywords) {
    if (tokenMatches(haystack, kw)) score += 1;
  }
  return score;
}
