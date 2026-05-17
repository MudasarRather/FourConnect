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
- **API contract stability** — request and response shapes are defined in `backend/app/schemas/`. Never change a field name or remove a field from a schema that the frontend already consumes. Add fields; do not rename or drop without a frontend migration plan.
- **Validation** — Pydantic model validators are the first line. Cross-field business rules (e.g., `end_date >= start_date`, `reversal_amount <= original_amount`) belong in the router handler or a dedicated validation helper, not in the model constructor.
- **Observability** — 500 errors are written to `backend/crash.log` by the global exception handler in `app/main.py`. For new routers, do not swallow exceptions into silent 200 responses; let them propagate to the global handler or raise `HTTPException`.
- **Maintainability** — routers stay readable. If a handler exceeds ~50 lines of business logic, extract it to a helper function or module in `backend/app/utils/`. Schemas, models, and routers are separate concerns.

If a request would force a shortcut that breaks any of the above, flag it before proceeding. **Fewer features done correctly** beats many features done sloppily.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend runtime** | Vue 3 (`<script setup>` SFCs) + Vite 5 |
| **Frontend routing** | Vue Router 4 |
| **HTTP client** | Axios |
| **Charts** | Chart.js 4 + vue-chartjs |
| **Icons** | lucide-vue-next |
| **Toast notifications** | vue-toastification (globally installed) |
| **PDF export** | jspdf + jspdf-autotable |
| **Utility** | lodash |
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
- Node.js ≥ 18 (for frontend)
- Python 3.14 at `C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe`
- PostgreSQL running on port 5432 with database `fourreck_db`

### Start frontend (from repo root)
```powershell
npm install           # first time only
npm run dev           # Vite dev server on http://localhost:5173
npm run build         # production build → dist/
npm run preview       # preview the production build
```

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
Copy or create `backend/.env` to override defaults from [backend/app/config.py](backend/app/config.py):
```
DATABASE_URL=postgresql://postgres:yourpassword@127.0.0.1:5432/fourreck_db
SECRET_KEY=change-this-in-production
```
Settings are loaded via `pydantic-settings` from `backend/.env` with fallback to the hardcoded defaults in `config.py`.

### Tests
There is **no organised pytest suite**. Both the repo root and `backend/` contain many `test_*.py`, `debug_*.py`, `verify_*.py`, and `check_*.py` files. These are **ad-hoc probes against a live dev backend**, not a pytest run. Do not attempt `pytest` — it will fail. Run individual scripts with:
```powershell
& "C:\Users\91700\AppData\Local\Programs\Python\Python314\python.exe" backend\check_db.py
```

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

**Session timeout**: `useSessionTimeout` ([src/composables/useSessionTimeout.js](src/composables/useSessionTimeout.js)) is initialised in `DashboardLayout` and auto-logs out after **10 minutes of inactivity** by watching `mousedown`, `keydown`, `scroll`, `touchstart`. On timeout it clears the correct token (admin vs user) based on the current path prefix.

### Frontend: Component organisation

```
src/
├── App.vue                  # Root; mounts router-view + ToastContainer
├── main.js                  # App bootstrap; installs router + vue-toastification
├── router/index.js          # All routes + navigation guard
├── components/
│   ├── dashboard/           # DashboardLayout, TopNavBar, PlaceholderPage
│   ├── LoginPage.vue        # User login
│   ├── SignupPage.vue       # User registration
│   ├── AdminLoginPage.vue   # Admin login
│   ├── common/              # Shared reusable UI atoms
│   ├── ui/                  # ToastContainer + other UI primitives
│   └── [feature]/           # Feature-scoped components (tasks, milestones, expenses, etc.)
├── views/                   # Page-level route components
│   └── documents/           # SLA, Handover, DPR wizard/dashboard pages
├── composables/
│   ├── useSessionTimeout.js # Auto-logout on inactivity
│   └── useToast.js          # Lightweight custom toast (superseded — prefer vue-toastification)
└── utils/
    ├── dprPdfGenerator.js
    ├── expenseReceiptGenerator.js
    ├── handoverPdfGenerator.js
    ├── receiptGenerator.js
    └── slaPdfGenerator.js
```

**Toast notification system**: There are **two toast mechanisms** in the codebase. `vue-toastification` is installed globally and is the canonical approach. The custom `useToast` composable in `src/composables/useToast.js` is a legacy pattern — prefer `vue-toastification` for any new code.

### Frontend: PDF generation

PDF utilities in `src/utils/` use `jspdf` + `jspdf-autotable` to generate client-side PDFs for DPR, SLA, handover documents, and expense receipts. Each utility exports a function that accepts data and returns a PDF blob or triggers a download. Call these from the component; do not mix PDF generation logic into router handlers.

### Backend: Entry point and request flow

[backend/app/main.py](backend/app/main.py) is the FastAPI entry point:

1. Loads settings via `get_settings()` (cached `@lru_cache`).
2. Calls `Base.metadata.create_all(bind=engine)` on startup — **new models auto-create their tables without requiring an Alembic migration run**. Alembic is used for column changes, index additions, and data migrations.
3. Registers `CORSMiddleware` for `localhost:5173` and `localhost:5174` only.
4. Mounts 18 routers, all under the `/api` prefix.
5. Mounts `/uploads` and `/storage` as `StaticFiles` directories (auto-created on startup).
6. Global exception handler writes a `crash.log` and **manually re-injects CORS headers on 500 responses** — without this the browser suppresses the error detail. Do not remove those headers.

**Request path**: HTTP request → CORS middleware → router handler → `Depends(get_db)` + `Depends(get_current_user)` → SQLAlchemy query → response schema → JSON.

### Backend: Database engine quirk — StaticPool

[backend/app/database.py](backend/app/database.py) uses `poolclass=StaticPool`:

```python
engine = create_engine(settings.DATABASE_URL, poolclass=StaticPool)
```

This means **only one connection is maintained** (no connection pool). It was chosen for stability on Python 3.14. Be aware:
- Long-running requests block others.
- No automatic connection recycling.
- Do not add `pool_size` or `max_overflow` arguments — they are incompatible with `StaticPool`.

### Backend: Login bypasses SQLAlchemy — psycopg2 direct

The `POST /api/auth/login` handler in [backend/app/routers/auth.py](backend/app/routers/auth.py) deliberately skips SQLAlchemy and queries PostgreSQL directly via `psycopg2`. This workaround exists because SQLAlchemy was deadlocking on Python 3.14 under the `StaticPool`. The handler parses `DATABASE_URL` with a regex and falls back to hardcoded defaults:

```python
match = re.search(r'postgresql://(.*?):(.*?)@(.*?):(\d+)/(.*)', db_url)
```

If you change the `DATABASE_URL` format (e.g., to `postgresql+psycopg2://`), update both `config.py` and this regex.

### Backend: Password hashing — argon2

Despite `requirements.txt` listing `passlib[bcrypt]`, the active hashing scheme is **argon2**:

```python
# backend/app/utils/auth.py
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
```

All passwords in the database are argon2 hashes. Do not change the scheme — existing password hashes will fail verification.

### Backend: Authentication dependencies

[backend/app/utils/dependencies.py](backend/app/utils/dependencies.py) provides two FastAPI dependencies:

| Dependency | Use case |
|---|---|
| `get_current_user` | Any authenticated route; validates JWT, loads user, checks `is_active` |
| `get_current_superuser` | Admin-only routes; wraps `get_current_user` + checks `is_superuser` |

`auth.py` also defines a local `get_superadmin` inline dependency for the admin-specific endpoints in that file. These are equivalent — use `get_current_superuser` from `dependencies.py` in new routers.

### Backend: Models

All SQLAlchemy models live in [backend/app/models/](backend/app/models/) and inherit from `Base`. Primary keys are `UUID(as_uuid=True)` defaulting to `uuid.uuid4`.

**User model fields of note:**
- `is_superuser` — grants admin panel access
- `is_activated` — must be `True` for user panel access; set by admin generating an 8-digit `activation_code`
- `organisation` — the user's organisation string (used as the project default)

**Soft delete**: `Project.is_deleted (Boolean, default=False)`. Always filter `Project.is_deleted == False` in list and fetch queries. Check individual models for whether they implement `is_deleted` — it is not universal across all models today.

**Status patterns**: Use Python `str + enum.Enum` (e.g., `ExpenseStatus`, `TaskStatus`, `MilestoneStatus`) mapped to SQLAlchemy `Enum` columns. Enum values are lowercase strings stored in the DB. Backward-compatibility aliases (`OPEN = open`) exist on `TaskStatus` and `TaskPriority` — do not remove them.

**JSON columns**: `attachments`, `allocations`, `reviewers`, `watchers`, and similar array/object fields are stored as `JSON` (or `JSONB`). Validate structure in the Pydantic schema layer, not in the model.

### Backend: Schemas (Pydantic)

Request/response schemas live in [backend/app/schemas/](backend/app/schemas/), one file per resource. The pattern per resource:
- `<Model>Create` — required fields for creation
- `<Model>Update` — all optional, for PATCH-style updates
- `<Model>Response` — outbound shape, must have `model_config = ConfigDict(from_attributes=True)` to serialise ORM objects

Date/time fields in responses serialise as ISO 8601. The frontend sends and receives standard JSON — no custom converters are needed.

### Backend: Routers

Each router file in [backend/app/routers/](backend/app/routers/) follows this shape:

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

All routers are registered in `main.py` under `/api`. A new router **must** be both imported and included in `main.py`.

### Backend: Module map

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
| `uploads.py` | `/api/uploads` | Generic file upload endpoint |
| `dashboard.py` | `/api/dashboard` | Summary stats for dashboard home |
| `settings.py` | `/api/settings` | System settings (admin) |
| `admin_employees.py` | `/api/admin/employees` | `AllowedEmployee` whitelist management |

### Backend: File storage

Uploaded files land in `backend/uploads/` (served at `/uploads/<filename>`). Generated/stored documents go in `backend/storage/`. Both directories are auto-created on startup and mounted as `StaticFiles`. The frontend constructs full URLs by prepending the API base URL, e.g. `http://localhost:8000/uploads/filename.pdf`.

---

## Key Conventions

### Routing: always register under `/api`
The Vite proxy only forwards requests with the `/api` prefix to the backend. Every router must be mounted with `app.include_router(router, prefix="/api")` in `main.py`.

### CORS: hardcoded origin allowlist
Only `localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174` are allowed. If the dev server port changes, update the `allow_origins` list in `main.py`.

### `auto-create` vs Alembic
`Base.metadata.create_all()` runs on startup and creates tables for any new model class automatically. Use this for **new tables**. Use Alembic for **column additions, index changes, renames, or data migrations** on existing tables. Never delete a `versions/` file to "start fresh" — it will corrupt the migration graph.

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

### Axios base URL
The Vite proxy handles `/api/*` routing. Axios calls in the frontend use relative paths like `/api/projects/` — no `http://localhost:8000` prefix needed in development. Do not hardcode the backend URL.

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
- **Hardcoding `http://localhost:8000` in frontend code** — all API calls must use relative `/api/*` paths so the Vite proxy handles them.
- **Auto-creating admin users via API** — `is_superuser` can only be set directly in the database or via the `create_admin.py` / `ensure_admin.py` scripts in `backend/`.
- **Ignoring crash.log** — if the backend returns 500, check `backend/crash.log` before debugging in the source; the full traceback is written there.

---

## Known Production-Hardening Gaps

Track these before any public or production deployment:

1. **`StaticPool` = single connection** — replace with `NullPool` or a standard `QueuePool` once Python 3.14 SQLAlchemy stability is confirmed.
2. **`SECRET_KEY` default** — `config.py` ships with `"your-secret-key-here-change-this-in-production"`. Must be overridden via `.env` before production.
3. **No rate limiting** — `/api/auth/login` is open to brute force. Add `slowapi` or equivalent before public exposure.
4. **No structured logging** — errors go to `crash.log` (plain text). Add `structlog` or `loguru` with JSON output for production observability.
5. **CORS is localhost-only** — update `allow_origins` in `main.py` for production domain(s).
6. **JWT `ACCESS_TOKEN_EXPIRE_MINUTES = 1440`** — 24-hour tokens with no refresh mechanism. Implement a refresh token flow before production.
7. **No file upload validation** — `uploads.py` currently accepts any file. Add MIME sniffing and size limits.
8. **`datetime.utcnow()` in older models** — deprecated in Python 3.12+. Migrate to `datetime.now(timezone.utc)` in `Project`, `Milestone`, `DprDocument`, and similar older models.
9. **No `/health` endpoint** — add a health check route that pings the DB for load balancer use.
10. **No test project** — first test added should target the auth flow and ownership check paths as they are the highest-risk surfaces.
