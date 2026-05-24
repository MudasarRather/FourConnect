import axios from 'axios'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchChecklist(processId) {
  const { data } = await axios.get(`/api/hr/onboarding/processes/${processId}/checklist`, { headers: authHeader() })
  return data
}
export async function createChecklistItem(payload) {
  const { data } = await axios.post('/api/hr/onboarding/checklist-items', payload, { headers: authHeader() })
  return data
}
export async function patchChecklistItem(id, payload) {
  const { data } = await axios.patch(`/api/hr/onboarding/checklist-items/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteChecklistItem(id) {
  await axios.delete(`/api/hr/onboarding/checklist-items/${id}`, { headers: authHeader() })
}
export async function fetchTemplates() {
  const { data } = await axios.get('/api/hr/onboarding/checklist-templates', { headers: authHeader() })
  return data
}
export async function createTemplate(payload) {
  const { data } = await axios.post('/api/hr/onboarding/checklist-templates', payload, { headers: authHeader() })
  return data
}
export async function patchTemplate(id, payload) {
  const { data } = await axios.patch(`/api/hr/onboarding/checklist-templates/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Approvals ──
export async function fetchApprovals(processId) {
  const { data } = await axios.get(`/api/hr/onboarding/processes/${processId}/approvals`, { headers: authHeader() })
  return data
}
export async function createApproval(payload) {
  const { data } = await axios.post('/api/hr/onboarding/approvals', payload, { headers: authHeader() })
  return data
}
export async function decideApproval(id, payload) {
  const { data } = await axios.patch(`/api/hr/onboarding/approvals/${id}/decide`, payload, { headers: authHeader() })
  return data
}
export async function deleteApproval(id) {
  await axios.delete(`/api/hr/onboarding/approvals/${id}`, { headers: authHeader() })
}

// ── Tasks ──
export async function fetchTasks(processId) {
  const url = processId
    ? `/api/hr/onboarding/processes/${processId}/tasks`
    : '/api/hr/onboarding/tasks'
  const { data } = await axios.get(url, { headers: authHeader() })
  return data
}
export async function createTask(payload) {
  const { data } = await axios.post('/api/hr/onboarding/tasks', payload, { headers: authHeader() })
  return data
}
export async function patchTask(id, payload) {
  const { data } = await axios.patch(`/api/hr/onboarding/tasks/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteTask(id) {
  await axios.delete(`/api/hr/onboarding/tasks/${id}`, { headers: authHeader() })
}
