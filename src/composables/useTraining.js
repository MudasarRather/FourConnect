// Training & Development (LTCMS) — "Learning Observatory" data layer.
// Mirrors usePayroll.js: tab/group metadata + status/type meta + thin axios
// fetchers. The program/assignment fetchers are re-exported from useOnbMisc so
// the Onboarding training section and this module share a single source.
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import {
  LayoutDashboard, BookOpen, UsersRound, Grid3x3, Award, CalendarClock,
  ShieldCheck, Inbox, Presentation, Library, Star, CalendarDays,
  ClipboardCheck, Wallet, FileBarChart2, ScrollText, Building2, Plane, Coins,
} from 'lucide-vue-next'

// Re-export the shared program/assignment fetchers (single source of truth).
export {
  fetchTrainingPrograms, createTrainingProgram, patchTrainingProgram, deleteTrainingProgram,
  fetchTrainingAssignments, createTrainingAssignment, patchTrainingAssignment, deleteTrainingAssignment,
} from '@/views/hr/onboarding/composables/useOnbMisc'

const BASE = `${API}/hr/training`
const ME = `${API}/hr/me/training`

// ── Tab + group metadata ──────────────────────────────────────────────────
export const TRAINING_GROUPS = [
  { key: 'overview',   label: 'Observatory' },
  { key: 'catalog',    label: 'Catalog' },
  { key: 'people',     label: 'People' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'ops',        label: 'Operations' },
  { key: 'system',     label: 'System' },
]

export const TRAINING_TABS = [
  { key: 'dashboard',            label: 'Dashboard',       icon: LayoutDashboard, group: 'overview' },
  { key: 'programs',             label: 'Programs',        icon: BookOpen,        group: 'catalog' },
  { key: 'trainers',             label: 'Trainers',        icon: Presentation,    group: 'catalog' },
  { key: 'materials',            label: 'Materials',       icon: Library,         group: 'catalog' },
  { key: 'enrollment',           label: 'Employee Trainings', icon: UsersRound,   group: 'people' },
  { key: 'skill-matrix',         label: 'Skill Matrix',    icon: Grid3x3,         group: 'people' },
  { key: 'certifications',       label: 'Certifications',  icon: Award,           group: 'people' },
  { key: 'certification-expiry', label: 'Cert Expiry',     icon: CalendarClock,   group: 'people' },
  { key: 'compliance',           label: 'Compliance',      icon: ShieldCheck,     group: 'compliance' },
  { key: 'requests',             label: 'Requests',        icon: Inbox,           group: 'compliance' },
  { key: 'feedback',             label: 'Feedback',        icon: Star,            group: 'ops' },
  { key: 'assessments',          label: 'Assessments',     icon: ClipboardCheck,  group: 'ops' },
  { key: 'calendar',             label: 'Calendar',        icon: CalendarDays,    group: 'ops' },
  { key: 'budget',               label: 'Budget',          icon: Wallet,          group: 'system' },
  { key: 'reports',              label: 'Reports',         icon: FileBarChart2,   group: 'system' },
  { key: 'audit-logs',           label: 'Audit Logs',      icon: ScrollText,      group: 'system' },
]
export const TRAINING_TAB_KEYS = TRAINING_TABS.map(t => t.key)

// ── Enum meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  NOT_STARTED: { label: 'Not started', token: 'not-started' },
  IN_PROGRESS: { label: 'In progress', token: 'in-progress' },
  COMPLETED:   { label: 'Completed',   token: 'completed' },
  FAILED:      { label: 'Failed',      token: 'failed' },
  WAIVED:      { label: 'Waived',      token: 'waived' },
}
export const statusMeta = (k) => STATUS_META[k] || STATUS_META.NOT_STARTED
export const ASSIGNMENT_STATUSES = Object.keys(STATUS_META)

const CERT_STATUS_META = {
  ACTIVE:          { label: 'Active' },
  EXPIRING_SOON:   { label: 'Expiring soon' },
  EXPIRED:         { label: 'Expired' },
  REVOKED:         { label: 'Revoked' },
  PENDING_RENEWAL: { label: 'Pending renewal' },
}
export const certStatusMeta = (k) => CERT_STATUS_META[k] || CERT_STATUS_META.ACTIVE

export const TRAINING_TYPES = [
  'HR_ORIENTATION', 'SECURITY', 'SOFTWARE', 'COMPLIANCE', 'SAFETY', 'DEPARTMENT', 'OTHER',
]
const TYPE_LABELS = {
  HR_ORIENTATION: 'HR Orientation', SECURITY: 'Security', SOFTWARE: 'Software',
  COMPLIANCE: 'Compliance', SAFETY: 'Safety', DEPARTMENT: 'Department', OTHER: 'Other',
}
export const typeMeta = (k) => ({
  label: TYPE_LABELS[k] || 'Other',
  cssVar: `--trn-type-${(k || 'OTHER').toLowerCase()}`,
})

export const SKILL_CATEGORIES = [
  'TECHNICAL', 'FUNCTIONAL', 'BEHAVIORAL', 'DOMAIN', 'LANGUAGE', 'CERTIFICATION', 'OTHER',
]
export const COMPLIANCE_FREQUENCIES = [
  'ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'BIENNIAL',
]
export const TRAINER_TYPES = ['INTERNAL', 'EXTERNAL', 'VENDOR']
export const MATERIAL_TYPES = ['DOCUMENT', 'VIDEO', 'LINK', 'SLIDE', 'QUIZ', 'OTHER']
export const DELIVERY_MODES = ['CLASSROOM', 'ONLINE', 'BLENDED', 'SELF_PACED', 'WORKSHOP', 'WEBINAR']

// ── Dashboard ─────────────────────────────────────────────────────────────
export async function fetchTrainingStats() {
  const { data } = await axios.get(`${BASE}/stats`, { headers: authHeader() })
  return data
}

// ── Skills + matrix ─────────────────────────────────────────────────────────
export async function fetchSkills(params = {}) {
  const { data } = await axios.get(`${BASE}/skills`, { headers: authHeader(), params })
  return data
}
export async function createSkill(p) { return (await axios.post(`${BASE}/skills`, p, { headers: authHeader() })).data }
export async function patchSkill(id, p) { return (await axios.patch(`${BASE}/skills/${id}`, p, { headers: authHeader() })).data }
export async function deleteSkill(id) { await axios.delete(`${BASE}/skills/${id}`, { headers: authHeader() }) }

export async function fetchSkillRequirements(params = {}) {
  const { data } = await axios.get(`${BASE}/skill-requirements`, { headers: authHeader(), params })
  return data
}
export async function createSkillRequirement(p) { return (await axios.post(`${BASE}/skill-requirements`, p, { headers: authHeader() })).data }
export async function patchSkillRequirement(id, p) { return (await axios.patch(`${BASE}/skill-requirements/${id}`, p, { headers: authHeader() })).data }
export async function deleteSkillRequirement(id) { await axios.delete(`${BASE}/skill-requirements/${id}`, { headers: authHeader() }) }

export async function fetchSkillMatrix(params = {}) {
  const { data } = await axios.get(`${BASE}/skill-matrix`, { headers: authHeader(), params })
  return data
}
export async function upsertEmployeeSkill(p) { return (await axios.post(`${BASE}/skill-matrix`, p, { headers: authHeader() })).data }
export async function patchEmployeeSkill(id, p) { return (await axios.patch(`${BASE}/employee-skills/${id}`, p, { headers: authHeader() })).data }
export async function deleteEmployeeSkill(id) { await axios.delete(`${BASE}/employee-skills/${id}`, { headers: authHeader() }) }
export async function fetchSkillGap(params = {}) {
  const { data } = await axios.get(`${BASE}/skill-gap`, { headers: authHeader(), params })
  return data
}

// ── Certifications ──────────────────────────────────────────────────────────
export async function fetchCertifications(params = {}) {
  const { data } = await axios.get(`${BASE}/certifications`, { headers: authHeader(), params })
  return data
}
export async function createCertification(p) { return (await axios.post(`${BASE}/certifications`, p, { headers: authHeader() })).data }
export async function patchCertification(id, p) { return (await axios.patch(`${BASE}/certifications/${id}`, p, { headers: authHeader() })).data }
export async function deleteCertification(id) { await axios.delete(`${BASE}/certifications/${id}`, { headers: authHeader() }) }

export async function fetchEmployeeCertifications(params = {}) {
  const { data } = await axios.get(`${BASE}/employee-certifications`, { headers: authHeader(), params })
  return data
}
export async function createEmployeeCertification(p) { return (await axios.post(`${BASE}/employee-certifications`, p, { headers: authHeader() })).data }
export async function patchEmployeeCertification(id, p) { return (await axios.patch(`${BASE}/employee-certifications/${id}`, p, { headers: authHeader() })).data }
export async function deleteEmployeeCertification(id) { await axios.delete(`${BASE}/employee-certifications/${id}`, { headers: authHeader() }) }
export async function fetchExpiringCertifications(window = 90) {
  const { data } = await axios.get(`${BASE}/certifications/expiring`, { headers: authHeader(), params: { window } })
  return data
}
export async function renewEmployeeCertification(id) {
  const { data } = await axios.post(`${BASE}/employee-certifications/${id}/renew`, {}, { headers: authHeader() })
  return data
}
export async function downloadCertificatePdf(ec) {
  const res = await axios.get(`${BASE}/employee-certifications/${ec.id}/certificate.pdf`, {
    headers: authHeader(), responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safe = (ec.name || 'credential').replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '_') || 'credential'
  a.download = `certificate_${safe}_${ec.employee_code || 'cert'}.pdf`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ── Compliance ───────────────────────────────────────────────────────────────
export async function fetchCompliance() { return (await axios.get(`${BASE}/compliance`, { headers: authHeader() })).data }
export async function createCompliance(p) { return (await axios.post(`${BASE}/compliance`, p, { headers: authHeader() })).data }
export async function patchCompliance(id, p) { return (await axios.patch(`${BASE}/compliance/${id}`, p, { headers: authHeader() })).data }
export async function deleteCompliance(id) { await axios.delete(`${BASE}/compliance/${id}`, { headers: authHeader() }) }
export async function fetchComplianceStatus(params = {}) {
  const { data } = await axios.get(`${BASE}/compliance/status`, { headers: authHeader(), params })
  return data
}
export async function runComplianceReassign(id) {
  const { data } = await axios.post(`${BASE}/compliance/${id}/run-reassign`, {}, { headers: authHeader() })
  return data
}

// ── Requests (admin / HR) ─────────────────────────────────────────────────────
export async function fetchRequests(params = {}) {
  const { data } = await axios.get(`${BASE}/requests`, { headers: authHeader(), params })
  return data
}
export async function decideRequest(id, payload) {
  const { data } = await axios.patch(`${BASE}/requests/${id}/decide`, payload, { headers: authHeader() })
  return data
}
export async function fulfillRequest(id, payload = {}) {
  const { data } = await axios.post(`${BASE}/requests/${id}/fulfill`, payload, { headers: authHeader() })
  return data
}

// ── Trainers ──────────────────────────────────────────────────────────────────
export async function fetchTrainers(params = {}) { return (await axios.get(`${BASE}/trainers`, { headers: authHeader(), params })).data }
export async function createTrainer(p) { return (await axios.post(`${BASE}/trainers`, p, { headers: authHeader() })).data }
export async function patchTrainer(id, p) { return (await axios.patch(`${BASE}/trainers/${id}`, p, { headers: authHeader() })).data }
export async function deleteTrainer(id, { reason, note } = {}) {
  const params = {}
  if (reason) params.reason = reason
  if (note) params.note = note
  await axios.delete(`${BASE}/trainers/${id}`, { headers: authHeader(), params })
}

// ── Materials ─────────────────────────────────────────────────────────────────
export async function fetchMaterials(params = {}) { return (await axios.get(`${BASE}/materials`, { headers: authHeader(), params })).data }
export async function createMaterial(p) { return (await axios.post(`${BASE}/materials`, p, { headers: authHeader() })).data }
export async function patchMaterial(id, p) { return (await axios.patch(`${BASE}/materials/${id}`, p, { headers: authHeader() })).data }
export async function deleteMaterial(id) { await axios.delete(`${BASE}/materials/${id}`, { headers: authHeader() }) }

// ── Feedback ──────────────────────────────────────────────────────────────────
export async function fetchFeedback(params = {}) { return (await axios.get(`${BASE}/feedback`, { headers: authHeader(), params })).data }
export async function fetchFeedbackSummary() { return (await axios.get(`${BASE}/feedback/summary`, { headers: authHeader() })).data }

// ── Audit logs ────────────────────────────────────────────────────────────────
export async function fetchTrainingAuditLogs(params = {}) {
  const { data } = await axios.get(`${BASE}/audit-logs`, { headers: authHeader(), params })
  return data
}

// ── Assessments (Phase 2) ────────────────────────────────────────────────────
export const ASSESSMENT_TYPES = ['QUIZ', 'EXAM', 'PRACTICAL', 'SURVEY']
export async function fetchAssessments(params = {}) { return (await axios.get(`${BASE}/assessments`, { headers: authHeader(), params })).data }
export async function createAssessment(p) { return (await axios.post(`${BASE}/assessments`, p, { headers: authHeader() })).data }
export async function patchAssessment(id, p) { return (await axios.patch(`${BASE}/assessments/${id}`, p, { headers: authHeader() })).data }
export async function deleteAssessment(id) { await axios.delete(`${BASE}/assessments/${id}`, { headers: authHeader() }) }
export async function fetchAssessmentResults(params = {}) { return (await axios.get(`${BASE}/assessment-results`, { headers: authHeader(), params })).data }
export async function recordAssessmentResult(p) { return (await axios.post(`${BASE}/assessment-results`, p, { headers: authHeader() })).data }

// ── Budget (Phase 2) ──────────────────────────────────────────────────────────
export const BUDGET_PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'ANNUAL']
export const BUDGET_COST_TYPES = ['TRAINER_FEE', 'MATERIAL', 'VENUE', 'TRAVEL', 'CERT_FEE', 'OTHER']

// Shared cost-category meta (icon + warm-palette colour + label) — used across the
// budget hero, breakdown panel, cards and the cost-line modal so they never drift.
export const BUDGET_COST_META = {
  TRAINER_FEE: { label: 'Trainer fee', icon: Presentation, color: 'var(--trn-amber)' },
  MATERIAL:    { label: 'Material',    icon: Library,      color: 'var(--trn-amber-strong)' },
  VENUE:       { label: 'Venue',       icon: Building2,    color: 'var(--trn-ember)' },
  TRAVEL:      { label: 'Travel',      icon: Plane,        color: 'var(--trn-orbit-far)' },
  CERT_FEE:    { label: 'Cert fee',    icon: Award,        color: 'var(--trn-amber-bright)' },
  OTHER:       { label: 'Other',       icon: Coins,        color: 'var(--trn-star-dim)' },
}
export const budgetCostMeta = (k) => BUDGET_COST_META[k] || BUDGET_COST_META.OTHER
export async function fetchBudgets(params = {}) { return (await axios.get(`${BASE}/budgets`, { headers: authHeader(), params })).data }
export async function createBudget(p) { return (await axios.post(`${BASE}/budgets`, p, { headers: authHeader() })).data }
export async function patchBudget(id, p) { return (await axios.patch(`${BASE}/budgets/${id}`, p, { headers: authHeader() })).data }
export async function deleteBudget(id) { await axios.delete(`${BASE}/budgets/${id}`, { headers: authHeader() }) }
export async function fetchBudgetItems(budgetId) { return (await axios.get(`${BASE}/budgets/${budgetId}/items`, { headers: authHeader() })).data }
export async function addBudgetItem(budgetId, p) { return (await axios.post(`${BASE}/budgets/${budgetId}/items`, p, { headers: authHeader() })).data }
export async function deleteBudgetItem(itemId) { await axios.delete(`${BASE}/budget-items/${itemId}`, { headers: authHeader() }) }
export async function fetchBudgetSummary(fiscalYear) {
  const params = fiscalYear ? { fiscal_year: fiscalYear } : {}
  return (await axios.get(`${BASE}/budget/summary`, { headers: authHeader(), params })).data
}

// ── Calendar (Phase 2) ────────────────────────────────────────────────────────
export async function fetchTrainingCalendar(params = {}) {
  return (await axios.get(`${BASE}/calendar`, { headers: authHeader(), params })).data
}

// ── Reports (Phase 2) ─────────────────────────────────────────────────────────
export async function fetchReportsList() { return (await axios.get(`${BASE}/reports`, { headers: authHeader() })).data }
export async function downloadReport(key, format, params = {}) {
  const ext = format === 'excel' ? 'xlsx' : format
  const res = await axios.get(`${BASE}/reports/${key}/export`, {
    headers: authHeader(), params: { format, ...params }, responseType: 'blob',
  })
  const blob = new Blob([res.data])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `training_${key}_${new Date().toISOString().slice(0, 10)}.${ext}`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ── Self-service (/hr/me/training) ──────────────────────────────────────────────
export async function fetchMyTraining() { return (await axios.get(`${ME}/`, { headers: authHeader() })).data }
export async function fetchMyTrainingSummary() { return (await axios.get(`${ME}/summary`, { headers: authHeader() })).data }
export async function updateMyProgress(assignmentId, status) {
  const { data } = await axios.patch(`${ME}/${assignmentId}/progress`, { status }, { headers: authHeader() })
  return data
}
export async function fetchMyCertifications() { return (await axios.get(`${ME}/certifications`, { headers: authHeader() })).data }
export async function fetchMySkills() { return (await axios.get(`${ME}/skills`, { headers: authHeader() })).data }
export async function fetchMyRequests() { return (await axios.get(`${ME}/requests`, { headers: authHeader() })).data }
export async function createMyRequest(p) { return (await axios.post(`${ME}/requests`, p, { headers: authHeader() })).data }
export async function withdrawMyRequest(id) { await axios.delete(`${ME}/requests/${id}`, { headers: authHeader() }) }
export async function fetchMyApprovalQueue() { return (await axios.get(`${ME}/requests/approval-queue`, { headers: authHeader() })).data }
export async function decideMyQueue(id, payload) {
  const { data } = await axios.patch(`${ME}/requests/${id}/decide`, payload, { headers: authHeader() })
  return data
}
export async function submitMyFeedback(assignmentId, p) {
  const { data } = await axios.post(`${ME}/${assignmentId}/feedback`, p, { headers: authHeader() })
  return data
}
export async function fetchMyMaterials(programId) {
  const params = programId ? { program_id: programId } : {}
  const { data } = await axios.get(`${ME}/materials`, { headers: authHeader(), params })
  return data
}

// ── Self-service reports (PDF / Excel / CSV) ─────────────────────────────────
export async function fetchMyReportsList() {
  const { data } = await axios.get(`${ME}/reports`, { headers: authHeader() })
  return data
}
export async function downloadMyReport(key, format, params = {}) {
  const ext = format === 'excel' ? 'xlsx' : format
  const res = await axios.get(`${ME}/reports/${key}/export`, {
    headers: authHeader(), params: { format, ...params }, responseType: 'blob',
  })
  const blob = new Blob([res.data])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `my_${key}_${new Date().toISOString().slice(0, 10)}.${ext}`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
