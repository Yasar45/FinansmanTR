# Production Deployment Guide

This guide captures the recommended production topology for **Çiftlik Pazar** and the steps required to roll it out across Vercel, a dedicated worker runtime, Redis, object storage, observability, and backups.

## High-Level Checklist

1. Prepare environment secrets (see [Environment Variables](#environment-variables)).
2. Deploy the web app (Next.js + API routes) to Vercel using the deploy button or script.
3. Provision a dedicated worker (Fly.io, Render, or Railway) that runs BullMQ queues with the same database and Redis credentials.
4. Configure Upstash Redis (or another managed Redis) and enable the Vercel/Upstash Scheduler for cron jobs.
5. Attach an S3-compatible bucket (Cloudflare R2, MinIO, AWS S3) for media/KYC uploads.
6. Configure daily PostgreSQL backups and retention.
7. Hook Pino logs to stdout and Logflare, and expose `/api/healthz`, `/api/readyz`, and `/api/metrics` for monitoring.

## Environment Variables

All deployments must define the variables in [`.env.example`](../../.env.example). The same configuration **must** be reused between the Vercel app and the worker so queues, cron jobs, and API routes share state.

Key production notes:

- `NODE_ENV=production`
- `NEXTAUTH_URL` must point at your public Vercel domain.
- Storage credentials are required in production (`STORAGE_*`).
- When streaming logs to Logflare, set both `LOGFLARE_API_KEY` and `LOGFLARE_SOURCE_TOKEN`.
- To temporarily disable queue connections (e.g., seeds), set `DISABLE_QUEUE_CONNECTIONS=true` before running scripts.

## Vercel (Frontend + API)

### One-click Deploy

Use the Vercel deploy button below or run the helper script:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/ciftlik-pazar&project-name=ciftlik-pazar&repository-name=ciftlik-pazar)

Alternatively execute:

```bash
./scripts/deploy-vercel.sh
```

The script runs `vercel deploy --prod --yes`, expecting `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and a logged-in Vercel CLI. Configure secrets in the Vercel dashboard or via `vercel env pull` / `vercel env add`.

### Scheduler Configuration

- **Hourly Tick:** `production:hourly` queue; schedule `POST https://<domain>/api/tick/hourly` every 60 minutes.
- **Daily Tick:** schedule `POST https://<domain>/api/tick/daily` at 00:05 Europe/Istanbul.
- **Pricing Oracle:** schedule `POST https://<domain>/api/oracle/run` daily at 06:00 Europe/Istanbul.

Use [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) or Upstash Scheduler with the same timings. Each endpoint is idempotent and safe to retry.

## Worker Runtime (BullMQ Queues)

Deploy a Node.js worker to Fly.io, Render, or Railway that runs `pnpm worker:start`. Use the included Dockerfile sample below (Fly/Render both support). Ensure the worker uses the same Git repo and `.env` secrets.

```dockerfile
# fly.worker.Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "worker:start"]
```

For Fly.io:

```bash
fly launch --dockerfile fly.worker.Dockerfile --name ciftlik-pazar-worker
fly secrets set $(cat .env.production | xargs)
fly deploy
```

For Render/Railway, point the start command to `pnpm worker:start`.

## Redis (Upstash or Self-hosted)

- Provision an Upstash Redis database and copy the REST/standard URL into `REDIS_URL`.
- If using Upstash Scheduler, add the cron schedules described earlier.
- For self-managed Redis, expose TLS and update `REDIS_URL` accordingly.

## Object Storage (KYC & Media)

Provision an S3-compatible bucket (R2, MinIO, AWS). Configure the bucket with private ACLs and create access keys restricted to this project. Populate:

- `STORAGE_BUCKET_URL`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`

Uploads are performed server-side to avoid leaking credentials.

## PostgreSQL Backups

Schedule a daily backup cron and retain snapshots for at least 7 days (hot) and 30 days (cold). Examples:

- **Neon/Supabase:** use built-in PITR + scheduled dumps.
- **RDS/Cloud SQL:** enable automated snapshots and create a maintenance window.
- **Self-hosted:** run `pg_dump` via cron. Sample systemd timer:

```bash
0 2 * * * pg_dump "$DATABASE_URL" > /backups/ciftlikpazar-$(date +\%F).sql
find /backups -type f -mtime +7 -delete
find /backups-monthly -type f -mtime +30 -delete
```

## Observability

- Logs: Pino emits JSON to stdout and, when configured, ships to Logflare for centralized retention.
- Metrics: scrape `/api/metrics` for queue depth, wallet TVL, and user counts.
- Health: `/api/healthz` (liveness) and `/api/readyz` (DB/Redis checks) integrate with Vercel health checks and Fly load balancers.
- Alerts: connect Logflare to your preferred alerting or use Vercel's log drains.

## Post-deploy Smoke Test

After deploy:

1. Run database migrations (`pnpm prisma migrate deploy`).
2. Seed demo data if desired (`pnpm db:seed`).
3. Visit `/` to confirm locale detection, `/dashboard` for KPIs, and `/admin` (ADMIN role) for controls.
4. Trigger `POST /api/tick/run-now` (admin action) to validate worker connectivity.
5. Check `/api/metrics` and Logflare dashboards for incoming data.

## Disaster Recovery

- Keep infrastructure IaC (Fly `fly.toml`, Render YAML) versioned.
- Store daily backups off-site (e.g., S3/Backblaze).
- Document Vercel + worker deployment tokens in a secure password vault.

