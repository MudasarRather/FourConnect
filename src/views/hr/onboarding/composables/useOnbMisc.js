import axios from 'axios'
import { API, authHeader } from '@/utils/api'

// ── Identity ──
export async function fetchIdentity(employeeId) {
  const { data } = await axios.get(`${API}/hr/identity/${employeeId}`, { headers: authHeader() })
  return data
}
export async function patchIdentity(employeeId, payload) {
  const { data } = await axios.patch(`${API}/hr/identity/${employeeId}`, payload, { headers: authHeader() })
  return data
}
export async function issueIdentity(employeeId) {
  const { data } = await axios.post(`${API}/hr/identity/${employeeId}/issue`, {}, { headers: authHeader() })
  return data
}
export async function revokeIdentity(employeeId) {
  const { data } = await axios.post(`${API}/hr/identity/${employeeId}/revoke`, {}, { headers: authHeader() })
  return data
}

// ── Account provisioning ──
export async function fetchAccountsByEmployee(employeeId) {
  const { data } = await axios.get(`${API}/hr/account-provisioning/by-employee/${employeeId}`, { headers: authHeader() })
  return data
}
export async function createAccount(payload) {
  const { data } = await axios.post(`${API}/hr/account-provisioning/`, payload, { headers: authHeader() })
  return data
}
export async function patchAccount(id, payload) {
  const { data } = await axios.patch(`${API}/hr/account-provisioning/${id}`, payload, { headers: authHeader() })
  return data
}
export async function activateAccount(id) {
  const { data } = await axios.post(`${API}/hr/account-provisioning/${id}/activate`, {}, { headers: authHeader() })
  return data
}
export async function revokeAccount(id) {
  const { data } = await axios.post(`${API}/hr/account-provisioning/${id}/revoke`, {}, { headers: authHeader() })
  return data
}
export async function deleteAccount(id) {
  await axios.delete(`${API}/hr/account-provisioning/${id}`, { headers: authHeader() })
}

// ── Training ──
export async function fetchTrainingPrograms(params = {}) {
  const { data } = await axios.get(`${API}/hr/training/programs`, { headers: authHeader(), params })
  return data
}
export async function createTrainingProgram(payload) {
  const { data } = await axios.post(`${API}/hr/training/programs`, payload, { headers: authHeader() })
  return data
}
export async function patchTrainingProgram(id, payload) {
  const { data } = await axios.patch(`${API}/hr/training/programs/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteTrainingProgram(id, { reason, note } = {}) {
  const params = {}
  if (reason) params.reason = reason
  if (note) params.note = note
  await axios.delete(`${API}/hr/training/programs/${id}`, { headers: authHeader(), params })
}
export async function fetchTrainingAssignments(params = {}) {
  const { data } = await axios.get(`${API}/hr/training/assignments`, { headers: authHeader(), params })
  return data
}
export async function createTrainingAssignment(payload) {
  const { data } = await axios.post(`${API}/hr/training/assignments`, payload, { headers: authHeader() })
  return data
}
export async function patchTrainingAssignment(id, payload) {
  const { data } = await axios.patch(`${API}/hr/training/assignments/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteTrainingAssignment(id, { reason, note } = {}) {
  const params = {}
  if (reason) params.reason = reason
  if (note) params.note = note
  await axios.delete(`${API}/hr/training/assignments/${id}`, { headers: authHeader(), params })
}

// ── Induction ──
export async function fetchSessions(upcomingOnly = false) {
  const { data } = await axios.get(`${API}/hr/induction/sessions`, {
    headers: authHeader(),
    params: { upcoming_only: upcomingOnly },
  })
  return data
}
export async function createSession(payload) {
  const { data } = await axios.post(`${API}/hr/induction/sessions`, payload, { headers: authHeader() })
  return data
}
export async function patchSession(id, payload) {
  const { data } = await axios.patch(`${API}/hr/induction/sessions/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteSession(id) {
  await axios.delete(`${API}/hr/induction/sessions/${id}`, { headers: authHeader() })
}
export async function fetchAttendees(sessionId) {
  const { data } = await axios.get(`${API}/hr/induction/sessions/${sessionId}/attendees`, { headers: authHeader() })
  return data
}
export async function bulkInvite(sessionId, employeeIds) {
  const { data } = await axios.post(`${API}/hr/induction/sessions/${sessionId}/invite`,
    { employee_ids: employeeIds },
    { headers: authHeader() }
  )
  return data
}
export async function patchAttendance(id, payload) {
  const { data } = await axios.patch(`${API}/hr/induction/attendance/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Welcome Kit ──
export async function fetchKitTemplates() {
  const { data } = await axios.get(`${API}/hr/welcome-kit/templates`, { headers: authHeader() })
  return data
}
export async function createKitTemplate(payload) {
  const { data } = await axios.post(`${API}/hr/welcome-kit/templates`, payload, { headers: authHeader() })
  return data
}
export async function patchKitTemplate(id, payload) {
  const { data } = await axios.patch(`${API}/hr/welcome-kit/templates/${id}`, payload, { headers: authHeader() })
  return data
}
export async function fetchKitByEmployee(employeeId) {
  const { data } = await axios.get(`${API}/hr/welcome-kit/by-employee/${employeeId}`, { headers: authHeader() })
  return data
}
export async function createKit(payload) {
  const { data } = await axios.post(`${API}/hr/welcome-kit/`, payload, { headers: authHeader() })
  return data
}
export async function patchKit(id, payload) {
  const { data } = await axios.patch(`${API}/hr/welcome-kit/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Reports ──
export async function fetchReport(name) {
  const { data } = await axios.get(`${API}/hr/onboarding/reports/${name}`, { headers: authHeader() })
  return data
}
