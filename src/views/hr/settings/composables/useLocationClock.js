// useLocationClock — the time/geography engine behind the Work Locations
// "Meridian" redesign. Turns a free-text IANA timezone string into a LIVE local
// clock, a UTC offset, a map longitude and a day/night verdict — so the atlas
// instrument and every location card can tick in real time off one shared
// heartbeat (a single 1s interval, ref-counted, never N timers).
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ── Shared 1-second heartbeat ────────────────────────────────────────────────
const _now = ref(Date.now())
let _timer = null
let _subs = 0
function _start() {
  if (_timer) return
  _timer = setInterval(() => { _now.value = Date.now() }, 1000)
}
function _stop() {
  _subs = Math.max(0, _subs - 1)
  if (_subs === 0 && _timer) { clearInterval(_timer); _timer = null }
}
/** Reactive `now` (ms) ticking once a second while any consumer is mounted. */
export function useNow() {
  onMounted(() => { _subs += 1; _start() })
  onBeforeUnmount(_stop)
  return _now
}

const pad = (n) => String(n).padStart(2, '0')

// ── Timezone resolution (DST-correct, no library) ────────────────────────────
/** Local wall-clock parts for an IANA tz at instant ts. null if tz invalid. */
export function tzLocal(tz, ts = Date.now()) {
  if (!tz) return null
  try {
    const d = new Date(ts)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short',
    }).formatToParts(d)
    const get = (t) => parts.find((p) => p.type === t)?.value
    let hh = parseInt(get('hour'), 10)
    if (hh === 24) hh = 0                 // some engines emit "24" at midnight
    const mm = parseInt(get('minute'), 10)
    const ss = parseInt(get('second'), 10)
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null
    return { hh, mm, ss: Number.isNaN(ss) ? 0 : ss, minutes: hh * 60 + mm,
      label: `${pad(hh)}:${pad(mm)}`, weekday: (get('weekday') || '').toUpperCase().slice(0, 3) }
  } catch { return null }
}

/** UTC offset (minutes) for an IANA tz at instant ts. DST-correct. null if invalid. */
export function tzOffsetMinutes(tz, ts = Date.now()) {
  if (!tz) return null
  try {
    const d = new Date(ts)
    // Reinterpret the tz wall-clock as if it were UTC, diff against real UTC.
    const asTz = new Date(d.toLocaleString('en-US', { timeZone: tz }))
    const asUtc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
    return Math.round((asTz - asUtc) / 60000)
  } catch { return null }
}

/** Pretty "GMT+5:30" / "GMT-4" / "GMT" label. */
export function offsetLabel(offMin) {
  if (offMin == null) return ''
  if (offMin === 0) return 'GMT'
  const sign = offMin < 0 ? '-' : '+'
  const a = Math.abs(offMin)
  const h = Math.floor(a / 60), m = a % 60
  return `GMT${sign}${h}${m ? ':' + pad(m) : ''}`
}

const wrap180 = (lon) => { let x = ((lon + 180) % 360 + 360) % 360 - 180; return x }
/** Approximate map longitude (deg, -180..180) from a UTC offset. */
export const lonFromOffset = (offMin) => (offMin == null ? null : wrap180((offMin / 60) * 15))
/** 0..100 horizontal % position on a -180..180 world band. */
export const lonToPct = (lon) => ((wrap180(lon) + 180) / 360) * 100

// ── Sun / day-night model ────────────────────────────────────────────────────
/** Sub-solar longitude (deg) — where it is local solar noon right now. */
export function sunLongitude(ts = Date.now()) {
  const d = new Date(ts)
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
  return wrap180((12 - utcHours) * 15)
}

/**
 * Day zones (lit half of the world, 180° wide) as up to two {left,width} %
 * spans on a 0..100 band — handles antimeridian wrap so the terminator is
 * continuous. The rest of the band is night.
 */
export function dayZones(ts = Date.now()) {
  const noon = sunLongitude(ts)
  let left = noon - 90, right = noon + 90
  const zones = []
  const push = (a, b) => { if (b > a) zones.push({ left: ((a + 180) / 360) * 100, width: ((b - a) / 360) * 100 }) }
  if (left < -180) { push(-180, right); push(left + 360, 180) }
  else if (right > 180) { push(left, 180); push(-180, right - 360) }
  else push(left, right)
  return { zones, noonPct: lonToPct(noon) }
}

export const isBusinessHours = (min) => min != null && min >= 9 * 60 && min < 18 * 60
export const isDaylight = (hh) => hh != null && hh >= 6 && hh < 18

// ── Weekly-off pattern helpers ───────────────────────────────────────────────
export const WEEKDAYS = [
  { code: 'MON', short: 'M', full: 'Monday' },
  { code: 'TUE', short: 'T', full: 'Tuesday' },
  { code: 'WED', short: 'W', full: 'Wednesday' },
  { code: 'THU', short: 'T', full: 'Thursday' },
  { code: 'FRI', short: 'F', full: 'Friday' },
  { code: 'SAT', short: 'S', full: 'Saturday' },
  { code: 'SUN', short: 'S', full: 'Sunday' },
]

/** Normalise a weekly_off_pattern JSONB into { days:[], alternate_saturdays:bool }. */
export function normalizeWeeklyOff(p) {
  const days = Array.isArray(p?.days) ? p.days.map((d) => String(d).toUpperCase().slice(0, 3)) : []
  return { days, alternate_saturdays: !!p?.alternate_saturdays }
}

/** Human one-liner for a weekly-off pattern. */
export function weeklyOffSummary(p) {
  const { days, alternate_saturdays } = normalizeWeeklyOff(p)
  if (!days.length && !alternate_saturdays) return 'No weekly-off set'
  const names = WEEKDAYS.filter((w) => days.includes(w.code)).map((w) => w.full.slice(0, 3))
  let out = names.length ? names.join(' · ') + ' off' : ''
  if (alternate_saturdays) out = out ? `${out} · alt Sat` : 'Alternate Saturdays off'
  return out
}

// ── Curated timezone quick-picks (label, IANA id) ────────────────────────────
export const TZ_PRESETS = [
  { id: 'Asia/Kolkata', label: 'India · IST' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Asia/Manila', label: 'Manila' },
  { id: 'Asia/Karachi', label: 'Karachi' },
  { id: 'Asia/Dhaka', label: 'Dhaka' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Berlin', label: 'Berlin' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'UTC', label: 'UTC' },
]

/** Best-effort: is this a timezone the runtime understands? */
export function isValidTz(tz) {
  if (!tz) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}
