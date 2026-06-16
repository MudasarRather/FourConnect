// Payslip data layer — admin (/hr/payroll/payslips) + self-service (/hr/me/payslips).
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

const ADMIN = `${API}/hr/payroll/payslips`
const PAYROLL = `${API}/hr/payroll`
const ME = `${API}/hr/me/payslips`

// Earnings before deductions before statutory in the detail view.
export const PAYSLIP_SECTIONS = [
  { key: 'EARNING', label: 'Earnings', cat: 'earning' },
  { key: 'DEDUCTION', label: 'Deductions', cat: 'deduction' },
  { key: 'STATUTORY_DEDUCTION', label: 'Statutory', cat: 'statutory' },
  { key: 'EMPLOYER_CONTRIBUTION', label: 'Employer contributions', cat: 'employer' },
]

// ── admin ──
export const fetchPayslips = async (params = {}) =>
  (await axios.get(`${ADMIN}/`, { headers: authHeader(), params })).data
export const fetchPayslip = async (id) =>
  (await axios.get(`${ADMIN}/${id}`, { headers: authHeader() })).data
export const holdPayslip = async (id, body = {}) =>
  (await axios.post(`${ADMIN}/${id}/hold`, body, { headers: authHeader() })).data
export const releasePayslip = async (id) =>
  (await axios.post(`${ADMIN}/${id}/release`, {}, { headers: authHeader() })).data

// ── admin tax documents (Form-16) ──
export const generateForm16 = async (body) =>
  (await axios.post(`${PAYROLL}/tax-documents/generate`, body, { headers: authHeader() })).data
export const fetchTaxDocuments = async (params = {}) =>
  (await axios.get(`${PAYROLL}/tax-documents`, { headers: authHeader(), params })).data

// ── self-service ──
export const fetchMyPayslips = async (params = {}) =>
  (await axios.get(`${ME}/`, { headers: authHeader(), params })).data
export const fetchMyPayslip = async (id) =>
  (await axios.get(`${ME}/${id}`, { headers: authHeader() })).data
export const fetchMyAnnual = async (fy) =>
  (await axios.get(`${ME}/annual`, { headers: authHeader(), params: fy ? { fy } : {} })).data

// ── self-service tax documents ──
export const fetchMyTaxSummary = async (fy) =>
  (await axios.get(`${ME}/tax-summary`, { headers: authHeader(), params: fy ? { fy } : {} })).data
// live (non-persisting) projection — body: { annual_gross?, declarations?: {...12BB heads} }
export const fetchMyTaxProjection = async (body = {}) =>
  (await axios.post(`${ME}/tax-projection`, body, { headers: authHeader() })).data
// persist Form-12BB declaration + regime, returns a fresh projection
export const saveMyTaxDeclarations = async (body) =>
  (await axios.post(`${ME}/tax-declarations`, body, { headers: authHeader() })).data
export const fetchMyTaxDocuments = async (fy) =>
  (await axios.get(`${ME}/tax-documents`, { headers: authHeader(), params: fy ? { fy } : {} })).data

// ── PDF download (blob → anchor) ──
async function _downloadBlob(url, filename) {
  const res = await axios.get(url, { headers: authHeader(), responseType: 'blob' })
  const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
}
export const downloadPayslipPdf = (id, no) => _downloadBlob(`${ADMIN}/${id}/pdf`, `${no || 'payslip'}.pdf`)
export const downloadMyPayslipPdf = (id, no) => _downloadBlob(`${ME}/${id}/pdf`, `${no || 'payslip'}.pdf`)
export const downloadMyTaxDocPdf = (id, name) => _downloadBlob(`${ME}/tax-documents/${id}/pdf`, `${name || 'tax-document'}.pdf`)
export const downloadTaxDocPdf = (id, name) => _downloadBlob(`${PAYROLL}/tax-documents/${id}/pdf`, `${name || 'tax-document'}.pdf`)
