// HR Settings — REST helpers shared by every master section + the dashboard.
// Master list endpoints return either a plain array (departments/designations/
// grades/locations) or a paginated { items, total } shape (asset-categories);
// `listMaster` normalises both.
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

export function errText(e, fallback = 'Something went wrong') {
  return e?.response?.data?.detail || e?.message || fallback
}

const h = () => ({ headers: authHeader() })

/** GET `${API}/hr/<base>/` → always returns an array. */
export async function listMaster(base, params = {}) {
  const res = await axios.get(`${API}/hr/${base}/`, { ...h(), params })
  const d = res.data
  return Array.isArray(d) ? d : (d?.items || [])
}

export async function createMaster(base, payload) {
  const res = await axios.post(`${API}/hr/${base}/`, payload, h())
  return res.data
}

export async function updateMaster(base, id, payload) {
  const res = await axios.patch(`${API}/hr/${base}/${id}`, payload, h())
  return res.data
}

export async function deleteMaster(base, id, reason) {
  const params = reason && String(reason).trim() ? { reason: String(reason).trim() } : {}
  await axios.delete(`${API}/hr/${base}/${id}`, { ...h(), params })
}

// ── Enum masters (mirrored from backend app/models/hr/employee.py) ───────────
// Phase A renders these read-only with editable display labels; Phase B swaps in
// the real configurable master tables.
export const EMPLOYMENT_TYPE_ENUM = [
  { code: 'FULL_TIME', label: 'Full Time' },
  { code: 'CONTRACT', label: 'Contract' },
  { code: 'CONSULTANT', label: 'Consultant' },
  { code: 'INTERN', label: 'Intern' },
  { code: 'PART_TIME', label: 'Part Time' },
]
export const EMPLOYEE_CATEGORY_ENUM = [
  { code: 'PERMANENT', label: 'Permanent' },
  { code: 'PROBATIONARY', label: 'Probationary' },
  { code: 'CONTRACT', label: 'Contract' },
  { code: 'TRAINEE', label: 'Trainee' },
]

export function titleCase(s) {
  return String(s || '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ── Fiscal year (India: Apr–Mar) ─────────────────────────────────────────────
export function currentFiscalYear(d = new Date()) {
  const y = d.getFullYear()
  const startYear = d.getMonth() >= 3 ? y : y - 1   // Apr = month 3
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

// ── Compliance / statutory config (existing payroll API) ─────────────────────
export async function listStatutory(fiscalYear, stateCode) {
  const params = {}
  if (fiscalYear) params.fiscal_year = fiscalYear
  if (stateCode) params.state_code = stateCode
  const res = await axios.get(`${API}/hr/payroll/config/statutory`, { ...h(), params })
  const d = res.data
  return Array.isArray(d) ? d : (d?.items || [])
}
export async function createStatutory(payload) {
  return (await axios.post(`${API}/hr/payroll/config/statutory`, payload, h())).data
}
export async function updateStatutory(id, payload) {
  return (await axios.patch(`${API}/hr/payroll/config/statutory/${id}`, payload, h())).data
}
export async function deleteStatutory(id, reason) {
  const params = reason && String(reason).trim() ? { reason: String(reason).trim() } : {}
  await axios.delete(`${API}/hr/payroll/config/statutory/${id}`, { ...h(), params })
}

// ── Notification rules ───────────────────────────────────────────────────────
export async function notificationCatalog() {
  return (await axios.get(`${API}/hr/settings/notification-rules/catalog`, h())).data
}
export async function listNotificationRules() {
  const res = await axios.get(`${API}/hr/settings/notification-rules/`, h())
  const d = res.data
  return Array.isArray(d) ? d : (d?.items || [])
}
export async function upsertNotificationRule(payload) {
  return (await axios.put(`${API}/hr/settings/notification-rules/`, payload, h())).data
}
export async function deleteNotificationRule(id, reason) {
  const params = reason && String(reason).trim() ? { reason: String(reason).trim() } : {}
  await axios.delete(`${API}/hr/settings/notification-rules/${id}`, { ...h(), params })
}

// ── Approval workflows ───────────────────────────────────────────────────────
export async function listApprovalWorkflows() {
  return (await axios.get(`${API}/hr/settings/approval-workflows/`, h())).data
}
export async function updateApprovalChain(module, policyId, approval_chain, reason) {
  const body = { approval_chain }
  if (reason && String(reason).trim()) body.reason = String(reason).trim()
  return (await axios.patch(`${API}/hr/settings/approval-workflows/${module}/${policyId}`, body, h())).data
}

// ── Numbering series ─────────────────────────────────────────────────────────
export async function numberingCatalog() {
  return (await axios.get(`${API}/hr/settings/numbering/catalog`, h())).data
}
export async function listNumbering() {
  return (await axios.get(`${API}/hr/settings/numbering/`, h())).data
}
export async function createNumbering(payload) {
  return (await axios.post(`${API}/hr/settings/numbering/`, payload, h())).data
}
export async function updateNumbering(id, payload) {
  return (await axios.patch(`${API}/hr/settings/numbering/${id}`, payload, h())).data
}
export async function deleteNumbering(id, reason) {
  const params = reason && String(reason).trim() ? { reason: String(reason).trim() } : {}
  await axios.delete(`${API}/hr/settings/numbering/${id}`, { ...h(), params })
}
export async function syncNumbering(id) {
  return (await axios.post(`${API}/hr/settings/numbering/${id}/sync`, {}, h())).data
}

// ── Payroll rules ────────────────────────────────────────────────────────────
export async function payrollRulesCatalog() {
  return (await axios.get(`${API}/hr/settings/payroll-rules/catalog`, h())).data
}
export async function getPayrollRules(fiscalYear) {
  const params = {}
  if (fiscalYear) params.fiscal_year = fiscalYear
  return (await axios.get(`${API}/hr/settings/payroll-rules/`, { ...h(), params })).data
}
export async function upsertPayrollRule(payload) {
  return (await axios.put(`${API}/hr/settings/payroll-rules/`, payload, h())).data
}

// ── Appraisal templates ──────────────────────────────────────────────────────
export async function listAppraisalTemplates() {
  return (await axios.get(`${API}/hr/settings/appraisal-templates/`, h())).data
}
export async function createAppraisalTemplate(payload) {
  return (await axios.post(`${API}/hr/settings/appraisal-templates/`, payload, h())).data
}
export async function updateAppraisalTemplate(id, payload) {
  return (await axios.patch(`${API}/hr/settings/appraisal-templates/${id}`, payload, h())).data
}
export async function deleteAppraisalTemplate(id) {
  await axios.delete(`${API}/hr/settings/appraisal-templates/${id}`, h())
}

// ── Unified settings audit ───────────────────────────────────────────────────
export async function listSettingsAudit({ entityType, skip = 0, limit = 50 } = {}) {
  const params = { skip, limit }
  if (entityType) params.entity_type = entityType
  return (await axios.get(`${API}/hr/settings/audit-logs/`, { ...h(), params })).data
}
