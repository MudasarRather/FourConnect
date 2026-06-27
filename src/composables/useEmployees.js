// Central data fetcher for HR employees / departments / etc.
// Caches reference data (departments, designations, grades, locations) since
// they change rarely; refetches the employee list on mutations.
import { reactive, ref, computed } from 'vue'
import axios from 'axios'
import { API } from '@/utils/api'

const API_BASE = `${API}`

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
  // Configurable workforce-taxonomy masters (HR Settings). Carry is_active so
  // pickers can hide deactivated values — see employmentTypeOptions() below.
  employmentTypes: [],
  employeeCategories: [],
  // Separation-reason lexicon (HR Settings → Exit). Carries category +
  // is_voluntary; consumed by the Exit resignation/reason pickers via
  // separationReasonOptions() so deactivating/relabelling a reason is live.
  separationReasons: [],
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
      // Masters degrade gracefully (.catch → []) so a failure there never breaks
      // the core org reference load; pickers fall back to the built-in enums.
      const empty = { data: [] }
      const [depts, dess, grades, locs, empTypes, empCats, sepReasons] = await Promise.all([
        axios.get(`${API_BASE}/hr/departments/`, { headers }),
        axios.get(`${API_BASE}/hr/designations/`, { headers }),
        axios.get(`${API_BASE}/hr/grades/`, { headers }),
        axios.get(`${API_BASE}/hr/locations/`, { headers }),
        axios.get(`${API_BASE}/hr/settings/masters/employment-types/`, { headers }).catch(() => empty),
        axios.get(`${API_BASE}/hr/settings/masters/employee-categories/`, { headers }).catch(() => empty),
        axios.get(`${API_BASE}/hr/settings/masters/separation-reasons/`, { headers }).catch(() => empty),
      ])
      referenceCache.departments = depts.data || []
      referenceCache.designations = dess.data || []
      referenceCache.grades = grades.data || []
      referenceCache.locations = locs.data || []
      referenceCache.employmentTypes = empTypes.data || []
      referenceCache.employeeCategories = empCats.data || []
      referenceCache.separationReasons = sepReasons.data || []
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

// MasterManager domain bases (in HR Settings) → keys in `referenceCache`.
const REFERENCE_KEYS = {
  departments: 'departments',
  designations: 'designations',
  grades: 'grades',
  locations: 'locations',
  // MasterManager / bespoke settings sections pass the full base path.
  'settings/masters/employment-types': 'employmentTypes',
  'settings/masters/employee-categories': 'employeeCategories',
  'settings/masters/separation-reasons': 'separationReasons',
}

// Push a freshly-fetched master list (from HR Settings → MasterManager) into the
// shared reference cache, so every LIVE consumer of `useHrReference()` —
// employee profile/transfer/add-wizard, recruitment drawers, attendance/training
// reports — reflects the edit immediately, without a full page reload.
//
// The cache is module-scoped and loads exactly once (`loaded` flag), so before
// this hook a department created in Settings stayed invisible everywhere until
// the browser was hard-reloaded. We only patch the slice when the cache is
// already active; if it was never loaded, the next `loadReferenceData()` on
// mount fetches everything fresh anyway, so there is nothing to keep in sync.
export function syncReferenceSlice(base, rows) {
  const key = REFERENCE_KEYS[base]
  if (!key || !referenceCache.loaded || !Array.isArray(rows)) return
  referenceCache[key] = rows
}

// ── Workforce-taxonomy picker options (respect HR Settings is_active) ─────────
// employment_type / employee_category are fixed enum columns on Employee, but
// HR Settings can DEACTIVATE a value to retire it from new selections. These
// helpers build the radio/segment options from the live masters, hiding inactive
// values — while always keeping the record's CURRENT value visible (tagged
// "inactive") so editing someone already on a retired value never blanks it.
// If the masters haven't loaded (or failed), they fall back to the built-in enums
// so a picker is never empty.
const EMPLOYMENT_TYPE_FALLBACK = [
  { code: 'FULL_TIME', label: 'Full-Time' },
  { code: 'CONTRACT', label: 'Contract' },
  { code: 'INTERN', label: 'Intern' },
  { code: 'CONSULTANT', label: 'Consultant' },
  { code: 'PART_TIME', label: 'Part-Time' },
]
const EMPLOYEE_CATEGORY_FALLBACK = [
  { code: 'PERMANENT', label: 'Permanent' },
  { code: 'PROBATIONARY', label: 'Probationary' },
  { code: 'CONTRACT', label: 'Contract' },
  { code: 'TRAINEE', label: 'Trainee' },
]

function buildMasterOptions(masters, fallback, currentValue) {
  const list = Array.isArray(masters) ? masters : []
  let options
  if (list.length) {
    options = list
      .filter(m => m.is_active !== false)
      .map(m => ({ value: m.code, label: m.label || m.code }))
  } else {
    options = fallback.map(f => ({ value: f.code, label: f.label }))
  }
  // Preserve the employee's existing value even if it was deactivated/removed,
  // so the segment still shows what they're on (and Save doesn't drop it).
  if (currentValue && !options.some(o => o.value === currentValue)) {
    const fromMaster = list.find(m => m.code === currentValue)
    const fromFallback = fallback.find(f => f.code === currentValue)
    const label = fromMaster?.label || fromFallback?.label || currentValue
    options.push({ value: currentValue, label: `${label} (inactive)` })
  }
  return options
}

/** Active employment-type options; pass the record's current value to keep it visible. */
export function employmentTypeOptions(currentValue = '') {
  return buildMasterOptions(referenceCache.employmentTypes, EMPLOYMENT_TYPE_FALLBACK, currentValue)
}
/** Active employee-category options; pass the record's current value to keep it visible. */
export function employeeCategoryOptions(currentValue = '') {
  return buildMasterOptions(referenceCache.employeeCategories, EMPLOYEE_CATEGORY_FALLBACK, currentValue)
}

// ── Separation-reason vocabulary (HR Settings → Exit Management) ──────────────
// The Exit module classifies every separation by a resignation_type and an exit
// reason_category. Those are enum columns on the backend, but HR Settings owns the
// live VOCABULARY — which reasons are offered, their labels, ordering and nature.
// This returns the ACTIVE reasons for a vocabulary ('RESIGNATION_TYPE' | 'EXIT_REASON'),
// keeping the record's current value visible (tagged "(inactive)") so editing a case
// already on a retired reason never blanks it. Returns null when the master hasn't
// loaded / has no rows for the vocabulary, so the caller falls back to its rich
// built-in list (which carries the per-reason icons).
export function separationReasonOptions(category, currentValue = '') {
  const all = (referenceCache.separationReasons || []).filter(m => m.category === category)
  if (!all.length) return null
  const options = all
    .filter(m => m.is_active !== false)
    .map(m => ({ value: m.code, label: m.label || m.code, is_voluntary: m.is_voluntary }))
  if (currentValue && !options.some(o => o.value === currentValue)) {
    const m = all.find(x => x.code === currentValue)
    options.push({ value: currentValue, label: `${m?.label || currentValue} (inactive)`, is_voluntary: m?.is_voluntary, inactive: true })
  }
  return options
}

// The default pay level configured on a grade (HR Settings), used to pre-fill an
// employee's pay_level when the grade is selected. Returns '' when the grade has
// none, so callers can decide whether to overwrite.
export function payLevelForGrade(grades, gradeId) {
  if (!gradeId) return ''
  const g = (grades || []).find(x => String(x.id) === String(gradeId))
  return g?.default_pay_level || ''
}

// Soft (non-blocking) check of an ANNUAL CTC against a grade's min/max band.
// Returns { min, max, status, message } where status is one of
// 'none' (grade has no band) | 'empty' (no CTC yet) | 'below' | 'above' | 'ok'.
// Callers render a hint/warning but never prevent saving.
export function gradeCtcBand(grade, annualCtc) {
  const min = grade?.min_ctc != null && grade.min_ctc !== '' ? Number(grade.min_ctc) : null
  const max = grade?.max_ctc != null && grade.max_ctc !== '' ? Number(grade.max_ctc) : null
  if (!grade || (min == null && max == null)) return { min, max, status: 'none', message: '' }
  const ctc = Number(annualCtc)
  if (!Number.isFinite(ctc) || ctc <= 0) return { min, max, status: 'empty', message: '' }
  const code = grade.code || 'grade'
  if (min != null && ctc < min) return { min, max, status: 'below', message: `Below ${code} band minimum` }
  if (max != null && ctc > max) return { min, max, status: 'above', message: `Above ${code} band maximum` }
  return { min, max, status: 'ok', message: `Within ${code} band` }
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

  // Previews the next employee id the backend would mint (active EMPLOYEE
  // numbering series → PG sequence → MAX+1) WITHOUT advancing any counter, so
  // the Add-Employee wizard can auto-fill the code. Returns '' on failure so the
  // caller can fall back to manual entry. See GET /hr/employees/next-code.
  const peekNextCode = async () => {
    try {
      const res = await axios.get(`${API_BASE}/hr/employees/next-code`, { headers: authHeader() })
      return res.data?.employee_id || ''
    } catch {
      return ''
    }
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
    peekNextCode,
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

// Former employees who can be brought back (separated + exit case marked
// eligible_for_rehire). Powers the Recruitment → Rehire roster.
export async function fetchRehireEligible(search = '') {
  const res = await axios.get(`${API_BASE}/hr/employees/rehire-eligible`, {
    headers: authHeader(),
    params: search ? { search } : {},
  })
  return res.data
}
