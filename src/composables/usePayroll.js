// Data layer for the HR Payroll module — /api/hr/payroll.
// Mirrors useLeaves.js: constants + metadata helpers, an admin list factory,
// and standalone fetchers. All money is INR.
import { ref, computed } from 'vue'
import axios from 'axios'
import {
  Coins, Layers, ListTree, Wallet, Cpu, CalendarClock, ShieldCheck,
  ReceiptText, BadgePercent, Landmark, FileSpreadsheet, ScrollText,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/payroll`

// ─── Batch statuses ───────────────────────────────────────────────────────
export const BATCH_STATUSES = [
  { key: 'DRAFT',     label: 'Draft',     pillClass: 'draft' },
  { key: 'GENERATED', label: 'Generated', pillClass: 'generated' },
  { key: 'VERIFIED',  label: 'Verified',  pillClass: 'verified' },
  { key: 'APPROVED',  label: 'Approved',  pillClass: 'approved' },
  { key: 'RELEASED',  label: 'Released',  pillClass: 'released' },
  { key: 'LOCKED',    label: 'Locked',    pillClass: 'locked' },
  { key: 'CANCELLED', label: 'Cancelled', pillClass: 'cancelled' },
]
export const BATCH_STATUS_BY_KEY = Object.fromEntries(BATCH_STATUSES.map(s => [s.key, s]))
export const BATCH_PIPELINE = ['DRAFT', 'GENERATED', 'VERIFIED', 'APPROVED', 'RELEASED', 'LOCKED']
export const statusMeta = (k) => BATCH_STATUS_BY_KEY[k] || { key: k, label: k, pillClass: 'cancelled' }

// ─── Component categories ───────────────────────────────────────────────
export const COMPONENT_CATEGORIES = [
  { key: 'EARNING',               label: 'Earning',   cat: 'earning' },
  { key: 'DEDUCTION',             label: 'Deduction', cat: 'deduction' },
  { key: 'STATUTORY_DEDUCTION',   label: 'Statutory', cat: 'statutory' },
  { key: 'EMPLOYER_CONTRIBUTION', label: 'Employer',  cat: 'employer' },
  { key: 'REIMBURSEMENT',         label: 'Reimburse', cat: 'earning' },
]
export const categoryMeta = (k) => COMPONENT_CATEGORIES.find(c => c.key === k) || { key: k, label: k, cat: 'earning' }

export const CALC_TYPES = [
  { key: 'FLAT', label: 'Flat amount' },
  { key: 'PERCENT_OF', label: '% of base' },
  { key: 'FORMULA', label: 'Formula' },
  { key: 'STATUTORY', label: 'Statutory' },
  { key: 'BALANCE', label: 'Balance to gross' },
  { key: 'ATTENDANCE_PRORATED', label: 'Attendance prorated' },
]
export const calcMeta = (k) => CALC_TYPES.find(c => c.key === k) || { key: k, label: k }

export const STATUTORY_KINDS = [
  'PF_EMPLOYEE', 'PF_EMPLOYER', 'ESI_EMPLOYEE', 'ESI_EMPLOYER',
  'PROFESSIONAL_TAX', 'TDS', 'LWF_EMPLOYEE', 'LWF_EMPLOYER',
]

// Tab metadata shared with the workspace TabBar.
export const PAYROLL_TABS = [
  { key: 'dashboard',     label: 'Dashboard',      icon: Coins,         group: 'overview', phaseA: true },
  { key: 'structures',    label: 'Structures',     icon: Layers,        group: 'design',   phaseA: true },
  { key: 'components',    label: 'Components',     icon: ListTree,      group: 'design',   phaseA: true },
  { key: 'compensation',  label: 'Compensation',   icon: Wallet,        group: 'design',   phaseA: true },
  { key: 'processing',    label: 'Processing',     icon: Cpu,           group: 'run',      phaseA: true },
  { key: 'monthly',       label: 'Monthly run',    icon: CalendarClock, group: 'run',      phaseA: true },
  { key: 'approval',      label: 'Approval',       icon: ShieldCheck,   group: 'run',      phaseA: true },
  { key: 'payslips',      label: 'Payslips',       icon: ReceiptText,   group: 'payout',   phaseA: true },
  { key: 'revisions',     label: 'Revisions',      icon: BadgePercent,  group: 'comp',     phaseA: true },
  { key: 'arrears',       label: 'Arrears',        icon: BadgePercent,  group: 'comp',     phaseA: true },
  { key: 'bonus',         label: 'Bonus',          icon: BadgePercent,  group: 'comp',     phaseA: true },
  { key: 'incentives',    label: 'Incentives',     icon: BadgePercent,  group: 'comp',     phaseA: true },
  { key: 'variable-pay',  label: 'Variable pay',   icon: BadgePercent,  group: 'comp',     phaseA: true },
  { key: 'tax',           label: 'Tax computation',icon: Landmark,      group: 'statutory',phaseA: true },
  { key: 'tds',           label: 'TDS',            icon: Landmark,      group: 'statutory',phaseA: true },
  { key: 'statutory',     label: 'Compliance',     icon: Landmark,      group: 'statutory',phaseA: true },
  { key: 'bank-files',    label: 'Bank files',     icon: FileSpreadsheet,group:'payout',   phaseA: true },
  { key: 'reports',       label: 'Reports',        icon: FileSpreadsheet,group:'system',   phaseA: true },
  { key: 'audit-logs',    label: 'Audit logs',     icon: ScrollText,    group: 'system',   phaseA: true },
]
export const PAYROLL_TAB_KEYS = PAYROLL_TABS.map(t => t.key)

// ─── INR helpers ───────────────────────────────────────────────────────
const _inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
export const inr = (v) => `₹${_inrFmt.format(Number(v || 0))}`
export const inrShort = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`
  return `₹${_inrFmt.format(n)}`
}
const _MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
export const monthLabel = (m) => _MONTHS[m] || ''
export const fyLabel = (d = new Date()) => {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}–${String(y + 1).slice(-2)}`
}

// ─── Admin compensation list factory ──────────────────────────────────────
export function usePayroll() {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({ page: 1, limit: 25, q: '', employee_id: null })
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.value.limit)))
  const setFilters = (patch) => { filters.value = { ...filters.value, ...patch }; if (!('page' in patch)) filters.value.page = 1 }
  const setPage = (p) => { filters.value.page = p }

  // compensation list is per-employee on the backend; this factory drives the
  // employee-comp table (employees decorated by the caller).
  const fetchList = async (url) => {
    loading.value = true; error.value = ''
    try {
      const res = await axios.get(url, { headers: authHeader(), params: {
        skip: (filters.value.page - 1) * filters.value.limit, limit: filters.value.limit,
        q: filters.value.q || undefined,
      } })
      items.value = res.data.items || []
      total.value = res.data.total || 0
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load'
      items.value = []; total.value = 0
    } finally { loading.value = false }
  }
  return { items, total, loading, error, filters, totalPages, setFilters, setPage, fetchList }
}

// ─── Standalone fetchers ───────────────────────────────────────────────────
export const fetchPayrollStats = async () =>
  (await axios.get(`${BASE}/dashboard`, { headers: authHeader() })).data

// Structures
export const fetchStructures = async (params = {}) =>
  (await axios.get(`${BASE}/structures/`, { headers: authHeader(), params })).data
export const fetchStructure = async (id) =>
  (await axios.get(`${BASE}/structures/${id}`, { headers: authHeader() })).data
export const createStructure = async (body) =>
  (await axios.post(`${BASE}/structures/`, body, { headers: authHeader() })).data
export const updateStructure = async (id, body) =>
  (await axios.patch(`${BASE}/structures/${id}`, body, { headers: authHeader() })).data
export const deleteStructure = async (id) =>
  (await axios.delete(`${BASE}/structures/${id}`, { headers: authHeader() })).data
export const addStructureComponent = async (id, body) =>
  (await axios.post(`${BASE}/structures/${id}/components`, body, { headers: authHeader() })).data
export const deleteStructureComponent = async (id, linkId) =>
  (await axios.delete(`${BASE}/structures/${id}/components/${linkId}`, { headers: authHeader() })).data
export const previewStructure = async (body) =>
  (await axios.post(`${BASE}/structures/preview`, body, { headers: authHeader() })).data

// Components
export const fetchComponents = async (params = {}) =>
  (await axios.get(`${BASE}/components/`, { headers: authHeader(), params })).data
export const createComponent = async (body) =>
  (await axios.post(`${BASE}/components/`, body, { headers: authHeader() })).data
export const updateComponent = async (id, body) =>
  (await axios.patch(`${BASE}/components/${id}`, body, { headers: authHeader() })).data
export const deleteComponent = async (id) =>
  (await axios.delete(`${BASE}/components/${id}`, { headers: authHeader() })).data

// One retry on a 5xx absorbs the known StaticPool pre-ping reconnect blip (the remote
// Postgres drops the single idle connection; the first checkout after that 500s once,
// then self-heals — see backend database.py). Keeps the compensation page from flashing
// an error on the first request after an idle period.
const _getWithRetry = async (url) => {
  try {
    return (await axios.get(url, { headers: authHeader() })).data
  } catch (e) {
    if (e?.response?.status >= 500) {
      await new Promise(r => setTimeout(r, 350))
      return (await axios.get(url, { headers: authHeader() })).data
    }
    throw e
  }
}

// Compensation
export const fetchCompHistory = async (employeeId) =>
  _getWithRetry(`${BASE}/compensation/employee/${employeeId}`)
export const fetchCurrentComp = async (employeeId) =>
  _getWithRetry(`${BASE}/compensation/employee/${employeeId}/current`)
export const createCompensation = async (employeeId, body) =>
  (await axios.post(`${BASE}/compensation/employee/${employeeId}`, body, { headers: authHeader() })).data
export const activateCompensation = async (id) =>
  (await axios.post(`${BASE}/compensation/${id}/activate`, {}, { headers: authHeader() })).data
export const deleteCompensation = async (id) =>
  (await axios.delete(`${BASE}/compensation/${id}`, { headers: authHeader() })).data

// Config + audit
export const fetchStatutoryConfig = async (params = {}) =>
  (await axios.get(`${BASE}/config/statutory`, { headers: authHeader(), params })).data
export const updateStatutoryConfig = async (id, body) =>
  (await axios.patch(`${BASE}/config/statutory/${id}`, body, { headers: authHeader() })).data
export const fetchPayrollAudit = async (params = {}) =>
  (await axios.get(`${BASE}/audit`, { headers: authHeader(), params })).data
