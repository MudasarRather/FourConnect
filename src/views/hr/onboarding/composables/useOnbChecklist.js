import axios from 'axios'
import { API, authHeader } from '@/utils/api'

export async function fetchChecklist(processId) {
  const { data } = await axios.get(`${API}/hr/onboarding/processes/${processId}/checklist`, { headers: authHeader() })
  return data
}
export async function createChecklistItem(payload) {
  const { data } = await axios.post(`${API}/hr/onboarding/checklist-items`, payload, { headers: authHeader() })
  return data
}
export async function patchChecklistItem(id, payload) {
  const { data } = await axios.patch(`${API}/hr/onboarding/checklist-items/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteChecklistItem(id) {
  await axios.delete(`${API}/hr/onboarding/checklist-items/${id}`, { headers: authHeader() })
}
export async function fetchTemplates() {
  const { data } = await axios.get(`${API}/hr/onboarding/checklist-templates`, { headers: authHeader() })
  return data
}
export async function createTemplate(payload) {
  const { data } = await axios.post(`${API}/hr/onboarding/checklist-templates`, payload, { headers: authHeader() })
  return data
}
export async function patchTemplate(id, payload) {
  const { data } = await axios.patch(`${API}/hr/onboarding/checklist-templates/${id}`, payload, { headers: authHeader() })
  return data
}

// ── Approvals ──
export async function fetchApprovals(processId) {
  const { data } = await axios.get(`${API}/hr/onboarding/processes/${processId}/approvals`, { headers: authHeader() })
  return data
}
export async function createApproval(payload) {
  const { data } = await axios.post(`${API}/hr/onboarding/approvals`, payload, { headers: authHeader() })
  return data
}
export async function decideApproval(id, payload) {
  const { data } = await axios.patch(`${API}/hr/onboarding/approvals/${id}/decide`, payload, { headers: authHeader() })
  return data
}
export async function deleteApproval(id) {
  await axios.delete(`${API}/hr/onboarding/approvals/${id}`, { headers: authHeader() })
}

// ── Tasks ──
export async function fetchTasks(processId) {
  const url = processId
    ? `${API}/hr/onboarding/processes/${processId}/tasks`
    : `${API}/hr/onboarding/tasks`
  const { data } = await axios.get(url, { headers: authHeader() })
  return data
}
export async function createTask(payload) {
  const { data } = await axios.post(`${API}/hr/onboarding/tasks`, payload, { headers: authHeader() })
  return data
}
export async function patchTask(id, payload) {
  const { data } = await axios.patch(`${API}/hr/onboarding/tasks/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteTask(id) {
  await axios.delete(`${API}/hr/onboarding/tasks/${id}`, { headers: authHeader() })
}
