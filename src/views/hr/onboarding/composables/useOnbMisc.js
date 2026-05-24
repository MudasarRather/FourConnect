import axios from 'axios'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Identity ──
export async function fetchIdentity(employeeId) {
  const { data } = await axios.get(`/api/hr/identity/${employeeId}`, { headers: authHeader() })
  return data
}
export async function patchIdentity(employeeId, payload) {
  const { data } = await axios.patch(`/api/hr/identity/${employeeId}`, payload, { headers: authHeader() })
  return data
}
export async function issueIdentity(employeeId) {
  const { data } = await axios.post(`/api/hr/identity/${employeeId}/issue`, {}, { headers: authHeader() })
  return data
}
export async function revokeIdentity(employeeId) {
  const { data } = await axios.post(`/api/hr/identity/${employeeId}/revoke`, {}, { headers: authHeader() })
  return data
}

// ── Account provisioning ──
export async function fetchAccountsByEmployee(employeeId) {
  const { data } = await axios.get(`/api/hr/account-provisioning/by-employee/${employeeId}`, { headers: authHeader() })
  return data
}
export async function createAccount(payload) {
  const { data } = await axios.post('/api/hr/account-provisioning/', payload, { headers: authHeader() })
  return data
}
export async function patchAccount(id, payload) {
  const { data } = await axios.patch(`/api/hr/account-provisioning/${id}`, payload, { headers: authHeader() })
  return data
}
export async function activateAccount(id) {
  const { data } = await axios.post(`/api/hr/account-provisioning/${id}/activate`, {}, { headers: authHeader() })
  return data
}
export async function revokeAccount(id) {
  const { data } = await axios.post(`/api/hr/account-provisioning/${id}/revoke`, {}, { headers: authHeader() })
  return data
}
export async function deleteAccount(id) {
  await axios.delete(`/api/hr/account-provisioning/${id}`, { headers: authHeader() })
}

// ── Training ──
export async function fetchTrainingPrograms(params = {}) {
  const { data } = await axios.get('/api/hr/training/programs', { headers: authHeader(), params })
  return data
}
export async function createTrainingProgram(payload) {
  const { data } = await axios.post('/api/hr/training/programs', payload, { headers: authHeader() })
  return data
}
export async function patchTrainingProgram(id, payload) {
  const { data } = await axios.patch(`/api/hr/training/programs/${id}`, payload, { headers: authHeader() })
  return data
}
export async function fetchTrainingAssignments(params = {}) {
  const { data } = await axios.get('/api/hr/training/assignments', { headers: authHeader(), params })
  return data
}
export async function createTrainingAssignment(payload) {
  const { data } = await axios.post('/api/hr/training/assignments', payload, { headers: authHeader() })
  return data
}
export async function patchTrainingAssignment(id, payload) {
  const { data } = await axios.patch(`/api/hr/training/assignments/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Induction ──
export async function fetchSessions(upcomingOnly = false) {
  const { data } = await axios.get('/api/hr/induction/sessions', {
    headers: authHeader(),
    params: { upcoming_only: upcomingOnly },
  })
  return data
}
export async function createSession(payload) {
  const { data } = await axios.post('/api/hr/induction/sessions', payload, { headers: authHeader() })
  return data
}
export async function patchSession(id, payload) {
  const { data } = await axios.patch(`/api/hr/induction/sessions/${id}`, payload, { headers: authHeader() })
  return data
}
export async function fetchAttendees(sessionId) {
  const { data } = await axios.get(`/api/hr/induction/sessions/${sessionId}/attendees`, { headers: authHeader() })
  return data
}
export async function bulkInvite(sessionId, employeeIds) {
  const { data } = await axios.post(`/api/hr/induction/sessions/${sessionId}/invite`,
    { employee_ids: employeeIds },
    { headers: authHeader() }
  )
  return data
}
export async function patchAttendance(id, payload) {
  const { data } = await axios.patch(`/api/hr/induction/attendance/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Welcome Kit ──
export async function fetchKitTemplates() {
  const { data } = await axios.get('/api/hr/welcome-kit/templates', { headers: authHeader() })
  return data
}
export async function createKitTemplate(payload) {
  const { data } = await axios.post('/api/hr/welcome-kit/templates', payload, { headers: authHeader() })
  return data
}
export async function patchKitTemplate(id, payload) {
  const { data } = await axios.patch(`/api/hr/welcome-kit/templates/${id}`, payload, { headers: authHeader() })
  return data
}
export async function fetchKitByEmployee(employeeId) {
  const { data } = await axios.get(`/api/hr/welcome-kit/by-employee/${employeeId}`, { headers: authHeader() })
  return data
}
export async function createKit(payload) {
  const { data } = await axios.post('/api/hr/welcome-kit/', payload, { headers: authHeader() })
  return data
}
export async function patchKit(id, payload) {
  const { data } = await axios.patch(`/api/hr/welcome-kit/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Reports ──
export async function fetchReport(name) {
  const { data } = await axios.get(`/api/hr/onboarding/reports/${name}`, { headers: authHeader() })
  return data
}
