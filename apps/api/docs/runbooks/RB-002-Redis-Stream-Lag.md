# RB-002 — Redis Stream Lag > 60s

- **Severity:** P3
- **Owner:** Platform / DevOps
- **Detection:** BullMQ `lag` metric > 60s for any queue
- **Dashboard:** Grafana → Workers → Queue Lag panel
- **Alert:** Slack #alerts-info

## Symptoms

- Job processing falls behind (notifications delayed, scoring stale, sync replay pile-up).
- Queue depth metric rising monotonically.

## Immediate Mitigation

1. Check worker pod health: `kubectl get pods -l app=transitops-worker`
2. If workers are OOMKilled or crash-looping, check recent deploy logs.
3. Scale workers temporarily: `kubectl scale deployment transitops-worker --replicas=<N+2>`
4. If Redis is the bottleneck (CPU > 80%), check for large key evictions or slow commands via `SLOWLOG`.

## Escalation

- After 20 min of sustained lag → Platform Lead.
- After 45 min → sev-3 incident declared.

## Post-Incident

- Audit the offending queue's job payload size.
- Consider splitting large jobs into batched sub-tasks.
