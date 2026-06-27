// Shared self-service greeting — anchors "Good morning / afternoon / evening" to
// the EMPLOYEE'S WORK-LOCATION timezone, never the viewer's device clock.
//
// Before this, every self-service page computed `new Date().getHours()` (the
// browser's local time) with a `h < 12 → morning` boundary, so an India-based
// employee saw "Good morning" at 00:11 (past midnight) and any employee opening
// the portal from a device in another timezone got a greeting for the wrong place.
// The work-location timezone (IANA, e.g. "Asia/Kolkata") comes from /auth/me
// (resolved server-side from Employee → WorkLocation).
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

// Session-shared resolved timezone. Keyed by the active bearer token so a
// different signed-in user never inherits the previous user's timezone — and we
// only fall back to the device clock until /auth/me resolves.
const tzRef = ref('')
let memoToken = null
let inFlight = null

const currentToken = () => authHeader().Authorization || ''

function resolveWorkTz() {
  const token = currentToken()
  if (!token) { tzRef.value = ''; return Promise.resolve('') }
  if (memoToken === token && inFlight) return inFlight
  memoToken = token
  inFlight = axios.get(`${API}/auth/me`, { headers: authHeader() })
    .then(({ data }) => {
      if (currentToken() !== token) return tzRef.value   // user switched mid-flight — ignore
      tzRef.value = data?.work_location_timezone || ''
      return tzRef.value
    })
    .catch(() => tzRef.value)
  return inFlight
}

// Hour (0–23) right now in the given IANA timezone; device-local if tz is empty/invalid.
export function hourInTz(tz) {
  if (tz) {
    try {
      const s = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date())
      const h = parseInt(s, 10)
      if (Number.isFinite(h)) return h % 24   // some engines emit "24" for midnight
    } catch { /* invalid tz string → device-local */ }
  }
  return new Date().getHours()
}

export function greetingForHour(h) {
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'   // 17:00–04:59 — never "morning" at/after midnight
}

/**
 * @returns {{ greeting: ComputedRef<string>, tzHour: ComputedRef<number>, workTz: Ref<string> }}
 *   greeting — standard "Good morning/afternoon/evening" in the work-location tz
 *   tzHour   — current hour (0–23) in the work-location tz, for pages with custom wording
 *   workTz   — the resolved IANA timezone (empty until /auth/me responds)
 */
export function useGreeting() {
  const nowTick = ref(0)
  let timer = null
  onMounted(() => {
    resolveWorkTz()
    // re-evaluate each minute so the greeting flips at an hour boundary while the page stays open
    timer = setInterval(() => { nowTick.value++ }, 60000)
  })
  onUnmounted(() => { if (timer) { clearInterval(timer); timer = null } })

  const tzHour = computed(() => { void nowTick.value; return hourInTz(tzRef.value) })
  const greeting = computed(() => greetingForHour(tzHour.value))
  return { greeting, tzHour, workTz: tzRef }
}
