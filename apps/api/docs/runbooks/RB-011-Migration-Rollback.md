# RB-011 — Migration Rollback

- **Severity:** P1 (if on prod), P2 (staging)
- **Owner:** Platform / DevOps
- **Detection:** Deploy pipeline fails after migration step; or post-deploy smoke tests fail
- **Dashboard:** Grafana → Deployments → Migration Status
- **Alert:** PagerDuty (sev-1 on prod, sev-2 on staging)

## Symptoms

- API pods crash-looping with schema mismatch errors.
- `pnpm db:migrate` exits non-zero.
- Application logs show `column does not exist` or `relation does not exist`.

## Immediate Mitigation

1. Halt the deploy pipeline immediately.
2. Determine if the migration was applied: check `drizzle.__migrations__` table for the new entry.
3. If migration was applied but code is failing:
   a. Run `pnpm db:rollback` to revert the migration.
   b. Verify rollback succeeds: `pnpm db:migrate && pnpm db:rollback && pnpm db:migrate`.
4. If migration was NOT applied (init container failed), simply roll back the deployment: `helm rollback transitops <previous-tag>`.
5. Run smoke tests against the rolled-back deployment.

## Escalation

- If rollback fails after 10 min → Platform Lead + DB Admin.
- After 20 min without resolution → sev-1 incident.

## Post-Incident

- Document root cause in the migration's PR.
- Update migration authoring guidelines to require Expand-Contract for destructive changes.
- Verify down migration was tested in CI — add a gate if missing.
