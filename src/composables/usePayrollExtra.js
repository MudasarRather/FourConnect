// Phase B/C payroll data layer — adjustments, tax, TDS, compliance, reports, bank files.
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const BASE = `${API}/hr/payroll`

// Adjustment type metadata (drives bonus / incentive / variable-pay / arrear tabs).
export const ADJUSTMENT_KINDS = {
  BONUS: { key: 'BONUS', label: 'Bonus', subTypes: ['Festival', 'Performance', 'Joining', 'Retention', 'Project Completion'] },
  INCENTIVE: { key: 'INCENTIVE', label: 'Incentive', subTypes: ['Sales', 'Recruitment', 'Attendance', 'Referral'] },
  VARIABLE_PAY: { key: 'VARIABLE_PAY', label: 'Variable Pay', subTypes: ['Performance Pay', 'Commission', 'Quarterly Incentive', 'Project Bonus'] },
  ARREAR: { key: 'ARREAR', label: 'Arrear', subTypes: ['Delayed Increment', 'Delayed Promotion', 'Attendance Correction', 'Salary Revision'] },
  DEDUCTION: { key: 'DEDUCTION', label: 'Deduction', subTypes: ['Loan Recovery', 'Advance Recovery', 'Other'] },
}
export const ADJ_STATUSES = [
  { key: 'DRAFT', label: 'Draft', pillClass: 'draft' },
  { key: 'APPROVED', label: 'Approved', pillClass: 'approved' },
  { key: 'PAID', label: 'Paid', pillClass: 'released' },
  { key: 'CANCELLED', label: 'Cancelled', pillClass: 'cancelled' },
]
export const adjStatusMeta = (k) => ADJ_STATUSES.find(s => s.key === k) || { key: k, label: k, pillClass: 'cancelled' }

// Adjustments
export const fetchAdjustments = async (params = {}) =>
  (await axios.get(`${BASE}/adjustments/`, { headers: authHeader(), params })).data
export const createAdjustment = async (body) =>
  (await axios.post(`${BASE}/adjustments/`, body, { headers: authHeader() })).data
export const updateAdjustment = async (id, body) =>
  (await axios.patch(`${BASE}/adjustments/${id}`, body, { headers: authHeader() })).data
export const approveAdjustment = async (id) =>
  (await axios.post(`${BASE}/adjustments/${id}/approve`, {}, { headers: authHeader() })).data
// cancel / delete accept an optional { reason, note } body — persisted to the payroll audit log.
export const cancelAdjustment = async (id, body = null) =>
  (await axios.post(`${BASE}/adjustments/${id}/cancel`, body || {}, { headers: authHeader() })).data
export const deleteAdjustment = async (id, body = null) =>
  (await axios.delete(`${BASE}/adjustments/${id}`, { headers: authHeader(), data: body || undefined })).data

// Tax / TDS / compliance
export const projectTax = async (body) =>
  (await axios.post(`${BASE}/tax/project`, body, { headers: authHeader() })).data
export const fetchTdsSummary = async (year, month) =>
  (await axios.get(`${BASE}/tds`, { headers: authHeader(), params: { year, month } })).data
export const fetchCompliance = async (year, month) =>
  (await axios.get(`${BASE}/compliance`, { headers: authHeader(), params: { year, month } })).data

// Reports — index, live preview telemetry, and multi-format export.
export const fetchReportIndex = async () =>
  (await axios.get(`${BASE}/reports`, { headers: authHeader() })).data

// Live KPI / per-report counts driving the Reports hub for a pay period.
export const fetchReportPreview = async (year, month, departmentId = null) =>
  (await axios.get(`${BASE}/reports/preview`, {
    headers: authHeader(),
    params: { year, month, department_id: departmentId || undefined },
  })).data

// Per-format download metadata. The backend sets a Content-Disposition filename;
// we still supply a sensible local fallback name.
const _REPORT_FMT = {
  pdf:   { ext: 'pdf',  mime: 'application/pdf' },
  excel: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  csv:   { ext: 'csv',  mime: 'text/csv' },
}
export const downloadReport = (key, year, month, format = 'pdf', departmentId = null) => {
  const m = _REPORT_FMT[format] || _REPORT_FMT.pdf
  return _downloadBlobUrl(
    `${BASE}/reports/${key}/export`,
    { year, month, format, department_id: departmentId || undefined },
    `${key}-${year}-${String(month).padStart(2, '0')}.${m.ext}`, m.mime,
  )
}

// Generic blob download (handles both CSV and binary XLSX).
async function _downloadBlobUrl(url, params, filename, mime) {
  const res = await axios.get(url, { headers: authHeader(), params, responseType: 'blob' })
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: mime }))
  const a = document.createElement('a')
  a.href = blobUrl; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
}

// Bank disbursement file — NEFT CSV (bank upload), styled Excel advice, or PDF advice.
const _BANK_FMT = {
  csv:  { name: 'bank',         ext: 'csv',  mime: 'text/csv' },
  xlsx: { name: 'disbursement', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pdf:  { name: 'disbursement', ext: 'pdf',  mime: 'application/pdf' },
}
export const downloadBankFile = (batchId, batchNo, fmt = 'csv') => {
  const m = _BANK_FMT[fmt] || _BANK_FMT.csv
  return _downloadBlobUrl(
    `${BASE}/batches/${batchId}/bank-file`, { fmt },
    `${m.name}-${batchNo || batchId}.${m.ext}`, m.mime,
  )
}
export const fetchBankFileSummary = async (batchId) =>
  (await axios.get(`${BASE}/batches/${batchId}/bank-file/summary`, { headers: authHeader() })).data

// Revisions (org-wide)
export const fetchRevisions = async (limit = 100) =>
  (await axios.get(`${BASE}/compensation/revisions`, { headers: authHeader(), params: { limit } })).data
