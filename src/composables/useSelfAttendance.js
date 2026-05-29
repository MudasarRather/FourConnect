import axios from 'axios'
import { API } from '@/utils/api'

// User-side auth — uses user_token, NOT admin_token.
const authHeader = () => {
  const t = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function fetchTodayMine() {
  const { data } = await axios.get(`${API}/hr/attendance/me/today`, { headers: authHeader() })
  return data
}

export async function clockIn(payload = {}) {
  const { data } = await axios.post(`${API}/hr/attendance/me/clock-in`, payload, { headers: authHeader() })
  return data
}
export async function clockOut(payload = {}) {
  const { data } = await axios.post(`${API}/hr/attendance/me/clock-out`, payload, { headers: authHeader() })
  return data
}
export async function startBreak(payload = {}) {
  const { data } = await axios.post(`${API}/hr/attendance/me/break/start`, payload, { headers: authHeader() })
  return data
}
export async function endBreak(payload = {}) {
  const { data } = await axios.post(`${API}/hr/attendance/me/break/end`, payload, { headers: authHeader() })
  return data
}

export async function fetchMyHistory(days = 14) {
  const { data } = await axios.get(`${API}/hr/attendance/me/history`, { headers: authHeader(), params: { days } })
  return data
}
export async function fetchMyMonth(year, month) {
  const { data } = await axios.get(`${API}/hr/attendance/me/month`, { headers: authHeader(), params: { year, month } })
  return data
}
export async function fetchMyPunches(days = 7) {
  const { data } = await axios.get(`${API}/hr/attendance/me/punches`, { headers: authHeader(), params: { days } })
  return data
}

// Per-day detail report — rolled-up totals + raw punch tape + break segments.
// Powers the self-service Attendance Report drawer.
export async function fetchMyDayDetail(isoDate) {
  const { data } = await axios.get(`${API}/hr/attendance/me/day-detail`, {
    headers: authHeader(), params: { on_date: isoDate },
  })
  return data
}
export async function fetchMyShift() {
  const { data } = await axios.get(`${API}/hr/shifts/me/current`, { headers: authHeader() })
  return data
}

export async function createMyCorrection(payload) {
  const { data } = await axios.post(`${API}/hr/attendance/corrections/me`, payload, { headers: authHeader() })
  return data
}
export async function requestLatePunch(payload) {
  // payload: { reason: string }
  const { data } = await axios.post(`${API}/hr/attendance/me/request-late-punch`, payload, { headers: authHeader() })
  return data
}
export async function requestEarlyExit(payload) {
  // payload: { reason: string }
  const { data } = await axios.post(`${API}/hr/attendance/me/request-early-exit`, payload, { headers: authHeader() })
  return data
}
export async function fetchMyCorrections() {
  const { data } = await axios.get(`${API}/hr/attendance/corrections/me`, { headers: authHeader() })
  return data
}
export async function createMyWfh(payload) {
  const { data } = await axios.post(`${API}/hr/wfh/me`, payload, { headers: authHeader() })
  return data
}
export async function fetchMyWfh() {
  const { data } = await axios.get(`${API}/hr/wfh/me`, { headers: authHeader() })
  return data
}

// ── Half-day requests (self-service) ───────────────────────────────────
export async function createMyHalfDay(payload) {
  const { data } = await axios.post(`${API}/hr/half-day/me`, payload, { headers: authHeader() })
  return data
}
export async function fetchMyHalfDay() {
  const { data } = await axios.get(`${API}/hr/half-day/me`, { headers: authHeader() })
  return data
}
export async function cancelMyHalfDay(id) {
  await axios.delete(`${API}/hr/half-day/me/${id}`, { headers: authHeader() })
}

// ── Overtime requests (self-service) ───────────────────────────────────
// Submit / list / cancel my own OT requests. The same OvertimeRequest pool
// also receives auto-detected entries when daily_rollup notices a clock-out
// past shift-end (segment-aware, breaks excluded) — so the "My OT requests"
// list shows both pre-submitted AND auto-detected rows.
export async function createMyOvertime(payload) {
  // payload: { date: 'YYYY-MM-DD', ot_hours: number, ot_type: 'WEEKDAY'|'WEEKEND'|'HOLIDAY'|'EMERGENCY', reason: string }
  const { data } = await axios.post(`${API}/hr/overtime/me`, payload, { headers: authHeader() })
  return data
}
export async function fetchMyOvertime(params = {}) {
  const { data } = await axios.get(`${API}/hr/overtime/me`, { headers: authHeader(), params })
  return data
}
export async function cancelMyOvertime(id) {
  await axios.delete(`${API}/hr/overtime/me/${id}`, { headers: authHeader() })
}

// Active geo-fences visible to the current user.
// Used by the self-service attendance page to verify the user is inside
// an authorised punching zone before allowing clock-in.
export async function fetchActiveGeoFences() {
  const { data } = await axios.get(`${API}/hr/geo-fences/active`, { headers: authHeader() })
  return data
}

// User-accessible holiday calendar for the current year.
export async function fetchMyHolidays(year) {
  const y = year || new Date().getFullYear()
  const { data } = await axios.get(`${API}/hr/holidays/me`, { headers: authHeader(), params: { year: y } })
  return data
}

// Haversine distance in metres between two WGS-84 points.
export function haversineMeters(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Cheap, free reverse geocoder. Uses BigDataCloud's no-key endpoint as the
// primary (CORS-friendly, no key, generous limits) and falls back to OSM
// Nominatim if BDC ever 4xxs. Returns a normalised label object so the
// caller doesn't have to care about response shape.
const _geoCache = new Map() // key: "lat,lng" rounded to 4dp
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (_geoCache.has(key)) return _geoCache.get(key)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const d = await res.json()
      const parts = [d.locality, d.city, d.principalSubdivision, d.countryName].filter(Boolean)
      const out = {
        name: d.locality || d.city || d.principalSubdivision || 'Unknown area',
        full: parts.join(', ') || 'Location resolved',
        country: d.countryName || '',
        region: d.principalSubdivision || '',
        city: d.city || d.locality || '',
        postcode: d.postcode || '',
      }
      _geoCache.set(key, out)
      return out
    }
  } catch {}
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const d = await res.json()
      const a = d.address || {}
      const out = {
        name: a.suburb || a.neighbourhood || a.village || a.town || a.city || 'Unknown area',
        full: d.display_name || 'Location resolved',
        country: a.country || '',
        region: a.state || '',
        city: a.city || a.town || a.village || '',
        postcode: a.postcode || '',
      }
      _geoCache.set(key, out)
      return out
    }
  } catch {}
  return null
}
