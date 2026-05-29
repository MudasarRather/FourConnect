// ════════════════════════════════════════════════════════════════════════════
// useSelfServiceDocuments — employee-facing wrapper for /api/hr/employee-documents/me/*
// ────────────────────────────────────────────────────────────────────────────
// Mirrors the shape of useEmployeeDocuments (admin) but every call hits the
// /me/* cluster — backed by token auth, scoped to the calling user's own
// employee record server-side.
// ════════════════════════════════════════════════════════════════════════════

import axios from 'axios'
import { API } from '@/utils/api'

const BASE = `${API}/hr/employee-documents`

const authHeader = () => {
  const t = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// ─── Category & doc-type metadata (frontend-only) ───────────────────────────

export const DOC_CATEGORIES = [
  { key: 'KYC',               label: 'KYC',                tone: '#fbbf24', mandatory: true,  icon: 'IdCard' },
  { key: 'ID_PROOF',          label: 'ID Proofs',          tone: '#f59e0b', mandatory: false, icon: 'Fingerprint' },
  { key: 'CONTRACT',          label: 'Contracts',          tone: '#ea580c', mandatory: true,  icon: 'FileSignature' },
  { key: 'EDUCATION',         label: 'Education',          tone: '#f97316', mandatory: false, icon: 'GraduationCap' },
  { key: 'CERTIFICATE',       label: 'Certificates',       tone: '#fb923c', mandatory: false, icon: 'Award' },
  { key: 'EXPERIENCE_LETTER', label: 'Letters',            tone: '#d97706', mandatory: false, icon: 'Mail' },
  { key: 'COMPLIANCE',        label: 'Compliance',         tone: '#c2410c', mandatory: true,  icon: 'ShieldCheck' },
  { key: 'SALARY_SLIP',       label: 'Salary',             tone: '#b45309', mandatory: false, icon: 'Wallet' },
  { key: 'OTHER',             label: 'Other',              tone: '#92400e', mandatory: false, icon: 'Folder' },
]

export const DOC_TYPE_SUGGESTIONS = {
  KYC:               ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'BANK_PASSBOOK', 'UTILITY_BILL'],
  CONTRACT:          ['EMPLOYMENT_CONTRACT', 'NDA', 'CONFIDENTIALITY_AGREEMENT', 'CONSULTANCY_AGREEMENT', 'INTERNSHIP_AGREEMENT', 'OFFER_LETTER', 'CONTRACT_RENEWAL'],
  CERTIFICATE:       ['TECHNICAL_CERTIFICATION', 'GOVERNMENT_CERTIFICATION', 'SAFETY_CERTIFICATION', 'TRAINING_CERTIFICATE', 'COMPLIANCE_CERTIFICATION'],
  SALARY_SLIP:       ['PAYSLIP'],
  EXPERIENCE_LETTER: ['EXPERIENCE_LETTER', 'RELIEVING_LETTER', 'PROMOTION_LETTER', 'CONFIRMATION_LETTER', 'TRANSFER_LETTER'],
  ID_PROOF:          ['EMPLOYEE_ID', 'RFID_ID', 'BIOMETRIC_ID', 'PHOTO', 'PASSPORT'],
  EDUCATION:         ['DEGREE', 'DIPLOMA', 'MARKSHEET', 'UNIVERSITY_CERTIFICATE', 'TRAINING_CERTIFICATE'],
  COMPLIANCE:        ['PF', 'ESI', 'TAX_FORM', 'POLICE_VERIFICATION', 'MEDICAL_FITNESS', 'BACKGROUND_VERIFICATION'],
  OTHER:             ['DOCUMENT'],
}

// Request-type catalogue (matches DocumentRequestType enum on the backend)
export const REQUEST_TYPES = [
  { key: 'EXPERIENCE_LETTER',   label: 'Experience Letter',   eta: '3–5 business days', tag: 'Career'  },
  { key: 'RELIEVING_LETTER',    label: 'Relieving Letter',    eta: '5–7 business days', tag: 'Exit'    },
  { key: 'CONFIRMATION_LETTER', label: 'Confirmation Letter', eta: '2–3 business days', tag: 'Status'  },
  { key: 'APPOINTMENT_LETTER',  label: 'Appointment Letter',  eta: '2–3 business days', tag: 'Joining' },
  { key: 'SALARY_CERTIFICATE',  label: 'Salary Certificate',  eta: '1–2 business days', tag: 'Finance' },
  { key: 'NDA',                 label: 'NDA Copy',            eta: '2 business days',   tag: 'Legal'   },
  { key: 'OFFER_LETTER',        label: 'Offer Letter Copy',   eta: '2 business days',   tag: 'Joining' },
  { key: 'ADDRESS_PROOF',       label: 'Address Proof',       eta: '2 business days',   tag: 'Verify'  },
  { key: 'NO_OBJECTION',        label: 'No-Objection Letter', eta: '3–5 business days', tag: 'Travel'  },
  { key: 'CUSTOM',              label: 'Custom Request',      eta: 'Depends on request', tag: 'Other'   },
]

export const STATUS_TONE = {
  PENDING:           { label: 'Pending review',     fg: '#a16207', bg: 'rgba(202, 138, 4, 0.18)',  ring: 'rgba(202, 138, 4, 0.45)'  },
  VERIFIED:          { label: 'Verified',           fg: '#0f766e', bg: 'rgba(13, 148, 136, 0.16)', ring: 'rgba(13, 148, 136, 0.45)' },
  REJECTED:          { label: 'Rejected',           fg: '#b91c1c', bg: 'rgba(220, 38, 38, 0.16)',  ring: 'rgba(220, 38, 38, 0.45)'  },
  RESUBMIT_REQUIRED: { label: 'Resubmit required',  fg: '#c2410c', bg: 'rgba(234, 88, 12, 0.18)',  ring: 'rgba(234, 88, 12, 0.45)'  },
  EXPIRED:           { label: 'Expired',            fg: '#7f1d1d', bg: 'rgba(127, 29, 29, 0.18)',  ring: 'rgba(127, 29, 29, 0.45)'  },
}

export const REQUEST_STATUS_TONE = {
  PENDING:     { label: 'Pending',     fg: '#a16207', bg: 'rgba(202, 138, 4, 0.18)'  },
  IN_PROGRESS: { label: 'In progress', fg: '#0369a1', bg: 'rgba(2, 132, 199, 0.16)'  },
  FULFILLED:   { label: 'Fulfilled',   fg: '#0f766e', bg: 'rgba(13, 148, 136, 0.18)' },
  REJECTED:    { label: 'Rejected',    fg: '#b91c1c', bg: 'rgba(220, 38, 38, 0.16)'  },
  CANCELLED:   { label: 'Cancelled',   fg: '#475569', bg: 'rgba(71, 85, 105, 0.14)'  },
}

// ════════════════════════════════════════════════════════════════════════════

export function useSelfServiceDocuments() {

  // ── My documents — listing & detail ──────────────────────────────────
  async function listMine(params = {}) {
    const { data } = await axios.get(`${BASE}/me`, { headers: authHeader(), params })
    return data
  }
  async function summaryMine() {
    const { data } = await axios.get(`${BASE}/me/summary`, { headers: authHeader() })
    return data
  }

  // ── My documents — actions ───────────────────────────────────────────

  /**
   * Self-upload a new document. `payload` is a plain object; we build the
   * multipart FormData inside so callers don't have to.
   */
  async function uploadMine(payload) {
    const fd = new FormData()
    fd.append('file', payload.file)
    fd.append('category', payload.category)
    fd.append('doc_type', payload.doc_type)
    fd.append('title', payload.title)
    if (payload.document_number) fd.append('document_number', payload.document_number)
    if (payload.issued_by)       fd.append('issued_by', payload.issued_by)
    if (payload.issue_date)      fd.append('issue_date', payload.issue_date)
    if (payload.expiry_date)     fd.append('expiry_date', payload.expiry_date)
    const { data } = await axios.post(`${BASE}/me/upload`, fd, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function resubmitMine(docId, file) {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await axios.post(`${BASE}/me/${docId}/resubmit`, fd, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  /**
   * Get a download URL for one of my documents. Returns the signed URL
   * (5-min TTL) — caller is responsible for navigating or fetching.
   *
   * @param {string} docId
   * @param {{ inline?: boolean }} options - when `inline=true`, the URL
   *   serves the file inline (Content-Disposition: inline) so browsers
   *   render it in-place (e.g. PDFs in an iframe). Without it the file
   *   downloads as an attachment.
   */
  async function downloadUrlMine(docId, { inline = false } = {}) {
    const { data } = await axios.post(
      `${BASE}/me/${docId}/download-token`, null, { headers: authHeader() }
    )
    // Compose the absolute URL — the signed token endpoint is public, no auth.
    const base = `${API.replace(/\/api$/, '')}${data.url}`
    return inline ? `${base}&inline=true` : base
  }

  // ── My document requests ─────────────────────────────────────────────

  async function listMyRequests(params = {}) {
    const { data } = await axios.get(`${BASE}/me/requests`, { headers: authHeader(), params })
    return data
  }
  async function createRequest(payload) {
    const { data } = await axios.post(`${BASE}/me/requests`, payload, { headers: authHeader() })
    return data
  }
  async function cancelRequest(reqId) {
    await axios.delete(`${BASE}/me/requests/${reqId}`, { headers: authHeader() })
  }

  return {
    // listing / detail
    listMine, summaryMine,
    // actions
    uploadMine, resubmitMine, downloadUrlMine,
    // requests
    listMyRequests, createRequest, cancelRequest,
    // constants (re-exported for ergonomics)
    DOC_CATEGORIES, DOC_TYPE_SUGGESTIONS, REQUEST_TYPES, STATUS_TONE, REQUEST_STATUS_TONE,
  }
}
