# 03 — API Contracts (OpenAPI)

**Owns:** URL conventions, request/response shapes, auth headers, error envelope, pagination,
filtering, idempotency, optimistic concurrency, websocket and push registration.

This doc sketches the **shape** of the API and the conventions every endpoint follows. The
authoritative OpenAPI file is generated from the code's Zod schemas (driven by a script:
`pnpm openapi:gen`) and lives at `apps/api/openapi.yaml`; it must be committed on every
endpoint change. Do not hand-edit `openapi.yaml`.

---

## 1. Base URL & Versioning

- Base: `/api/v1` (only one version lives at a time; breaking changes require a v2 path).
- All paths lowercase, plural resources: `/api/v1/vehicles`, `/api/v1/trips`.
- Sub-resources nest only one level: `/api/v1/vehicles/{id}/timeline`,
  `/api/v1/trips/{id}/events`. Deeper nesting is via query filters (`?vehicle_id=`).
- Trailing slash: never. Accept `'/'` with a 308 redirect to unwrapped path.

## 2. Authentication

```
Authorization: Bearer <access_token>     # 15 minute lifetime, JWT HS256/RS256
X-Trace-Id: <uuid v7>                    # client-minted or server-minted; propagates to events/audit
```

- `POST /api/v1/auth/login` returns `{ access_token, refresh_token, user, expires_in }`.
- `POST /api/v1/auth/refresh` rotates refresh; body `{ refresh_token }`.
- `POST /api/v1/auth/logout` revokes the refresh family.
- `POST /api/v1/auth/mfa/enroll`, `POST /api/v1/auth/mfa/verify`, recovery codes endpoints.
- `GET /api/v1/me` — current user, role, notification prefs, feature flags.

Every protected route runs `requireAuth()` then `requireRole([...])` middleware. RBAC
matrix lives in `10-Roles-Security.md`.

## 3. Standard Request Headers

| Header | Required | Notes |
|---|---|---|
| `Authorization` | yes (except `/auth/login`) | JWT access token |
| `X-Trace-Id` | no | Propagated to logs/events/audit |
| `Idempotency-Key` | for POST/PUT/PATCH that mutate | See §7 |
| `If-Match` | for PUT/PATCH that mutate | Optimistic concurrency token (the entity's `etag`) |
| `Accept-Language` | no | Used to localize error messages |
| `X-Client-Id` | for offline clients | Identifies the offline session (see `04`) |

### 3.1 Response headers (always present)
- `X-Trace-Id` — echoed.
- `ETag` — weak entity tag (sha256 of json body, per RFC 7232).
- `Last-Modified` — entity's `updated_at`.
- `RateLimit-*` standard headers (limit, remaining, reset, policy).

## 4. Error Envelope

A single shape across all non-2xx responses. Stable machine codes — never change them, only
add new ones. See canonical list below.

```jsonc
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot dispatch trip: 2 blocking rules failed",
    "trace_id": "01HN6k9c0p...",
    "details": [
      {
        "rule": "vehicle.in_shop",
        "field": "vehicle_id",
        "code": "VEHICLE_NOT_AVAILABLE",
        "message": "Vehicle TN09AB1234 is currently in shop"
      },
      {
        "rule": "driver.license_expired",
        "field": "driver_id",
        "code": "DRIVER_LICENSE_EXPIRED",
        "message": "Driver's license expired on 2025-11-04"
      }
    ]
  }
}
```

### 4.1 HTTP status map
| Status | When |
|---|---|
| 200 | success (read or update) |
| 201 | created (returns the entity in the body) |
| 202 | accepted async work (job id returned) |
| 204 | no content (delete) |
| 400 | malformed body, bad query params, missing required header |
| 401 | missing/expired access token |
| 403 | authenticated but role/field-level forbidden |
| 404 | resource not found |
| 409 | optimistic concurrency mismatch (`If-Match` failed) |
| 422 | business rule violation (the canonical case for `BUSINESS_RULE_VIOLATION`) |
| 429 | rate limited |
| 503 | downstream unavailable (maps/LLM); the UI MUST degrade gracefully |

### 4.2 Canonical machine codes
`VALIDATION_FAILED`, `BUSINESS_RULE_VIOLATION`, `NOT_FOUND`, `UNAUTHORIZED`,
`FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `DOWNSTREAM_UNAVAILABLE`,
`IDEMPOTENCY_REPLAY`, `SCHEMA_MIGRATION_REQUIRED`, `TENANT_NOT_ACTIVE`,
`OFFLINE_REPLAY_REJECTED`, `WORK_IN_PROGRESS`, `QUOTA_EXCEEDED`.

## 5. Pagination, Filtering, Sorting

List endpoints accept the uniform query language:

| Param | Example | Notes |
|---|---|---|
| `page` | `?page=1` | 1-indexed |
| `page_size` | `?page_size=50` | max 100, default 50 |
| `sort` | `?sort=-created_at,name` | `-` prefix = desc |
| `q` | `?q=TN09` | full-text search across fields documented per endpoint |
| `filters` | `?status=available&type=truck` | exact match shim; complex filters via `?filter[...]` |
| `filter` | `?filter[created_at][gte]=2026-01-01` | operators `eq,neq,gt,gte,lt,lte,in,like,between` |
| `fields` | `?fields=id,registration_number,status`(sparse fieldsets) |
| `include` | `?include=driver,vehicle` | nested embeds the server explicitly allows |

### 5.1 Response wrapper
```jsonc
{
  "data": [ /* entities */ ],
  "meta": {
    "page": 1,
    "page_size": 50,
    "total": 137,
    "total_pages": 3,
    "trace_id": "01HN..."
  }
}
```
Single entities return `{ "data": { ... }, "meta": { "trace_id": "..." } }`.

## 6. Resource Conventions

- Output uses **camelCase** at the JSON boundary. Internal DB snake_case is mapped in the
  DTO layer (response serializer), never leaked.
- Datetimes are ISO-8601 UTC with `Z`.
- Dates (no time) are `YYYY-MM-DD`.
- Money fields carry their currency via the resource's `currency_code` field; monetary
  values are `string` (preserve scale): `"cost": "1245.50"`. Decimals are strings for the
  same reason.
- IDs are uuid strings lowercase.
- Reference fields: include both the id and a denormalized summary in show endpoints when
  useful (e.g. `trip.vehicle` embedded as `{ "id": "...", "registration_number": "..." }`);
  list endpoints include only the id unless `?include=vehicle` is set.
- Each entity carries computed `etag` and `updated_at` for optimistic concurrency.

## 7. Idempotency

For mutating writes the client supplies `Idempotency-Key` (uuid v4 per logical request).

- Server stores `(idempotency_key, organization_id, response_status, response_body,
  request_hash)` for 24h.
- On replay within TTL: if `request_hash` matches → respond with the stored response.
- On replay with mismatched request → `409 IDEMPOTENCY_REPLAY` (key was reused).
- After TTL expiry, replay is treated as a new request.

This is what makes the **offline replay queue** safe — see `04-Offline-First-Sync.md` §6.

## 8. Optimistic Concurrency

- PUT/PATCH must send `If-Match: "<etag>"`.
- If the etag does not match the current row → `409 CONFLICT` with the new etag in the body
  so the client can re-fetch + retry.
- The client *must* refetch on conflict and surface a merge UI when the same fields changed.

## 9. Entity Endpoints (catalog)

The headline contract for each resource. Field-level schemas live in `02` (the SQL) and in
the generated OpenAPI. Standard actions (list, show, create, update, delete) are implied
unless noted.

### 9.1 auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/login` | `{email, password, mfa_code?}` | 200 → tokens |
| POST | `/auth/refresh` | `{refresh_token}` | rotates, returns new pair |
| POST | `/auth/logout` | `{refresh_token}` | revokes family |
| POST | `/auth/mfa/enroll` | `{}` | returns secret + QR url |
| POST | `/auth/mfa/verify` | `{code}` | enables MFA |
| POST | `/auth/forgot-password` | `{email}` | 202 (always, to avoid user enumeration) |
| POST | `/auth/reset-password` | `{token, password}` | 200 |
| GET  | `/me` | — | current user + prefs + flags |

### 9.2 users (admin only)
Standard CRUD plus `PATCH /users/{id}/role`, `PATCH /users/{id}/status`, `POST /users/{id}/invite`.

### 9.3 vehicles
| Method | Path | Notes |
|---|---|---|
| GET    | `/vehicles` | filters: type, status, region, score range |
| POST   | `/vehicles` | admin or fleet_manager |
| GET    | `/vehicles/{id}` | returns latest health score, latest location |
| PATCH  | `/vehicles/{id}` | odometer NOT modifiable here |
| DELETE | `/vehicles/{id}` | soft delete; admin only |
| GET    | `/vehicles/{id}/timeline` | merged chronological feed (trip, maintenance, fuel, audit) → `[{type, occurred_at, payload}]` |
| GET    | `/vehicles/{id}/health-scores` | timeseries of health scores |
| GET    | `/vehicles/{id}/documents` | list |
| POST   | `/vehicles/{id}/documents` | multipart upload → S3 |
| GET    | `/vehicles/{id}/locations` | paged historical, default last 24h |
| POST   | `/vehicles/{id}/locations` | internal/telematics endpoint (see `12`) |
| GET    | `/vehicles/{id}/copilot` | returns rules-based analysis + optional LLM prose; see `06` |
| GET    | `/vehicles/{id}/qrcode` | returns base64 PNG (Tier 2) |

### 9.4 drivers
Standard CRUD; `GET /drivers/{id}/score-history`; `PATCH /drivers/{id}/status`;
`POST /drivers/{id}/suspend`.

### 9.5 trips
| Method | Path | Notes |
|---|---|---|
| GET  | `/trips` | filters: status, vehicle_id, driver_id, customer_id, date range |
| POST | `/trips` | create `draft` trip (no driver/vehicle assignment required yet) |
| GET  | `/trips/{id}` | returns trip + vehicle + driver embeds |
| PATCH | `/trips/{id}` | update draft fields; if already dispatched, restricted |
| POST | `/trips/{id}/dispatch` | runs the validation chain (§05) → flips to `dispatched` |
| POST | `/trips/{id}/start` | driver marks en-route (offline write) |
| POST | `/trips/{id}/checkpoint` | driver records position/checkpoint (offline write) |
| POST | `/trips/{id}/complete` | body `{odometer_km, fuel_consumed_l, actual_distance_km}` (offline write) |
| POST | `/trips/{id}/cancel` | body `{reason}` |
| GET  | `/trips/{id}/events` | per-trip event timeline |
| POST | `/trips/{id}/pre-trip-inspection` | body `{responses}` (offline write) |
| POST | `/trips/{id}/pod` | multipart: photo + signature + recipient (offline write) |
| POST | `/trips/{id}/route-autofill` | given source+destination returns `{distance_km, travel_mins, est_fuel_l, est_cost}` from maps adapter |

### 9.6 maintenance_logs
Standard CRUD; `POST /maintenance_logs/{id}/close` (auto-restores vehicle to available).

### 9.7 fuel_logs
POST creates a fuel log AND triggers `fuel.log.created` event → anomaly detector. Response
includes `{ anomaly_flag: {...} | null }` so the client can show the inline flag without a
second roundtrip.

### 9.8 expenses
Standard CRUD.

### 9.9 intelligence surface
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/intelligence/dispatch-recommendation` | `{source, destination, cargo_weight_kg}` | returns ranked vehicle+driver pairs + reasoning; uses `06` rules engine |
| POST | `/intelligence/route-filling` | `{source, destination, vehicle_id}` | fills planned_distance/duration/fuel via maps adapter |
| POST | `/intelligence/dispatch-check` | `{vehicle_id, driver_id, cargo_weight_kg}` | returns rule pass/fail chain (`[{rule, ok, reason}]`); drives the kill-switch UI |
| GET  | `/intelligence/todays-report` | — | operations summary (CI §8.1) |
| GET  | `/vehicles/{id}/copilot` | — | per-vehicle Fleet Copilot; rules + LLM prose |

### 9.10 notifications
| Method | Path | Notes |
|---|---|---|
| GET   | `/notifications` | paged; recipients-only rows for the caller; filter `?unread=true` |
| POST  | `/notifications/{id}/read` | body `{dismiss?: bool}` |
| POST  | `/notifications/read-all` | bulk |
| GET   | `/notifications/unread-count` | payload `{count}` for the bell badge |
| PATCH | `/me/notification-prefs` | `{payload}` |
| POST  | `/notifications/register-push` | body `{subscription: WebPushSubscription}` |

### 9.11 audit_logs
GET `/audit-logs` with filters: `actor_id`, `entity_type`, `entity_id`, `from`, `to`,
`action`. Admin only. Returns the audit envelope with `old_value`/`new_value` already
diffed by the worker.

### 9.12 reports & analytics
| Method | Path | Notes |
|---|---|---|
| GET | `/reports/fleet-kpis` | snapshot counts + ratios |
| GET | `/reports/fuel-efficiency` | per-vehicle + fleet |
| GET | `/reports/utilization` | timeseries by hour/day |
| GET | `/reports/utilization-heatmap` | matrix for the screen widget |
| GET | `/reports/operational-cost` | fuel + maintenance + expense per vehicle |
| GET | `/reports/vehicle-roi` | ROI per vehicle (uses revenue from trips) — `(revenue - (maintenance+fuel+expenses)) / acquisition_cost` |
| GET | `/reports/emissions` | per-vehicle CO2 + fleet total (see `11` ESG) |
| GET | `/reports/customer-profitability` | per-customer aggregation |
| POST| `/reports/export` | body `{report_id, format: csv|pdf, filters}` returns 202 + `job_id` |

### 9.13 telemetry / offline
| Method | Path | Notes |
|---|---|---|
| POST | `/sync/push` | body `{mutations: [{type, id, payload, client_id, occurred_at, idempotency_key}]}` returns per-mutation `{status, result|\|error}` (`04`) |
| POST | `/sync/pull` | body `{since}` returns deltas for the caller's accessible entities (`04`) |
| GET  | `/sync/info` | returns the caller's sync cursor + last server clock + queue state |

### 9.14 geofences & regions
Standard CRUD; `GET /geofence-events` filtered by `vehicle_id`, `geofence_id`, date range.

### 9.15 settings (admin only)
`GET /settings`, `PATCH /settings` (Zod-validated against the settings schema).

### 9.16 health
`GET /healthz`, `GET /readyz`, `GET /metrics` (mTLS-gated).

## 10. WebSocket API

Connection: `WSS /api/v1/realtime?token=<access>`. On upgrade success:
```
{ "type": "hello", "channels": ["notifications", "fleet", "kpi"], "trace_id": "..." }
```

| Channel | Frames out (server→client) |
|---|---|
| `notifications` | `{type:"notification", payload: {...Notification}}`, `{type:"unread-count", payload:{count}}` |
| `fleet` | `{type:"vehicle-position", payload:{vehicle_id, lat, lng, status, ...}}`, `{type:"vehicle-status", payload:{vehicle_id, old_status, new_status, ...}}` |
| `kpi` | `{type:"kpi-snapshot", payload:{...mv_fleet_kpis row}}` (heartbeat on top of every 5s poll fallback) |

Client frames in: `{type:"subscribe", channel:"fleet"}`, `{type:"ping"}`. Long-idle servers
send `{type:"ping"}` every 30s; clients must reply `pong` or be closed (60s).

## 11. Worked Example — Dispatch

### Request
```
POST /api/v1/trips/0b1.../dispatch
Idempotency-Key: 6f8a2c2e-...
If-Match: "W/\"abc123\""
Authorization: Bearer ...
```
No body — the trip already exists. (Can also accept `{force?: boolean}` for the manual-override
checkbox if the user accepts documented overrides — see `05`.)

### Failure response (kill-switch scenario)
```jsonc
HTTP/1.1 422 Unprocessable Entity
{ "error": { "code": "BUSINESS_RULE_VIOLATION", "trace_id": "01HN...",
  "message": "Dispatch blocked by 1 rule",
  "details": [
    { "rule":"driver.license_expired",
      "field":"driver_id","code":"DRIVER_LICENSE_EXPIRED",
      "message":"License expired 2025-11-04" }
  ]}}
```
The UI maps `details[].code` to localized strings in `messages/en/error-rules.json`.

### Success response
```jsonc
HTTP/1.1 200 OK
ETag: "W/\"def456\""
{ "data": { "id":"0b1...", "status":"dispatched", "dispatched_at":"2026-...",
  "vehicle": {"id":"v1","status":"on-trip"}, "driver":{"id":"d1","status":"on-trip"} },
  "meta": {"trace_id":"01HN...","events":["trip.dispatched@abc"]} }
```
Note: `meta.events` returns the domain event ids so a subscribing WS client can correlate.

## 12. Webhooks (outbound)

Settings → org can register outbound webhooks. The notification service can also push to a
configured URL. Retry policy: exponential backoff 1m→24h, up to 8 attempts, then dead-letter.

Webhook payload:
```jsonc
{ "event":"trip.dispatched","occurred_at":"...","organization_id":"...",
  "entity":{"type":"trip","id":"..."}, "payload": { ... }, "delivery_id":"..." }
```
Signed with `X-TransitOps-Signature: t=<ts>,v1=<hmac-sha256 of body>`.

## 13. Acceptance

- Every endpoint has a generated OpenAPI entry (the diff in `openapi.yaml` is required in the
  same commit as the route code).
- Every endpoint has at least one integration test (see `13`) exercising both happy + the
  most likely business-rule failure.
- Each role can call exactly the endpoints the matrix in `10` allows — verified by an RBAC
  test matrix.
- Rate limits apply to anonymous routes (`/auth/login`) and to read endpoints per org.