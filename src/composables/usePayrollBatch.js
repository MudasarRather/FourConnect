// Payroll batch (monthly run) data layer — /api/hr/payroll/batches.
import { ref } from 'vue'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/payroll/batches`

// legal next actions per batch status (drives button enablement)
export const BATCH_TRANSITIONS = {
  DRAFT:     [{ action: 'generate', label: 'Generate', primary: true }],
  GENERATED: [{ action: 'verify', label: 'Verify', primary: true },
              { action: 'recalc', label: 'Recalculate' },
              { action: 'reopen', label: 'Reopen' }],
  VERIFIED:  [{ action: 'approve', label: 'Approve', primary: true },
              { action: 'return', label: 'Return' }],
  APPROVED:  [{ action: 'release', label: 'Release', primary: true, confirm: true },
              { action: 'return', label: 'Return' }],
  RELEASED:  [{ action: 'lock', label: 'Lock', primary: true, confirm: true }],
  LOCKED:    [],
  CANCELLED: [],
}

// Pre-flight eligibility roster for a period/scope — who gets paid, who's
// blocked and why, final-settlement (exited) flags, and engine-computed net.
// Drives the run wizard + Processing dial. One retry on a 5xx absorbs the known
// StaticPool pre-ping reconnect blip (see backend database.py) so a transient
// dropped connection doesn't surface as a hard failure to the user.
export const fetchEligibility = async (body) => {
  try {
    return (await axios.post(`${BASE}/eligibility`, body, { headers: authHeader() })).data
  } catch (e) {
    if (e?.response?.status >= 500) {
      await new Promise(r => setTimeout(r, 350))
      return (await axios.post(`${BASE}/eligibility`, body, { headers: authHeader() })).data
    }
    throw e
  }
}

export const fetchBatches = async (params = {}) =>
  (await axios.get(`${BASE}/`, { headers: authHeader(), params })).data
export const fetchBatch = async (id) =>
  (await axios.get(`${BASE}/${id}`, { headers: authHeader() })).data
export const createBatch = async (body) =>
  (await axios.post(`${BASE}/`, body, { headers: authHeader() })).data
export const generateBatch = async (id) =>
  (await axios.post(`${BASE}/${id}/generate`, {}, { headers: authHeader() })).data
export const fetchBatchPayslips = async (id, params = {}) =>
  (await axios.get(`${BASE}/${id}/payslips`, { headers: authHeader(), params })).data
export const fetchBatchProgress = async (id) =>
  (await axios.get(`${BASE}/${id}/progress`, { headers: authHeader() })).data
export const fetchBatchAudit = async (id) =>
  (await axios.get(`${BASE}/${id}/audit`, { headers: authHeader() })).data

export const transitionBatch = async (id, action, body = {}) =>
  (await axios.post(`${BASE}/${id}/${action}`, body, { headers: authHeader() })).data

// Soft-delete a pay run (reason required). Backend blocks RELEASED/LOCKED runs.
export const deleteBatch = async (id, body) =>
  (await axios.post(`${BASE}/${id}/delete`, body, { headers: authHeader() })).data

// A run can be deleted unless it's part of the disbursement record.
export const canDeleteBatch = (status) => !['RELEASED', 'LOCKED'].includes(status)

// Factory bundling reactive batch state + a generation-progress poller.
export function usePayrollBatch() {
  const batch = ref(null)
  const payslips = ref([])
  const total = ref(0)
  const loading = ref(false)
  const generating = ref(false)
  const genProgress = ref({ done: 0, total: 0, pct: 0 })

  const load = async (id) => {
    loading.value = true
    try { batch.value = await fetchBatch(id) }
    finally { loading.value = false }
  }
  const loadPayslips = async (id, params = {}) => {
    const res = await fetchBatchPayslips(id, params)
    payslips.value = res.items || []
    total.value = res.total || 0
  }
  const generate = async (id) => {
    generating.value = true
    try {
      const updated = await generateBatch(id)
      batch.value = updated
      await loadPayslips(id)
    } finally { generating.value = false }
  }
  const act = async (id, action, body = {}) => {
    batch.value = await transitionBatch(id, action, body)
    return batch.value
  }
  return { batch, payslips, total, loading, generating, genProgress, load, loadPayslips, generate, act }
}
