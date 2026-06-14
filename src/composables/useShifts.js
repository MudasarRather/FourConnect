// Data layer for the HR Shifts & Rosters module — /api/hr/shifts (+ shift-rotations,
// shift-rosters, shift-coverage). Mirrors usePayroll.js: tab metadata + helpers +
// standalone axios fetchers wrapping the centralised API base.
import axios from 'axios'
import {
  Gauge, CalendarClock, UsersRound, RefreshCcw, CalendarRange, CalendarDays,
  Radar, ArrowLeftRight, TrendingUp, Moon, Palmtree, Timer, FileSpreadsheet,
  ScrollText,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr`

// ─── Tab metadata (shared with the Control-Tower rail) ──────────────────────
// group: operate | schedule | plan | insights ; soon: scaffolded (coming soon)
export const SHIFT_TABS = [
  { key: 'dashboard',      label: 'Dashboard',        icon: Gauge,         group: 'operate'  },
  { key: 'management',     label: 'Shift Management', icon: CalendarClock, group: 'operate'  },
  { key: 'assignment',     label: 'Assignment',       icon: UsersRound,    group: 'operate'  },
  { key: 'rotation',       label: 'Rotation',         icon: RefreshCcw,    group: 'schedule' },
  { key: 'rosters',        label: 'Weekly Rosters',   icon: CalendarRange, group: 'schedule' },
  { key: 'calendar',       label: 'Shift Calendar',   icon: CalendarDays,  group: 'schedule' },
  { key: 'coverage',       label: 'Coverage',         icon: Radar,         group: 'plan'     },
  { key: 'swap',           label: 'Shift Swaps',      icon: ArrowLeftRight,group: 'plan'     },
  { key: 'night',          label: 'Night Shifts',     icon: Moon,          group: 'plan'     },
  { key: 'holidays',       label: 'Holiday Shifts',   icon: Palmtree,      group: 'plan'     },
  { key: 'overtime-rules', label: 'Overtime Rules',   icon: Timer,         group: 'plan'     },
  { key: 'workforce',      label: 'Workforce',        icon: TrendingUp,    group: 'plan'     },
  { key: 'reports',        label: 'Reports',          icon: FileSpreadsheet, group: 'insights' },
  { key: 'audit-logs',     label: 'Audit Logs',       icon: ScrollText,    group: 'insights' },
]
export const SHIFT_TAB_KEYS = SHIFT_TABS.map(t => t.key)
export const SHIFT_GROUPS = [
  { key: 'operate',  label: 'Operate'  },
  { key: 'schedule', label: 'Schedule' },
  { key: 'plan',     label: 'Plan'     },
  { key: 'insights', label: 'Insights' },
]

// ─── Shift-type metadata ────────────────────────────────────────────────────
export const SHIFT_TYPES = [
  { key: 'GENERAL',    label: 'General',    color: 'var(--shift-general)' },
  { key: 'NIGHT',      label: 'Night',      color: 'var(--shift-nightt)' },
  { key: 'ROTATIONAL', label: 'Rotational', color: 'var(--shift-rotational)' },
  { key: 'FLEXIBLE',   label: 'Flexible',   color: 'var(--shift-flex)' },
]
export const shiftTypeMeta = (k) => SHIFT_TYPES.find(t => t.key === k) || { key: k, label: k, color: 'var(--shift-amber)' }

export const DOW_LABELS = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']
export const DOW_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Time helpers ───────────────────────────────────────────────────────────
export const shortTime = (t) => {
  if (!t) return '—'
  const [h, m] = String(t).split(':')
  const hh = Number(h)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 || 12
  return `${h12}:${m || '00'} ${ampm}`
}
const toMin = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// Position/width on a 24h timeline (handles overnight wrap).
export const hourPct = (t) => (toMin(t) / 1440) * 100
export const durationPct = (start, end) => {
  let s = toMin(start), e = toMin(end)
  if (e <= s) e += 1440 // overnight
  return Math.min(100, ((e - s) / 1440) * 100)
}
export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const isoOffsetDays = (days, from = new Date()) => {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Monday of the week containing `d` (ISO weeks).
export const mondayOf = (d = new Date()) => {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = Monday
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

const H = () => ({ headers: authHeader() })

// ─── Dashboard + Calendar ───────────────────────────────────────────────────
export const fetchShiftStats = async () =>
  (await axios.get(`${BASE}/shifts/dashboard`, H())).data
export const fetchShiftCalendar = async (params = {}) =>
  (await axios.get(`${BASE}/shifts/calendar`, { headers: authHeader(), params })).data

// ─── Shift templates (reuses existing /hr/shifts CRUD) ──────────────────────
export const fetchShifts = async (params = {}) =>
  (await axios.get(`${BASE}/shifts/`, { headers: authHeader(), params })).data
export const fetchShift = async (id) =>
  (await axios.get(`${BASE}/shifts/${id}`, H())).data
export const createShift = async (body) =>
  (await axios.post(`${BASE}/shifts/`, body, H())).data
export const patchShift = async (id, body) =>
  (await axios.patch(`${BASE}/shifts/${id}`, body, H())).data
export const deleteShift = async (id) =>
  (await axios.delete(`${BASE}/shifts/${id}`, H())).data

// ─── Assignments ────────────────────────────────────────────────────────────
export const fetchShiftAssignments = async (params = {}) =>
  (await axios.get(`${BASE}/shifts/assignments`, { headers: authHeader(), params })).data
export const assignShiftBulk = async (shiftId, body) =>
  (await axios.post(`${BASE}/shifts/${shiftId}/assign`, body, H())).data
export const unassignShift = async (assignmentId) =>
  (await axios.delete(`${BASE}/shifts/assignments/${assignmentId}`, H())).data

// ─── Rotations ──────────────────────────────────────────────────────────────
export const fetchRotations = async (params = {}) =>
  (await axios.get(`${BASE}/shift-rotations/`, { headers: authHeader(), params })).data
export const fetchRotation = async (id) =>
  (await axios.get(`${BASE}/shift-rotations/${id}`, H())).data
export const createRotation = async (body) =>
  (await axios.post(`${BASE}/shift-rotations/`, body, H())).data
export const updateRotation = async (id, body) =>
  (await axios.patch(`${BASE}/shift-rotations/${id}`, body, H())).data
export const deleteRotation = async (id, { revokeFuture = false } = {}) =>
  (await axios.delete(`${BASE}/shift-rotations/${id}`, { headers: authHeader(), params: { revoke_future: revokeFuture } })).data
export const fetchRotationImpact = async (id) =>
  (await axios.get(`${BASE}/shift-rotations/${id}/impact`, H())).data
export const advanceRotation = async (id) =>
  (await axios.post(`${BASE}/shift-rotations/${id}/advance`, {}, H())).data

// ─── Rosters ────────────────────────────────────────────────────────────────
export const fetchRosters = async (params = {}) =>
  (await axios.get(`${BASE}/shift-rosters/`, { headers: authHeader(), params })).data
export const fetchRoster = async (id) =>
  (await axios.get(`${BASE}/shift-rosters/${id}`, H())).data
export const createRoster = async (body) =>
  (await axios.post(`${BASE}/shift-rosters/`, body, H())).data
export const updateRoster = async (id, body) =>
  (await axios.patch(`${BASE}/shift-rosters/${id}`, body, H())).data
export const deleteRoster = async (id) =>
  (await axios.delete(`${BASE}/shift-rosters/${id}`, H())).data
export const upsertRosterEntries = async (id, entries) =>
  (await axios.put(`${BASE}/shift-rosters/${id}/entries`, { entries }, H())).data
export const publishRoster = async (id) =>
  (await axios.post(`${BASE}/shift-rosters/${id}/publish`, {}, H())).data

// ─── Coverage ───────────────────────────────────────────────────────────────
export const fetchCoverageRules = async (params = {}) =>
  (await axios.get(`${BASE}/shift-coverage/`, { headers: authHeader(), params })).data
export const createCoverageRule = async (body) =>
  (await axios.post(`${BASE}/shift-coverage/`, body, H())).data
export const updateCoverageRule = async (id, body) =>
  (await axios.patch(`${BASE}/shift-coverage/${id}`, body, H())).data
export const deleteCoverageRule = async (id) =>
  (await axios.delete(`${BASE}/shift-coverage/${id}`, H())).data
export const fetchCoverageAlerts = async (params = {}) =>
  (await axios.get(`${BASE}/shift-coverage/alerts`, { headers: authHeader(), params })).data

// ─── Shared lookups ─────────────────────────────────────────────────────────
export const fetchEmployeesLite = async (search = '') => {
  const params = { limit: 100, page: 1 }
  if (search) params.search = search
  const { data } = await axios.get(`${BASE}/employees/`, { headers: authHeader(), params })
  const rows = Array.isArray(data) ? data : (data?.items || [])
  return rows.map(r => ({
    id: r.id,
    full_name: r.full_name || r.user?.full_name || r.name || '—',
    employee_code: r.employee_code || r.employee_id || '',
    department_id: r.department_id || r.department?.id || null,
    department_name: r.department_name || r.department?.name || r.department || '',
  }))
}
export const fetchDepartments = async () => {
  const { data } = await axios.get(`${BASE}/departments/`, { headers: authHeader(), params: { limit: 200 } })
  const rows = Array.isArray(data) ? data : (data?.items || [])
  return rows.map(d => ({ id: d.id, name: d.name }))
}

// Target tables that constitute the Shifts-module audit trail. The audit view
// pulls every shift-scoped event in one time-ordered call by filtering on these.
export const SHIFT_AUDIT_TABLES = [
  'hr_employee_shift_assignments',
  'hr_shift_rotations',
  'hr_shift_rosters',
  'hr_shift_swap_requests',
  'hr_overtime_rules',
]

// Shift-scoped audit rows from the shared attendance log. Arrays (e.g.
// target_table) are serialised as repeated keys (`a&a`) so FastAPI's
// `List[str]` binds them — axios's default `a[]=` bracket form would not.
export const fetchShiftLogs = async (params = {}) =>
  (await axios.get(`${BASE}/attendance/logs/`, {
    headers: authHeader(),
    params,
    paramsSerializer: (p) => {
      const usp = new URLSearchParams()
      for (const [k, v] of Object.entries(p)) {
        if (Array.isArray(v)) v.forEach(x => x != null && usp.append(k, x))
        else if (v != null) usp.append(k, v)
      }
      return usp.toString()
    },
  })).data

// ─── Holidays (read-only lookup for Holiday Shifts) ─────────────────────────
// Shift planning must only see APPLIED holidays — a draft/imported holiday that
// hasn't been applied in Attendance · Holidays is not yet "live" (it doesn't
// short-circuit the daily rollup), so staffing it would silently pay a holiday
// premium for a day attendance treats as normal work. Default active_only=true;
// callers may override by passing active_only:false explicitly.
export const fetchHolidays = async (params = {}) => {
  const { data } = await axios.get(`${BASE}/holidays/`, { headers: authHeader(), params: { active_only: true, ...params } })
  const rows = Array.isArray(data) ? data : (data?.items || [])
  return rows.map(h => ({ id: h.id, name: h.name, date: h.date, holiday_type: h.holiday_type, is_active: h.is_active }))
}

// ═══════════════════ Phase 2 — Ops ═══════════════════

export const OT_TYPES = [
  { key: 'WEEKDAY', label: 'Daily / weekday', color: 'var(--shift-amber)' },
  { key: 'WEEKEND', label: 'Weekend', color: 'var(--shift-ember)' },
  { key: 'HOLIDAY', label: 'Holiday', color: 'var(--shift-ember-strong)' },
  { key: 'EMERGENCY', label: 'Emergency', color: 'var(--shift-alert)' },
]
export const otTypeMeta = (k) => OT_TYPES.find(t => t.key === k) || { key: k, label: k, color: 'var(--shift-amber)' }

export const HOLIDAY_COMP_TYPES = [
  { key: 'DOUBLE_PAY', label: 'Double pay', mult: 2.0 },
  { key: 'OVERTIME', label: 'Overtime', mult: 1.5 },
  { key: 'HOLIDAY_ALLOWANCE', label: 'Holiday allowance', mult: 1.0 },
  { key: 'COMP_OFF', label: 'Comp-off', mult: 1.0 },
]
export const compMeta = (k) => HOLIDAY_COMP_TYPES.find(c => c.key === k) || { key: k, label: k, mult: 1.0 }

export const SWAP_STATUS = {
  PENDING_PEER: { label: 'Awaiting peer', tone: 'gold' },
  PENDING_MANAGER: { label: 'Awaiting manager', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'ok' },
  REJECTED: { label: 'Rejected', tone: 'alert' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
}
export const swapStatusMeta = (k) => SWAP_STATUS[k] || { label: k, tone: 'neutral' }

// Overtime rules
export const fetchOvertimeRules = async (params = {}) =>
  (await axios.get(`${BASE}/overtime-rules/`, { headers: authHeader(), params })).data
export const createOvertimeRule = async (body) =>
  (await axios.post(`${BASE}/overtime-rules/`, body, H())).data
export const updateOvertimeRule = async (id, body) =>
  (await axios.patch(`${BASE}/overtime-rules/${id}`, body, H())).data
export const deleteOvertimeRule = async (id, reason = '') =>
  (await axios.delete(`${BASE}/overtime-rules/${id}`, { headers: authHeader(), params: reason ? { reason } : {} })).data
export const resolveOvertimeRule = async (params = {}) =>
  (await axios.get(`${BASE}/overtime-rules/resolve`, { headers: authHeader(), params })).data

// Shift swaps
export const fetchSwaps = async (params = {}) =>
  (await axios.get(`${BASE}/shift-swaps/`, { headers: authHeader(), params })).data
export const createSwap = async (body) =>
  (await axios.post(`${BASE}/shift-swaps/`, body, H())).data
export const acceptSwap = async (id) =>
  (await axios.post(`${BASE}/shift-swaps/${id}/accept`, {}, H())).data
export const approveSwap = async (id, notes = '') =>
  (await axios.patch(`${BASE}/shift-swaps/${id}/approve`, { notes }, H())).data
export const rejectSwap = async (id, notes = '') =>
  (await axios.patch(`${BASE}/shift-swaps/${id}/reject`, { notes }, H())).data
export const cancelSwap = async (id, notes = '') =>
  (await axios.post(`${BASE}/shift-swaps/${id}/cancel`, { notes }, H())).data
export const deleteSwap = async (id) =>
  (await axios.delete(`${BASE}/shift-swaps/${id}`, H())).data

// Holiday shifts
export const fetchHolidayShifts = async (params = {}) =>
  (await axios.get(`${BASE}/holiday-shifts/`, { headers: authHeader(), params })).data
export const createHolidayShift = async (body) =>
  (await axios.post(`${BASE}/holiday-shifts/`, body, H())).data
export const bulkHolidayShift = async (body) =>
  (await axios.post(`${BASE}/holiday-shifts/bulk`, body, H())).data
// body (optional): { reason, reason_category } — persisted as stand-down audit.
// axios drops a DELETE body unless Content-Type is set, so attach it explicitly.
export const deleteHolidayShift = async (id, body = null) => {
  const cfg = { headers: authHeader() }
  if (body && (body.reason || body.reason_category)) {
    cfg.data = body
    cfg.headers = { ...cfg.headers, 'Content-Type': 'application/json' }
  }
  return (await axios.delete(`${BASE}/holiday-shifts/${id}`, cfg)).data
}

// Night shift policies + roster
export const fetchNightPolicies = async () =>
  (await axios.get(`${BASE}/night-policies/`, { headers: authHeader() })).data
export const upsertNightPolicy = async (body) =>
  (await axios.put(`${BASE}/night-policies/`, body, H())).data
export const deleteNightPolicy = async (id) =>
  (await axios.delete(`${BASE}/night-policies/${id}`, H())).data
export const fetchNightRoster = async (params = {}) =>
  (await axios.get(`${BASE}/night-policies/roster`, { headers: authHeader(), params })).data

// Workforce planning — demand + forecast
export const fetchWorkforceDemands = async (params = {}) =>
  (await axios.get(`${BASE}/workforce/demands`, { headers: authHeader(), params })).data
export const createWorkforceDemand = async (body) =>
  (await axios.post(`${BASE}/workforce/demands`, body, H())).data
export const updateWorkforceDemand = async (id, body) =>
  (await axios.patch(`${BASE}/workforce/demands/${id}`, body, H())).data
export const deleteWorkforceDemand = async (id) =>
  (await axios.delete(`${BASE}/workforce/demands/${id}`, H())).data
export const fetchWorkforceForecast = async (params = {}) =>
  (await axios.get(`${BASE}/workforce/forecast`, { headers: authHeader(), params })).data

// ═══════════════════ Shift Reports (server-side PDF/Excel/CSV) ═══════════════════
// Each report maps 1:1 to a Shifts page; the backend renders a unique magazine-
// style PDF + a tailored Excel + CSV. See app/utils/hr/shift_reports/.
export const SHIFT_REPORTS = [
  { key: 'roster',    name: 'Shift Roster',          accent: '#d97706', soft: '#fef3c7', deep: '#92400e' },
  { key: 'coverage',  name: 'Coverage & Staffing',   accent: '#ea580c', soft: '#ffedd5', deep: '#7c2d12' },
  { key: 'overtime',  name: 'Overtime Ledger',       accent: '#b45309', soft: '#fef3c7', deep: '#451a03' },
  { key: 'night',     name: 'Night Shift Operations',accent: '#f59e0b', soft: '#fde68a', deep: '#78350f' },
  { key: 'rotation',  name: 'Rotation Schedule',     accent: '#ca8a04', soft: '#fef9c3', deep: '#713f12' },
  { key: 'workforce', name: 'Workforce Demand',      accent: '#c2410c', soft: '#ffedd5', deep: '#7c2d12' },
]
export const SHIFT_REPORT_KEYS = SHIFT_REPORTS.map(r => r.key)

export const fetchShiftReportPreview = async (params = {}) =>
  (await axios.get(`${BASE}/shifts/reports/preview`, { headers: authHeader(), params })).data

const _filenameFromResponse = (resp, fallback) => {
  const cd = resp.headers?.['content-disposition'] || ''
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (star) { try { return decodeURIComponent(star[1]) } catch { /* noop */ } }
  const plain = /filename="?([^";]+)"?/i.exec(cd)
  return plain ? plain[1] : fallback
}

// Triggers a browser download of the requested report. Returns nothing (side-effect).
export const runShiftReport = async ({ reportKey, format, from, to, department_id = null }) => {
  if (!SHIFT_REPORT_KEYS.includes(reportKey)) throw new Error(`Unknown report: ${reportKey}`)
  if (!['pdf', 'excel', 'csv'].includes(format)) throw new Error(`Unknown format: ${format}`)
  const params = { format, from, to }
  if (department_id) params.department_id = department_id

  const resp = await axios.get(`${BASE}/shifts/reports/${reportKey}/export`, {
    headers: authHeader(), params, responseType: 'blob',
  })
  // A JSON error can arrive disguised as a blob — surface its detail.
  if (resp.data && resp.data.type === 'application/json') {
    const txt = await resp.data.text()
    let detail = 'Export failed'
    try { detail = (JSON.parse(txt) || {}).detail || detail } catch { /* noop */ }
    throw new Error(detail)
  }
  const ext = format === 'excel' ? 'xlsx' : format
  const meta = SHIFT_REPORTS.find(r => r.key === reportKey)
  const fallback = `Fourreck-Shifts-${(meta?.name || reportKey).replace(/\s+/g, '-')}-${from}-to-${to}.${ext}`
  const filename = _filenameFromResponse(resp, fallback)
  const url = URL.createObjectURL(resp.data)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
