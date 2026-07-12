# 08 — UI / UX & Design System

**Owns:** the visual + interaction language — color tokens, typography, layout, components,
theming (light/dark), motion, empty/loading/error states, accessibility, i18n, offline UX,
and the universal UI conventions every screen inherits. Companion docs: `09` (per-screen
spec), `04` (offline states), `10` (role-gated UI), `02`/`03` (data shapes the components
render).

> **Decided foundation:** shadcn/ui + Radix primitives + Tailwind CSS. Components are
> copied into `apps/web/src/components/ui/` and treated as source — modify to fit the
> TransitOps grammar, do not abstract into a library.

---

## 1. Design Principles

1. **Status is the only thing that colors** — never introduce decorative hues that could
   be confused with available/on-trip/in-shop/retired. Highlight only for emphasis.
2. **Live-feel without animation noise** — updates re-render in place (numbers tick, pins
   move, state dots flip color); no slide-ins, fades for routine transitions.
3. **Proactive, not reactive** — the UI surfaces what needs attention; the manager should
   never need to "go look".
4. **Every metric is explicable** — clickable → formula + raw signals. Pilot trust over
   polish hidden behind a number.
5. **Mobile-first for the driver surface** — every driver screen must work one-handed on a
   5" phone mounted in a dock; thumb-zone priority.
6. **Equally consider every persona** — no persona gets a "rough" screen. Driver, Safety
   Officer, Financial Analyst screens share the same component grammar as the Fleet Manager
   command center.
7. **Design for the worst connection** — offline rendering is the default, not a degraded
   variant.

## 2. Color System

### 2.1 CSS variables (semantic tokens, never read raw values in components)
```css
:root {
  /* Brand */
  --brand-50 ... --brand-950: HSL staircase;

  /* Surface */
  --bg-app, --bg-card, --bg-sunken, --bg-elevated;
  --fg-primary, --fg-secondary, --fg-muted, --fg-disabled;
  --border-default, --border-strong, --border-subtle;

  /* Status (canonical — see 00 §3.4) */
  --status-available, --status-on-trip, --status-in-shop, --status-retired;

  /* Alerts */
  --alert-red, --alert-orange, --alert-blue, --alert-green, --alert-magenta; /* sync */

  /* Charts */
  --chart-1..--chart-6 and chart-{good}/{warn}/{bad};
}
```
Dark theme overrides only these tokens via `[data-theme="dark"] { … }`. Components consume
the tokens; the components are theme-agnostic.

### 2.2 Status grammar (memorize)
| Status | Token | Icon (Lucide) | Shape note |
|---|---|---|---|
| Available | `--status-available` | `circle-dot` | green circle |
| On Trip | `--status-on-trip` | `truck` | blue circle |
| In Shop | `--status-in-shop` | `wrench` | amber circle |
| Retired | `--status-retired` | `archive` | gray circle |
| Driver available | `--status-available` | `circle-dot` | green circle |
| Driver on-trip | `--status-on-trip` | `truck` | blue circle |
| Driver off-duty | `--fg-muted` | `moon` | gray circle |
| Driver suspended | `--alert-red` | `ban` | red circle w/ ring |
| Trip draft | `--fg-muted` | `file-pen` | rounded square |
| Trip dispatched | `--status-on-trip` | `truck` | blue rounded square |
| Trip in-transit | `--status-on-trip` | `navigation` | blue rounded square w/ pulse (≤30s) |
| Trip completed | `--status-available` | `circle-check` | green circle |
| Trip cancelled | `--alert-red` | `circle-x` | red circle |

> **Rule:** Color is paired with an icon and (when alone, e.g., status dot) a tooltip with
  the literal status string. Color is never the only signal — accessibility §10.

## 3. Typography

- System-native font stack (`-apple-system, "Segoe UI", "Roboto", sans-serif`) for speed
  and locale fit. Numeric font-feature-settings `tnum` on for all numeric/data values so
  numbers don't shift width when animating.
- Scale (rem):
  | Token | Size | Use |
  |---|---|---|
  | `--text-xs` | 0.75 | table cells, badges |
  | `--text-sm` | 0.875 | secondary text, helper labels |
  | `--text-base` | 1.0 | body |
  | `--text-lg` | 1.125 | section headers |
  | `--text-xl` | 1.25 | page headers |
  | `--text-2xl` | 1.5 | dashboard KPI numbers |
  | `--text-3xl` | 2 | Command Center panes |

Weight: 400 body, 500 emphasis, 600 headings, 700 KPI numbers.

## 4. Spacing & Layout

- Tailwind default 4px grid. Use Tailwind spacing scale — never literal pixels.
- Max content width: 1440px. Padding: 24px on desktop, 16px tablet/mobile. Sidebar width
  248px (expanded) / 68px (icon-only collapsed).
- Page header: optional pre-title (breadcrumb / context), title (`--text-xl`), actions row
  right-aligned. Drawer/dialog for create/edit forms.
- Content density: tables compact by default; user can toggle "comfortable" rows.

### 4.1 Grids
- KPI strip: `repeat(auto-fit, minmax(180px, 1fr))` — fits 1 col on mobile / 4–6 on desktop.
- Vehicle Registry list: virtual scrolling at > 100 rows (`@tanstack/react-virtual`).
- Reports charts: 1-up on narrow, 2-up on desktop.

## 5. Component Inventory

The component set is grouped into `ui/` primitives (shadcn-derived) and `Composite` blocks.

### 5.1 Primitives (in `components/ui/`)
Button (variants: primary, secondary, ghost, destructive; sizes sm/md/lg; loading
state with persistent width), IconButton, Input, Textarea, Select, Combobox (async), Checkbox,
RadioGroup, Switch, Slider, DatePicker, DateRangePicker, Tooltip (Radix), Dialog, Sheet
(side drawer), Tabs, Toast (Sonner integration), Badge, Avatar, Progress (linear +
circular), Skeleton, Spinner, Separator, Table primitives, Pagination, Breadcrumbs,
EmptyState, ErrorState, KeyboardHint.

### 5.2 Composite blocks (in `components/<domain>/` if used by single screen, or
`components/blocks/` if shared)

| Block | Purpose | Features |
|---|---|---|
| `<KpiCard />` | One dashboard KPI cell | icon, value, delta vs. baseline, sparkline, explainable-tooltip |
| `<AlertStrip />` | Horizontal scrolling list of red/orange alerts | dismissable, click-to-deep-link, dismiss persists per user |
| `<SideRailPanel />` | Right rail panel container (Today, Maintenance Queue, ...) | title, action chip, scrollable inner content, sticky footer for "see all" |
| `<StatusBadge />` | Status pill or dot with icon | reuses color grammar |
| `<HealthScoreBadge />` | 0–100 colored chip with hover breakdown | lazy-loads sub-score popover |
| `<VehiclePin />` | Map pin with clustering-aware icon | supports `stale` state |
| `<DigitalTwinChip />` | Compact vehicle state square | updates in place; tooltip = summary |
| `<Timeline />` | Vertical chronological feed w/ event icons | used on Vehicle Detail + Trip Detail |
| `<RuleVisualizationChain />` | Animated dispatch rule chain | steps light up green/red; FIRST BLOCK surfacing the kill-switch |
| `<DispatchRecommendationCard />` | Smart Dispatch recommended pair | confidence, reason chips, alternatives, "select" button |
| `<CopilotCard />` | Vehicle Detail AI block | signals list, recommendation, 'why' drawer |
| `<EmptyState />` | Standard empty UI | title, body, primary action, optional illustration |
| `<ErrorState />` | Standard error UI | message, retry, report-issue link |
| `<ConfirmDialog />` | Destructive/important confirmation | reason required for cancels |
| `<OfflineBanner />` | Top-bar pill (Connected/Syncing/Offline/Issues) | see §11 |
| `<FilterPanel />` | Side filter drawer for tables | persisted to URL; reflects on share |
| `<CommandMenu />` | Cmd+K palette | universal search + nav + quick actions |
| `<DocumentUploader />` | Drag-drop upload + preview | client-side type check, retry on upload failure |
| `<InspectionChecklist />` | Pre-trip inspection UI | fails-fast, defect capture, photo attachments |
| `<PodCapture />` | e-POD photo + signature | offline-first, shows pending upload state |
| `<Heatmap />` | Utilization matrix | custom ECharts wrapper |
| `<MapPanel />` | Leaflet map (pluggable provider) | pins + popups; clusters; route overlay |
| `<DetailViewLayout />` | Header + tabs + action bar shared scaffolding | used for vehicle/driver/customer detail |

## 6. Forms

- **react-hook-form** + Zod. The same Zod schema server-side validates. Errors render inline
  under each field (red `--alert-red` text + icon); error count in submit button label.
- **Inline validation** as the user types for: cargo_weight vs. selected vehicle's
  max_load_capacity (instant `OVER_CAPACITY` warn chip), license expiry on driver picker
  (instant `LICENSE_EXPIRED`), duplicate registration on vehicle create (debounced ~300ms).
  Inline validation is *advisory* — the server is authoritative (`05`).
- **Layout**: one column ≤ 600px; two columns ≥ 900px; never three columns on input forms.
- **Buttons**: primary vs. secondary; destructive paired with `ConfirmDialog`.
- **Smart placeholders**: e.g. Trip create form's distance/time/fuel estimate button labeled
  "Auto-fill from route" — clicking triggers auto-fill and greys the inputs as "estimated".
- **Draft autosave** for trips (TanStack Query mutation on `blur`, debounced 1s) — so a tab
  reload doesn't lose entries.

## 7. Iconography

- **Lucide** icon set only — no ad-hoc SVGs that duplicate Lucide names (consistency +
  tree-shaking). Icons in a fixed sizing scale: 14 / 16 / 20 / 24 / 32.
- Add a new icon by importing into `components/ui/icon.tsx` so tree-shaking keeps them
  accounted for.

## 8. Motion

- Default transitions 150ms ease-out for color/opacity, 200ms for transform.
- **Pulse** on `in-transit` pins (1.5s ease) — disabled under `prefers-reduced-motion`.
- **Numbers animating** use `react-spring` count-up only when the value changes; jump if
  reduced-motion is set.
- No motion for status changes during routine updates — colors flip in place. The pulse is
  the only standing animation.
- Maps: pin moves interpolate via Leaflet's `setLatLng` (CSS transition of the marker
  transform) — 800ms ease-out, capped.

## 9. Empty / Loading / Error States (designed — never blank)

| State | Pattern |
|---|---|
| Loading (first load) | Skeleton matching the final layout shape (KPI skeleton, table row skeletons, drawer skeleton) — never a full-page spinner |
| Loading (refetch) | Subtle top-loading `--accent` stripe (nprogress-like) on the page; data stays visible |
| Empty (no records) | `EmptyState` with persona-tuned copy: "🚚 No Vehicles Yet — Register your first vehicle" + primary CTA |
| Empty (filtered) | "No results for these filters" + "Clear filters" button |
| Error (retryable) | `ErrorState` with `Retry` + `Copy trace_id` |
| Error (downstream maps/LLM) | Inline component card: "Service currently unavailable — showing fallback. [Retry]" |
| Offline | see §11 |
| 404 | Persona-tuned "We couldn't find that — go back to [Command Center]" |
| 403 | "You don't have access to this. Switch user?" |

## 10. Accessibility (WCAG 2.1 AA floor — user-confirmed)

- Color-contrast: text 4.5:1, UI components 3:1 (verified by Lighthouse CI in the build).
- Color never sole signal — icons/labels always accompany color (§2.2).
- All interactive elements reachable via keyboard in source order; visible focus ring using
  `--ring` token; modals trap focus (Radix built-in); ESC closes; restores focus on close.
- ARIA: every status badge carries `aria-label` with the status text. Tables use proper
  `<table>` semantics with `<th scope>`. Live regions (`aria-live=polite`) for KPI updates +
  bell badge so screen readers announce changes without focus shift.
- Forms: real `<label>` linked via `htmlFor`; error text `aria-describedby`; submit buttons
  wear `aria-disabled` not just `disabled` so they remain discoverable.
- Reduced-motion: all motion respects `prefers-reduced-motion`.
- Target size: hit areas 44×44 px minimum on touch (mobile + tablet).
- Lint: eslint-plugin-jsx-a11y + axe via Playwright in CI. No PR passes with a11y violations.

## 11. Offline UX Pill (top-bar)

The single visible "network state" UI surface. Spec referenced from `04`.

| Pill visual (left→right) | Label | Behavior |
|---|---|---|
| ● green dot | Synced | Latest data ≤15s old |
| ◐ spinner | Syncing … (3 pending) | Pushing / pulling |
| ● amber | Offline · 3 pending | Cached reads; mutations queued |
| ● red | Sync issues (2) | Tap → Sync Issues tray |
| ● magenta | App update ready | Refresh requested |
| ● grey | Read-only old cache | older than 5 min — refresh advised if online |

Tap → fly-down menu: Pause/Resume sync, "Sync now", "Sync issues", "Show cached data".
The pill never disappears; it always telegraphs state.

## 12. Theming

- **Light** default; **Dark** toggle persisted per-user in `users.notification_prefs` +
  `localStorage`. Auto-pref via `prefers-color-scheme` on first create.
- Toggle is animated ≤200ms; never blocks first paint.
- No third theme. To ship a brand variation per org (multi-tenant future), a brand overrides
  SASS-style config is the path — but **not in v1**.

## 13. Internationalization

- English default. Locale files: `apps/web/src/messages/<locale>.json` keyed by dotted
  paths (`KAction.save`, `drivers.field.license_expiry.label`).
- `i18next` + `react-i18next` wired. **No user-facing string hardcoded** — enforced by lint
  rule (`i18next/no-literal-string`).
- Locale detection: user pref (`me.locale`) → `Accept-Language` → 'en'.
- RTL-ready: Tailwind logical properties; first locale requiring RTL triggers a CI check.
- Messages are referenced by key, not interpolated client strings into server responses.
  Server-published `message` fields are *keys*; the client interpolates with the payload
  (see `07`).

## 14. Responsive Behavior

| Width | Transformation |
|---|---|
| ≥1280 | Desktop — full sidebar expanded, KPI strip 4-col, side rail visible |
| 1024–1279 | Laptop — same; rail collapses to drawer toggle if dense |
| 768–1023 | Tablet — sidebar to icon-only; KPI strip 2-col; rail becomes a tab strip below content; map shrinks |
| <768 | Driver Mobile — bottom navigation (Home, Trips, e-POD, Settings), decisions visible full-screen, map collapses to a peek strip; KPI strip becomes horizontally scrollable. |

Every screen must consume the breakpoint utility and pass responsive review before merge.

## 15. Navigation

### 15.1 Desktop sidebar
Items: Command Center, Vehicles, Drivers, Trips, Maintenance, Fuel & Expense, Reports,
Fleet Map, Notifications (badge dot), Audit Log (admin only), Settings, plus **persona
hidden items** per `10`'s role matrix.

### 15.2 Mobile/driver — bottom nav
Drivers never see: Vehicles CRUD, Maintenance CRUD, Reports, Audit. Drivers always see:
My Trips (home), Pre-Trip, e-POD, Notifications, Me.

### 15.3 Command menu (Cmd/Ctrl+K)
Universal search + actions + recent screens. Fuse-indexed from cached entities + a static
action list. Standard results groups: Actions, Vehicles, Drivers, Trips, Customers, Reports.

## 16. Keyboard Shortcuts (Tier 2 polish — ship behind a feature flag)

| Key | Action |
|---|---|
| `N` | New Vehicle (admin/fleet_manager only) |
| `T` | New Trip |
| `M` | New Maintenance record |
| `F` | New Fuel log |
| `/` | Focus global search |
| `Cmd/Ctrl+K` | Command menu |
| `?` | Keyboard shortcuts help overlay |
| `g` then `v`/`d`/`t`/`r` | Go to Vehicles/Drivers/Trips/Reports |
| `Esc` | Close modal/drawer |

Shortcuts documented in a `/shortcuts` overlay and on hint chips in primary buttons
(`<Button hint="T" />`).

## 17. Tooltip — Explain Every Metric (innovation)

Every metric (KPI tile, health score, ROI row, anomaly, ETA) exposes an info icon.
Clicking → a popover with three sections:
1. **Formula** — mathML-rendered, locale-translated (e.g. *Utilization (%) = (Trip-Distance
   × Trips) / (Vehicles × Hours × Nominal)*).
2. **Components** — the underlying raw signals at this moment (e.g. "42 trips · 18 vehicles
   · 23h period").
3. **Provenance** — what generated this row (e.g. `mv_fleet_kpis@2026-07-12T10:00`).

> No "AI explainability" smoke — actual elementary arithmetic. Sourced from the
> `sources` JSONB on the row's stored snapshot (see `06` sources trace + `11` report meta).

## 18. Toasts (Sonner)

- Single source for ephemeral success/info/warn/error messages; never use for blocked
  mutations or anything requiring action — those use inline UI.
- Default: short label, left icon, dismissable; auto-dismiss 4s for success, sticky for
  error/warn.
- Stacking limited to 3 visible; overflow folds into "X more".

## 19. Dark Mode Mechanics

Toggle at Settings → Theme. The `data-theme` attribute on `<html>` carries the choice.
Forced-light components (e.g., a printable report view) override via a parent `[data-print]`
selector. Avoid hardcoded hex inside any component — tokens only.

## 20. Data Display Conventions

- Money: always formatted with `currency_code` from the resource (Indian Rupee `₹1,234.50`)
  unless the row's currency differs from org default — then show explicit code (`USD 12.00`
  / `INR 12.00`).
- Dates: locale-aware via `date-fns`. Days remaining: "in 5 days", "2 days ago" — past
  expiry says "expired 12 days ago" (not negative days).
- Numbers: locale-aware thousand separators; scientifically large values abbreviated
  (`12.4K km`, `1.2M L`) — but with the long form in the tooltip.
- Coordinates: not shown raw on cards; "12 km from depot", "TN09 depot" instead; only
  shown raw in audit/telematics inspector screens.

## 21. Print Styles

Reports screen's PDF export route (`11`) opens a print-styled view — no nav/sidebars, A4,
monochrome for ink-friendly printing. Defined via a single `print` stylesheet; `@media print`
hides `.no-print`, displays `.print-only` blocks.

## 22. Acceptance

- Visual regression tests (Playwright snapshots) on every screen at two breakpoints
  (desktop + mobile) in both themes — added/updated whenever a screen is touched.
- Lighthouse a11y score ≥ 95 on every page in CI.
- No `:focus-visible` ring missing on any interactive control (axe rule).
- Theme toggle persists across reloads; first paint never renders the wrong theme (cookie
  read server-side, see DevOps + 14 hydration).
- No hard-coded English strings — lint fails otherwise.
- All four personas can complete each of their primary workflows on a 360px-wide viewport
  (smallest target).