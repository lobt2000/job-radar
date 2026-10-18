# Job Radar — Design Spec

**Date:** 2026-10-18  
**Status:** Approved for planning  
**Project path:** `e:\Progects\job-radar`

## Problem

Browse IT vacancies across companies listed on [DOU companies](https://jobs.dou.ua/companies/), track applications, surface “new” roles, and score fits against a simple personal keyword profile. Not all companies have useful career sites; DOU company vacancy pages are the reliable fallback.

## Goals (v1)

1. Build a local **company wiki** (structured store) of DOU companies: slug, site, careers URL (when known), vacancy source strategy, scrape notes for later.
2. Pull vacancies from DOU company vacancy pages (`/companies/{slug}/vacancies/`).
3. UI to browse vacancy cards (title, company, brief description), mark applied, filter New vs All vs Applied, edit profile keywords, trigger Refresh.

## Non-goals (v1)

- Scraping arbitrary company career sites (deferred to a future Python worker)
- Vector/LLM matching or embeddings
- Auto-apply, LinkedIn, cloud deploy
- Multi-user auth

## Decisions

| Topic | Choice |
|-------|--------|
| Vacancy sources | Hybrid: DOU now; wiki fields ready for career sites later |
| Matching | Rule-based keyword/role profile (not vectors) |
| Runtime | Local-only Next.js + SQLite |
| Future scrapers | TypeScript now; Python later via same upsert contract |
| App shape | Monolith Next.js |
| UI | Top tabs: All · New · Applied · Profile; Refresh in header |

## Architecture

```
Next.js UI → Server actions / API → SQLite
Refresh job → DOU (companies + vacancies) → SQLite upsert
Profile keywords → rule scorer → ranked board
Future Python worker → same vacancy upsert shape → SQLite
```

## Data model

### companies (wiki)

- `id`, `slug` (unique), `name`
- `dou_url`, `dou_vacancies_url`
- `website_url` (nullable), `careers_url` (nullable)
- `vacancy_source`: `dou` | `careers` | `both` (default `dou`)
- `scrape_notes` (text, for future parsers)
- `dou_vacancy_count`, `last_scraped_at`
- `description` (short DOU blurb)

### vacancies

- `id`, `external_id` + `source` unique together
- `company_id`, `title`, `short_description`, `url`
- `source`: `dou` (later `careers`)
- `first_seen_at`, `last_seen_at`, `is_active`

### profile (single row)

- `roles`, `keywords`, `exclude_keywords` (stored as JSON string arrays or comma-separated text)
- `new_seen_watermark` (datetime — “new” cutoff)

### applications

- `vacancy_id` (unique), `status`: `interested` | `applied` | `rejected` | `archived`
- `applied_at`, `notes`

### scrape_runs (optional but useful)

- `id`, `started_at`, `finished_at`, `status`, `error_summary`, `stats_json`

## Scoring

- Normalize title + short_description to lowercase.
- +1 (or weighted) per matching role/keyword token; exclude_keywords → score 0 / hidden from default All view (configurable: hide vs demote — **v1: hide from All when exclude matches**).
- Sort: score desc, then `first_seen_at` desc.
- Empty profile keywords → show all active vacancies unscored (or score 0), sorted by `first_seen_at` desc.

## Refresh pipeline

1. Paginate `https://jobs.dou.ua/companies/` → upsert companies.
2. Enrich from company DOU page: website if present; best-effort careers link only if cheap to detect.
3. For each company, fetch DOU vacancies page → upsert vacancies; deactivate ones no longer present.
4. Rate-limit delays; browser-like User-Agent; continue on per-company errors.
5. Persist scrape run summary for UI banner.
6. Idempotent; safe to re-run.

**Out of scope for Refresh:** career-site HTML scraping, CAPTCHA, auto-apply.

## UI

- **All:** scored active vacancies; mark applied; open source URL.
- **New:** `first_seen_at` > `new_seen_watermark`; badge count; advancing watermark when user views New or after successful Refresh (pick one — **v1: update watermark when opening New tab**).
- **Applied:** application list with status/date; unmark/archive.
- **Profile:** edit roles/keywords/exclude; light companies wiki list (name, DOU, website, careers, source).
- **Refresh:** starts background-ish job with status (running / done / N failures).

Card fields: title, company name, brief description, match score, applied control, link out.

## Future Python hook

Document a minimal upsert contract:

```ts
upsertVacancy({
  companySlug: string,
  externalId: string,
  source: 'dou' | 'careers',
  title: string,
  shortDescription: string,
  url: string,
})
```

Python worker later reads `companies` wiki (`careers_url`, `scrape_notes`) and writes vacancies the same way.

## Constraints

- Personal local use; polite scraping only.
- Prefer small focused modules (scrape / db / score / ui).
- No vector DB in v1; structured SQLite is the “wiki”.
- Add `.superpowers/` to `.gitignore`.

## Success criteria

- Refresh populates companies + vacancies from DOU (paginated companies).
- Board shows cards; profile keywords affect ranking/filtering.
- Applied tracking persists across restarts.
- New tab reflects newly first-seen vacancies.
- Schema ready for a future Python career scraper without UI rewrite.
