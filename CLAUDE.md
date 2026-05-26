# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quality Bar (Non-Negotiable)

Everything built or modified in this project must meet the standard expected of a **production-grade internal employee management and project ERP**. This overrides convenience shortcuts.

Every router, model, schema, utility, and frontend component must demonstrate:

- **Correctness & Robustness** — handle nulls, missing foreign keys, empty payloads, expired tokens, duplicate submissions, and partial data gracefully. Validate at the API boundary using Pydantic schemas; enforce business invariants inside the router or a dedicated service function; raise `HTTPException` with a clear `detail` for predictable failures — never silently swallow errors.
- **Security** — never trust user-supplied IDs without ownership checks. Project access, milestone access, expense access — always verify `created_by_id == current_user.id` OR `is_superuser`. Never return another user's data through a missing filter. Validate uploaded files (MIME + size) before persisting. Sanitize any value that reaches a raw SQL string.
- **Performance** — paginate every list endpoint (`page`, `limit`). Use `joinedload` / `selectinload` to avoid N+1. Never call `.all()` on a full table for list responses. Use `AsNoTracking` equivalent (`query(Model)` without expunge) for read-only projections. Aggregate in SQL (`func.sum`, `func.count`) — never pull raw rows into Python to compute totals.
- **Auth boundary** — every route that touches user or business data must declare `current_user: User = Depends(get_current_user)` or `Depends(get_current_superuser)`. No route may expose private data without an auth dependency.
- **Soft deletes** — `Project.is_deleted` is the canonical soft-delete flag on that model. Any query listing or fetching projects must filter `Project.is_deleted == False` unless explicitly building an admin recovery view. When adding soft delete to other models, follow the same pattern.
- **Idempotency** — expense reversals, payment captures, and document approvals must be safe to resubmit. Use natural unique keys (`project.code`, `task.task_code`, `expense.id`) or status-guard checks to prevent double-writes.
- **API contract stability** — request and response shapes are defined in `app/schemas/` (under `C:\Projects\FourConnectService\`). Never change a field name or remove a field from a schema that the frontend already consumes. Add fields; do not rename or drop without a frontend migration plan.
- **Validation** — Pydantic model validators are the first line. Cross-field business rules (e.g., `end_date >= start_date`, `reversal_amount <= original_amount`) belong in the router handler or a dedicated validation helper, not in the model constructor.
- **Observability** — 500 errors are written to `C:\Projects\FourConnectService\crash.log` by the global exception handler in `app/main.py`. For new routers, do not swallow exceptions into silent 200 responses; let them propagate to the global handler or raise `HTTPException`.
- **Maintainability** — routers stay readable. If a handler exceeds ~50 lines of business logic, extract it to a helper function or module in `app/utils/`. Schemas, models, and routers are separate concerns.

If a request would force a shortcut that breaks any of the above, flag it before proceeding. **Fewer features done correctly** beats many features done sloppily.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend runtime** | Vue 3 (`<script setup>` SFCs) + Vite 8 (requires Node 20.19+ or 22.12+ — Vite 8 throws `node:util.styleText` import error on Node 21.x) |
| **Frontend routing** | Vue Router 4 |
| **HTTP client** | Axios |
| **Charts** | Chart.js 4 + vue-chartjs |
| **Icons** | lucide-vue-next |
| **Toast notifications** | vue-toastification (globally installed) |
| **PDF export** | jspdf + jspdf-autotable |
| **3D / animation** | three, @tresjs/core, @tresjs/cientos, @theatre/core, @theatre/studio, gsap, motion-v, @vueuse/motion, @lottiefiles/dotlottie-vue. The bare `motion` package is also installed as a sibling — **do not import from it**; use `motion-v` (see Animations convention below). |
| **Utilities** | lodash, @vueuse/core, country-state-city |
| **Backend runtime** | Python 3.14 (path: `C:\Users\91700\AppData\Local\Programs\Python\Python314\`) |
| **Web framework** | FastAPI |
| **ORM** | SQLAlchemy 2 |
| **Database** | PostgreSQL (`fourreck_db`) |
| **Migrations** | Alembic (+ many ad-hoc `add_*.py` / `fix_*.py` scripts) |
| **Validation** | Pydantic v2 + pydantic-settings |
| **Password hashing** | argon2 via passlib (`CryptContext(schemes=["argon2"])`) |
| **JWT** | python-jose (HS256, 24-hour expiry) |
| **File serving** | FastAPI `StaticFiles` for `/uploads` and `/storage` |

---

## Build & Run

### Prerequisites
- **Node.js 20.19+, 22.12+, or 24 LTS** (Vite 8 requires this; Node 21.x fails to start the dev server with a `node:util.styleText` SyntaxError — Node 24 has been verified working)
- Python 3.14 at `C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe`
- PostgreSQL running on port 5432 with database `fourreck_db`

### Start frontend (from repo root)
```powershell
npm install --legacy-peer-deps   # required — see peer-dep note below
npm run dev                      # Vite dev server on http://localhost:5173
npm run build                    # production build → dist/
npm run preview                  # preview the production build
```

> **`--legacy-peer-deps` is required.** `package.json` declares `vite@^8` but `@vitejs/plugin-vue@^5` only lists Vite 5/6 as compatible peers, so `npm install` (clean) fails with `ERESOLVE`. The legacy flag is the right escape hatch until someone bumps `@vitejs/plugin-vue` to v6+.

> **If Vite throws `Cannot find module '.../dep-XXXXXX.js'` mid-session**, your dev process is referencing chunk hashes from a prior install that was wiped or replaced. Kill the dev server PID (the hashes are baked into the running process) and restart from a fresh terminal. Reinstalling Vite without restarting the dev server reproduces this error.

> **No lint or test scripts.** `package.json` ships only `dev`, `build`, `preview` — there is no `lint`, `format`, or `test` script. Don't run `npm run lint` / `npm test`; they will fail. The Vite dev server still proxies bare `/api/*` paths to `http://127.0.0.1:8000` (see [vite.config.js](vite.config.js)) for the small number of relative-path call sites that remain, but new code should route through `@/utils/api` (see Key Conventions). The backend CORS list whitelists `localhost:5173` + `127.0.0.1:5173` + `:5174` + production domains — keep both forms in sync when changing dev ports.

### Start backend (from `C:\Projects\FourConnectService`)

> **Backend location:** The active FastAPI backend lives at `C:\Projects\FourConnectService\` (the `app/` package is inside it). An older `c:\Projects\FourConnect\backend\` path no longer exists — do not look for it.

```powershell
cd C:\Projects\FourConnectService
& "C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe" -m pip install -r requirements.txt   # first time
& "C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend API docs: http://localhost:8000/api/docs
Backend Redoc: http://localhost:8000/api/redoc

### Database migrations (from `C:\Projects\FourConnectService`)
```powershell
# Apply all pending migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "describe_what_changed"

# Rollback one step
alembic downgrade -1
```

> **Warning:** Many schema changes in this repo were applied via ad-hoc `add_*.py` / `fix_*.py` scripts at the backend root rather than Alembic revisions. Before creating a new migration, run `alembic current` to check current revision state, and inspect `alembic/versions/` to avoid conflicts.

### Environment config
Copy or create `C:\Projects\FourConnectService\.env` to override defaults from `app/config.py`:
```
DATABASE_URL=postgresql://postgres:yourpassword@127.0.0.1:5432/fourreck_db
SECRET_KEY=change-this-in-production
```
Settings are loaded via `pydantic-settings` from that `.env` with fallback to the hardcoded defaults in `config.py`.

> **⚠️ The live DB is REMOTE, not local.** The actual `.env` in this workspace points `DATABASE_URL` at `216.48.179.252:5432/FourConnect` — a hosted Postgres. The local `127.0.0.1:5432/fourreck_db` you'll see in `config.py` is **only a hardcoded fallback** used when `.env` cannot be located. This trips up ad-hoc scripts:
> - `pydantic-settings` resolves `.env` **relative to cwd**. uvicorn started from `C:\Projects\FourConnectService` finds it → uses remote. A script invoked with an absolute path from any other cwd (`python C:\Projects\...\my_script.py`) will silently use the local fallback and operate on a **different database**.
> - When writing a one-off script that hits the same DB the backend uses, **read `.env` directly with a small text parser** rather than relying on `get_settings()`. The login handler in `auth.py` already does this with a regex — copy that approach.
> - If you ever see the backend showing data your direct-DB query can't find (or vice versa), **double-check which DB each side is connected to before debugging anything else**.

### Tests
There is **no organised pytest suite**. The backend root contains many `test_*.py`, `debug_*.py`, `verify_*.py`, and `check_*.py` files. These are **ad-hoc probes against a live dev backend**, not a pytest run. Do not attempt `pytest` — it will fail. Run individual scripts with:
```powershell
& "C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe" C:\Projects\FourConnectService\check_db.py
```

> Any new probe script that connects to Postgres directly should: (1) read `.env` itself (don't trust `get_settings()` cwd resolution — see env section above), (2) call `psycopg2.extras.register_uuid()` before sending Python `uuid.UUID` values (otherwise `can't adapt type 'UUID'`), and (3) defensively check `information_schema.columns` rather than assuming columns the SQLAlchemy model declares actually exist in the live DB.

### Scheduled tasks
`C:\Projects\FourConnectService\tasks_cron.py` is the only scheduled-task entry point. It calls `check_update_upcoming_tasks` and `check_update_expired_tasks` from `app/routers/tasks.py` to drive task status transitions (`UPCOMING ↔ OPEN ↔ EXPIRED`). Wire it to Task Scheduler or a similar runner — there is no in-process scheduler.

---

## Architecture

### Overview

This is a **single-tenant internal ERP** with two user roles — regular employees and superadmin — exposed through separate dashboard panels. The frontend is a Vue 3 SPA proxying all `/api` calls to the FastAPI backend. There is no service layer between routers and the database; routers own all business logic directly.

```
Frontend (Vue 3 SPA)        Backend (FastAPI)           Database
  src/views/               app/routers/                PostgreSQL
  src/components/    ───►  app/models/           ───►  fourreck_db
  src/composables/         app/schemas/
  src/utils/               app/utils/
```

### Frontend: Dual-panel routing model

The app exposes **two parallel dashboards** — `/user/*` and `/admin/*` — both built on the same `DashboardLayout` component ([src/components/dashboard/DashboardLayout.vue](src/components/dashboard/DashboardLayout.vue)). They share views but differ by role permissions enforced both on the frontend (route guards) and backend (dependency injection).

**Auth state in `localStorage`:**

| Key | Scope | Purpose |
|---|---|---|
| `user_token` | User panel | JWT for regular user sessions |
| `admin_token` | Admin panel | JWT for superadmin sessions |
| `user_is_activated` | User panel | `"true"` when user has passed the 8-digit activation gate |
| `session_start` | Both | Session start timestamp |

Both tokens are independent — a user can be logged into both panels simultaneously. The router guard ([src/router/index.js](src/router/index.js)) inspects the current path prefix to determine which token to check.

**Navigation guard logic** (`router.beforeEach`):
1. `/admin/*` paths → require `admin_token`, redirect to `/authentication/admin/login` if absent.
2. `/user/*` paths → require `user_token` + if route has `meta.requiresActivation`, require `user_is_activated === 'true'`, redirect to `/authentication/user/activation` otherwise.
3. Public pages redirect to the correct dashboard if the user is already authenticated.

**Adding a new route**: register it **twice** — once under `/user/` and once under `/admin/` — pointing at the same component. Add legacy redirects if the URL changes. See [src/router/index.js](src/router/index.js) for the pattern. Most views use lazy imports (`() => import('../views/X.vue')`); a handful are eager at the top of the file — keep whichever style the surrounding entries use.

**Admin-only modules**: The HR module is registered **only** under `/admin/hr/*` — there is no user-side mirror. The user side instead exposes a parallel `/user/self-service/*` surface for employee self-service (profile, attendance, leave, payslips). Do not duplicate HR admin routes to `/user/`.

**Tab-driven workspace pages**: Newer HR pages collapse multiple "sub-pages" into a single component driven by a constrained route param. Example pattern from [src/router/index.js](src/router/index.js):

```js
hr/employees/:tab(all|directory|profiles|history|lifecycle|transfers|promotions|confirmations|probation|suspended|inactive|archived|add)
hr/recruitment/:tab(dashboard|requisitions|positions|candidates|applications|screening|interviews|panels|offers|pipeline|analytics)
hr/onboarding/:tab(dashboard|pending-joining|checklist|approvals|documents|identity|assets|account-provisioning|welcome-kit|training|induction|probation|tasks|reports)
```

A single `Hr<Module>WorkspacePage.vue` lives at [src/views/hr/](src/views/hr/) and reads `$route.params.tab` to render the right section from `sections/`, `components/`, `drawers/`, and `modals/` subfolders. Use this pattern for any new HR-style multi-tab workspace; do not register one route per tab.

**Phase metadata on placeholder routes**: Many routes use `PlaceholderPage` with a `phase` prop (e.g. `'Phase 2 — Time Management'`, `'Phase 5 — Growth & Lifecycle'`). This is the roadmap signal — a placeholder marked Phase 3 is intentionally not yet built. Do not replace placeholders with stubs unless you are actually implementing that phase.

**Session timeout**: `useSessionTimeout` ([src/composables/useSessionTimeout.js](src/composables/useSessionTimeout.js)) is initialised in `DashboardLayout` and auto-logs out after **10 minutes of inactivity** by watching `mousedown`, `keydown`, `scroll`, `touchstart`. On timeout it clears the correct token (admin vs user) based on the current path prefix.

**Global animation infrastructure**: [src/main.js](src/main.js) wires three app-wide directives — `v-reveal` (scroll-triggered fade-up), `v-tilt` (3D pointer-tilt), `v-magnetic` (magnetic-pointer pull) — plus `MotionPlugin` from `@vueuse/motion`, plus a one-time `attachRouterCleanup()` from [src/composables/useGsapAnim.js](src/composables/useGsapAnim.js) that disposes GSAP tweens across route changes. **Reach for these before inventing new scroll/tilt/animation logic.** GSAP, motion-v, three, @tresjs/core, @theatre/core, and @lottiefiles/dotlottie-vue are all already loaded — the design aesthetic depends on them.

### Frontend: Component organisation

```
src/
├── App.vue                  # Root; mounts router-view + ToastContainer
├── main.js                  # App bootstrap; installs router + vue-toastification + MotionPlugin + 3 global directives
├── router/index.js          # All routes + navigation guard
├── directives/              # Global v-directives registered in main.js (see below)
│   ├── vReveal.js           #   v-reveal — scroll-triggered fade/translate
│   ├── vTilt.js             #   v-tilt — 3D pointer-tilt
│   └── vMagnetic.js         #   v-magnetic — magnetic-pointer pull on hover
├── components/
│   ├── dashboard/           # DashboardLayout, TopNavBar, PlaceholderPage
│   ├── LoginPage.vue        # User login
│   ├── SignupPage.vue       # User registration
│   ├── AdminLoginPage.vue   # Admin login
│   ├── common/              # Shared reusable UI atoms
│   ├── ui/                  # ToastContainer + other UI primitives
│   └── [feature]/           # Feature-scoped components (tasks, milestones, expenses, etc.)
├── views/                   # Page-level route components
│   ├── documents/           # SLA, Handover, DPR wizard/dashboard pages
│   └── hr/                  # HR module — admin-only workspace pages
│       ├── employees/       #   employee workspace + profile + add wizard
│       ├── recruitment/     #   recruitment workspace (components/drawers/modals/sections)
│       ├── onboarding/      #   onboarding workspace (components/composables/sections)
│       ├── HrDashboardPage.vue
│       └── SelfService*.vue #   user-side self-service pages (mounted under /user/self-service)
├── composables/
│   ├── useSessionTimeout.js # Auto-logout on inactivity
│   ├── useGsapAnim.js       # GSAP wrapper; exposes attachRouterCleanup() called once from main.js
│   └── useToast.js          # Lightweight custom toast (superseded — prefer vue-toastification)
├── styles/
│   ├── theme.css            # Global design tokens (dark + light); loaded from main.js
│   ├── theme-light-rescue.css # App-wide light-mode overrides (loaded AFTER theme.css)
│   ├── hr-theme.css         # HR module design tokens (warm gold/amber palette, --hr-* vars)
│   ├── onboarding-theme.css # Feature-scoped — imports hr-theme.css; do NOT import globally
│   └── recruitment-theme.css# Feature-scoped — imports hr-theme.css; do NOT import globally
└── utils/
    ├── dprPdfGenerator.js
    ├── expenseReceiptGenerator.js
    ├── handoverPdfGenerator.js
    ├── receiptGenerator.js
    └── slaPdfGenerator.js
```

**Toast notification system**: There are **two toast mechanisms** in the codebase. `vue-toastification` is installed globally and is the canonical approach. The custom `useToast` composable in `src/composables/useToast.js` is a legacy pattern — prefer `vue-toastification` for any new code.

### Frontend: Dark/Light theme system

The app supports a dark/light theme toggle. The codebase was designed dark-first, so **every new component or page must add `[data-theme="light"]` overrides** for any hardcoded `#fff` / `rgba(255,255,255,X)` / dark `rgba(0,0,0,X)` colors — otherwise the page is unreadable on cream in light mode.

**Architecture:**
- **Tokens** live in [src/styles/theme.css](src/styles/theme.css) — defines `:root` + `[data-theme="light"]` blocks for: `--bg-color`, `--card-bg`, `--text-primary/secondary/tertiary/placeholder`, `--input-bg/border/focus`, `--accent-gold/emerald/danger/noir`, `--divider-color`, etc. Light mode is **warm cream** (`#faf7f0`), not pure white — gold/amber/orange accents stay vivid; only neutrals invert.
- **Composable** [src/composables/useTheme.js](src/composables/useTheme.js) — exposes `{ resolved, isDark, isLight, toggle, setPreference, cycle }`. Persists to `localStorage['theme_preference']`. Uses View Transitions API for a sunrise-sweep animation on toggle (respects `prefers-reduced-motion`). Pre-mount init via `initTheme()` in [main.js](src/main.js).
- **Anti-flicker bootstrap** — [index.html](index.html) has an inline `<script>` in `<head>` that reads localStorage and sets `data-theme` on `<html>` before any CSS loads.
- **Toggle component** [src/components/common/ThemeToggle.vue](src/components/common/ThemeToggle.vue) — sun/moon icon button, used in TopNavBar and on each auth page (top-right).
- **HR module** has its own token set in [src/styles/hr-theme.css](src/styles/hr-theme.css) (`--hr-*`) and [src/styles/onboarding-theme.css](src/styles/onboarding-theme.css) (`--onb-*`) — both have `[data-theme="light"]` override blocks appended.
- **Global rescue stylesheet** [src/styles/theme-light-rescue.css](src/styles/theme-light-rescue.css) — uses `:root[data-theme="light"]` (specificity 0,3,0) to override common class-name patterns app-wide (`.glass-card`, `.modal-*`, `.text-input`, `.stat-eyebrow`, `.drop-zone`, `.cmd-tab`, etc.) and the vue-toastification portal. Loaded AFTER theme.css in main.js.

**Critical anti-patterns:**
- **Never write `:root { --text-primary: #fff; ... }` in a scoped page style** — it leaks globally and hijacks the theme. (Past offender: `CreateTaskPage.vue` line 894, now scoped to `.settings-page`.) Use page-scoped selectors for local CSS variables.
- **Never write `:global([data-theme="light"]) .selector`** in Vue scoped CSS — PostCSS chokes on the nested attribute selector and falls back to parsing the SFC template as CSS, breaking the entire page's styles. Use plain `[data-theme="light"] .selector` — Vue scoped styles still apply the data-v hash to the selector, but the attribute prefix is enough to win specificity.
- **Don't promote the rescue stylesheet to use `!important` everywhere.** The `:root[data-theme="light"]` prefix already wins via specificity (0,3,0 vs scoped 0,2,0). Reserve `!important` for vue-toastification only (it uses inline styles).

**Light theme is incomplete:**
The user panel has had broad light-mode overrides applied across ~30 pages and ~20 shared components. The HR module's main surfaces (topbar, rail, lifecycle modal, profile drawer wide, all employee sections — All / Directory / Profiles / Lifecycle / History / Probation / Suspended / Inactive / Archived / Transfers via shared `_FilteredListSection`) now have light-theme overrides. Rough edges remain on: Documents wizards (SLA/Handover/DPR), HR recruitment + onboarding submodules, and any modal/drawer that hasn't been explicitly toured. When adding light overrides to a NEW page, follow this checklist:
1. Page wrapper `color` (replace `#fff` / `#f5f5f7` with `var(--text-primary)`)
2. All section/card titles, eyebrows, descriptions
3. Form labels + required asterisks
4. Inputs/textareas/selects backgrounds + borders + placeholders
5. Stat eyebrow (use `#6b5840`, NOT `var(--text-secondary)` — too faded on cream)
6. Tab labels + active state + tab-count badges
7. Empty state text + icons
8. Action buttons (preserve gold-gradient primaries; tokenize ghost/secondary)
9. Tables: headers, rows, hover, borders
10. Status pills + priority pills (red/amber/emerald variants need cream-readable variants)
11. **Modals/drawers: keep frosted-glass feel** — use `rgba(255, 250, 240, 0.65)` + `backdrop-filter: blur(20px)` instead of solid cream
12. File-upload drop zones (`rgba(255, 250, 240, 0.65)` + warm dashed border)

Files modified for light theme are committed under feature branches; check `git log` for context. The CSS is appended to each file's `<style scoped>` block in a `═════ LIGHT THEME OVERRIDES ═════` section at the end.

### Frontend: PDF generation

PDF utilities in `src/utils/` use `jspdf` + `jspdf-autotable` to generate client-side PDFs for DPR, SLA, handover documents, and expense receipts. Each utility exports a function that accepts data and returns a PDF blob or triggers a download. Call these from the component; do not mix PDF generation logic into router handlers.

### Backend: Entry point and request flow

`C:\Projects\FourConnectService\app\main.py` is the FastAPI entry point:

1. Loads settings via `get_settings()` (cached `@lru_cache`).
2. Calls `Base.metadata.create_all(bind=engine)` on startup — **new models auto-create their tables without requiring an Alembic migration run**. Alembic is used for column changes, index additions, and data migrations.
3. Registers `CORSMiddleware` for `localhost:5173` and `localhost:5174` only.
4. Mounts 20 top-level routers + 1 HR sub-router package, all under the `/api` prefix.
5. Mounts `/uploads`, `/storage`, and `/static` as `StaticFiles` directories (auto-created on startup).
6. Global exception handler writes a `crash.log` and **manually re-injects CORS headers on 500 responses** — without this the browser suppresses the error detail. Do not remove those headers.
7. Exposes `GET /health` for load-balancer pings and serves a custom Swagger/ReDoc with the Fourconnect favicon at `/api/docs` and `/api/redoc`.

**Request path**: HTTP request → CORS middleware → router handler → `Depends(get_db)` + `Depends(get_current_user)` → SQLAlchemy query → response schema → JSON.

### Backend: Database engine quirk — StaticPool

`C:\Projects\FourConnectService\app\database.py` uses `poolclass=StaticPool`:

```python
engine = create_engine(settings.DATABASE_URL, poolclass=StaticPool)
```

This means **only one connection is maintained** (no connection pool). It was chosen for stability on Python 3.14. Be aware:
- Long-running requests block others.
- No automatic connection recycling.
- Do not add `pool_size` or `max_overflow` arguments — they are incompatible with `StaticPool`.

### Backend: Login bypasses SQLAlchemy — psycopg2 direct

The `POST /api/auth/login` handler in `C:\Projects\FourConnectService\app\routers\auth.py` deliberately skips SQLAlchemy and queries PostgreSQL directly via `psycopg2`. This workaround exists because SQLAlchemy was deadlocking on Python 3.14 under the `StaticPool`. The handler parses `DATABASE_URL` with a regex and falls back to hardcoded defaults:

```python
match = re.search(r'postgresql://(.*?):(.*?)@(.*?):(\d+)/(.*)', db_url)
```

If you change the `DATABASE_URL` format (e.g., to `postgresql+psycopg2://`), update both `config.py` and this regex.

### Backend: Password hashing — argon2

Despite `requirements.txt` listing `passlib[bcrypt]`, the active hashing scheme is **argon2**:

```python
# app/utils/auth.py
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
```

All passwords in the database are argon2 hashes. Do not change the scheme — existing password hashes will fail verification.

### Backend: Authentication dependencies

`C:\Projects\FourConnectService\app\utils\dependencies.py` provides two FastAPI dependencies:

| Dependency | Use case |
|---|---|
| `get_current_user` | Any authenticated route; validates JWT, loads user, checks `is_active` |
| `get_current_superuser` | Admin-only routes; wraps `get_current_user` + checks `is_superuser` |

`auth.py` also defines a local `get_superadmin` inline dependency for the admin-specific endpoints in that file (legacy). These are equivalent — use `get_current_superuser` from `dependencies.py` in new routers. The HR routers all use `get_current_superuser`.

### Backend: Models

All SQLAlchemy models live in `C:\Projects\FourConnectService\app\models\` and inherit from `Base`. Primary keys are `UUID(as_uuid=True)` defaulting to `uuid.uuid4`. HR models live in a `hr/` sub-package under `app/models/` and follow the same conventions.

**User model fields of note:**
- `is_superuser` — grants admin panel access
- `is_activated` — must be `True` for user panel access; set by admin generating an 8-digit `activation_code`
- `organisation` — the user's organisation string (used as the project default)

**Soft delete**: `Project.is_deleted (Boolean, default=False)`. Always filter `Project.is_deleted == False` in list and fetch queries. Check individual models for whether they implement `is_deleted` — it is not universal across all models today.

**Status patterns**: Use Python `str + enum.Enum` (e.g., `ExpenseStatus`, `TaskStatus`, `MilestoneStatus`) mapped to SQLAlchemy `Enum` columns. Enum values are lowercase strings stored in the DB. Backward-compatibility aliases (`OPEN = open`) exist on `TaskStatus` and `TaskPriority` — do not remove them.

**JSON columns**: `attachments`, `allocations`, `reviewers`, `watchers`, and similar array/object fields are stored as `JSON` (or `JSONB`). Validate structure in the Pydantic schema layer, not in the model.

### Backend: Schemas (Pydantic)

Request/response schemas live in `C:\Projects\FourConnectService\app\schemas\`, one file per resource (HR schemas under `app/schemas/hr/`). The pattern per resource:
- `<Model>Create` — required fields for creation
- `<Model>Update` — all optional, for PATCH-style updates
- `<Model>Response` — outbound shape, must have `model_config = ConfigDict(from_attributes=True)` to serialise ORM objects

Date/time fields in responses serialise as ISO 8601. The frontend sends and receives standard JSON — no custom converters are needed.

### Backend: Routers

Each router file in `C:\Projects\FourConnectService\app\routers\` follows this shape:

```python
router = APIRouter(prefix="/resource", tags=["Resource"])

@router.get("/")
def list_items(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ...
```

All routers are registered in `main.py` under `/api`. A top-level router **must** be both imported and included in `main.py`.

**HR sub-router aggregation (newer pattern).** The HR module deviates from the flat layout. `app/routers/hr/__init__.py` collects every HR sub-router into one package-level `APIRouter`:

```python
# app/routers/hr/__init__.py
router = APIRouter()
router.include_router(_employees_router)        # prefix="/hr/employees"
router.include_router(_recruitment_router)      # prefix="/hr/recruitment"
router.include_router(_onboarding_router)       # prefix="/hr/onboarding"
# ...14 sub-routers total
```

Each sub-router declares its own `prefix="/hr/<resource>"` and `tags=["HR — Resource"]`. `main.py` mounts the whole package once with `app.include_router(hr.router, prefix="/api")`. **When adding a new HR sub-router**: create the file under `app/routers/hr/`, give it a `/hr/<resource>` prefix, then add a single `router.include_router(...)` line in `app/routers/hr/__init__.py`. Do **not** touch `main.py`.

### Backend: Module map

**Top-level routers** (all under `app/routers/`):

| Router file | Prefix | Key responsibilities |
|---|---|---|
| `auth.py` | `/api/auth` | Signup, login (psycopg2 path), `/me`, password change, activation code, admin user list |
| `projects.py` | `/api/projects` | CRUD, approval, archive, complete, project order upload |
| `team.py` | `/api/team` | Assign/remove team members per project |
| `milestone.py` | `/api/milestones` | Milestone CRUD, tracker, assignments |
| `tasks.py` | `/api/tasks` | Task CRUD, comments, checklists, assignments, activity log |
| `expenses.py` | `/api/expenses` | Full lifecycle: draft → submit → approve/reject → void → reversal |
| `financials.py` | `/api/financials` | Project payments, ledger, budget analytics |
| `notes.py` | `/api/notes` | Project-scoped notes |
| `notifications.py` | `/api/notifications` | In-app notification list, read, dismiss |
| `activity.py` | `/api/activity` | Audit/activity log (project-scoped) |
| `sla.py` | `/api/sla` | SLA agreement wizard multi-step save |
| `handover.py` | `/api/handover` | Handover document creation |
| `dpr.py` | `/api/dpr` | DPR (Detailed Project Report) multi-section document |
| `drive.py` | `/api/drive` | Document drive storage |
| `archive.py` | `/api/archive` | Archive / restore across project + document artefacts |
| `documents_hub.py` | `/api/documents-hub` | Cross-document aggregation for the Documents Hub landing page |
| `uploads.py` | `/api/uploads` | Generic file upload endpoint |
| `dashboard.py` | `/api/dashboard` | Summary stats for dashboard home |
| `settings.py` | `/api/settings` | System settings (admin) |
| `admin_employees.py` | `/api/admin/employees` | `AllowedEmployee` whitelist management |

**HR sub-routers** (all under `app/routers/hr/`, aggregated by `app/routers/hr/__init__.py`):

| Router file | Prefix | Key responsibilities |
|---|---|---|
| `dashboard.py` | `/api/hr/dashboard` | HR landing-page summary cards / charts |
| `employees.py` | `/api/hr/employees` | Employee CRUD + lifecycle state machine (`LifecycleState` — confirm/promote/transfer/suspend/reinstate/give-notice/exit/archive) + history log. PII (bank account) masked unless `?reveal_bank=true`; Aadhaar stored as last-4 only. |
| `employee_history` | (inside employees) | `EmployeeHistory` + `EmployeeChangeType` audit rows written via `_track_actor` |
| `departments.py` | `/api/hr/departments` | Department master |
| `designations.py` | `/api/hr/designations` | Designation master |
| `grades.py` | `/api/hr/grades` | Grade master |
| `locations.py` | `/api/hr/locations` | Work location master |
| `recruitment.py` | `/api/hr/recruitment` | Requisitions, positions, candidates, applications, screening, interviews, panels, offers, pipeline, analytics |
| `onboarding.py` | `/api/hr/onboarding` | Onboarding checklist driver; bootstrapped via `app/utils/hr/onboarding_bootstrap.py` when an employee is created |
| `onboarding_documents.py` | `/api/hr/onboarding-documents` | Per-employee onboarding document upload + approval |
| `identity.py` | `/api/hr/identity` | Identity verification step (KYC docs) |
| `assets.py` | `/api/hr/assets` | Asset issue / return / tracking for the asset master |
| `training.py` | `/api/hr/training` | Training assignments at onboarding |
| `induction.py` | `/api/hr/induction` | Induction schedule + sessions |
| `account_provisioning.py` | `/api/hr/account-provisioning` | System account creation step |
| `welcome_kit.py` | `/api/hr/welcome-kit` | Welcome-kit fulfilment tracker |

**HR styling — feature-scoped CSS.** The HR module has its own design tokens at [src/styles/hr-theme.css](src/styles/hr-theme.css) (warm gold/amber/orange palette, `--hr-*` custom properties). Sub-modules extend it via their own stylesheets that `@import` `hr-theme.css` and add module-specific tokens and keyframes — currently [src/styles/onboarding-theme.css](src/styles/onboarding-theme.css) (`--onb-*`, stage colours, journey-path geometry, ~12 keyframes) and [src/styles/recruitment-theme.css](src/styles/recruitment-theme.css) (recruitment workspace surfaces). These files are **imported per-view** by the HR workspace SFCs that need them — they are **not** loaded globally from `main.js` or `style.css`. Do not promote them to global; do not duplicate their tokens elsewhere. New HR sub-modules should follow the same pattern (`<module>-theme.css` that `@import`s `hr-theme.css`).

### Backend: File storage

Uploaded files land in `C:\Projects\FourConnectService\uploads\` (served at `/uploads/<filename>`). Generated/stored documents go in `C:\Projects\FourConnectService\storage\`. Static assets (favicon etc.) live in `C:\Projects\FourConnectService\static\`. All three are auto-created on startup and mounted as `StaticFiles`. The frontend constructs full URLs by prepending the API base URL, e.g. `http://localhost:8000/uploads/filename.pdf`.

---

## Key Conventions

### Routing: always register under `/api`
The Vite proxy only forwards requests with the `/api` prefix to the backend. Every router must be mounted with `app.include_router(router, prefix="/api")` in `main.py`.

### CORS: hardcoded origin allowlist
`ALLOWED_ORIGINS` in `app/main.py` whitelists the four local dev origins (`localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174`) plus the production frontend domains (`https://crm.fourreck.com`, `https://www.crm.fourreck.com`). If you add a new origin (new dev port, new staging domain), add it to that list — and remember the global exception handler in `main.py` also re-injects CORS headers on 500s, so cross-origin error visibility depends on this list staying complete.

### `auto-create` vs Alembic
`Base.metadata.create_all()` runs on startup and creates tables for any new model class automatically. Use this for **new tables**. Use Alembic for **column additions, index changes, renames, or data migrations** on existing tables. Never delete a `versions/` file to "start fresh" — it will corrupt the migration graph.

> **Schema-drift trap.** `create_all()` does NOT add columns to existing tables. If the `Project` (or any other) model adds a column and no migration script runs against the live DB, SQLAlchemy will generate SELECTs that reference the missing column and Postgres will error out. The endpoint may return a 500 that the frontend swallows in a `try/catch`, leaving counters at `0` with no visible error in the UI. When something "returns empty for no reason," **check the DB schema against the model first**: query `information_schema.columns` and compare. The repo has ad-hoc patch scripts (`add_govt_project_columns.py`, `drop_cost_center_budget_type.py`) for known cases — run them if you suspect drift.

### Ownership checks (not just auth)
`get_current_user` verifies the JWT is valid but does **not** verify resource ownership. Routers must check, e.g.:
```python
if expense.user_id != current_user.id and not current_user.is_superuser:
    raise HTTPException(status_code=403, detail="Access denied")
```

### Pagination
List endpoints must accept `page: int = 1` and `limit: int = 10` query parameters. Apply them as:
```python
.offset((page - 1) * limit).limit(limit)
```
Always return total count alongside items so the frontend can render pagination controls.

### Status machine discipline
Expense, project, milestone, task, and document models all have status state machines. Never allow arbitrary status jumps — a `VOID` expense cannot be `APPROVED`; a `completed` project cannot be set to `Draft`. Gate status transitions explicitly in the router handler.

### UUID stringification
SQLAlchemy returns `UUID` fields as Python `uuid.UUID` objects. Pydantic v2 handles this automatically in response schemas. When comparing IDs in query filters, pass `uuid.UUID` objects directly — do not cast to string unless building a raw SQL query.

### `datetime.utcnow()` vs `func.now()`
Older models use `default=datetime.utcnow` (Python-side, naive UTC). Newer models use `server_default=func.now()` (DB-side, timezone-aware). Do not mix the two in the same model. For new models, prefer `server_default=func.now()` with `DateTime(timezone=True)`.

### Vue `<script setup>` SFCs
All Vue components use the Composition API with `<script setup>`. Do not introduce Options API components. Emit events with `defineEmits`, expose slots with `defineSlots`, and props with `defineProps` — all at the top of the `<script setup>` block.

### Axios base URL — import from `@/utils/api`
The canonical pattern is the centralised helper at [src/utils/api.js](src/utils/api.js), which exports:

```js
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const API = `${API_BASE}/api`
```

Every new view, component, or composable that talks to the backend must import these and prefix URLs with `${API}`:

```js
import { API, API_BASE } from '@/utils/api'

axios.get(`${API}/projects/`)                 // API endpoints
imageUrl = `${API_BASE}${doc.file_url}`       // static assets under /uploads or /storage
```

The current frontend uses this pattern in ~83 files. **Do not** hardcode `http://localhost:8000` or `http://127.0.0.1:8000` anywhere — `VITE_API_URL` in `.env` is the production override (e.g. `VITE_API_URL=https://apifc.fourreck.com`). The Vite proxy in [vite.config.js](vite.config.js) still forwards bare `/api/*` paths to `127.0.0.1:8000` for any remaining relative-path callers, but new code should go through `@/utils/api`.

### `@` path alias
[vite.config.js](vite.config.js) maps `@` → `./src`. Use it for any cross-folder import (`@/utils/api`, `@/components/ui/CustomSelect.vue`, `@/composables/useToast`) — currently in use across ~82 files. Don't write deep relative chains like `../../../utils/api` in new code.

### Modal overlays must `<Teleport to="body">`
Any modal that uses `backdrop-filter: blur(...)` on its overlay **must** wrap its template in `<Teleport to="body">`. Without that, the overlay is rendered inside the page's stacking context — and `backdrop-filter` scopes itself to the containing block, so descendants with their own `border-radius`, `overflow`, or `transform` produce visible **boxed blur regions** that look like rectangular ghost outlines behind the modal. (Past offender: `UploadDocModal.vue`. Fix: added `<Teleport to="body">` to match `PaymentEntryModal.vue` and `CreateMilestoneModal.vue`.) The Record Payment / New Milestone / Tracker modals are the reference pattern.

### Dropdowns trapped under sticky headers / tab strips — the GSAP-transform pitfall
The page-entry choreography in [src/animations/pageChoreography.js](src/animations/pageChoreography.js) runs `tl.from(items, { x: -24, opacity: 0, ... })` against tab strips (e.g. `[data-anim="tabs-dock"]`). GSAP **leaves `transform: translate3d(0,0,0)` inline** on each `.dock-item` after the animation completes because the timeline is invoked without `clearProps`. A non-identity transform creates a stacking context per element, and combined with the page header's `isolation: isolate` + `z-index: 50`, an in-header dropdown can no longer escape — its `z-index: 1500` is scoped to the header's local context and ends up painting under the tabs even though the dropdown owns a higher z-index.

**Symptoms**: tab pill text shows through (or above) the dropdown body even after the dropdown's background is set to near-opaque.

**Fix**: don't fight the stacking context — `<Teleport to="body">` the popover and position it with `position: fixed` driven by `getBoundingClientRect()` of the trigger. Recalc on `resize` and on `scroll` with `capture: true` so sticky-header scroll events fire it. Reference: project-selector dropdown on [src/views/ProjectFinancialsPage.vue](src/views/ProjectFinancialsPage.vue) (`triggerRef` / `dropdownPos` / `recalcDropdownPos`).

When you teleport a popover that lives inside a parent with `v-click-outside`, **also add `@mousedown.stop @click.stop` to the teleported root**. The directive checks `el.contains(event.target)` against the original parent — once the popover is moved to `<body>`, clicks inside it look like outside-clicks and the popover closes on every interaction.

### Shared form-input components — use the Compact* variants
Newer Vue forms (milestones, financials) use a parallel set of input components prefixed `Compact*`:
- [src/components/ui/CompactDatePicker.vue](src/components/ui/CompactDatePicker.vue) — newer; teleports its calendar popover and is theme-aware. Prefer this over the older [src/components/ui/DatePicker.vue](src/components/ui/DatePicker.vue).
- [src/components/ui/CompactTaskCreator.vue](src/components/ui/CompactTaskCreator.vue), [CompactSelectionList.vue](src/components/ui/CompactSelectionList.vue), [CompactUserGrid.vue](src/components/ui/CompactUserGrid.vue), [CompactTaskPreview.vue](src/components/ui/CompactTaskPreview.vue), [CompactFileUpload.vue](src/components/ui/CompactFileUpload.vue) — newer milestone-style inputs with light-theme overrides.
- [src/components/ui/CustomSelect.vue](src/components/ui/CustomSelect.vue), [CustomNumberInput.vue](src/components/ui/CustomNumberInput.vue), [FileUpload.vue](src/components/ui/FileUpload.vue) — the broader app uses these. Both Compact* and Custom*/regular variants have full light-theme overrides; pick the variant the surrounding feature already uses for visual consistency.

### Chart.js theming — make options reactive to `data-theme`
Chart.js renders axis ticks, legends, gridlines, and tooltips via JS-supplied colors, which CSS overrides can't reach. For any chart that needs light-theme support: wire a `MutationObserver` on `document.documentElement` watching `data-theme`, store it in a ref, and **compute the chart options reactively**. Also re-key the chart (`<Line :key="theme">`) so it remounts on theme switch. See [src/components/financials/overview/SpendTrendChart.vue](src/components/financials/overview/SpendTrendChart.vue) for the reference pattern.

### ID comparison — stringify both sides
JWT claims are strings; SQLAlchemy returns `uuid.UUID` objects; localStorage stores either. Comparing a project/milestone's `created_by_id` against `currentUser.id` directly can fail when one side is a UUID object and the other a string. **Always stringify both sides for cross-boundary checks**: `String(milestone.created_by_id) === String(currentUser.id)`. Inside SQLAlchemy filters, keep it native (`Project.created_by_id == current_user.id`). The bug surfaces as "creator gets denied access to their own resource" — see the fix in [MilestoneTrackerModal.vue](src/components/milestones/MilestoneTrackerModal.vue) `canEditTracker` + `isCreator` computeds.

### Animations — prefer `motion-v` for new component motion

`motion-v` (the Vue port of Framer Motion) is installed and is the **default tool for any new component-level animation**: hover lifts, tap presses, entrance/exit transitions, staggered list reveals, drawer slides, modal pops, progress fills. Do **not** reach for raw CSS `@keyframes`, hand-written `<Transition>` blocks, or GSAP tweens unless the effect genuinely needs imperative control over a long timeline.

**Import the component, not a plugin:**
```js
import { Motion } from 'motion-v'
```
There is no global plugin registration — import per-file where you use it.

**The four reactive props you'll use 95% of the time:**
| Prop | Purpose | Example |
|---|---|---|
| `initial` | State the element mounts from | `:initial="{ opacity: 0, y: 12 }"` |
| `animate` | Target state to animate toward (reactive) | `:animate="{ opacity: 1, y: 0 }"` |
| `whileHover` | Applied on pointer hover, released on leave | `:whileHover="{ y: -2, scale: 1.02 }"` |
| `whileTap` | Applied on press, released on pointer up | `:whileTap="{ scale: 0.96 }"` |

Also useful: `exit` (paired with `<Presence>`/`<AnimatePresence>` for unmount), `:transition` (`{ duration, delay, ease }` — prefer `ease: [0.16, 1, 0.3, 1]` for the project's signature ease-out spring).

**Render as any element with `as`:**
```vue
<Motion as="button" class="btn-pill primary"
  :initial="{ opacity: 0, y: 8 }"
  :animate="{ opacity: 1, y: 0 }"
  :whileHover="{ y: -2, scale: 1.02 }"
  :whileTap="{ scale: 0.97 }"
  :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
  Continue
</Motion>
```

**Reference implementations in this repo:**
- [src/views/hr/onboarding/components/OnbTabBar.vue](src/views/hr/onboarding/components/OnbTabBar.vue) — staggered tab entrance + hover/tap micro-interactions on a tab dock.
- [src/components/documents/EditSlaModal.vue](src/components/documents/EditSlaModal.vue) — multi-step wizard with animated step dots, modal entrance, animated progress fill, and hover-lift CTAs.

**When to still use other tools:**
- **`v-reveal` directive** (already global) — for one-shot scroll-into-view fade-up of decorative blocks. Don't replace it with motion-v.
- **GSAP** — long imperative timelines, scrub-controlled scroll, route-leave cleanup (`attachRouterCleanup()` already wired in [src/main.js](src/main.js)).
- **Plain CSS `@keyframes`** — pure decorative loops (shimmer sweeps, aura drift, breathing glows) that don't need to react to JS state.
- **Vue `<Transition>` / `<TransitionGroup>`** — acceptable for trivial enter/leave on a single element; switch to `<Motion>` once you need hover/tap variants or any reactive `animate` target.

**Anti-patterns to avoid:**
- Don't combine motion-v `:animate` with conflicting CSS `transition: transform ...` on the same property — the CSS transition fights the motion engine.
- Don't animate `transform: translateY(-1px)` in an infinite `repeat: -1` loop on layout-affecting elements (CLAUDE.md already calls this out elsewhere — "Continuous-motion GSAP breathing" applies to motion-v too). Bobbing tabs/cards shift surrounding content. Use CSS-only `::after` glow shimmers for ambient breathing instead.
- Don't import from `'motion'` — the package is `'motion-v'`. The bare `'motion'` package is the JS/framework-agnostic version and isn't installed here.

### currentUser hydration — fetch from `/api/auth/me`
Several views read `currentUser` from `localStorage.getItem('user')`. That key is only populated by `LoginPage.vue` after a recent login — older sessions don't have it. When `currentUser` is needed for permission checks, **hydrate it from `/api/auth/me` on mount** as a fallback before relying on the localStorage value. The endpoint is cheap and returns the full `UserResponse`. Pattern: [ProjectDetailsLandingPage.vue](src/views/ProjectDetailsLandingPage.vue) `hydrateCurrentUser()`.

---

## Anti-Patterns to Avoid

- **Missing auth dependency** — never define a route that touches user data without `Depends(get_current_user)`.
- **Missing ownership check** — `get_current_user` only validates the token, not whether the current user owns the requested resource. Always check ownership or `is_superuser`.
- **`SELECT *` on full tables** — always filter at minimum by relevant foreign key (`project_id`, `user_id`) before `.all()`.
- **Missing soft-delete filter** — `Project.is_deleted == False` must appear on every project query that isn't an admin recovery view.
- **`datetime.now()` for timestamps** — use `datetime.utcnow()` or `func.now()` consistently per the model's existing pattern.
- **Modifying a shipped Alembic migration** — add a new revision; never edit `versions/*.py` files.
- **Raw string concatenation in SQL queries** — use SQLAlchemy ORM or parameterised Dapper-style queries; never f-string a user value into a SQL string.
- **Returning another user's data** — any list endpoint must scope results to `current_user.id` unless the caller is `is_superuser`.
- **Breaking a Pydantic response schema** — the frontend depends on field names being stable. Add optional fields with defaults; do not rename existing ones.
- **Trusting `is_superuser` from request body** — `is_superuser` is a DB property on the `User` model loaded from the JWT. Never accept it from the request payload.
- **Changing the password hash scheme** — the scheme is argon2. Changing it to bcrypt or pbkdf2 invalidates all existing password hashes.
- **Changing `StaticPool` to a standard pool** — until Python 3.14 SQLAlchemy compatibility is verified, leave the pool configuration alone.
- **Adding logic to the Vite proxy** — `vite.config.js` proxies `/api` only. Do not add path rewrites without testing the backend route prefix.
- **Using `useToast` composable for new notifications** — the custom composable in `src/composables/useToast.js` is superseded. Use `vue-toastification`'s `useToast` from `'vue-toastification'`.
- **Hardcoding `http://localhost:8000` (or any backend URL) in frontend code** — import `API` / `API_BASE` from `@/utils/api` instead. The base URL is driven by `VITE_API_URL` at build time, with localhost as the dev fallback. Hardcoding breaks production deploys against `apifc.fourreck.com`.
- **Auto-creating admin users via API** — `is_superuser` can only be set directly in the database or via `ensure_admin.py` at the backend root (`C:\Projects\FourConnectService\ensure_admin.py`).
- **Ignoring crash.log** — if the backend returns 500, check `C:\Projects\FourConnectService\crash.log` before debugging in the source; the full traceback is written there.
- **Touching `main.py` to add an HR endpoint** — HR sub-routers are aggregated in `app/routers/hr/__init__.py`. Add them there, not in `main.py`.
- **Returning full Aadhaar or unmasked bank account from HR endpoints** — Aadhaar is stored last-4 only (no full-reveal anywhere). Bank account is masked by default; only return the unmasked value when the caller explicitly passes `?reveal_bank=true`, and only for superusers.
- **Targeting `.modal-container` in light overrides when the modal uses `.modal-content` / `.glass-panel`** — several modals in this codebase use a `<div class="modal-content glass-panel">` shell. A `[data-theme="light"] .modal-container { ... }` block silently does nothing. Always grep the modal's template for the actual root class and target that.
- **Continuous-motion GSAP "breathing" on active UI elements** — `gsap.to(el, { y: -1, yoyo: true, repeat: -1 })` on an active tab/card makes the element visibly bob and shifts surrounding layout. Prefer a CSS-only shimmer/glow on a child pseudo-element (`::after` with `box-shadow` keyframe or gradient flow) so nothing in the layout moves. Past offender removed from [pageChoreography.js](src/animations/pageChoreography.js) `projectNotesEntry`.
- **Introducing blue/purple/indigo/teal accents** — the brand palette is warm orange/amber/golden. The Tailwind-style utility classes (`text-blue-400`, `text-purple-400`, `text-indigo-400`, etc.) appear in older code and must be remapped to amber (`#fbbf24`, `#f59e0b`, `#d97706`, `#b45309`, `#92400e`) when touching that file. Emerald `#34d399`/`#047857` is reserved for success-state semantics; red `#ef4444`/`#b91c1c` for danger.
- **Off-cwd ad-hoc script invocation** — running `python C:\Projects\FourConnectService\some_script.py` from a different working directory makes `pydantic-settings` miss `.env` and use the hardcoded fallback DB. Either `cd` to the backend root first OR have the script load `.env` itself with a small text parser (see Environment config section).
- **Returning soft-deleted records in list-shape responses** — soft delete is enforced at the *primary fetch* (e.g. `Project.is_deleted == False`), but several list endpoints serialize nested arrays (`team_members`, `attachments`, etc.) from the relationship without filtering by status. Past offender: `GET /api/team/projects` was including team members with `status='removed'` in each project's `team_members` array — so removed members kept appearing in row avatars and `team_count` even though the side-panel "Assigned Team" filter hid them. After a successful "Remove" this looked like the action had failed. **When serializing a relationship array in a list endpoint, filter out tombstoned rows** (`status='removed'`, `is_deleted=True`, etc.) before iterating — match what the detail view shows.
- **Bare `npm install` (without `--legacy-peer-deps`)** — fails with `ERESOLVE` because `@vitejs/plugin-vue@^5` lists Vite 5/6 as peer but the project declares Vite 8. Always pass `--legacy-peer-deps` for installs in this repo until plugin-vue is bumped to v6+.
- **Targeting a globally-styled class without `!important`** — [src/styles/theme-light-rescue.css](src/styles/theme-light-rescue.css) applies broad pattern overrides to generic class names like `.table-header`, `.glass-card`, `.modal-*`. If a specific page needs a *different* light-mode background for one of these classes (e.g., transparent instead of the rescue's faint overlay), the page's scoped CSS specificity ties with the rescue rule (both at 0,3,0 after the data-v attribute) and the cascade order is unreliable. Use `!important` only on the conflicting property and add a one-line comment naming the rescue rule that's being defeated — example: [DocumentDrivePage.vue](src/views/documents/DocumentDrivePage.vue) `.table-header` override.

---

## Known Production-Hardening Gaps

Track these before any public or production deployment:

1. **`StaticPool` = single connection** — replace with `NullPool` or a standard `QueuePool` once Python 3.14 SQLAlchemy stability is confirmed.
2. **`SECRET_KEY` default** — `config.py` ships with `"your-secret-key-here-change-this-in-production"`. Must be overridden via `.env` before production.
3. **No rate limiting** — `/api/auth/login` is open to brute force. Add `slowapi` or equivalent before public exposure.
4. **No structured logging** — errors go to `crash.log` (plain text). Add `structlog` or `loguru` with JSON output for production observability.
5. **CORS allowlist is hardcoded in source** — `ALLOWED_ORIGINS` in `main.py` already includes `crm.fourreck.com` + dev ports. New staging/production frontends require a code change and redeploy, not a config flip.
6. **JWT `ACCESS_TOKEN_EXPIRE_MINUTES = 1440`** — 24-hour tokens with no refresh mechanism. Implement a refresh token flow before production.
7. **No file upload validation** — `uploads.py` currently accepts any file. Add MIME sniffing and size limits.
8. **`datetime.utcnow()` in older models** — deprecated in Python 3.12+. Migrate to `datetime.now(timezone.utc)` in `Project`, `Milestone`, `DprDocument`, and similar older models.
9. **`/health` is shallow** — the route exists but only returns `{"status": "healthy"}`. It does not ping the DB, so a dead PostgreSQL will still report healthy. Wire a DB ping in before relying on it for load-balancer routing.
10. **No test project** — first test added should target the auth flow and ownership check paths as they are the highest-risk surfaces.
11. **Ad-hoc backend scripts** — `add_govt_project_columns.py`, `drop_cost_center_budget_type.py`, `seed_archive_data.py`, `ensure_admin.py`, `tasks_cron.py` sit at the backend root and bypass Alembic. Migrate the schema-changing ones into proper revisions before production; keep operational scripts (`ensure_admin`, `tasks_cron`) separate.


# Design System

## Aesthetic Direction
Ultra-modern dark tech aesthetic. Think: Apple Vision Pro meets brutalist editorial.
NEVER use generic layouts. Every page must have a unique visual identity.