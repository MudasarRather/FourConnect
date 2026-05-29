// Data layer for the HR Employee Documents module.
// Reactive list state + lifecycle actions over /api/hr/employee-documents.
import { ref, computed } from 'vue'
import axios from 'axios'
import { API, API_BASE } from '@/utils/api'

const BASE = `${API}/hr/employee-documents`

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const DOC_CATEGORIES = [
  { key: 'KYC', label: 'KYC', tab: 'kyc' },
  { key: 'CONTRACT', label: 'Contracts', tab: 'contracts' },
  { key: 'CERTIFICATE', label: 'Certificates', tab: 'certificates' },
  { key: 'SALARY_SLIP', label: 'Salary Slips', tab: 'salary-slips' },
  { key: 'EXPERIENCE_LETTER', label: 'Experience Letters', tab: 'experience-letters' },
  { key: 'ID_PROOF', label: 'ID Proofs', tab: 'id-proofs' },
  { key: 'EDUCATION', label: 'Education', tab: 'education' },
  { key: 'COMPLIANCE', label: 'Compliance', tab: 'compliance' },
]

// Common doc-type suggestions per category (for the upload form).
export const DOC_TYPES = {
  KYC: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'BANK_PASSBOOK', 'UTILITY_BILL'],
  CONTRACT: ['EMPLOYMENT_CONTRACT', 'NDA', 'CONFIDENTIALITY_AGREEMENT', 'CONSULTANCY_AGREEMENT', 'INTERNSHIP_AGREEMENT', 'OFFER_LETTER', 'CONTRACT_RENEWAL'],
  CERTIFICATE: ['TECHNICAL_CERTIFICATION', 'GOVERNMENT_CERTIFICATION', 'SAFETY_CERTIFICATION', 'TRAINING_CERTIFICATE', 'COMPLIANCE_CERTIFICATION'],
  SALARY_SLIP: ['PAYSLIP'],
  EXPERIENCE_LETTER: ['EXPERIENCE_LETTER', 'RELIEVING_LETTER', 'PROMOTION_LETTER', 'CONFIRMATION_LETTER', 'TRANSFER_LETTER'],
  ID_PROOF: ['EMPLOYEE_ID', 'RFID_ID', 'BIOMETRIC_ID', 'PHOTO', 'PASSPORT'],
  EDUCATION: ['DEGREE', 'DIPLOMA', 'MARKSHEET', 'UNIVERSITY_CERTIFICATE', 'TRAINING_CERTIFICATE'],
  COMPLIANCE: ['PF', 'ESI', 'TAX_FORM', 'POLICE_VERIFICATION', 'MEDICAL_FITNESS', 'BACKGROUND_VERIFICATION'],
  OTHER: ['DOCUMENT', 'RESUME'],
}

export function useEmployeeDocuments() {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({ page: 1, limit: 20, q: '', status: null, category: null, archived: false })

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
      error.value = e?.response?.data?.detail || 'Failed to load documents'
      items.value = []; total.value = 0
    } finally { loading.value = false }
  }

  const fetchQueue = async (page = 1, limit = 20) => {
    loading.value = true
    try {
      const res = await axios.get(`${BASE}/queue`, { headers: authHeader(), params: { page, limit } })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) { error.value = e?.response?.data?.detail || 'Failed to load queue'; items.value = [] }
    finally { loading.value = false }
  }

  const fetchExpiring = async (within = 90) => {
    loading.value = true
    try {
      const res = await axios.get(`${BASE}/expiring`, { headers: authHeader(), params: { within, limit: 200 } })
      items.value = res.data.items || []; total.value = res.data.total || 0
    } catch (e) { error.value = e?.response?.data?.detail || 'Failed to load expiring docs'; items.value = [] }
    finally { loading.value = false }
  }

  const byEmployee = async (employeeId) => {
    const res = await axios.get(`${BASE}/by-employee/${employeeId}`, { headers: authHeader() })
    return res.data.items || []
  }
  const getOne = async (id, reveal = false) => {
    const res = await axios.get(`${BASE}/${id}`, { headers: authHeader(), params: reveal ? { reveal: true } : {} })
    return res.data
  }
  const create = async (payload) => (await axios.post(`${BASE}/`, payload, { headers: authHeader() })).data
  const update = async (id, patch) => (await axios.patch(`${BASE}/${id}`, patch, { headers: authHeader() })).data

  const uploadFile = async (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`${BASE}/${id}/upload`, fd, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  const verify = async (id, body = {}) => (await axios.post(`${BASE}/${id}/verify`, body, { headers: authHeader() })).data
  const reject = async (id, reason) => (await axios.post(`${BASE}/${id}/reject`, { reason }, { headers: authHeader() })).data
  const requestResubmit = async (id, reason) => (await axios.post(`${BASE}/${id}/request-resubmit`, { reason }, { headers: authHeader() })).data
  const bulk = async (ids, action, reason = null) => (await axios.post(`${BASE}/verify-bulk`, { ids, action, reason }, { headers: authHeader() })).data
  const archive = async (id) => (await axios.post(`${BASE}/${id}/archive`, {}, { headers: authHeader() })).data
  const restore = async (id) => (await axios.post(`${BASE}/${id}/restore`, {}, { headers: authHeader() })).data
  const remove = async (id, body = null) => {
    // axios uses `data` (not `body`) on DELETE and silently drops it if Content-Type isn't set.
    const config = { headers: authHeader() }
    if (body && (body.reason || body.reason_category)) {
      config.data = body
      config.headers['Content-Type'] = 'application/json'
    }
    await axios.delete(`${BASE}/${id}`, config)
  }
  const syncOnboarding = async (employeeId) => (await axios.post(`${BASE}/sync-onboarding/${employeeId}`, {}, { headers: authHeader() })).data

  // Returns a fully-qualified, short-lived signed download URL.
  const downloadUrl = async (id) => {
    const res = await axios.post(`${BASE}/${id}/download-token`, {}, { headers: authHeader() })
    return `${API_BASE}${res.data.url}`
  }

  return {
    items, total, loading, error, filters, totalPages,
    setFilters, setPage, fetchList, fetchQueue, fetchExpiring,
    byEmployee, getOne, create, update, uploadFile,
    verify, reject, requestResubmit, bulk, archive, restore, remove,
    syncOnboarding, downloadUrl,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Admin Document Requests — outgoing requests from employees, HR's queue
// ════════════════════════════════════════════════════════════════════════════

export const REQUEST_TYPE_META = [
  { key: 'EXPERIENCE_LETTER',   label: 'Experience Letter',   tag: 'Career',   icon: 'Mail' },
  { key: 'RELIEVING_LETTER',    label: 'Relieving Letter',    tag: 'Exit',     icon: 'FileSignature' },
  { key: 'CONFIRMATION_LETTER', label: 'Confirmation Letter', tag: 'Status',   icon: 'Award' },
  { key: 'APPOINTMENT_LETTER',  label: 'Appointment Letter',  tag: 'Joining',  icon: 'Briefcase' },
  { key: 'SALARY_CERTIFICATE',  label: 'Salary Certificate',  tag: 'Finance',  icon: 'Wallet' },
  { key: 'NDA',                 label: 'NDA Copy',            tag: 'Legal',    icon: 'Shield' },
  { key: 'OFFER_LETTER',        label: 'Offer Letter Copy',   tag: 'Joining',  icon: 'FileText' },
  { key: 'ADDRESS_PROOF',       label: 'Address Proof',       tag: 'Verify',   icon: 'MapPin' },
  { key: 'NO_OBJECTION',        label: 'No-Objection Letter', tag: 'Travel',   icon: 'Plane' },
  { key: 'CUSTOM',              label: 'Custom Request',      tag: 'Other',    icon: 'Stamp' },
]

export const REQUEST_STATUS_META = {
  PENDING:     { label: 'Pending',     fg: '#a16207', bg: 'rgba(202, 138, 4, 0.18)',  ring: 'rgba(202, 138, 4, 0.45)' },
  IN_PROGRESS: { label: 'In progress', fg: '#0369a1', bg: 'rgba(2, 132, 199, 0.16)',  ring: 'rgba(2, 132, 199, 0.45)' },
  FULFILLED:   { label: 'Fulfilled',   fg: '#0f766e', bg: 'rgba(13, 148, 136, 0.18)', ring: 'rgba(13, 148, 136, 0.45)' },
  REJECTED:    { label: 'Rejected',    fg: '#b91c1c', bg: 'rgba(220, 38, 38, 0.16)',  ring: 'rgba(220, 38, 38, 0.45)' },
  CANCELLED:   { label: 'Cancelled',   fg: '#475569', bg: 'rgba(71, 85, 105, 0.14)',  ring: 'rgba(71, 85, 105, 0.34)' },
}

export async function fetchAdminRequests(params = {}) {
  const res = await axios.get(`${BASE}/admin/requests`, { headers: authHeader(), params })
  return res.data
}

export async function decideAdminRequest(reqId, payload) {
  const res = await axios.patch(`${BASE}/admin/requests/${reqId}`, payload, { headers: authHeader() })
  return res.data
}

export async function fetchEdocDashboard() {
  const res = await axios.get(`${BASE}/dashboard`, { headers: authHeader() })
  return res.data
}

export const TEMPLATE_TYPES = [
  { key: 'EXPERIENCE_LETTER', label: 'Experience Letter' },
  { key: 'RELIEVING_LETTER', label: 'Relieving Letter' },
  { key: 'CONFIRMATION_LETTER', label: 'Confirmation Letter' },
  { key: 'APPOINTMENT_LETTER', label: 'Appointment Letter' },
  { key: 'OFFER_LETTER', label: 'Offer Letter' },
  { key: 'SALARY_CERTIFICATE', label: 'Salary Certificate' },
  { key: 'NDA', label: 'NDA' },
]
export const COMMON_PLACEHOLDERS = ['employee_name', 'employee_code', 'designation', 'department', 'joining_date', 'issue_date', 'company']

// Per-template-type placeholder banks — surface only what each letter really needs.
// Keep entries in groups so the editor can show them as labelled sections.
export const TEMPLATE_PLACEHOLDERS = {
  EXPERIENCE_LETTER: {
    Employee: ['employee_name', 'employee_code', 'designation', 'department', 'gender', 'employment_type', 'work_location'],
    Tenure:   ['joining_date', 'last_working_date'],
    Document: ['issue_date', 'reference_no', 'company', 'hr_email'],
  },
  RELIEVING_LETTER: {
    Employee: ['employee_name', 'employee_code', 'designation', 'department', 'current_address', 'email'],
    Separation: ['resignation_date', 'last_working_date', 'exit_reason', 'settlement_amount', 'notice_period_days'],
    Document: ['issue_date', 'reference_no', 'company'],
  },
  CONFIRMATION_LETTER: {
    Employee: ['employee_name', 'employee_code', 'designation', 'department'],
    Confirmation: ['joining_date', 'confirmation_date', 'probation_months', 'performance_rating', 'notice_period_days'],
    Document: ['issue_date', 'reference_no', 'company'],
  },
  APPOINTMENT_LETTER: {
    Employee: ['employee_name', 'employee_code', 'designation', 'department', 'current_address', 'email'],
    Employment: ['joining_date', 'work_location', 'reporting_manager', 'probation_months', 'notice_period_days', 'employment_type'],
    Compensation: ['annual_ctc', 'monthly_ctc', 'basic', 'hra', 'special_allowance'],
    Document: ['issue_date', 'reference_no', 'company'],
  },
  OFFER_LETTER: {
    Candidate: ['candidate_name', 'designation', 'department', 'current_address', 'email'],
    Offer: ['joining_date', 'offer_valid_till', 'work_location', 'reporting_manager', 'annual_ctc', 'monthly_ctc', 'sign_on_bonus'],
    Document: ['issue_date', 'reference_no', 'company', 'hr_email'],
  },
  SALARY_CERTIFICATE: {
    Employee: ['employee_name', 'employee_code', 'designation', 'department', 'joining_date'],
    Compensation: ['annual_ctc', 'monthly_ctc', 'basic', 'hra', 'pf_amount', 'tax'],
    Purpose: ['purpose', 'bank_name', 'account_number', 'requesting_authority'],
    Document: ['issue_date', 'reference_no', 'company'],
  },
  NDA: {
    Parties: ['recipient_name', 'recipient_code', 'recipient_designation', 'recipient_address', 'recipient_email'],
    Company: ['company', 'company_address', 'company_cin'],
    Terms: ['term_years', 'effective_date', 'governing_law', 'execution_city'],
    Document: ['issue_date', 'reference_no'],
  },
}

/**
 * Form fields the user can fill at Generate time for each template type.
 * Each entry: { key, label, kind: 'text'|'number'|'date'|'textarea'|'address', helper? }
 */
export const TEMPLATE_FORM_FIELDS = {
  EXPERIENCE_LETTER: [
    { key: 'last_working_date', label: 'Last Working Day (leave blank for "till date")', kind: 'date' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea', helper: 'A paragraph of free-form text to insert after the main body.' },
  ],
  RELIEVING_LETTER: [
    { key: 'resignation_date', label: 'Resignation Date', kind: 'date' },
    { key: 'last_working_date', label: 'Last Working Day', kind: 'date' },
    { key: 'exit_reason', label: 'Reason for Separation', kind: 'text', helper: 'e.g. Voluntary resignation' },
    { key: 'settlement_amount', label: 'Settlement Amount (₹)', kind: 'number' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea' },
  ],
  CONFIRMATION_LETTER: [
    { key: 'confirmation_date', label: 'Confirmation Date', kind: 'date' },
    { key: 'probation_months', label: 'Probation Period (months)', kind: 'number' },
    { key: 'performance_rating', label: 'Performance Rating (optional)', kind: 'text' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea' },
  ],
  APPOINTMENT_LETTER: [
    { key: 'joining_date', label: 'Date of Joining', kind: 'date' },
    { key: 'annual_ctc', label: 'Annual CTC (₹)', kind: 'number' },
    { key: 'probation_months', label: 'Probation Period (months)', kind: 'number' },
    { key: 'notice_period_days', label: 'Notice Period (days, post-confirmation)', kind: 'number' },
    { key: 'work_location', label: 'Work Location', kind: 'text' },
    { key: 'reporting_manager', label: 'Reporting Manager', kind: 'text' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea' },
  ],
  OFFER_LETTER: [
    { key: 'designation', label: 'Position / Designation', kind: 'text' },
    { key: 'department', label: 'Department', kind: 'text' },
    { key: 'joining_date', label: 'Proposed Joining Date', kind: 'date' },
    { key: 'annual_ctc', label: 'Annual CTC (₹)', kind: 'number' },
    { key: 'expiry_date', label: 'Offer Valid Till', kind: 'date' },
    { key: 'work_location', label: 'Work Location', kind: 'text' },
    { key: 'reporting_manager', label: 'Reporting Manager', kind: 'text' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea' },
  ],
  SALARY_CERTIFICATE: [
    { key: 'annual_ctc', label: 'Annual CTC (₹)', kind: 'number' },
    { key: 'purpose', label: 'Purpose', kind: 'text', helper: 'e.g. visa application, home loan, etc.' },
    { key: 'requesting_authority', label: 'Requesting Authority (optional)', kind: 'text' },
  ],
  NDA: [
    { key: 'company_name', label: 'Company / Disclosing Party Name', kind: 'text', helper: 'Defaults to Fourreck Technologies Pvt. Ltd. — override if executing under a different legal entity.' },
    { key: 'term_years', label: 'Confidentiality Term (years)', kind: 'number', helper: 'Number of years the obligations survive after the engagement ends.' },
    { key: 'effective_date', label: 'Effective Date', kind: 'date' },
    { key: 'execution_city', label: 'Place of Execution', kind: 'text', helper: 'City where the agreement is signed (e.g. Hyderabad)' },
    { key: 'governing_law', label: 'Governing Law / Jurisdiction', kind: 'text', helper: 'e.g. Hyderabad, Telangana, India' },
    { key: 'company_address', label: 'Company Registered Office Address', kind: 'textarea' },
    { key: 'recipient_address', label: 'Recipient Address', kind: 'textarea' },
    { key: 'additional_clauses', label: 'Additional clauses (optional)', kind: 'textarea' },
  ],
}

export function useEdocTemplates() {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')

  const fetchList = async () => {
    loading.value = true; error.value = ''
    try {
      const res = await axios.get(`${BASE}/templates/list`, { headers: authHeader(), params: { limit: 100 } })
      items.value = res.data.items || []
    } catch (e) { error.value = e?.response?.data?.detail || 'Failed to load templates'; items.value = [] }
    finally { loading.value = false }
  }
  const create = async (payload) => (await axios.post(`${BASE}/templates`, payload, { headers: authHeader() })).data
  const update = async (id, patch) => (await axios.patch(`${BASE}/templates/${id}`, patch, { headers: authHeader() })).data
  const remove = async (id) => { await axios.delete(`${BASE}/templates/${id}`, { headers: authHeader() }) }

  return { items, loading, error, fetchList, create, update, remove }
}
