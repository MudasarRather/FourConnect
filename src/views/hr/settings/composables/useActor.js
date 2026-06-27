// useActor — the currently signed-in admin/HR user, for "who is making this
// change" attribution inside Settings modals. Hydrates instantly from the
// `user` localStorage key (set at login) and refreshes from /api/auth/me once
// per session so older sessions that predate that key still resolve.
import { ref } from 'vue'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const actor = ref(null)
let started = false

export function useActor() {
  if (!started) {
    started = true
    try {
      const raw = localStorage.getItem('user')
      if (raw) actor.value = JSON.parse(raw)
    } catch { /* ignore malformed cache */ }
    axios.get(`${API}/auth/me`, { headers: authHeader() })
      .then((r) => {
        if (r?.data) {
          actor.value = r.data
          try { localStorage.setItem('user', JSON.stringify(r.data)) } catch { /* quota */ }
        }
      })
      .catch(() => { /* stay with cached value */ })
  }
  return actor
}

/** Display name for a user object, falling back gracefully. */
export function actorName(u) {
  if (!u) return 'You'
  return u.full_name || u.name || u.username || (u.email ? u.email.split('@')[0] : 'You')
}

/** Two-letter initials for the avatar chip. */
export function actorInitials(u) {
  const n = actorName(u)
  const parts = String(n).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

/** Human role label. */
export function actorRole(u) {
  if (!u) return 'HR Administrator'
  if (u.is_superuser) return 'Super Administrator'
  return u.designation || u.role || (u.organisation ? `${u.organisation} · HR` : 'HR Administrator')
}
