import { ref } from 'vue'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'

export async function fetchDashboardStats() {
  const { data } = await axios.get(`${API}/hr/onboarding/dashboard/stats`, { headers: authHeader() })
  return data
}

export async function fetchHotTasks(limit = 20) {
  const { data } = await axios.get(`${API}/hr/onboarding/dashboard/hot-tasks?limit=${limit}`, { headers: authHeader() })
  return data
}

export async function fetchJourneyState(processId = null) {
  const url = processId ? `${API}/hr/onboarding/journey-state?process_id=${processId}` : `${API}/hr/onboarding/journey-state`
  const { data } = await axios.get(url, { headers: authHeader() })
  return data
}

export async function fetchPendingJoining() {
  const { data } = await axios.get(`${API}/hr/onboarding/pending-joining`, { headers: authHeader() })
  return data
}

export async function fetchProcesses(params = {}) {
  const { data } = await axios.get(`${API}/hr/onboarding/processes`, { headers: authHeader(), params })
  return data
}

export async function fetchProcessDetail(processId) {
  const { data } = await axios.get(`${API}/hr/onboarding/processes/${processId}`, { headers: authHeader() })
  return data
}

export async function fetchProcessByEmployee(employeeId) {
  const { data } = await axios.get(`${API}/hr/onboarding/processes/by-employee/${employeeId}`, { headers: authHeader() })
  return data
}

export async function updateProcess(processId, payload) {
  const { data } = await axios.patch(`${API}/hr/onboarding/processes/${processId}`, payload, { headers: authHeader() })
  return data
}

export function useDashboard() {
  const stats = ref(null)
  const hotTasks = ref([])
  const journey = ref(null)
  const loading = ref(false)
  const load = async () => {
    loading.value = true
    try {
      const [s, h, j] = await Promise.all([fetchDashboardStats(), fetchHotTasks(15), fetchJourneyState()])
      stats.value = s
      hotTasks.value = Array.isArray(h) ? h : (h?.items || [])
      journey.value = j
    } finally {
      loading.value = false
    }
  }
  return { stats, hotTasks, journey, loading, load }
}
