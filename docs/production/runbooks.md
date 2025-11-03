# Operations Runbooks

These runbooks cover common production interventions for Çiftlik Pazar.

## Queue Stuck or Backlogged

1. **Identify backlog**
   - Visit `/admin` → Logs → Queue dashboard for counts.
   - Check `/api/metrics` for `queueDepth.hourly` / `queueDepth.daily`.
   - Inspect Logflare for errors tagged `queue`.
2. **Pause inflow**
   - In Admin → Economy → Tick Controls, pause the hourly/daily queues.
3. **Restart worker**
   - SSH into worker host or use Fly/Render dashboard.
   - Run `pnpm worker:start` (or restart the service) and tail logs.
4. **Drain stuck jobs**
   - Use BullMQ UI (if connected) or call `POST /api/admin/queues/drain` (requires ADMIN ability) to clear duplicates.
5. **Resume processing**
   - Resume queues from the Admin panel.
6. **Post-mortem**
   - File an AuditLog note with root cause and remediation steps.

## Database Migration

1. Take a fresh backup (see [deployment guide](./deployment.md#postgresql-backups)).
2. Put the app in maintenance mode (optional): enable a feature flag or Vercel maintenance page.
3. Run migrations:

   ```bash
   pnpm prisma migrate deploy
   ```

4. Verify schema version with `pnpm prisma migrate status`.
5. Run smoke tests (`pnpm test`, `pnpm test:e2e` if available).
6. Disable maintenance mode and monitor `/api/readyz` for a few minutes.

## Emergency Hotfix

1. **Assess impact** via Logflare alerts and user reports.
2. **Create a hotfix branch** from the current production tag.
3. Apply the fix and run targeted tests (`pnpm lint`, `pnpm test`).
4. Deploy using `./scripts/deploy-vercel.sh` with `--scope hotfix` (set `VERCEL_GIT_COMMIT_SHA`).
5. For worker fixes, redeploy the worker image (`fly deploy` or equivalent).
6. Monitor `/api/metrics` and Logflare for regressions.
7. Post-incident: merge hotfix into `main`, write retrospective.

## Rolling Back

1. Revert to the last known good Vercel deployment via the dashboard.
2. Redeploy worker using previous image tag (`fly releases` / `render release list`).
3. Restore the latest backup if schema changes break functionality.
4. Communicate status to moderators/admins via Notification broadcast.

## Restoring Backups

1. Provision a temporary database.
2. Restore the desired dump (e.g., `psql < backup.sql`).
3. Point staging environment to restored DB and validate.
4. Plan cutover window and inform stakeholders.
5. Update production connection strings and restart services.

