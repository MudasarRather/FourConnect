import axios from 'axios'
import { API } from '@/utils/api'

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ── Dashboard / overview ───────────────────────────────────────────────
export async function fetchAttendanceStats(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/dashboard/stats`, { headers: authHeader(), params })
  return data
}
export async function fetchByDepartment(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/dashboard/by-department`, { headers: authHeader(), params })
  return data
}
export async function fetchHeatmap(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/heatmap`, { headers: authHeader(), params })
  return data
}

// ── Daily attendance ───────────────────────────────────────────────────
export async function fetchTodayAttendance(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/today`, { headers: authHeader(), params })
  return data
}
export async function recomputeAttendance(employee_id, on_date) {
  const { data } = await axios.post(`${API}/hr/attendance/recompute`,
    {}, { headers: authHeader(), params: { employee_id, on_date } })
  return data
}
// Waive (or un-waive) a LATE mark so it no longer counts toward the monthly
// late-accumulation penalty. The punch + LATE status stay; only the penalty
// is reconciled (server recomputes the month).
export async function condoneLate(employee_id, on_date, condoned = true) {
  const { data } = await axios.post(`${API}/hr/attendance/condone-late`,
    {}, { headers: authHeader(), params: { employee_id, on_date, condoned } })
  return data
}
export async function patchAttendance(id, payload, force = false) {
  const { data } = await axios.patch(`${API}/hr/attendance/${id}`, payload,
    { headers: authHeader(), params: { force } })
  return data
}
export async function markAbsentees(on_date) {
  const { data } = await axios.post(`${API}/hr/attendance/mark-absentees`,
    {}, { headers: authHeader(), params: on_date ? { on_date } : {} })
  return data
}

// Admin punch-on-behalf — appends a punch for any employee (manual override).
// Pass `on_date` (YYYY-MM-DD) when closing a past day; the backend will route
// through the orphan-finalizer instead of trying to add a punch at "now".
export async function adminPunchOnBehalf(employee_id, punch_type, on_date = null) {
  const params = { employee_id }
  if (on_date) params.on_date = on_date
  const { data } = await axios.post(`${API}/hr/attendance/admin-punch`,
    { punch_type, source: 'MANUAL' },
    { headers: authHeader(), params })
  return data
}

// Admin break-anomaly fetcher — employees whose total break time exceeded
// their shift cap on `on_date` (defaults to today). Returns { summary, items }.
export async function fetchBreakAnomalies(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/break-anomalies`,
    { headers: authHeader(), params })
  return data
}
export async function lockDay(on_date) {
  const { data } = await axios.post(`${API}/hr/attendance/lock-day`,
    {}, { headers: authHeader(), params: on_date ? { on_date } : {} })
  return data
}

// ── Corrections ────────────────────────────────────────────────────────
export async function fetchCorrections(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/corrections/`, { headers: authHeader(), params })
  return data
}
export async function decideCorrection(id, decision, notes = '', level = 'HR', force = false) {
  const verb = decision === 'APPROVED' ? 'approve' : 'reject'
  const { data } = await axios.patch(`${API}/hr/attendance/corrections/${id}/${verb}`,
    { decision, notes, level, force }, { headers: authHeader() })
  return data
}

// ── Shifts ─────────────────────────────────────────────────────────────
export async function fetchShifts(params = {}) {
  const { data } = await axios.get(`${API}/hr/shifts/`, { headers: authHeader(), params })
  return data
}
export async function createShift(payload) {
  const { data } = await axios.post(`${API}/hr/shifts/`, payload, { headers: authHeader() })
  return data
}
export async function patchShift(id, payload) {
  const { data } = await axios.patch(`${API}/hr/shifts/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteShift(id, reason = '') {
  await axios.delete(`${API}/hr/shifts/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}
export async function fetchShiftAssignments(params = {}) {
  const { data } = await axios.get(`${API}/hr/shifts/assignments`, { headers: authHeader(), params })
  return data
}
export async function assignShift(shiftId, body) {
  const { data } = await axios.post(`${API}/hr/shifts/${shiftId}/assign`, body, { headers: authHeader() })
  return data
}
export async function unassignShift(assignmentId, reason = '') {
  await axios.delete(`${API}/hr/shifts/assignments/${assignmentId}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}

// ── WFH ────────────────────────────────────────────────────────────────
export async function fetchWfhRequests(params = {}) {
  const { data } = await axios.get(`${API}/hr/wfh/`, { headers: authHeader(), params })
  return data
}
export async function decideWfh(id, decision, notes = '') {
  const verb = decision === 'APPROVED' ? 'approve' : 'reject'
  const { data } = await axios.patch(`${API}/hr/wfh/${id}/${verb}`, { decision, notes }, { headers: authHeader() })
  return data
}

// ── Half-Day requests ──────────────────────────────────────────────────
export async function fetchHalfDayRequests(params = {}) {
  const { data } = await axios.get(`${API}/hr/half-day/`, { headers: authHeader(), params })
  return data
}
export async function fetchHalfDayStats() {
  const { data } = await axios.get(`${API}/hr/half-day/stats`, { headers: authHeader() })
  return data
}
export async function fetchMyHalfDayRequests() {
  const { data } = await axios.get(`${API}/hr/half-day/me`, { headers: authHeader() })
  return data
}
export async function createMyHalfDay(payload) {
  const { data } = await axios.post(`${API}/hr/half-day/me`, payload, { headers: authHeader() })
  return data
}
export async function cancelMyHalfDay(id) {
  await axios.delete(`${API}/hr/half-day/me/${id}`, { headers: authHeader() })
}
export async function adminCreateHalfDay(payload) {
  const { data } = await axios.post(`${API}/hr/half-day/`, payload, { headers: authHeader() })
  return data
}
export async function decideHalfDay(id, decision, notes = '') {
  const verb = decision === 'APPROVED' ? 'approve' : 'reject'
  const { data } = await axios.patch(`${API}/hr/half-day/${id}/${verb}`,
    { decision, notes }, { headers: authHeader() })
  return data
}
export async function adminDeleteHalfDay(id, reason = '') {
  await axios.delete(`${API}/hr/half-day/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}

// ── Logs ───────────────────────────────────────────────────────────────
export async function fetchAttendanceLogs(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/logs/`, { headers: authHeader(), params })
  return data
}

// ── Overtime ───────────────────────────────────────────────────────────
export async function fetchOvertime(params = {}) {
  const { data } = await axios.get(`${API}/hr/overtime/`, { headers: authHeader(), params })
  return data
}
export async function createOvertime(payload) {
  const { data } = await axios.post(`${API}/hr/overtime/`, payload, { headers: authHeader() })
  return data
}
export async function decideOvertime(id, decision, notes = '') {
  const verb = decision === 'APPROVED' ? 'approve' : 'reject'
  const { data } = await axios.patch(`${API}/hr/overtime/${id}/${verb}`, { decision, notes }, { headers: authHeader() })
  return data
}

// ── Holidays ───────────────────────────────────────────────────────────
export async function fetchHolidays(params = {}) {
  const { data } = await axios.get(`${API}/hr/holidays/`, { headers: authHeader(), params })
  return data
}
export async function createHoliday(payload) {
  const { data } = await axios.post(`${API}/hr/holidays/`, payload, { headers: authHeader() })
  return data
}
export async function deleteHoliday(id, reason = '') {
  await axios.delete(`${API}/hr/holidays/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}
export async function bulkDeleteHolidays({ year, holiday_type } = {}) {
  const params = {}
  if (year != null) params.year = year
  if (holiday_type) params.holiday_type = holiday_type
  const { data } = await axios.delete(`${API}/hr/holidays/`, { headers: authHeader(), params })
  return data
}
export async function updateHoliday(id, payload) {
  const { data } = await axios.patch(`${API}/hr/holidays/${id}`, payload, { headers: authHeader() })
  return data
}
export async function activateHoliday(id) {
  const { data } = await axios.post(`${API}/hr/holidays/${id}/activate`, null, { headers: authHeader() })
  return data
}
export async function bulkActivateHolidays({ year, holiday_type } = {}) {
  const params = {}
  if (year != null) params.year = year
  if (holiday_type) params.holiday_type = holiday_type
  const { data } = await axios.post(`${API}/hr/holidays/bulk-activate`, null, { headers: authHeader(), params })
  return data
}

// ── Policies ───────────────────────────────────────────────────────────
export async function fetchPolicies(params = {}) {
  const { data } = await axios.get(`${API}/hr/attendance/policies/`, { headers: authHeader(), params })
  return data
}
export async function createPolicy(payload) {
  const { data } = await axios.post(`${API}/hr/attendance/policies/`, payload, { headers: authHeader() })
  return data
}
export async function deletePolicy(id, reason = '') {
  await axios.delete(`${API}/hr/attendance/policies/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}

// ── Geo-Fences ─────────────────────────────────────────────────────────
export async function fetchGeoFences(params = {}) {
  const { data } = await axios.get(`${API}/hr/geo-fences/`, { headers: authHeader(), params })
  return data
}
export async function createGeoFence(payload) {
  const { data } = await axios.post(`${API}/hr/geo-fences/`, payload, { headers: authHeader() })
  return data
}
export async function deleteGeoFence(id, reason = '') {
  await axios.delete(`${API}/hr/geo-fences/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}

// Biometric device delete (was missing — composable only had create/fetch/sync).
export async function deleteBiometricDevice(id, reason = '') {
  await axios.delete(`${API}/hr/biometric/${id}`, {
    headers: authHeader(),
    params: reason ? { reason } : {},
  })
}

// Reverse geocode helper — wraps OpenStreetMap Nominatim (no key needed).
// Used by the Geo section to resolve a friendly address from lat/lng.
export async function reverseGeocodePoint(lat, lng) {
  if (lat == null || lng == null) return null
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const d = await res.json()
    const a = d.address || {}
    return {
      label: d.display_name || `${lat}, ${lng}`,
      short: a.suburb || a.neighbourhood || a.village || a.town || a.city || 'Unknown area',
      city: a.city || a.town || a.village || '',
      region: a.state || '',
      country: a.country || '',
      postcode: a.postcode || '',
    }
  } catch {
    return null
  }
}

// ── Biometric ──────────────────────────────────────────────────────────
export async function fetchBiometricDevices() {
  const { data } = await axios.get(`${API}/hr/biometric/`, { headers: authHeader() })
  return data
}
export async function createBiometricDevice(payload) {
  const { data } = await axios.post(`${API}/hr/biometric/`, payload, { headers: authHeader() })
  return data
}
export async function syncBiometricDevices(device_id = null) {
  const { data } = await axios.post(`${API}/hr/biometric/sync`,
    {}, { headers: authHeader(), params: device_id ? { device_id } : {} })
  return data
}
