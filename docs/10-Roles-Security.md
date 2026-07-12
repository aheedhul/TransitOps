# 10 — Roles & Security

**Owns:** the RBAC matrix, authentication (JWT + refresh rotation + optional MFA), session
lifecycle, server-side authorization middleware, field-level visibility, audit, tenancy,
PII handling, secrets, and security incident response. Companion docs: `02` (tables &
constraints), `03` (auth endpoints), `05` (rule chain which this doc guards).

> Posture: cybersecurity background is our edge. Security standards here are
> **non-negotiable**. Every requirement is enforced server-side; client-side enforcement is
> decoration.

---

## 1. Role Model

Five fixed roles per blueprint + field-level visibility macros. Custom role composition is
out of scope.

| Role | Scope | When introduced |
|---|---|---|
| `admin` | Configuration, users, audit, settings, all data | Seeded by first-run |
| `fleet_manager` | Trips, vehicles, maintenance, dispatch, fuel, map | Primary operator |
| `driver` | Own trips, pre-trip, e-POD, fuel logs (assigned trips), own score | Operational |
| `safety_officer` | Drivers, license compliance, anomaly receipts | Compliance |
| `financial_analyst` | Reports, fuel costs, anomalies, ROI, ESG, customer profitability | Back office |

### 1.1 Permission Macros
Every operation in the API maps to one or more **capabilities**. Roles bundle capabilities.
Server middleware `requireCapability('vehicle.update')` enforces. Capabilities not granted to
the caller's role → `403 FORBIDDEN` before any business rule runs.

### 1.2 Capability Catalogue (excerpt — full table in source truth in `lib/auth/capabilities.ts`)

| Capability | admin | fleet_manager | driver | safety_officer | financial_analyst |
|---|---|---|---|---|---|
| `vehicle.read` | ✓ | ✓ | ✓ (assigned only) | ✓ | ✓ |
| `vehicle.create` | ✓ | ✓ | – | – | – |
| `vehicle.update` | ✓ | ✓ | – | – | – |
| `vehicle.delete` (soft) | ✓ | – | – | – | – |
| `vehicle.retire` | ✓ | ✓ | – | – | – |
| `driver.read` | ✓ | ✓ | {"id": own} | ✓ | ✓ |
| `driver.create` | ✓ | – | – | – | – |
| `driver.update` | ✓ | – | – | (license_only) | – |
| `driver.suspend` | ✓ | – | – | ✓ | – |
| `trip.read` | ✓ | ✓ | {"id": own} | ✓ (compliance) | ✓ |
| `trip.create` | ✓ | ✓ | ✓ (own) | – | – |
| `trip.dispatch` | ✓ | ✓ | – | – | – |
| `trip.complete` | ✓ | ✓ | ✓ (own) | – | – |
| `trip.cancel` | ✓ | ✓ | ✓ (own) | – | – |
| `maintenance.read` | ✓ | ✓ | ✓ (own fleet) | ✓ | ✓ |
| `maintenance.create` | ✓ | ✓ | ✓ (driver report) | – | – |
| `maintenance.close` | ✓ | ✓ | – | – | – |
| `fuel_log.create` | ✓ | ✓ | ✓ (own trips) | – | ✓ (back-dated batches) |
| `expense.create` | ✓ | ✓ | ✓ (toll/parking, own trip) | – | ✓ |
| `reports.read` | ✓ | ✓ | – (own KPIs) | ✓ (safety) | ✓ (financial) |
| `reports.export` | ✓ | ✓ | – | – | ✓ |
| `audit.read` | ✓ | – | – | – | – |
| `users.manage` | ✓ | – | – | – | – |
| `settings.manage` | ✓ | – | – | – | – |
| `notifications.read` (own) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `notifications.send.test` | ✓ | – | – | – | – |
| `dashboard.realtime.subscribe` | ✓ | ✓ | ✓ (own trip) | ✓ | ✓ |

Field-level visibility ("macros") operates **on top** of capability grants. Each row in a
response is whitewashed per-role:

| Field | Visibility |
|---|---|
| `vehicle.acquisition_cost` | admin, financial_analyst |
| `vehicle.current_value` (derived) | admin, financial_analyst |
| `expense.amount`, `fuel_log.cost` | admin, financial_analyst, fleet_manager |
| `driver.contact_number` | admin, fleet_manager, safety_officer, **self** |
| `driver.license_number` | admin, safety_officer, **self** |
| `user.email` | admin, **self** |
| `trip.revenue_amount` | admin, financial_analyst, fleet_manager |
| `audit_log` | admin only |

These whitewashes run inside the response serializer (`modules/<x>/dto.ts::serialize`),
never in the query itself — so the DB row may be fetched but leak nothing to the caller.

## 2. Authentication

### 2.1 Password storage
- Argon2id with `m=64MiB`, `t=3`, `p=4` (OWASP 2023 minimum). Verification via
  `argon2idVerify`.
- Password policy: 12+ chars minimum, no length cap, no forced composition (NIST 2017).
- Password reuse check against last 5 passwords per user (stored as hashes).
- Login throttled per `(email, org)` after 5 fails → 15-min lock + audit row.

### 2.2 Login
- `POST /auth/login` → email, password, optional `mfa_code`.
- On success sets cookies (strict SameSite, Secure, `HttpOnly`) holding `access_token`
  (15min) and a `refresh_token` (30d, rotation family). For PWA + offline scenarios also
  returns both tokens in JSON for storage in the client's encrypted storage — flagged by
  `Accept: application/json` vs cookie browsers. Both flows supported.
- Access token: JWT HS256 (or RS256 in production via env) with claims `sub, sub_role_id,
  org_id, scope ([]), exp, iat, jti, ver`. Lifetime 15 min.

### 2.3 Refresh rotation (family)
- Refresh token: random 32-byte base64url, hash stored in `refresh_tokens.token_hash`.
- Each refresh issues a new token and **revokes the old** (`replaced_by` assigned)
  → tokens form a chain within a "family".
- On a refresh attempt using a token that is already revoked (replay/reuse): the **entire
  family is revoked** (`status='revoked'`), audit row `auth.refresh_replay`, user alerted
  via in-app notification immediately, all WS connections force-closed.

### 2.4 MFA (optional, user-confirmed default posture)
- TOTP via RFC 6231 (otpb authenticator). Enrollment requires user-entered code from QR +
  stores encrypted secret with the tenant-KEK.
- Recovery codes: 10 single-use 8-char codes; reveal-once on enrollment; regenerate
  requires current TOTP. Each usage invalidates the code.
- Admin users (role `admin`) **must enable MFA**: their account is read-only until enroll —
  enforced by `auth.requireMFAEnrolledForAdmin` middleware.

### 2.5 Tokens + requests
- All protected routes run `requireAuth` then `requireCapability` then
  `requireOrgMatch` (each token binds to an org; an `organization_id` on the request that
  differs from the caller's → 403).
- State-changing actions require a fresh access token — i.e., **you can read with a
  near-expiring access token but not mutate within last 60s**. Forces a refresh before
  destructive ops; reduces the live window of a stolen access token.
- A `requirePlatform` flag exists for `/sync/push` etc. (offline clients use refresh token
  + session stamp) so we can identify abnormal persistence without forcing a UI session.

### 2.6 Logout
- `POST /auth/logout` revokes the entire refresh family; clears cookies; user-issued
  `access_token` continues until 15min expiry — acceptable given no path will accept it
  for state-changing ops within the 60s rule.
- A logout-all capability: `/auth/logout-everywhere` revokes every refresh family row for
  the user. Available in `/me` security section.
- WS subs close on token expiry.

## 3. Server-side Authorization (the contract)

```
HTTP request
  → middleware/trace.ts        mint/propagate trace_id
  → middleware/cors.ts
  → middleware/auth.ts         verify access, attach {actor, org, role}
  → middleware/rateLimit.ts
  → route handler
      → requireCapability(...)  // throws 403 before any data touched
      → dto validate (Zod)
      → service.call(actor, input)
          → repository.* // multi-tenant scoping applies automatically
          → authorization checks at the row level
```

### 3.1 Row-level authorization
- Every multi-tenant table query in repositories **must** filter by `organization_id` of
  the actor. The repository layer enforces it via a generic helper `scopedRepository(name)`
  that injects `$orgId` into every query. No raw SQL may bypass this — enforced by lint.
- Driver-scoped queries (`trip.read` for drivers) additionally filter
  `driver_id = $driverId` resolved from the caller's user_id; the SQL has a check
  constraint that no other driver's rows surface.
- Safety-officer role query scope for the `driver` table is the whole tenant (fully readable
  for license compliance).

### 3.2 The multi-tenant seam
- `organizations.id` is the tenant boundary.
- Even in single-tenant deployment where exactly one row exists, all queries include the
  filter — keeps behavioral compatibility with multi-tenant lift (already scaffolded).
- An admin token cannot access another org's data even by mistake; the org scoping layer
  is unconditional regardless of role.

### 3.3 RBAC test matrix
A test matrix where each `(role, capability)` cell asserts success/forbidden. Generated
gauge test runs end-to-end against a test auth provider with each role logged in. The PR
gate fails if a new capability is added without matrix entries.

## 4. Audit

See `02` for the `audit_logs` table. Every state-changing service calls the audit writer
subscriber through the event bus (`01 §4.2`). Audit rows are **append-only** — no schema
allows updates or deletes by the app.

**Captured fields per row**: id (uuid v7 for time-sortable), organization_id, actor_id,
actor_kind, action, entity_type, entity_id, event_id (the domain event that generated this
row), trace_id, old_value, new_value, ip, user_agent, occurred_at.

### 4.1 What triggers an audit row
- All CRUD on master data (vehicle/driver/customer/region/geofence).
- All trip transitions (created/dispatched/started/checkpoint/complete/cancel/pod-attached/
  pre-trip-submitted).
- All maintenance create/close.
- All fuel/expense creates/updates.
- All user role changes, invitations, activations, deactivations.
- All settings changes (diff stored).
- All override actions (e.g. `trip.dispatch.override`).
- All auth events: login, logout, refresh-reuse detection, MFA enrollment, password change,
  password reset.
- All `sync/push` rejected mutations (with reason).

### 4.2 Retention
- `audit_retention_days` set per-org (default 365).
- Nightly vacuum job moves expired rows to cold storage (S3) with object lock (write-once for
  retention duration); original rows are truncated. Cold copy readable only by admin.
- Audit retention extends beyond soft-delete of the related entity (audit is self-sufficient
  — entity_id stored directly).

### 4.3 Audit Log screen
`/audit-logs` (admin only). Filters: actor, action, entity_type, entity_id, date, trace_id.
Export CSV/PDF scheduled weekly if pinned. Diff viewer shows structured old_value vs.
new_value rendered per entity-type-specific diff formatter.

## 5. PII & Data Protection

### 5.1 PII inventory
- User: name, email, password_hash ( hashed ), mfa_secret ( encrypted ), IPs from login +
  audit, user_agent strings.
- Driver: name, license_number, contact_number, license_history.
- Customer: contact_name, contact_email, contact_phone, billing_address.
- Vehicle: registration_number (semi-PII per jurisdiction).

### 5.2 Storage protections
- mfa_secret: encrypted with the tenant-KEK (`KMS`-derived AES-256-GCM); never returned in
  any API response; recovery codes hashed (Argon2id low-mem).
- Driver contact_number + license_number: at rest encrypted in column with
  pgcrypto using the tenant data key; accessor serializer decrypts lazily based on
  field-visibility.
- Audit + notification payload: must not store driver_name, contact_number, license_number,
  salary-equivalents. Payload only the foreign keys; UI resolves names client-side from the
  entity cached response.
- Push payloads (`07 §2.3`): only ids + type tokens, never PII.

### 5.3 Right-to-be-forgotten (exportable)
Admin action `/users/{id}/forget` soft-deletes the user (PII fields wiped to null) while
preserving audit rows with their `actor_id` reference. Driver records referenced by trips
must be anonymized in place (replace name with `<deleted user>`) — this is a manual admin
workflow with mandatory reason.

## 6. Transport Security

- TLS 1.3 only; 1.2 disabled at the LB.
- HSTS (max-age 63072000, includeSubDomains, preload).
- Cookies: `HttpOnly`, `Secure`, `SameSite=Strict`; refresh token path `/api/v1/auth/refresh`
  only — narrows exfiltration surface.
- CSP: `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'
  <ws> <maps tiles>`, `img-src 'self' data: blob: <maps tiles>`, `style-src 'self'
  'nonce-<per-request>'`. Nonce via server render; `unsafe-inline` denied. `_blank` links
  carry `rel="noopener noreferrer"`.
- `X-Content-Type-Options: nosniff`. `X-Frame-Options: SAMEORIGIN` (or CSP `frame-ancestors`).
- Referrer-Policy: `strict-origin-when-cross-origin`.
- Permissions-Policy: deny camera/mic except on `/trips/{id}/pod` (POD capture) and
  `/trips/{id}/pre-trip-inspection` (defect photos) — granted on demand with consent gate.

## 7. Input Validation (server-side only)

See `05 §5-6` for the strict DTO + sanitization. Security highlights:
- Json body size cap 256KB per request (1MB for multipart POD attach); enforced at the
  gateway per route.
- Multipart: max files 6, max single size 8MB; magic-byte sniff + extension; reject if
  mismatch. Stored under hashed S3 keys; metadata in DB.
- Trailing-slash-CORs strict allow-list of one origin; no wildcard.
- Path traversal: documented for documents + exports — `path.normalize` + bin-prefixing of
  S3 keys; vendor-supplied filenames sanitized.
- GraphQL: not used (out of scope).
- SSRF: outgoing calls to maps/routing go via `lib/maps/adapter` which has a hardcoded
  allow-list of hosts; no user-supplied URLs to server-side fetches except the registered
  webhook base URL (validated to a public host + not RFC1918 + not localhost; admin-only
  edit).

## 8. Rate Limiting + Anti-abuse

- Anonymous (`/auth/login`, `/auth/forgot-password`): 5/min/IP, 20/15min/IP. Login
  additionally throttled by `(email, org)` with progressive backoff.
- Per-token read endpoints: 600/min/token, 200/sec/token burst.
- Per-token write endpoints: 120/min/token.
- `/sync/push`: 30/min/token (each push can carry up to 50 mutations anyway).
- 429 with `Retry-After` + `RateLimit-*` headers per draft IETF spec.
- Abuse detection: a non-linear pattern (1000 failed reconciliations from one user) emits
  an audit row + temporary 5-min throttle + ops alert.

## 9. Cross-Origin / WebSocket Security

- WS upgrade carries token as `?token=` (short-lived); server validates and closes on
  expiry. Refresh via the WS again (logout-reconnect).
- WS target channels are filtered server-side by capability — a driver can subscribe only
  to `notifications` + the channel for their own `trip/{id}/position`.
- The Redis pub/sub backplane names channels include `org_<orgId>_` prefixes to prevent
  cross-org cross-talk.

## 10. Secrets Management

- All secrets via env at boot (12-factor). The dev container loads from `.env.local` (git-
  ignored); CI loads from the secret manager (see `14`).
- The tenant-KEK used for column-level encryption is sealed by an env-deployed KMS/wrapping
  key (local:.age keyfile; prod: Cloud KMS/AWS KMS). Decryption happens in-process only.
- JWT signing key: HS256 in dev (env `JWT_SECRET`); RS256 in prod (private key in KMS,
  public key bundled for verification).
- VAPID keys generated on first run per org via an admin script and stored in `settings`
  (encrypted).
- LLM provider keys (Groq/Gemini): per-org `settings.integrations.llm` stored encrypted,
  settable only by admin UI; never echoed back in GET responses.

## 11. Incident Response

| Trigger | Auto action | Human action |
|---|---|---|
| Refresh-token reuse detected | Revoke family + alert user + audit | Admin investigates;FORCE logout-all if needed |
| Brute force login | Lock account + audit + ops alert | Admin reviews actor IPs |
| Audit log somersault (writes stop) | Telemetry alert | On-call (in-hours) investigate |
| Push subscription 410 storm | Auto-prune | None |
| LLM cost anomaly (cost spike 5x) | Auto-disable LLM feature + admin notification | Admin reviews + flag toggle |
| Anomaly spray (200+ notif/hr org) | `WORK_IN_PROGRESS` dispatcher pause + ops alert | Investigate root cause |
| Unusual /sync/push rate from one client | Rate-limit + raise sync alerts | Investigate possibly held offline app |

## 12. Privacy & Compliance (future-facing)

- The schema + audit design supports GDPR/CCPA DPAs: right of access (`/me/data-export`),
  right to erasure (admin `forget` action above), data processing records via audit.
- Cookie policy: only auth cookie is set; no analytics cookies in v1 (analytics via
  Telemetry docs are server-side aggregated only).
- DPA + cookie banner: out of scope for v1; spec'd to ship when multi-tenant is lifted.

## 13. Acceptance

- A driver-role user issuing a request to `/api/v1/vehicles` for an org table returns
  only the vehicles assigned to their active trip — never the full list. Verified by a test
  per capability in the matrix.
- A `financial_analyst` token querying `/vehicles/{id}` returns the row but with
  `acquisition_cost` blanked — verified by serializer unit test.
- Refresh-token reuse triggers family revocation → all subsequent refreshes for that family
  fail → user must re-login.
- All state-changing endpoints write a single audit row with diff content; no exceptions.
- MFA enrollment is required for `admin` and enforced server-side.
- No CORS access for unknown origins — verified via an automated CORS test.
- Pen-test particles: stale TLS, IDOR (incremental id traversal), mass-assignment (extra
  JSON fields), SSRF via webhook admin endpoint — all four covered by integration tests.