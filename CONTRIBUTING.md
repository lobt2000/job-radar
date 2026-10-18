# Contributing / git workflow

## Branches

- `main` — stable, always runnable
- Feature work: `feat/<short-name>` or `fix/<short-name>`

## Commits

Prefer small, focused commits:

1. Scaffold / deps  
2. Domain (db, scoring, upsert)  
3. Scrapers  
4. UI / API  
5. Docs / CI  

Use imperative messages (“Add…”, “Fix…”, “Refactor…”).

## Local checks before push

```bash
npm test
npm run build
```

CI runs the same on every push/PR to `main`.

## Scrape env (optional)

```bash
# Cap during development
set JOB_RADAR_MAX_COMPANIES=20
set JOB_RADAR_ENRICH_WEBSITES=0
set JOB_RADAR_DISCOVER_CAREERS=0
npm run scrape
```
