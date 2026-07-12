# RB-003 — Refresh Token Reuse Detected

- **Severity:** P2
- **Owner:** Security / Platform
- **Detection:** audit-log event `auth.refresh_replay` fired
- **Dashboard:** Grafana → Security → Token Anomalies panel
- **Alert:** PagerDuty (sev-2)

## Symptoms

- A refresh token that was already used (rotated) is presented again.
- This is a strong signal of token theft or client clock skew.

## Immediate Mitigation

1. Revoke the entire token family for that user: `UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = '<family>'`.
2. Force-logout all sessions for that user.
3. Check IP / geo of the replaying request vs the original.
4. Notify the user via email to rotate their password.

## Escalation

- If the same user triggers replay ≥3× in 24h → Security Lead.
- If ≥2 users trigger replay in 1h → sev-1 security incident.

## Post-Incident

- Rotate JWT signing keys.
- Review MFA enforcement for the affected role.
- Document timeline in the security log.
