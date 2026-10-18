# Deploying Job Radar (share with friends)

Job Radar is a **long-running Node app** with **SQLite on disk** and **background DOU scraping**. That rules out classic serverless hosts (Vercel / Netlify functions) unless you redesign storage and scrapers.

## Constraints

| Need | Why |
|------|-----|
| Persistent disk | SQLite (`job-radar.db`) + CV uploads |
| Node + native addons | `better-sqlite3` |
| Long requests / background work | Refresh / scrape can run for minutes–hours |
| Polite outbound HTTP | DOU may rate-limit or block some cloud IPs |

## Recommended options

### A) Docker on a small VPS (best control) — **recommended**

Works on Hetzner, DigitalOcean, Contabo, a home NAS, etc.

```bash
git clone https://github.com/lobt2000/job-radar.git
cd job-radar
docker compose up -d --build
```

- App: `http://YOUR_SERVER_IP:3000`
- Data persists in Docker volume `job-radar-data`
- Optional: put **Caddy** or **nginx** in front with HTTPS + basic auth

**Share with friends:** give them the URL + a simple password (HTTP basic auth or Tailscale).

Env knobs (see `docker-compose.yml`):

- `JOB_RADAR_MAX_COMPANIES` — keep low on first deploy (e.g. `50`–`100`)
- `JOB_RADAR_ENRICH_WEBSITES=0` / `JOB_RADAR_DISCOVER_CAREERS=0` — faster Refresh
- `JOB_RADAR_RESUME=1` — skip recently scraped companies

### B) Fly.io (managed, SQLite-friendly)

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/), `fly auth login`
2. `fly launch` (don’t deploy yet) — choose a region near you
3. Add a volume:

```bash
fly volumes create job_radar_data --size 3
```

4. Set `DATABASE_PATH=/data/job-radar.db` and mount the volume at `/data`
5. Deploy the Dockerfile in this repo

Pros: HTTPS URL out of the box. Cons: scrape may hit cloud IP limits; use resume + max companies.

### C) Railway / Render (Docker)

Same idea as Fly: deploy the Dockerfile, attach a **persistent volume** at `/data`, set `DATABASE_PATH`.

Watch sleep policies — scrapes need the service awake.

### D) Not recommended (without big changes)

- **Vercel / Netlify**: no durable local SQLite, short function timeouts, scrapers will fail
- **Shared hosting (FTP/PHP)**: wrong runtime

## Hardening before inviting friends

1. **Auth** — today the app is single-tenant / open. Add at least:
   - HTTP basic auth at the reverse proxy, or
   - a simple shared password cookie / NextAuth later
2. **Don’t expose Refresh publicly** without auth — scrapes burn CPU and may get your IP blocked
3. **Backups** — copy `/data/job-radar.db` regularly
4. **Legal** — personal/friends use; respect DOU ToS; keep rate limits

## Minimal “friends demo” path (fastest)

1. Deploy with Docker Compose on a €4–6/mo VPS  
2. Put Caddy in front with HTTPS + `basicauth`  
3. Run one capped scrape: `JOB_RADAR_MAX_COMPANIES=80`  
4. Share the URL + password  

## Later (multi-user product)

- Postgres or Turso instead of SQLite  
- Per-user profiles / applications  
- Separate scrape worker queue  
- Proper login  

Until then: one shared board + shared profile is fine for a small friend group.
