// Single source of truth for the backend URL.
//
// Override at build/dev time with VITE_API_URL in .env, e.g.:
//   VITE_API_URL=http://216.48.179.252:8000
//
// Falls back to localhost:8000 to match the Vite proxy target in vite.config.js.
//
// Usage:
//   import { API, API_BASE, authHeader } from '@/utils/api'
//   axios.get(`${API}/projects/`, { headers: authHeader() })
//   imageUrl = `${API_BASE}${doc.file_url}`
// Resolution order:
//   1. VITE_API_URL (build/dev override from .env) — wins if set.
//   2. Otherwise the per-mode default below.
//
// The production default MUST be the hosted backend, not localhost.
// `.env*` is gitignored, so the DigitalOcean build never sees a local .env —
// previously the build fell back to `http://localhost:8000`, which made the
// deployed crm.fourreck.com bundle tell every visitor's browser to call
// THEIR OWN machine. It only worked for whoever happened to be running the
// backend locally (Chrome exempts http://localhost from mixed-content
// blocking); every other laptop/phone got connection-refused and couldn't log in.
//
// Keying the fallback on import.meta.env.PROD keeps `npm run dev` on localhost
// while making production builds correct by default, with VITE_API_URL still
// available as an explicit override for staging/other backends.
const DEFAULT_API_BASE = import.meta.env.PROD
  ? 'https://apifc.fourreck.com'
  : 'http://localhost:8000'
export const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_BASE
export const API = `${API_BASE}/api`

/**
 * Path-aware Authorization header picker.
 *
 * Both panels (/user, /admin) can be logged in simultaneously with
 * different accounts. Older code did `admin_token || user_token`, which
 * silently sent the admin's token even when a /user/* page made the
 * request — so the API resolved the request as the wrong identity (e.g.
 * the admin had no Employee row, so /hr/leaves/me/balance returned
 * "unlinked" while the actual user-panel account was correctly linked).
 *
 * Now we look at the current URL prefix and prefer the token belonging
 * to that panel, falling back to the other only if the preferred one is
 * absent. This keeps single-panel sessions working unchanged.
 */
export function authHeader() {
  const isUserPanel = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/user')
  const primary = isUserPanel ? 'user_token' : 'admin_token'
  const fallback = isUserPanel ? 'admin_token' : 'user_token'
  const t = (typeof localStorage !== 'undefined')
    ? (localStorage.getItem(primary) || localStorage.getItem(fallback))
    : null
  return t ? { Authorization: `Bearer ${t}` } : {}
}
