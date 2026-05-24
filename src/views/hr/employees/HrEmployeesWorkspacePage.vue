<template>
  <div class="hr-workspace">
    <HrWorkspaceTopBar
      :section-label="currentSectionLabel"
      :section-description="currentSectionDescription"
      :tour-position="tourPosition"
      :tour-total="tourTotal"
      @open-wizard="openWizard"
    />

    <div class="ws-body">
      <SectionRail
        v-model="activeTab"
        :groups="railGroups"
        :collapsed="railCollapsed"
        :recent="recentList"
        title="Employees"
        @select="onSelectTab"
        @toggle-collapsed="toggleRail"
        @open-recent="openProfile"
      />

      <main class="ws-canvas">
        <transition :name="`canvas-${slideDir}`" mode="out-in">
          <section :key="activeTab" class="canvas-section">
            <!-- All Employees -->
            <AllEmployeesSection
              v-if="activeTab === 'all'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              :stats="dashboardStats"
              @open-profile="openProfile"
              @set-filters="onSetFilters"
              @set-page="onSetPage"
              @refresh="onRefresh"
            />

            <EmployeeDirectorySection
              v-else-if="activeTab === 'directory'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              @open-profile="openProfile"
              @set-filters="onSetFilters"
              @set-page="onSetPage"
            />

            <AddEmployeeSection
              v-else-if="activeTab === 'add'"
              @open-wizard="openWizard"
            />

            <EmployeeProfilesSection
              v-else-if="activeTab === 'profiles'"
              @open-profile="openProfile"
            />

            <LifecycleSection
              v-else-if="activeTab === 'lifecycle'"
              :employees="lifecycleEmployees"
              :loading="lifecycleLoading"
              :reference="reference"
              :submitting="lifecycleSubmitting"
              @open-profile="openProfile"
              @lifecycle-action="onLifecycleAction"
            />

            <EmployeeHistorySection
              v-else-if="activeTab === 'history'"
              title="Employment History"
              subtitle="All lifecycle events, newest first."
              @open-profile="openProfile"
            />

            <PromotionsSection v-else-if="activeTab === 'promotions'" @open-profile="openProfile" />
            <ConfirmationsSection v-else-if="activeTab === 'confirmations'" @open-profile="openProfile" />
            <TransfersSection v-else-if="activeTab === 'transfers'" @open-profile="openProfile" />

            <ProbationSection
              v-else-if="activeTab === 'probation'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              @open-profile="openProfile"
              @set-page="onSetPage"
              @set-filters="onSetFilters"
              @lifecycle-action="onLifecycleAction"
            />
            <SuspendedSection
              v-else-if="activeTab === 'suspended'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              @open-profile="openProfile"
              @set-page="onSetPage"
              @set-filters="onSetFilters"
              @lifecycle-action="onLifecycleAction"
            />
            <InactiveSection
              v-else-if="activeTab === 'inactive'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              @open-profile="openProfile"
              @set-page="onSetPage"
              @set-filters="onSetFilters"
            />
            <ArchivedSection
              v-else-if="activeTab === 'archived'"
              :employees="employees"
              :total="total"
              :loading="loading"
              :filters="filters"
              :total-pages="totalPages"
              :reference="reference"
              @open-profile="openProfile"
              @set-page="onSetPage"
              @set-filters="onSetFilters"
              @lifecycle-action="onLifecycleAction"
            />
          </section>
        </transition>
      </main>
    </div>

    <EmployeeProfileDrawer
      :open="profileOpen"
      :employee-id="profileEmployeeId"
      @update:open="onProfileOpenChange"
      @lifecycle-action="onLifecycleAction"
      @updated="onProfileUpdated"
    />

    <AddEmployeeWizard
      :open="wizardOpen"
      @update:open="wizardOpen = $event"
      @created="onEmployeeCreated"
    />

    <LifecycleActionModal
      :open="actionModalOpen"
      :action="actionModalKey"
      :employee="actionModalEmployee"
      :reference="reference"
      :submitting="lifecycleSubmitting"
      @close="closeActionModal"
      @confirm="onActionModalConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Users, LayoutGrid, UserPlus, IdCard, GitBranch, History,
  ArrowUp, CheckCircle, ArrowRight, Hourglass, Pause, UserX, Archive,
} from 'lucide-vue-next'
import '../../../styles/hr-theme.css'

import HrWorkspaceTopBar from '../../../components/hr/HrWorkspaceTopBar.vue'
import SectionRail from '../../../components/hr/SectionRail.vue'

import AllEmployeesSection from './sections/AllEmployeesSection.vue'
import EmployeeDirectorySection from './sections/EmployeeDirectorySection.vue'
import AddEmployeeSection from './sections/AddEmployeeSection.vue'
import EmployeeProfilesSection from './sections/EmployeeProfilesSection.vue'
import LifecycleSection from './sections/LifecycleSection.vue'
import EmployeeHistorySection from './sections/EmployeeHistorySection.vue'
import PromotionsSection from './sections/PromotionsSection.vue'
import ConfirmationsSection from './sections/ConfirmationsSection.vue'
import TransfersSection from './sections/TransfersSection.vue'
import ProbationSection from './sections/ProbationSection.vue'
import SuspendedSection from './sections/SuspendedSection.vue'
import InactiveSection from './sections/InactiveSection.vue'
import ArchivedSection from './sections/ArchivedSection.vue'

import EmployeeProfileDrawer from './EmployeeProfileDrawer.vue'
import AddEmployeeWizard from './AddEmployeeWizard.vue'
import LifecycleActionModal from '../../../components/hr/LifecycleActionModal.vue'

import { useEmployees, useHrReference, fetchDashboardStats } from '../../../composables/useEmployees'
import { useToast } from '../../../composables/useToast'

const route = useRoute()
const router = useRouter()
const { success, error } = useToast()

const {
  employees, total, loading, error: dataError, filters, totalPages,
  fetchList, setFilters, setPage, lifecycle, getOne,
} = useEmployees()

const { reference, loadReferenceData } = useHrReference()

const TABS = [
  { key: 'all',           label: 'All Employees',  description: 'Directory of every employee with filters, sort, and bulk actions.', icon: Users,         group: 'Browse' },
  { key: 'directory',     label: 'Directory',      description: 'Visual card directory.',                                              icon: LayoutGrid,    group: 'Browse' },
  { key: 'add',           label: 'Add Employee',   description: 'Open the four-step onboarding wizard.',                              icon: UserPlus,      group: 'Browse' },
  { key: 'profiles',      label: 'Profiles',       description: 'Search and open any employee profile.',                              icon: IdCard,        group: 'Browse' },

  { key: 'lifecycle',     label: 'Lifecycle',      description: 'Kanban board across all lifecycle states.',                           icon: GitBranch,     group: 'Lifecycle' },
  { key: 'transfers',     label: 'Transfers',      description: 'Department / location / manager changes.',                            icon: ArrowRight,    group: 'Lifecycle' },
  { key: 'promotions',    label: 'Promotions',     description: 'All promotion events.',                                                icon: ArrowUp,       group: 'Lifecycle' },
  { key: 'confirmations', label: 'Confirmations',  description: 'Probationary → permanent confirmations.',                              icon: CheckCircle,   group: 'Lifecycle' },
  { key: 'probation',     label: 'Probation',      description: 'Employees currently on probation.',                                    icon: Hourglass,     group: 'Lifecycle' },

  { key: 'suspended',     label: 'Suspended',      description: 'Currently suspended employees.',                                       icon: Pause,         group: 'Status' },
  { key: 'inactive',      label: 'Inactive',       description: 'Marked inactive (extended hold).',                                     icon: UserX,         group: 'Status' },
  { key: 'archived',      label: 'Archived',       description: 'Read-only archive.',                                                   icon: Archive,       group: 'Status' },

  { key: 'history',       label: 'History',        description: 'Chronological lifecycle event log.',                                   icon: History,       group: 'Audit' },
]
const TAB_KEYS = TABS.map(t => t.key)
const VALID = new Set(TAB_KEYS)

const activeTab = ref(VALID.has(route.params.tab) ? route.params.tab : 'all')
const slideDir = ref('forward')

// Rail collapsed state persisted to localStorage
const railCollapsed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('hr.employees.rail.collapsed') === '1'
)
const toggleRail = () => {
  railCollapsed.value = !railCollapsed.value
  try { localStorage.setItem('hr.employees.rail.collapsed', railCollapsed.value ? '1' : '0') } catch {}
}

const currentSectionLabel = computed(() => TABS.find(t => t.key === activeTab.value)?.label || '')
const currentSectionDescription = computed(() => TABS.find(t => t.key === activeTab.value)?.description || '')
const tourPosition = computed(() => Math.max(1, TAB_KEYS.indexOf(activeTab.value) + 1))
const tourTotal = computed(() => TABS.length)

// Live counts per tab for the rail badges
const tabCounts = computed(() => ({
  all:           dashboardStats.value.total_employees,
  probation:     dashboardStats.value.employees_on_probation,
  suspended:     dashboardStats.value.employees_suspended,
  // The rest stay nullable so badges don't render where we don't have a count
}))

const railGroups = computed(() => {
  const groups = {}
  for (const t of TABS) {
    if (!groups[t.group]) groups[t.group] = { title: t.group, items: [] }
    const count = tabCounts.value[t.key]
    groups[t.group].items.push({
      key: t.key,
      label: t.label,
      icon: t.icon,
      count: typeof count === 'number' ? count : null,
      tone: t.key === 'probation' || t.key === 'all' ? 'gold' : 'neutral',
    })
  }
  return Object.values(groups)
})

const onSelectTab = (key) => {
  if (route.params.tab !== key) {
    router.replace({ name: 'HrEmployeesTab', params: { tab: key } })
  }
}

watch(() => route.params.tab, (newTab) => {
  if (!newTab || !VALID.has(newTab)) return
  const prevIdx = TAB_KEYS.indexOf(activeTab.value)
  const nextIdx = TAB_KEYS.indexOf(newTab)
  slideDir.value = nextIdx >= prevIdx ? 'forward' : 'back'
  activeTab.value = newTab
  applyTabFilters(newTab)
})

// Tab-specific filter presets
const TAB_FILTER_PRESET = {
  all: {},
  directory: {},
  probation: { lifecycle_state: 'ON_PROBATION' },
  suspended: { lifecycle_state: 'SUSPENDED' },
  inactive: { lifecycle_state: 'INACTIVE' },
  archived: { lifecycle_state: 'ARCHIVED', include_deleted: true },
}

const applyTabFilters = async (tab) => {
  const listTabs = ['all', 'directory', 'probation', 'suspended', 'inactive', 'archived']
  if (!listTabs.includes(tab)) return
  const preset = TAB_FILTER_PRESET[tab] || {}
  setFilters({
    page: 1,
    search: '',
    department_id: null,
    designation_id: null,
    work_location_id: null,
    employment_type: null,
    lifecycle_state: preset.lifecycle_state ?? null,
    include_deleted: preset.include_deleted ?? false,
  })
  await fetchList()
}

const onSetFilters = async (patch) => {
  setFilters(patch)
  await fetchList()
}
const onSetPage = async (p) => {
  setPage(p)
  await fetchList()
}
const onRefresh = async () => { await fetchList(); await loadStats() }

// Lifecycle kanban data
const lifecycleEmployees = ref([])
const lifecycleLoading = ref(false)
const lifecycleSubmitting = ref(false)

const fetchLifecycle = async () => {
  if (activeTab.value !== 'lifecycle') return
  lifecycleLoading.value = true
  try {
    const prevFilters = { ...filters.value }
    setFilters({
      page: 1, limit: 100,
      search: '', department_id: null, designation_id: null,
      work_location_id: null, employment_type: null,
      lifecycle_state: null, include_deleted: true,
    })
    await fetchList()
    lifecycleEmployees.value = employees.value
    setFilters(prevFilters)
  } catch {
    lifecycleEmployees.value = []
  } finally {
    lifecycleLoading.value = false
  }
}

// Dashboard stats
const dashboardStats = ref({
  total_employees: 0,
  active_employees: 0,
  employees_on_probation: 0,
  employees_on_notice: 0,
  employees_suspended: 0,
  recent_hires_30d: 0,
})
const loadStats = async () => {
  try { dashboardStats.value = await fetchDashboardStats() } catch {}
}

// Profile drawer + Recent tracker
const profileOpen = ref(false)
const profileEmployeeId = ref('')
const recentList = ref([])

const loadRecent = () => {
  try {
    const raw = localStorage.getItem('hr.employees.recent')
    recentList.value = raw ? JSON.parse(raw) : []
  } catch { recentList.value = [] }
}
const pushRecent = (employee) => {
  if (!employee) return
  const entry = {
    id: employee.id,
    full_name: employee.full_name || (employee.user && employee.user.full_name) || '',
    employee_id: employee.employee_id || '',
    email: employee.email || (employee.user && employee.user.email) || '',
  }
  const next = [entry, ...recentList.value.filter(r => r.id !== entry.id)].slice(0, 3)
  recentList.value = next
  try { localStorage.setItem('hr.employees.recent', JSON.stringify(next)) } catch {}
}

const openProfile = async (id) => {
  // Populate "recent" before navigating away
  const fromList = employees.value.find(e => e.id === id)
                || lifecycleEmployees.value.find(e => e.id === id)
  if (fromList) pushRecent(fromList)
  else {
    try {
      const e = await getOne(id)
      pushRecent({
        id: e.id, employee_id: e.employee_id,
        full_name: e.user?.full_name,
        email: e.user?.email,
      })
    } catch {}
  }
  // Route to the dedicated full-page profile (drawer is deprecated).
  router.push({ name: 'HrEmployeeProfile', params: { id } })
}
const onProfileOpenChange = (v) => {
  profileOpen.value = v
  if (!v) profileEmployeeId.value = ''
}
const onProfileUpdated = async () => {
  await onRefresh()
  if (activeTab.value === 'lifecycle') await fetchLifecycle()
}

const wizardOpen = ref(false)
const openWizard = () => { wizardOpen.value = true }
const onEmployeeCreated = async (created) => {
  await onRefresh()
  if (activeTab.value === 'lifecycle') await fetchLifecycle()
  await openProfile(created.id)
}

// Lifecycle action plumbing. Any trigger point (drawer footer, kanban menu,
// archived-list restore button) emits a `lifecycle-action` event:
//   - { action, employee }              → open the modal to collect fields
//   - { action, employee, body, onDone } → submit immediately (kanban modal
//                                          collected fields already)
// The shared LifecycleActionModal is the single source of truth for form
// shape; it mirrors the backend schemas in employee_lifecycle.py.
const actionModalOpen = ref(false)
const actionModalKey = ref('')
const actionModalEmployee = ref(null)
const pendingOnDone = ref(null)

const openActionModal = (action, employee, onDone = null) => {
  actionModalKey.value = action
  actionModalEmployee.value = employee
  pendingOnDone.value = onDone
  actionModalOpen.value = true
}
const closeActionModal = () => {
  actionModalOpen.value = false
  actionModalKey.value = ''
  actionModalEmployee.value = null
  pendingOnDone.value = null
}

const submitLifecycle = async (action, employee, body, onDone) => {
  lifecycleSubmitting.value = true
  try {
    await lifecycle(employee.id, action, body)
    success(`${employee.full_name || employee.user?.full_name || employee.employee_id}: ${humanAction(action)} applied`)
    await onRefresh()
    if (activeTab.value === 'lifecycle') await fetchLifecycle()
    if (profileOpen.value && profileEmployeeId.value === employee.id) {
      profileEmployeeId.value = ''
      requestAnimationFrame(() => { profileEmployeeId.value = employee.id })
    }
    onDone?.()
    closeActionModal()
  } catch (e) {
    error(e.response?.data?.detail || `Failed to apply ${action}`)
  } finally {
    lifecycleSubmitting.value = false
  }
}

const humanAction = (a) => ({
  confirm: 'Confirmation',
  'put-on-probation': 'Probation',
  suspend: 'Suspension',
  reinstate: 'Reinstatement',
  'give-notice': 'Notice',
  exit: 'Exit',
  archive: 'Archive',
  unarchive: 'Restore',
  promote: 'Promotion',
  transfer: 'Transfer',
}[a] || a)

const onLifecycleAction = ({ action, employee, body, onDone }) => {
  // If the caller already collected a body (kanban legacy path), submit directly.
  if (body && Object.keys(body).length) {
    return submitLifecycle(action, employee, body, onDone)
  }
  // Otherwise open the shared modal so the user can fill required fields.
  openActionModal(action, employee, onDone)
}

const onActionModalConfirm = ({ action, employee, body }) => {
  submitLifecycle(action, employee, body, pendingOnDone.value)
}

watch(activeTab, async () => {
  if (activeTab.value === 'lifecycle') await fetchLifecycle()
}, { immediate: false })

onMounted(async () => {
  loadRecent()
  await loadReferenceData()
  await loadStats()
  await applyTabFilters(activeTab.value)
  if (activeTab.value === 'lifecycle') await fetchLifecycle()
})

watch(() => dataError.value, (e) => { if (e) error(e) })
</script>

<style scoped>
@import '../../../styles/hr-theme.css';

.hr-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: calc(100vh - 100px);
  /* Sit directly on the dashboard background — no painted surface here. */
  background: transparent;
}

.ws-body {
  display: flex;
  align-items: flex-start;
  gap: 0;
  /* No flex:1 or min-height:0 here — we want the rail's `position: sticky`
     to anchor to the window scroll, not to a captive inner scroller. */
}
.ws-canvas {
  flex: 1;
  min-width: 0;
  padding: 16px 4px 28px 8px;
  /* Let the page scroll naturally so the rail can stick. */
  animation: hr-fade-up 0.3s var(--hr-spring);
}

.canvas-section {
  min-height: 100%;
}

.canvas-forward-enter-active, .canvas-forward-leave-active,
.canvas-back-enter-active, .canvas-back-leave-active {
  transition: opacity 0.22s var(--hr-spring), transform 0.22s var(--hr-spring);
}
.canvas-forward-enter-from { opacity: 0; transform: translateX(12px); }
.canvas-forward-leave-to   { opacity: 0; transform: translateX(-8px); }
.canvas-back-enter-from    { opacity: 0; transform: translateX(-12px); }
.canvas-back-leave-to      { opacity: 0; transform: translateX(8px); }

@media (max-width: 900px) {
  .ws-canvas { padding: 16px 14px 24px; }
}
</style>
