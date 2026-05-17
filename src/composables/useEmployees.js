// Central data fetcher for HR employees / departments / etc.
// Caches reference data (departments, designations, grades, locations) since
// they change rarely; refetches the employee list on mutations.
import { reactive, ref, computed } from 'vue'
import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const authHeader = () => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------------------- Reference data cache (module-scoped) ----------------------

const referenceCache = reactive({
  departments: [],
  designations: [],
  grades: [],
  locations: [],
  loaded: false,
  loading: false,
  error: '',
})

// Module-level in-flight promise so concurrent callers share the same fetch.
// On failure we clear the cache flag so the next caller can retry; we don't
// permanently lock the wizard out of seeing data.
let _inflightLoad = null

async function loadReferenceData(force = false) {
  if (referenceCache.loaded && !force) return referenceCache
  if (_inflightLoad) return _inflightLoad
  referenceCache.loading = true
  referenceCache.error = ''
  _inflightLoad = (async () => {
    try {
      const headers = authHeader()
      const [depts, dess, grades, locs] = await Promise.all([
        axios.get(`${API_BASE}/hr/departments/`, { headers }),
        axios.get(`${API_BASE}/hr/designations/`, { headers }),
        axios.get(`${API_BASE}/hr/grades/`, { headers }),
        axios.get(`${API_BASE}/hr/locations/`, { headers }),
      ])
      referenceCache.departments = depts.data || []
      referenceCache.designations = dess.data || []
      referenceCache.grades = grades.data || []
      referenceCache.locations = locs.data || []
      referenceCache.loaded = true
    } catch (e) {
      referenceCache.error = e?.response?.data?.detail || e?.message || 'Failed to load reference data'
      // Don't mark loaded — next call will retry
    } finally {
      referenceCache.loading = false
      _inflightLoad = null
    }
    return referenceCache
  })()
  return _inflightLoad
}

// ---------------------- Employees composable ----------------------

export function useEmployees() {
  const employees = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const filters = ref({
    page: 1,
    limit: 20,
    search: '',
    department_id: null,
    designation_id: null,
    grade_id: null,
    work_location_id: null,
    lifecycle_state: null,
    employment_type: null,
    include_deleted: false,
    sort_by: 'created_at',
    sort_dir: 'desc',
  })

  const fetchList = async () => {
    loading.value = true
    error.value = ''
    try {
      const params = {}
      for (const [k, v] of Object.entries(filters.value)) {
        if (v !== null && v !== '' && v !== undefined) params[k] = v
      }
      const res = await axios.get(`${API_BASE}/hr/employees/`, {
        headers: authHeader(),
        params,
      })
      employees.value = res.data.items || []
      total.value = res.data.total || 0
    } catch (e) {
      error.value = e.response?.data?.detail || 'Failed to load employees'
      employees.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const getOne = async (employeePk, opts = {}) => {
    const res = await axios.get(`${API_BASE}/hr/employees/${employeePk}`, {
      headers: authHeader(),
      params: opts.revealBank ? { reveal_bank: true } : {},
    })
    return res.data
  }

  const create = async (payload) => {
    const res = await axios.post(`${API_BASE}/hr/employees/`, payload, { headers: authHeader() })
    await fetchList()
    return res.data
  }

  const update = async (employeePk, patch) => {
    const res = await axios.patch(`${API_BASE}/hr/employees/${employeePk}`, patch, {
      headers: authHeader(),
    })
    return res.data
  }

  const remove = async (employeePk, { force = false } = {}) => {
    await axios.delete(`${API_BASE}/hr/employees/${employeePk}`, {
      headers: authHeader(),
      params: force ? { force: true } : {},
    })
    await fetchList()
  }

  const lifecycle = async (employeePk, action, body = {}) => {
    const res = await axios.post(
      `${API_BASE}/hr/employees/${employeePk}/lifecycle/${action}`,
      body,
      { headers: authHeader() }
    )
    return res.data
  }

  const history = async (employeePk) => {
    const res = await axios.get(`${API_BASE}/hr/employees/${employeePk}/history`, {
      headers: authHeader(),
    })
    return res.data
  }

  const allHistory = async (params = {}) => {
    const res = await axios.get(`${API_BASE}/hr/employees/history/all`, {
      headers: authHeader(),
      params,
    })
    return res.data
  }

  const setFilters = (patch) => {
    filters.value = { ...filters.value, ...patch }
    if (!('page' in patch)) filters.value.page = 1
  }

  const setPage = (p) => {
    filters.value.page = p
  }

  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.value.limit)))

  return {
    // state
    employees,
    total,
    loading,
    error,
    filters,
    totalPages,
    // reference data
    reference: referenceCache,
    loadReferenceData,
    // actions
    fetchList,
    getOne,
    create,
    update,
    remove,
    lifecycle,
    history,
    allHistory,
    setFilters,
    setPage,
  }
}

export function useHrReference() {
  return { reference: referenceCache, loadReferenceData }
}

export async function fetchDashboardStats() {
  const res = await axios.get(`${API_BASE}/hr/dashboard-stats`, { headers: authHeader() })
  return res.data
}
