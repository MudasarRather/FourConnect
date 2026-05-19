// Central data fetcher for HR Recruitment module.
// Each resource exposes a `useX()` composable returning reactive list state +
// CRUD actions. Pagination follows the standard { items, total, page, limit, total_pages }.
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE = 'http://localhost:8000/api/hr/recruitment'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ──────────────────────────────────────────────────────────────────────────
// Generic list state factory
// ──────────────────────────────────────────────────────────────────────────

function makeListState(initialFilters = {}) {
  const items = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({
    page: 1,
    limit: 20,
    search: '',
    ...initialFilters,
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.value.limit)))

  const setFilters = (patch) => {
    filters.value = { ...filters.value, ...patch }
    if (!('page' in patch)) filters.value.page = 1
  }
  const setPage = (p) => {
    filters.value.page = p
  }

  const buildParams = () => {
    const out = {}
    for (const [k, v] of Object.entries(filters.value)) {
      if (v !== null && v !== '' && v !== undefined) out[k] = v
    }
    return out
  }

  return { items, total, loading, error, filters, totalPages, setFilters, setPage, buildParams }
}

// ──────────────────────────────────────────────────────────────────────────
// Requisitions
// ──────────────────────────────────────────────────────────────────────────

export function useRequisitions() {
  const state = makeListState({ status: null, department_id: null, priority: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/requisitions`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load requisitions'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/requisitions`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/requisitions/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/requisitions/${id}`, { headers: authHeader() })
    return res.data
  }
  const submit = async (id) => {
    const res = await axios.post(`${API_BASE}/requisitions/${id}/submit`, {}, { headers: authHeader() })
    return res.data
  }
  const decide = async (id, approve, reason = null) => {
    const res = await axios.post(`${API_BASE}/requisitions/${id}/decision`, { approve, reason }, { headers: authHeader() })
    return res.data
  }
  const convert = async (id) => {
    const res = await axios.post(`${API_BASE}/requisitions/${id}/convert`, {}, { headers: authHeader() })
    return res.data
  }
  const archive = async (id) => {
    await axios.delete(`${API_BASE}/requisitions/${id}`, { headers: authHeader() })
  }

  return { ...state, fetchList, create, update, getOne, submit, decide, convert, archive }
}

// ──────────────────────────────────────────────────────────────────────────
// Positions
// ──────────────────────────────────────────────────────────────────────────

export function usePositions() {
  const state = makeListState({ status: null, department_id: null, work_mode: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/positions`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load positions'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/positions`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/positions/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/positions/${id}`, { headers: authHeader() })
    return res.data
  }
  const publish = async (id) => {
    const res = await axios.post(`${API_BASE}/positions/${id}/publish`, {}, { headers: authHeader() })
    return res.data
  }
  const hold = async (id) => {
    const res = await axios.post(`${API_BASE}/positions/${id}/hold`, {}, { headers: authHeader() })
    return res.data
  }
  const close = async (id) => {
    const res = await axios.post(`${API_BASE}/positions/${id}/close`, {}, { headers: authHeader() })
    return res.data
  }
  const archive = async (id) => {
    await axios.delete(`${API_BASE}/positions/${id}`, { headers: authHeader() })
  }

  return { ...state, fetchList, create, update, getOne, publish, hold, close, archive }
}

// ──────────────────────────────────────────────────────────────────────────
// Candidates
// ──────────────────────────────────────────────────────────────────────────

export function useCandidates() {
  const state = makeListState({ status: null, in_talent_pool: null, source: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/candidates`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load candidates'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/candidates`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/candidates/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/candidates/${id}`, { headers: authHeader() })
    return res.data
  }
  const archive = async (id) => {
    await axios.delete(`${API_BASE}/candidates/${id}`, { headers: authHeader() })
  }

  return { ...state, fetchList, create, update, getOne, archive }
}

// ──────────────────────────────────────────────────────────────────────────
// Applications
// ──────────────────────────────────────────────────────────────────────────

export function useApplications() {
  const state = makeListState({ stage: null, position_id: null, candidate_id: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/applications`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load applications'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/applications`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/applications/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/applications/${id}`, { headers: authHeader() })
    return res.data
  }
  const changeStage = async (id, stage, notes = null, rejection_reason = null) => {
    const res = await axios.post(`${API_BASE}/applications/${id}/stage`,
      { stage, notes, rejection_reason }, { headers: authHeader() })
    return res.data
  }
  const archive = async (id) => {
    await axios.delete(`${API_BASE}/applications/${id}`, { headers: authHeader() })
  }

  return { ...state, fetchList, create, update, getOne, changeStage, archive }
}

// ──────────────────────────────────────────────────────────────────────────
// Interviews
// ──────────────────────────────────────────────────────────────────────────

export function useInterviews() {
  const state = makeListState({ status: null, upcoming_only: false, application_id: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/interviews`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load interviews'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/interviews`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/interviews/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/interviews/${id}`, { headers: authHeader() })
    return res.data
  }
  const submitFeedback = async (id, payload) => {
    const res = await axios.post(`${API_BASE}/interviews/${id}/feedback`, payload, { headers: authHeader() })
    return res.data
  }
  const listFeedback = async (id) => {
    const res = await axios.get(`${API_BASE}/interviews/${id}/feedback`, { headers: authHeader() })
    return res.data
  }
  const cancel = async (id) => {
    await axios.delete(`${API_BASE}/interviews/${id}`, { headers: authHeader() })
  }

  return { ...state, fetchList, create, update, getOne, submitFeedback, listFeedback, cancel }
}

// ──────────────────────────────────────────────────────────────────────────
// Panels
// ──────────────────────────────────────────────────────────────────────────

export function usePanels() {
  const items = ref([])
  const loading = ref(false)
  const error = ref('')

  const fetchList = async () => {
    loading.value = true
    error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/panels`, { headers: authHeader() })
      items.value = res.data || []
    } catch (e) {
      error.value = e?.response?.data?.detail || 'Failed to load panels'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/panels`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/panels/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const remove = async (id) => {
    await axios.delete(`${API_BASE}/panels/${id}`, { headers: authHeader() })
  }

  return { items, loading, error, fetchList, create, update, remove }
}

// ──────────────────────────────────────────────────────────────────────────
// Offers
// ──────────────────────────────────────────────────────────────────────────

export function useOffers() {
  const state = makeListState({ status: null })

  const fetchList = async () => {
    state.loading.value = true
    state.error.value = ''
    try {
      const res = await axios.get(`${API_BASE}/offers`, {
        headers: authHeader(), params: state.buildParams(),
      })
      state.items.value = res.data.items || []
      state.total.value = res.data.total || 0
    } catch (e) {
      state.error.value = e?.response?.data?.detail || 'Failed to load offers'
      state.items.value = []
      state.total.value = 0
    } finally {
      state.loading.value = false
    }
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/offers`, payload, { headers: authHeader() })
    return res.data
  }
  const update = async (id, patch) => {
    const res = await axios.patch(`${API_BASE}/offers/${id}`, patch, { headers: authHeader() })
    return res.data
  }
  const getOne = async (id) => {
    const res = await axios.get(`${API_BASE}/offers/${id}`, { headers: authHeader() })
    return res.data
  }
  const approve = async (id) => {
    const res = await axios.post(`${API_BASE}/offers/${id}/approve`, {}, { headers: authHeader() })
    return res.data
  }
  const release = async (id) => {
    const res = await axios.post(`${API_BASE}/offers/${id}/release`, {}, { headers: authHeader() })
    return res.data
  }
  const respond = async (id, accept, note = null) => {
    const res = await axios.post(`${API_BASE}/offers/${id}/respond`, { accept, note }, { headers: authHeader() })
    return res.data
  }
  const archive = async (id) => {
    await axios.delete(`${API_BASE}/offers/${id}`, { headers: authHeader() })
  }

  // List ACCEPTED offers — used by the Add Employee wizard banner.
  // When `unlinkedOnly` is true, offers already linked to an employee are
  // filtered out server-side so they can't be onboarded twice.
  const listAccepted = async ({ unlinkedOnly = true, limit = 100 } = {}) => {
    const params = { status: 'ACCEPTED', limit }
    if (unlinkedOnly) params.unlinked_only = true
    const res = await axios.get(`${API_BASE}/offers`, { headers: authHeader(), params })
    return res.data?.items || []
  }

  // Flat prefill payload (candidate + position + offer fields) for the
  // Add Employee wizard.
  const getOnboardingPrefill = async (id) => {
    const res = await axios.get(`${API_BASE}/offers/${id}/onboarding-prefill`, {
      headers: authHeader(),
    })
    return res.data
  }

  return {
    ...state,
    fetchList, create, update, getOne, approve, release, respond, archive,
    listAccepted, getOnboardingPrefill,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Dashboard & Pipeline
// ──────────────────────────────────────────────────────────────────────────

export async function fetchRecruitmentDashboard() {
  const res = await axios.get(`${API_BASE}/dashboard`, { headers: authHeader() })
  return res.data
}

export async function fetchPipeline(positionId = null) {
  const params = positionId ? { position_id: positionId } : {}
  const res = await axios.get(`${API_BASE}/pipeline`, { headers: authHeader(), params })
  return res.data
}
