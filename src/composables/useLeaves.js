// Data layer for the HR Leave & Absence module.
// Reactive list state + lifecycle actions over /api/hr/leaves.
//
// Mirrors useEmployeeDocuments.js: factory `useLeaves()` exposes a list
// state for admin views; standalone helpers handle self-service, balances,
// policies, calendar, cron, etc.
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  Sun, Stethoscope, Plane, Baby, HeartHandshake, Heart,
  Coffee, MinusCircle, GraduationCap, Sparkles,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/leaves`

// ─── Constants (icon / palette / label per leave type) ────────────────────
export const LEAVE_TYPES = [
  { key: 'CASUAL',      label: 'Casual',      icon: Sun,           color: 'var(--leave-casual)',      hex: '#facc15' },
  { key: 'SICK',        label: 'Sick',        icon: Stethoscope,   color: 'var(--leave-sick)',        hex: '#ef4444' },
  { key: 'EARNED',      label: 'Earned',      icon: Plane,         color: 'var(--leave-earned)',      hex: '#38bdf8' },
  { key: 'MATERNITY',   label: 'Maternity',   icon: Baby,          color: 'var(--leave-maternity)',   hex: '#f472b6' },
  { key: 'PATERNITY',   label: 'Paternity',   icon: HeartHandshake,color: 'var(--leave-paternity)',   hex: '#818cf8' },
  { key: 'BEREAVEMENT', label: 'Bereavement', icon: Heart,         color: 'var(--leave-bereavement)', hex: '#a78bfa' },
  { key: 'COMP_OFF',    label: 'Comp-Off',    icon: Coffee,        color: 'var(--leave-compoff)',     hex: '#fb923c' },
  { key: 'LWP',         label: 'LWP',         icon: MinusCircle,   color: 'var(--leave-lwp)',         hex: '#f97316' },
  { key: 'STUDY',       label: 'Study',       icon: GraduationCap, color: 'var(--leave-study)',       hex: '#14b8a6' },
  { key: 'SPECIAL',     label: 'Special',     icon: Sparkles,      color: 'var(--leave-special)',     hex: '#c084fc' },
]

export const LEAVE_TYPE_BY_KEY = Object.fromEntries(LEAVE_TYPES.map(t => [t.key, t]))

export const LEAVE_STATUSES = [
  { key: 'DRAFT',            label: 'Draft',          tone: 'draft',         pillClass: 'draft' },
  { key: 'PENDING_MANAGER',  label: 'Mgr review',     tone: 'pending-mgr',   pillClass: 'pending-mgr' },
  { key: 'PENDING_HR',       label: 'HR review',      tone: 'pending-hr',    pillClass: 'pending-hr' },
  { key: 'APPROVED',         label: 'Approved',       tone: 'approved',      pillClass: 'approved' },
  { key: 'MANAGER_REJECTED', label: 'Mgr rejected',   tone: 'mgr-rejected',  pillClass: 'mgr-rejected' },
  { key: 'REJECTED',         label: 'HR rejected',    tone: 'rejected',      pillClass: 'rejected' },
  { key: 'CANCELLED',        label: 'Cancelled',      tone: 'cancelled',     pillClass: 'cancelled' },
  { key: 'WITHDRAWN',        label: 'Withdrawn',      tone: 'withdrawn',     pillClass: 'withdrawn' },
]
export const LEAVE_STATUS_BY_KEY = Object.fromEntries(LEAVE_STATUSES.map(s => [s.key, s]))

export const LEAVE_PIPELINE_STAGES = ['DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED']

export const typeMeta = (key) => LEAVE_TYPE_BY_KEY[key] || { key, label: key, icon: Sparkles, color: 'var(--hr-accent-gold)', hex: '#fbbf24' }
export const statusMeta = (key) => LEAVE_STATUS_BY_KEY[key] || { key, label: key, tone: 'cancelled', pillClass: 'cancelled' }

// ─── Admin list factory ───────────────────────────────────────────────────
export function useLeaves() {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({
    page: 1, limit: 25,
    q: '', status: null, leave_type: null,
    employee_id: null, department_id: null, manager_id: null,
    from: null, to: null,
  })
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.value.limit)))

  const setFilters = (patch) => {
    filters.value = { ...filters.value, ...patch }
    if (!('page' in patch)) filters.value.page = 1
  }
  const setPage = (p) => { filters.value.page = p }

  const buildParams = () => {
    const out = {}
    for (const [k, v] of Object.entries(filters.value)) {
      if (v !== null && v !== '' && v !== undefined) out[k] = v
    }
    return out
  }

  const fetchList = async () => {
    loading.value = true; error.value = ''
    try {
      const res = await axios.get(`${BASE}/`, { headers: authHeader(), params: buildParams() })
      items.value = res.data.items || []
      total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load leave requests'
      items.value = []; total.value = 0
    } finally { loading.value = false }
  }

  const fetchHrQueue = async (page = 1, limit = 50) => {
    loading.value = true
    try {
      const res = await axios.get(`${BASE}/hr/queue`, { headers: authHeader(), params: { page, limit } })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load HR queue'
      items.value = []
    } finally { loading.value = false }
  }

  const fetchManagerQueueAsAdmin = async (page = 1, limit = 50) => {
    // Admin overview of all PENDING_MANAGER rows (filter applied client-side
    // for now until backend offers a /manager/all endpoint).
    loading.value = true
    try {
      const res = await axios.get(`${BASE}/`, {
        headers: authHeader(),
        params: { status: 'PENDING_MANAGER', page, limit },
      })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load manager queue'
      items.value = []
    } finally { loading.value = false }
  }

  return {
    items, total, loading, error, filters, totalPages,
    setFilters, setPage, fetchList, fetchHrQueue, fetchManagerQueueAsAdmin,
  }
}

// ─── Admin standalone helpers ─────────────────────────────────────────────
export const fetchLeaveStats     = async () => (await axios.get(`${BASE}/stats`, { headers: authHeader() })).data
export const fetchLeavePolicies  = async () => (await axios.get(`${BASE}/policies`, { headers: authHeader() })).data
export const updateLeavePolicy   = async (lt, patch) => (await axios.patch(`${BASE}/policies/${lt}`, patch, { headers: authHeader() })).data
export const createLeavePolicy   = async (payload) => (await axios.post(`${BASE}/policies`, payload, { headers: authHeader() })).data
export const fetchLeavePolicyUsage = async (lt) => (await axios.get(`${BASE}/policies/${lt}/usage`, { headers: authHeader() })).data
export const deleteLeavePolicy   = async (lt, body) => (await axios.delete(`${BASE}/policies/${lt}`, {
  headers: { ...authHeader(), 'Content-Type': 'application/json' },
  data: body,
})).data
export const fetchLeaveCalendar  = async (params) => (await axios.get(`${BASE}/calendar`, { headers: authHeader(), params })).data
export const fetchLeaveBalances  = async (params = {}) => (await axios.get(`${BASE}/balances`, { headers: authHeader(), params })).data
export const adjustLeaveBalance  = async (employeeId, body) => (await axios.post(`${BASE}/balances/${employeeId}/adjust`, body, { headers: authHeader() })).data
export const fetchLeaveOne       = async (id) => (await axios.get(`${BASE}/${id}`, { headers: authHeader() })).data
export const fetchLeaveHistory   = async (id) => (await axios.get(`${BASE}/${id}/history`, { headers: authHeader() })).data
export const adminCreateLeave    = async (payload) => (await axios.post(`${BASE}/`, payload, { headers: authHeader() })).data
export const adminDeleteLeave    = async (id, body = null) => {
  const cfg = { headers: authHeader() }
  if (body && (body.reason || body.reason_category)) {
    cfg.data = body
    cfg.headers['Content-Type'] = 'application/json'
  }
  await axios.delete(`${BASE}/${id}`, cfg)
}
export const decideAsHr          = async (id, payload) => (await axios.patch(`${BASE}/hr/${id}/decide`, payload, { headers: authHeader() })).data
export const decideAsManager     = async (id, payload) => (await axios.patch(`${BASE}/manager/${id}/decide`, payload, { headers: authHeader() })).data
export const bulkDecide          = async (ids, decision, notes) => (await axios.post(`${BASE}/bulk-decide`, { ids, decision, notes }, { headers: authHeader() })).data

// ─── Phase 4 — Configurable approval chain ────────────────────────────────
export const APPROVER_TYPES = [
  { key: 'MANAGER', label: 'Reporting Manager', description: "Resolved to the employee's reporting manager at submit time" },
  { key: 'HR',      label: 'HR / Superuser',    description: 'Any active superuser may approve this stage' },
  { key: 'USER',    label: 'Named user',        description: 'A specific named user (e.g. department head)' },
]
export const APPROVER_TYPE_BY_KEY = Object.fromEntries(APPROVER_TYPES.map(t => [t.key, t]))

// Default chain used when policy.approval_chain is null. Kept identical to
// the backend _DEFAULT_CHAIN so the UI preview matches what gets snapshotted.
export const DEFAULT_APPROVAL_CHAIN = () => ([
  { approver_type: 'MANAGER', approver_user_id: null, label: 'Reporting Manager' },
  { approver_type: 'HR',      approver_user_id: null, label: 'HR' },
])

export const fetchApproverCandidates = async (q = '', limit = 40) =>
  (await axios.get(`${BASE}/approver-candidates`, { headers: authHeader(), params: { q, limit } })).data

// Chain-aware queue + generic per-stage decide
export const fetchMyApprovalQueue = async () =>
  (await axios.get(`${BASE}/me/queue`, { headers: authHeader() })).data
export const decideChainStage = async (id, payload) =>
  (await axios.patch(`${BASE}/chain/${id}/decide`, payload, { headers: authHeader() })).data

// ─── Cron ─────────────────────────────────────────────────────────────────
export const cronAccrueMonthly   = async (month) => (await axios.post(`${BASE}/cron/accrue-monthly`, { month }, { headers: authHeader() })).data
export const cronCarryForward    = async (from_fy, to_fy) => (await axios.post(`${BASE}/cron/carry-forward`, { from_fy, to_fy }, { headers: authHeader() })).data

// ─── Self-service helpers ────────────────────────────────────────────────
export const fetchMyLeaves       = async (params = {}) => (await axios.get(`${BASE}/me`, { headers: authHeader(), params })).data
export const fetchMyBalance      = async () => (await axios.get(`${BASE}/me/balance`, { headers: authHeader() })).data
// Live preview that mirrors the server's `_compute_total_and_fy` so the wizard
// can show the true working-day count + block submit on off-day-only ranges.
export const fetchLeavePreview   = async (params = {}) => (await axios.get(`${BASE}/me/preview`, { headers: authHeader(), params })).data
export const fetchMyBalanceFy    = async (fy) => (await axios.get(`${BASE}/me/balance/${fy}`, { headers: authHeader() })).data
export const createMyLeave       = async (payload) => (await axios.post(`${BASE}/me`, payload, { headers: authHeader() })).data
export const withdrawMyLeave     = async (id, note) => {
  const cfg = { headers: authHeader(), data: { note } }
  cfg.headers['Content-Type'] = 'application/json'
  await axios.delete(`${BASE}/me/${id}`, cfg)
}
export const fetchManagerQueue   = async () => (await axios.get(`${BASE}/manager/queue`, { headers: authHeader() })).data

// ─── Proof-of-leave attachments ───────────────────────────────────────────
// HR can request supporting documents for a leave; the requesting employee
// then uploads N files. Endpoints are symmetric: admin asks, owner uploads,
// both can list, owner deletes their own.
export const requestLeaveProof = async (id, note) =>
  (await axios.post(`${BASE}/${id}/request-proof`, { note: note || null }, { headers: authHeader() })).data

export const fetchLeaveProofs = async (id) =>
  (await axios.get(`${BASE}/${id}/proofs`, { headers: authHeader() })).data

export const uploadLeaveProof = async (id, file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await axios.post(`${BASE}/me/${id}/proof`, fd, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (ev) => {
      if (typeof onProgress !== 'function') return
      if (!ev.total) return
      onProgress(Math.round((ev.loaded / ev.total) * 100))
    },
  })
  return res.data
}

export const deleteLeaveProof = async (leaveId, attachmentId, body = null) => {
  const cfg = { headers: authHeader() }
  if (body && (body.reason || body.note)) {
    cfg.data = body
    cfg.headers['Content-Type'] = 'application/json'
  }
  await axios.delete(`${BASE}/me/${leaveId}/proof/${attachmentId}`, cfg)
}

// ─── Phase 2 — Comp-Off ───────────────────────────────────────────────────
export const COMP_OFF_EXPIRY_DEFAULT_DAYS = 90

export const fetchCompOffList   = async (params = {}) => (await axios.get(`${BASE}/comp-off`, { headers: authHeader(), params })).data
export const fetchCompOffStats  = async (params = {}) => (await axios.get(`${BASE}/comp-off/stats`, { headers: authHeader(), params })).data
export const grantCompOff       = async (body) => (await axios.post(`${BASE}/comp-off/grant`, body, { headers: authHeader() })).data
export const fetchCompOffImpact = async (id) => (await axios.get(`${BASE}/comp-off/${id}/impact`, { headers: authHeader() })).data
export const deleteCompOff      = async (id, body) => (await axios.delete(`${BASE}/comp-off/${id}`, {
  headers: { ...authHeader(), 'Content-Type': 'application/json' },
  data: body,
})).data
export const fetchMyCompOff     = async () => (await axios.get(`${BASE}/me/comp-off`, { headers: authHeader() })).data

// ─── Phase 2 — Encashment ─────────────────────────────────────────────────
export const ENCASHMENT_STATUSES = [
  { key: 'PENDING_MANAGER', label: 'Mgr review', tone: 'pending-mgr' },
  { key: 'PENDING',   label: 'HR review', tone: 'pending-hr' },
  { key: 'APPROVED',  label: 'Sanctioned', tone: 'approved' },
  { key: 'PAID',      label: 'Paid',      tone: 'approved' },
  { key: 'REJECTED',  label: 'Rejected',  tone: 'rejected' },
  { key: 'CANCELLED', label: 'Cancelled', tone: 'cancelled' },
]

export const fetchMyEncashmentOptions = async () => (await axios.get(`${BASE}/me/encashment/options`, { headers: authHeader() })).data
export const previewEncashment       = async (body) => (await axios.post(`${BASE}/me/encashment/preview`, body, { headers: authHeader() })).data
export const requestMyEncashment     = async (body) => (await axios.post(`${BASE}/me/encashment`, body, { headers: authHeader() })).data
export const cancelMyEncashment      = async (id) => { await axios.delete(`${BASE}/me/encashment/${id}`, { headers: authHeader() }) }
export const fetchMyEncashment       = async () => (await axios.get(`${BASE}/me/encashment`, { headers: authHeader() })).data

export const fetchEncashmentList     = async (params = {}) => (await axios.get(`${BASE}/encashment`, { headers: authHeader(), params })).data
export const fetchEncashmentStats    = async (params = {}) => (await axios.get(`${BASE}/encashment/stats`, { headers: authHeader(), params })).data
export const adminCreateEncashment   = async (body) => (await axios.post(`${BASE}/encashment`, body, { headers: authHeader() })).data
export const decideEncashment        = async (id, body) => (await axios.patch(`${BASE}/encashment/${id}/decide`, body, { headers: authHeader() })).data
export const fetchManagerEncashmentQueue = async () => (await axios.get(`${BASE}/encashment/manager/queue`, { headers: authHeader() })).data
export const managerDecideEncashment = async (id, body) => (await axios.patch(`${BASE}/encashment/${id}/manager-decide`, body, { headers: authHeader() })).data
export const payEncashment           = async (id, body = {}) => (await axios.post(`${BASE}/encashment/${id}/pay`, body, { headers: authHeader() })).data

// ─── Phase 3 — Reports + Audit Logs ───────────────────────────────────────
export const fetchReportIndex   = async () => (await axios.get(`${BASE}/reports/index`, { headers: authHeader() })).data
export const fetchReportPreview = async (reportKey, params) =>
  (await axios.get(`${BASE}/reports/${reportKey}/preview`, { headers: authHeader(), params })).data

export const downloadReport = async (reportKey, { format = 'csv', from, to, department_id, employee_id } = {}) => {
  const params = new URLSearchParams({ format })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (department_id) params.set('department_id', department_id)
  if (employee_id) params.set('employee_id', employee_id)
  const res = await axios.get(`${BASE}/reports/${reportKey}/export?${params.toString()}`, {
    headers: authHeader(), responseType: 'blob',
  })
  const mime = format === 'pdf' ? 'application/pdf'
    : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv'
  const ext = format === 'excel' ? 'xlsx' : format
  const url = URL.createObjectURL(new Blob([res.data], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = `fourconnect-leave-${reportKey}-${from || ''}-${to || ''}.${ext}`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

export const fetchAuditLogs = async (params = {}) =>
  (await axios.get(`${BASE}/audit-logs`, { headers: authHeader(), params })).data

// ─── Phase 2 — Calendar ICS download ──────────────────────────────────────
export const downloadCalendarIcs = async ({ from, to, department_id, leave_type } = {}) => {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (department_id) params.set('department_id', department_id)
  if (leave_type) params.set('leave_type', leave_type)
  const res = await axios.get(`${BASE}/calendar/export.ics?${params.toString()}`, {
    headers: authHeader(), responseType: 'blob',
  })
  // Trigger browser download
  const url = URL.createObjectURL(new Blob([res.data], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `fourconnect-leave-${from || ''}-${to || ''}.ics`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ─── Pure utility: compute net days client-side for the wizard step 2 ─────
// Mirrors backend _compute_total_and_fy but lighter (no FY split). Used only
// for the live "net days" preview while the user is picking dates.
export const computeNetDays = ({ from, to, isHalfDay, holidays = [], countWeekends = true, weekendDays = [5, 6] }) => {
  if (!from || !to) return 0
  const s = new Date(from); const e = new Date(to)
  if (isNaN(s) || isNaN(e) || e < s) return 0
  if (isHalfDay && s.getTime() !== e.getTime()) return 0
  if (isHalfDay) return 0.5
  const holidaySet = new Set((holidays || []).map(h => (typeof h === 'string' ? h : h?.date)))
  let n = 0
  const cur = new Date(s)
  while (cur <= e) {
    const isWeekend = weekendDays.includes(cur.getDay() === 0 ? 6 : cur.getDay() - 1)
    const iso = cur.toISOString().slice(0, 10)
    const isHoliday = holidaySet.has(iso)
    if (countWeekends || (!isWeekend && !isHoliday)) {
      n += 1
    }
    cur.setDate(cur.getDate() + 1)
  }
  return n
}
