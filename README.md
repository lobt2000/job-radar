# Job Radar

Personal job board for Ukrainian IT companies listed on [DOU](https://jobs.dou.ua/companies/).

Scrapes the company catalog (with pagination), builds a local **company wiki** (site, careers URL when known, how vacancies are sourced), pulls openings from each company’s DOU vacancies page as a reliable fallback, then lets you browse scored cards, mark applications, and spot what’s new.

> Status: early — design approved, MVP implementation in progress. Spec: [`docs/superpowers/specs/2026-10-18-job-radar-design.md`](docs/superpowers/specs/2026-10-18-job-radar-design.md).

## Why

DOU lists many companies, but career pages are inconsistent. Job Radar:

1. Indexes companies from DOU into a structured local wiki  
2. Always has a fallback: `https://jobs.dou.ua/companies/{slug}/vacancies/`  
3. Scores vacancies against your keyword/role profile (rules first; vectors later optional)  
4. Tracks what you applied to and highlights newly seen roles  

## Planned stack (v1)

- **Next.js** (App Router) + TypeScript  
- **SQLite** via Drizzle — local, no cloud required  
- **Cheerio + fetch** — polite DOU scraping behind a Refresh button  
- Future: **Python** worker for company career sites, writing the same vacancy upsert shape  

## UI (v1)

| Tab | Purpose |
|-----|---------|
| **All** | Ranked vacancy cards (title, company, short description, score) |
| **New** | First seen since your last watermark |
| **Applied** | Roles you marked as applied |
| **Profile** | Keywords / roles / excludes + light company wiki |

Header **Refresh** re-runs the DOU catalog + vacancies pipeline.

## Roadmap

- [x] Design spec  
- [ ] Scaffold Next.js + SQLite schema  
- [ ] DOU company + vacancy scrapers  
- [ ] Keyword scoring + board UI  
- [ ] Apply tracking + New tab  
- [ ] Document upsert contract for a future Python careers scraper  

## Local use notes

Intended for personal local use with polite rate limits. No auto-apply. Respect DOU’s terms and be a good citizen when scraping.

## License

MIT (to be confirmed when the app lands).
