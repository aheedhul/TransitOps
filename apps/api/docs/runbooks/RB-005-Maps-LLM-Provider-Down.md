# RB-005 — Maps / LLM Provider Down

- **Severity:** P3
- **Owner:** Platform
- **Detection:** `DOWNSTREAM_UNAVAILABLE` error code appearing on > 5% of outbound calls to maps or LLM provider
- **Dashboard:** Grafana → External Services → Maps & LLM panel
- **Alert:** Slack #alerts-info

## Symptoms

- Route autofill returns 503; UI falls back to manual distance entry.
- Copilot returns templated (non-LLM) prose.
- ETA panel shows "Estimate unavailable".

## Immediate Mitigation

1. Verify provider status page (OpenRouteService status, Groq status, etc.).
2. If provider is down, no action needed — system degrades gracefully.
3. If only our API key is failing, verify key validity and quota in provider dashboard.
4. If key is expired/over-quota, rotate key or increase quota.

## Escalation

- >1h of provider downtime → notify Product to communicate to users.
- If fallback paths also fail → sev-2 (check degradation chain).

## Post-Incident

- Review provider SLA and consider adding a secondary provider for failover.
- Update the provider status dashboard widget.
