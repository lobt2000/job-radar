# Vacancy upsert contract

Shared write API for Job Radar scrapers (Node today, Python later).

## Function

```ts
upsertVacancy(input: {
  companySlug: string;      // must already exist in companies wiki
  externalId: string;       // stable id from source (DOU vacancy id, or careers hash)
  source: "dou" | "careers";
  title: string;
  shortDescription: string;
  url: string;
}): Vacancy
```

## Behavior

1. Resolve `companySlug` → `companies.id` (error if missing).
2. If `(externalId, source)` exists → update title/description/url, bump `last_seen_at`, set `is_active = true`.
3. Else insert with `first_seen_at = now`.

## Company wiki fields for future career scrapers

| Column | Use |
|--------|-----|
| `website_url` | Official site from DOU |
| `careers_url` | Direct careers / jobs listing when known |
| `vacancy_source` | `dou` \| `careers` \| `both` |
| `scrape_notes` | Free-text parser hints (selectors, auth, quirks) |

Python workers should upsert companies’ `careers_url` / `scrape_notes` as they discover them, then call the same vacancy upsert (via SQLite directly or a thin HTTP/CLI wrapper).
