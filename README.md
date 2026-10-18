# Job Radar

Personal local job board for Ukrainian IT companies listed on [DOU](https://jobs.dou.ua/companies/).

It builds a **company wiki** from the DOU catalog, pulls vacancies from each company’s DOU vacancies page (`/companies/{slug}/vacancies/`), scores them with your keyword/role profile, and lets you track applications and spot what’s new.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Drizzle ORM (`data/job-radar.db`)
- Cheerio + fetch for polite DOU scraping

## Quick start

```bash
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Open **Profile** and set roles / keywords / excludes (comma-separated).
2. Click **Refresh** in the header to crawl DOU (first full run can take a while).
3. Browse **All**, **New**, and **Applied**.

### Optional CLI scrape

```bash
# Limit scope while developing
set JOB_RADAR_MAX_COMPANIES=15
set JOB_RADAR_ENRICH_WEBSITES=0
npm run scrape
```

| Env | Meaning |
|-----|---------|
| `JOB_RADAR_MAX_COMPANIES` | Optional cap; omit for **all** DOU companies |
| `JOB_RADAR_ENRICH_WEBSITES` | Set to `0` to skip DOU website enrichment |
| `JOB_RADAR_DISCOVER_CAREERS` | Set to `0` to skip homepage careers-link discovery |
| `JOB_RADAR_DELAY_MS` | Delay between requests (default `400`) |
| `DATABASE_PATH` | Override SQLite path |

### Careers URL discovery (best-effort)

After a company has `website_url`, Job Radar fetches the homepage and scores same-site links whose path/text looks like careers/jobs/vacancies (UA/EN). Hits go into `careers_url` + `scrape_notes`; `vacancy_source` becomes `both`.

```bash
# Backfill wiki for companies already in SQLite
npm run discover-careers
```

### JSON APIs (paginated)

All list endpoints accept `?page=1&limit=20` (max `limit` 100):

| Endpoint | Data |
|----------|------|
| `GET /api/vacancies` | All active (scored) |
| `GET /api/vacancies/new` | New since watermark |
| `GET /api/vacancies/applied` | Applied / interested |
| `GET /api/companies` | Company wiki |
| `GET/POST /api/refresh` | Scrape status / start Refresh |

Response shape: `{ items, page, limit, total, totalPages, hasNext, hasPrev }`.

## UI

| Tab | Purpose |
|-----|---------|
| **All** | Active vacancies ranked by profile score |
| **New** | First seen since your last New visit (opens clears the badge) |
| **Applied** | Roles you marked applied |
| **Profile** | Keywords + company wiki table |

## Upsert contract (future Python worker)

Node scrapers and a future career-site worker should write vacancies through the same shape:

```ts
upsertVacancy({
  companySlug: string,
  externalId: string,
  source: "dou" | "careers",
  title: string,
  shortDescription: string,
  url: string,
})
```

Implemented in [`src/lib/vacancies.ts`](src/lib/vacancies.ts). Company wiki fields `careers_url` and `scrape_notes` are reserved for later parsers.

## Design

See [`docs/superpowers/specs/2026-10-18-job-radar-design.md`](docs/superpowers/specs/2026-10-18-job-radar-design.md).

## Notes

- Intended for **personal local use** with polite rate limits.
- No auto-apply. Respect DOU’s terms.
- Re-running Refresh upserts in place (no duplicate vacancies) and deactivates openings that disappeared from DOU.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run db:migrate
npm run scrape
```

## License

MIT
