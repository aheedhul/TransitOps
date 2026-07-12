# RB-001 — DB Out of Connections

- **Severity:** P2
- **Owner:** Platform / DevOps
- **Detection:** `pg_stat_activity` count > max_connections × 0.9 for ≥2 min
- **Dashboard:** Grafana → DB Overview → Connections panel
- **Alert:** PagerDuty (sev-2)

## Symptoms

- API begins returning 503 or timeouts on mutation endpoints.
- `readyz` reports Postgres unreachable.
- `pg_stat_activity` shows connection count near ceiling.

## Immediate Mitigation

1. Identify the source of connection spike: `SELECT count(*), state, application_name FROM pg_stat_activity GROUP BY 2,3;`
2. If a specific application pool is leaking, restart that worker.
3. If transient (e.g. deploy storm), wait for connections to drain naturally.
4. If persistent, temporarily increase `max_connections` (requires restart) — coordinate with on-call before doing so.

## Escalation

- After 15 min without recovery → escalate to Platform Lead.
- After 30 min → incident declared, post in #incidents.

## Post-Incident

- Review connection pool sizing.
- Check for unclosed DB handles in recent deploys.
- Update this runbook with any new findings.
