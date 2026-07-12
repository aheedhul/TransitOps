# RB-004 — Sync Engine Outbox Backpressure

- **Severity:** P2
- **Owner:** Platform
- **Detection:** Outbox queue size > 10,000 entries
- **Dashboard:** Grafana → Sync Engine → Outbox Depth panel
- **Alert:** Slack #alerts-info, escalates to PagerDuty if > 20k

## Symptoms

- Driver PWA shows "Syncing..." indefinitely.
- `POST /sync/push` response times climbing.
- Offline mutations not reflecting on the server.

## Immediate Mitigation

1. Check if the API is rate-limiting sync pushes; temporarily raise the rate limit.
2. Check for a large batch of identical idempotency keys — this may indicate a client loop.
3. If the queue contains mostly duplicate keys, drain them manually via admin endpoint.
4. Scale API replicas to absorb burst.

## Escalation

- >20k entries for >10 min → Platform Lead.
- >50k entries → sev-2 incident, halt new offline writes.

## Post-Incident

- Review the offending client version for mutation-loop bug.
- Consider adding per-user outbox size limits with backpressure signalling.
