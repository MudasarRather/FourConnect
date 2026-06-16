// Data layer for the HR Reimbursements / Employee Claims module.
// Reactive list state + lifecycle actions over /api/hr/reimbursements.
// Mirrors useLeaves.js: factory `useReimbursements()` for admin lists,
// standalone helpers for admin actions, /me self-service + manager queue.
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  Plane, Stethoscope, Wifi, Utensils, Fuel, Receipt,
  Send, UserCheck, Landmark, CheckCircle2, XCircle, Undo2,
  BadgeCheck, Clock, Wallet, RotateCcw, Ban,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/reimbursements`
const ME = `${API}/hr/me/reimbursements`

// Extract a human string from an axios error. FastAPI 422s return `detail` as
// an ARRAY of {loc,msg,type}; passing that array to vue-toastification crashes
// the toast renderer ("Component is missing template or render function").
export function errText(e, fallback = 'Something went wrong') {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || fallback
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(x => x?.msg || (typeof x === 'string' ? x : JSON.stringify(x))).join('; ') || fallback
  if (typeof d === 'object') return d.msg || JSON.stringify(d)
  return String(d)
}

// ─── Money formatting (Indian numbering) ───────────────────────────────────
// Full grouped rupee value: 1234567 → "₹12,34,567".
export const fmtINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

// Compact lakh/crore for axis ticks & chips: 1234567 → "₹12.3L", 23400000 → "₹2.3Cr".
export const fmtCompactINR = (n) => {
  const v = Number(n || 0)
  const a = Math.abs(v)
  if (a >= 1e7) return '₹' + (v / 1e7).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + 'Cr'
  if (a >= 1e5) return '₹' + (v / 1e5).toFixed(a >= 1e6 ? 0 : 1).replace(/\.0$/, '') + 'L'
  if (a >= 1e3) return '₹' + (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return '₹' + Math.round(v)
}

// ─── Category metadata (icon / palette per default category) ───────────────
export const CLAIM_CATEGORIES = [
  { key: 'TRAVEL',   label: 'Travel',   icon: Plane,       color: 'var(--rmb-cat-travel)',   hex: '#3b82f6' },
  { key: 'MEDICAL',  label: 'Medical',  icon: Stethoscope, color: 'var(--rmb-cat-medical)',  hex: '#ef4444' },
  { key: 'INTERNET', label: 'Internet', icon: Wifi,        color: 'var(--rmb-cat-internet)', hex: '#8b5cf6' },
  { key: 'FOOD',     label: 'Food',     icon: Utensils,    color: 'var(--rmb-cat-food)',     hex: '#14b8a6' },
  { key: 'FUEL',     label: 'Fuel',     icon: Fuel,        color: 'var(--rmb-cat-fuel)',     hex: '#f59e0b' },
]
export const CLAIM_CATEGORY_BY_KEY = Object.fromEntries(CLAIM_CATEGORIES.map(c => [c.key, c]))
export const categoryMeta = (key) =>
  CLAIM_CATEGORY_BY_KEY[key] || { key, label: key, icon: Receipt, color: 'var(--hr-accent-gold)', hex: '#fbbf24' }

// ─── Status metadata ───────────────────────────────────────────────────────
export const CLAIM_STATUS = [
  { key: 'DRAFT',            label: 'Draft',     icon: Clock,        tone: 'cancelled', hex: '#9ca3af' },
  { key: 'PENDING_APPROVAL', label: 'In review', icon: Clock,        tone: 'pending',   hex: '#fbbf24' },
  { key: 'APPROVED',         label: 'Approved',  icon: CheckCircle2, tone: 'approved',  hex: '#34d399' },
  { key: 'RETURNED',         label: 'Returned',  icon: Undo2,        tone: 'returned',  hex: '#fb923c' },
  { key: 'REJECTED',         label: 'Rejected',  icon: XCircle,      tone: 'rejected',  hex: '#f87171' },
  { key: 'SETTLED',          label: 'Settled',   icon: BadgeCheck,   tone: 'settled',   hex: '#2dd4bf' },
  { key: 'PAID',             label: 'Paid',      icon: Wallet,       tone: 'paid',      hex: '#22c55e' },
  { key: 'CANCELLED',        label: 'Cancelled', icon: Ban,          tone: 'cancelled', hex: '#9ca3af' },
  { key: 'REVERSED',         label: 'Reversed',  icon: RotateCcw,    tone: 'reversed',  hex: '#c084fc' },
]
export const CLAIM_STATUS_BY_KEY = Object.fromEntries(CLAIM_STATUS.map(s => [s.key, s]))
export const statusMeta = (key) =>
  CLAIM_STATUS_BY_KEY[key] || { key, label: key, icon: Clock, tone: 'cancelled', hex: '#9ca3af' }

// Visible pipeline nodes for the stage tracker (submission → settled).
export const CLAIM_PIPELINE_STAGES = ['SUBMITTED', 'MANAGER', 'FINANCE', 'APPROVED', 'SETTLED']

export const SETTLEMENT_MODES = [
  { key: 'PAYROLL',       label: 'Payroll',       icon: BadgeCheck },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
  { key: 'CASH',          label: 'Cash',          icon: Wallet },
  { key: 'CHEQUE',        label: 'Cheque',        icon: Receipt },
  { key: 'PETTY_CASH',    label: 'Petty Cash',    icon: Wallet },
]

// Resolve a claim's lifecycle into pipeline-node states for RmbStageTracker.
export function pipelineStateFor(claim) {
  const steps = claim?.approval_steps || []
  const cur = claim?.current_step ?? 0
  const status = claim?.status
  const nodes = [{ key: 'SUBMITTED', label: 'Submitted' }]
  steps.forEach((s, i) => nodes.push({
    key: s.approver_type, label: s.label || s.approver_type, step: i,
    decision: s.decision,
  }))
  nodes.push({ key: 'APPROVED', label: 'Approved' })
  nodes.push({ key: 'SETTLED', label: 'Settled' })

  return nodes.map((n, i) => {
    let state = 'pending'
    if (n.key === 'SUBMITTED') {
      state = status === 'DRAFT' ? 'current' : 'done'
    } else if (n.step !== undefined) {
      if (n.decision === 'APPROVED') state = 'done'
      else if (n.decision === 'SKIPPED') state = 'skipped'
      else if (n.decision === 'REJECTED') state = 'rejected'
      else if (n.decision === 'RETURNED') state = 'rejected'
      else if (status === 'PENDING_APPROVAL' && n.step === cur) state = 'current'
      else if (['APPROVED', 'SETTLED', 'PAID'].includes(status)) state = 'done'
    } else if (n.key === 'APPROVED') {
      state = ['APPROVED', 'SETTLED', 'PAID'].includes(status) ? 'done'
        : (status === 'REJECTED' ? 'rejected' : 'pending')
    } else if (n.key === 'SETTLED') {
      state = ['SETTLED', 'PAID'].includes(status) ? 'done' : 'pending'
    }
    return { ...n, state }
  })
}

// ─── Admin list factory ─────────────────────────────────────────────────────
export function useReimbursements() {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({
    page: 1, limit: 20,
    q: '', status: null, category_id: null,
    employee_id: null, department_id: null, settlement_method: null,
    project_id: null, date_from: null, date_to: null,
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
      error.value = e?.response?.data?.detail || 'Failed to load claims'
      items.value = []; total.value = 0
    } finally { loading.value = false }
  }

  const fetchApprovalQueue = async (page = 1, limit = 50) => {
    loading.value = true; error.value = ''
    try {
      const res = await axios.get(`${BASE}/queue`, { headers: authHeader(), params: { page, limit } })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load approval queue'
      items.value = []
    } finally { loading.value = false }
  }

  const fetchSettlementQueue = async (page = 1, limit = 50) => {
    loading.value = true; error.value = ''
    try {
      const res = await axios.get(`${BASE}/`, {
        headers: authHeader(), params: { status: 'APPROVED', page, limit },
      })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load settlement queue'
      items.value = []
    } finally { loading.value = false }
  }

  return {
    items, total, loading, error, filters, totalPages,
    setFilters, setPage, fetchList, fetchApprovalQueue, fetchSettlementQueue,
  }
}

// ─── Admin standalone helpers ─────────────────────────────────────────────
export const fetchReimbStats = async () => (await axios.get(`${BASE}/stats`, { headers: authHeader() })).data
export const fetchClaim       = async (id) => (await axios.get(`${BASE}/${id}`, { headers: authHeader() })).data
export const adminCreateClaim = async (payload) => (await axios.post(`${BASE}/`, payload, { headers: authHeader() })).data
export const decideClaim      = async (id, body) => (await axios.patch(`${BASE}/${id}/decide`, body, { headers: authHeader() })).data
export const requestClarification = async (id, body) => (await axios.post(`${BASE}/${id}/request-clarification`, body, { headers: authHeader() })).data
export const escalateClaim    = async (id, body = {}) => (await axios.post(`${BASE}/${id}/escalate`, body, { headers: authHeader() })).data
export const bulkDecide       = async (body) => (await axios.post(`${BASE}/bulk-decide`, body, { headers: authHeader() })).data
export const settleViaPayroll = async (id, body) => (await axios.post(`${BASE}/${id}/settle/payroll`, body, { headers: authHeader() })).data
export const settleDirect     = async (id, body) => (await axios.post(`${BASE}/${id}/settle/direct`, body, { headers: authHeader() })).data
export const reverseClaim     = async (id, body) => (await axios.post(`${BASE}/${id}/reverse`, body, { headers: authHeader() })).data
export const deleteClaim      = async (id) => (await axios.delete(`${BASE}/${id}`, { headers: authHeader() })).data
export const updateClaim      = async (id, body) => (await axios.patch(`${BASE}/${id}`, body, { headers: authHeader() })).data
export const fetchApproverCandidates = async (q) => (await axios.get(`${BASE}/approver-candidates`, { headers: authHeader(), params: { q } })).data
export const fetchAuditLogs   = async (params = {}) => (await axios.get(`${BASE}/audit`, { headers: authHeader(), params })).data

// Categories
export const fetchCategories  = async (includeInactive = false) =>
  (await axios.get(`${BASE}/categories/`, { headers: authHeader(), params: { include_inactive: includeInactive } })).data
export const createCategory   = async (payload) => (await axios.post(`${BASE}/categories/`, payload, { headers: authHeader() })).data
export const updateCategory   = async (id, patch) => (await axios.patch(`${BASE}/categories/${id}`, patch, { headers: authHeader() })).data
export const deleteCategory   = async (id, reason) => (await axios.delete(`${BASE}/categories/${id}`, {
  headers: { ...authHeader(), 'Content-Type': 'application/json' }, data: reason ? { reason } : {},
})).data

// Policies
export const fetchPolicies    = async () => (await axios.get(`${BASE}/policies/`, { headers: authHeader() })).data
export const fetchPolicyForCategory = async (cid) => (await axios.get(`${BASE}/policies/by-category/${cid}`, { headers: authHeader() })).data
export const createPolicy     = async (payload) => (await axios.post(`${BASE}/policies/`, payload, { headers: authHeader() })).data
export const updatePolicy     = async (id, patch) => (await axios.patch(`${BASE}/policies/${id}`, patch, { headers: authHeader() })).data
export const deletePolicy     = async (id, reason) => (await axios.delete(`${BASE}/policies/${id}`, {
  headers: { ...authHeader(), 'Content-Type': 'application/json' }, data: reason ? { reason } : {},
})).data

// Reports
export const fetchReportIndex = async () => (await axios.get(`${BASE}/reports/`, { headers: authHeader() })).data
export const downloadReport   = async (reportKey, { format = 'csv', from, to, category_id, status } = {}) => {
  const params = new URLSearchParams({ format })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (category_id) params.set('category_id', category_id)
  if (status) params.set('status', status)
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
  a.download = `fourconnect-reimbursement-${reportKey}.${ext}`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ─── Self-service (/me) helpers ────────────────────────────────────────────
export const fetchMyClaims    = async (params = {}) => (await axios.get(`${ME}/`, { headers: authHeader(), params })).data
export const fetchMyClaimSummary = async () => (await axios.get(`${ME}/summary`, { headers: authHeader() })).data
export const fetchMyBalances  = async () => (await axios.get(`${ME}/balances`, { headers: authHeader() })).data
export const fetchMyCategories = async () => (await axios.get(`${ME}/categories`, { headers: authHeader() })).data
export const fetchMyClaim     = async (id) => (await axios.get(`${ME}/${id}`, { headers: authHeader() })).data
export const createMyClaim    = async (payload) => (await axios.post(`${ME}/`, payload, { headers: authHeader() })).data
export const createMyDraft    = async (payload) => (await axios.post(`${ME}/draft`, payload, { headers: authHeader() })).data
export const editMyClaim      = async (id, patch) => (await axios.patch(`${ME}/${id}`, patch, { headers: authHeader() })).data
export const submitMyClaim    = async (id) => (await axios.post(`${ME}/${id}/submit`, {}, { headers: authHeader() })).data
export const withdrawMyClaim  = async (id, reason) => (await axios.delete(`${ME}/${id}`, {
  headers: { ...authHeader(), 'Content-Type': 'application/json' }, data: { reason },
})).data

// Manager queue (user-side Team Approvals)
export const fetchMyApprovalQueue = async (params = {}) => (await axios.get(`${ME}/approval-queue`, { headers: authHeader(), params })).data
export const decideMyClaim    = async (id, body) => (await axios.patch(`${ME}/claims/${id}/decide`, body, { headers: authHeader() })).data

// Receipt upload — reuse the proven expense-attachment endpoint.
export const uploadClaimReceipt = async (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${API}/uploads/expense-attachment`, form, {
    headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  return res.data
}
