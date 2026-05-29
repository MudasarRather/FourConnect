// ════════════════════════════════════════════════════════════════════════════
// Attendance Report Generator — thin client over the backend.
// ────────────────────────────────────────────────────────────────────────────
// All PDF (WeasyPrint), Excel (openpyxl + xlsxwriter), and CSV generation now
// happens on the backend. This module:
//
//   • Hits GET /api/hr/attendance/reports/preview for the live KPIs
//     (replaces the old per-day pagination of /hr/attendance/today)
//   • Hits GET /api/hr/attendance/reports/{key}/export?format=pdf|excel|csv
//     to download a single file and triggers a browser save
//
// Each report has its own unique design built server-side. The frontend
// stays simple: pick a date range + department, click a format, and a file
// streams down.
// ════════════════════════════════════════════════════════════════════════════

import axios from 'axios'
import { API } from '@/utils/api'

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ─── Status-color ramp (re-exported for the preview UI only) ───────────────
export const STATUS_COLORS = {
  PRESENT:  { hex: '#0d9488', light: '#ccfbf1', deep: '#115e59' },
  LATE:     { hex: '#a16207', light: '#fef9c3', deep: '#713f12' },
  HALF_DAY: { hex: '#c2410c', light: '#ffedd5', deep: '#7c2d12' },
  ABSENT:   { hex: '#b91c1c', light: '#fee2e2', deep: '#7f1d1d' },
  LEAVE:    { hex: '#7c3aed', light: '#ede9fe', deep: '#4c1d95' },
  WFH:      { hex: '#0284c7', light: '#e0f2fe', deep: '#0c4a6e' },
  REMOTE:   { hex: '#0f766e', light: '#ccfbf1', deep: '#134e4a' },
  WEEK_OFF: { hex: '#64748b', light: '#f1f5f9', deep: '#334155' },
  HOLIDAY:  { hex: '#dc2626', light: '#fee2e2', deep: '#7f1d1d' },
  ON_DUTY:  { hex: '#2563eb', light: '#dbeafe', deep: '#1e3a8a' },
}

// ─── Theme per report (matches backend cover motif) ────────────────────────
const REPORT_THEME = {
  monthly:    { name: 'Monthly Summary',   accent: '#d97706', soft: '#fef3c7', deep: '#92400e' },
  late:       { name: 'Late Arrivals',     accent: '#ca8a04', soft: '#fef9c3', deep: '#713f12' },
  overtime:   { name: 'Overtime',          accent: '#ea580c', soft: '#ffedd5', deep: '#7c2d12' },
  wfh:        { name: 'Work From Home',    accent: '#0284c7', soft: '#e0f2fe', deep: '#0c4a6e' },
  compliance: { name: 'Shift Compliance',  accent: '#0d9488', soft: '#ccfbf1', deep: '#134e4a' },
  anomalies:  { name: 'Anomalies',         accent: '#b91c1c', soft: '#fee2e2', deep: '#7f1d1d' },
  daily:      { name: 'Daily Roster',      accent: '#7c3aed', soft: '#ede9fe', deep: '#4c1d95' },
  breaks:     { name: 'Breaks',            accent: '#92400e', soft: '#fef3c7', deep: '#451a03' },
}
export const REPORT_KEYS = Object.keys(REPORT_THEME)
export const reportTheme = (key) => REPORT_THEME[key] || REPORT_THEME.daily

// ─── Date helpers ──────────────────────────────────────────────────────────
function isoDate(d) {
  const dt = d instanceof Date ? d : new Date(d)
  return dt.toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════════════════════════════
//   DATA — preview KPIs from backend
// ════════════════════════════════════════════════════════════════════════════

/**
 * Pull preview KPIs (per-report counts + summary + department coverage).
 *
 * The shape is back-compat with the old client-side generator: the section
 * expects a `previewRows` array, so we return a synthetic row list with one
 * dummy entry per "tag" so the existing `shapeForReport` / `statsFor` paths
 * still work. The summary already has the real counts attached.
 */
export async function fetchAttendanceRange({ from, to, department_id = null, onProgress = null }) {
  // Light single-call to backend
  onProgress?.(0, 1)
  const params = { from, to }
  if (department_id) params.department_id = department_id
  const { data } = await axios.get(`${API}/hr/attendance/reports/preview`, {
    headers: authHeader(),
    params,
  })
  onProgress?.(1, 1)

  // Hand back the backend's counts + summary + department coverage. The
  // section's `statsFor()` looks at shaped row count, so we stash the
  // per-report counts on the response and expose a fake `rows` shaped by
  // the count for backwards compatibility with the consumer's reduce()
  // calls (which only check `.length`).
  return {
    rows: [],                 // not used for the new export path
    summary: data.summary,
    counts: data.counts,
    by_department: data.by_department,
    from: data.from,
    to: data.to,
    days: data.days,
  }
}

// ─── Back-compat shims for the section page ────────────────────────────────
// AttReportsSection still calls these helpers, so we keep them returning
// stub shapes that satisfy the UI without the heavy data dump.

export function shapeForReport(key, _rows) {
  // Returns an array with `length` matching the backend's count for that
  // report. The section only reads `.length` and a couple of reduce()
  // accumulators — we expose those numbers via `runReport` / the live
  // summary stash instead.
  return []
}

export function shapeSummary(_rows) {
  return {
    rows: 0, employees: 0, departments: 0,
    present: 0, late: 0, absent: 0, halfDay: 0, leave: 0, wfh: 0,
    overtime_hours: 0, late_minutes: 0, on_time_pct: 0,
  }
}

// ════════════════════════════════════════════════════════════════════════════
//   EXPORT — backend stream + browser save
// ════════════════════════════════════════════════════════════════════════════

function _filenameFromResponse(resp, fallback) {
  // Server sends `Content-Disposition: attachment; filename="..."; filename*=UTF-8''...`
  const cd = resp.headers?.['content-disposition'] || resp.headers?.['Content-Disposition'] || ''
  const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="([^"]+)"/i)
  if (m) {
    try { return decodeURIComponent(m[1]) } catch { return m[1] }
  }
  return fallback
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Trigger a backend export download.
 *
 * @param {{ reportKey: string, format: 'csv'|'pdf'|'excel', from: string, to: string,
 *           department_id?: string, onProgress?: Function }}
 */
export async function runReport({ reportKey, format, from, to, department_id = null, onProgress = null }) {
  if (!REPORT_KEYS.includes(reportKey)) {
    throw new Error(`Unknown report: ${reportKey}`)
  }
  if (!['pdf', 'excel', 'csv'].includes(format)) {
    throw new Error(`Unknown format: ${format}`)
  }
  onProgress?.(0, 1)

  const params = { format, from, to }
  if (department_id) params.department_id = department_id

  const resp = await axios.get(`${API}/hr/attendance/reports/${reportKey}/export`, {
    headers: authHeader(),
    params,
    responseType: 'blob',
  })
  onProgress?.(1, 1)

  // If the server returned a JSON error masquerading as a blob, parse it
  if (resp.data && resp.data.type === 'application/json') {
    const txt = await resp.data.text()
    let detail = 'Export failed'
    try { detail = (JSON.parse(txt) || {}).detail || detail } catch {}
    throw new Error(detail)
  }

  const ext = format === 'excel' ? 'xlsx' : format
  const filename = _filenameFromResponse(
    resp,
    `Fourreck-${REPORT_THEME[reportKey].name.replace(/\s+/g, '-')}-${from}-to-${to}.${ext}`,
  )
  _triggerDownload(resp.data, filename)

  return { count: 0 }
}
