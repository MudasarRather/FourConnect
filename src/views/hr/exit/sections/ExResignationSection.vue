<template>
  <div class="ex-resig">
    <ResignationHero
      :cases="items" :by-status="byStatus" :kpis="kpis" :active-status="statusF" :loading="loading || statsLoading"
      @new="openCreate" @refresh="refreshAll" @pick="pickStatus" @go="$emit('go', $event)" @focus="openById" />

    <!-- command bar -->
    <Motion as="div" class="cmd ex-grain"
      :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="cmd-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search case # / employee ID…"
          @input="onSearch" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="cmd-clear-x" @click="q = ''; applyFilters()" type="button"><X :size="13" /></button>
      </div>

      <div class="cmd-filters">
        <ExSelect v-model="statusF" :options="statusOpts" size="sm" @change="applyFilters" />
        <ExSelect v-model="typeF" :options="typeOpts" size="sm" @change="applyFilters" />
        <ExSelect v-model="deptF" :options="deptOpts" size="sm" @change="applyFilters" />
        <Motion v-if="hasFilters" as="button" class="cmd-clear" type="button" @click="clearFilters"
          :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.9 }"
          :whileHover="{ y: -1 }" :whileTap="{ scale: 0.95 }"><X :size="13" /> Clear</Motion>
      </div>

      <div class="cmd-right">
        <span class="cmd-count ex-mono">{{ total }} {{ total === 1 ? 'case' : 'cases' }}</span>
        <div class="cmd-view" role="tablist" aria-label="View mode">
          <button :class="{ on: view === 'grid' }" @click="setView('grid')" type="button" aria-label="Grid view"><LayoutGrid :size="15" /></button>
          <button :class="{ on: view === 'list' }" @click="setView('list')" type="button" aria-label="List view"><List :size="15" /></button>
          <span class="cmd-view-pill" :class="view" aria-hidden="true" />
        </div>
      </div>
    </Motion>

    <!-- loading skeleton -->
    <div v-if="loading && !items.length" class="rc-grid">
      <div v-for="n in 6" :key="n" class="skel ex-grain"><span class="skel-shimmer" /></div>
    </div>

    <ExEmptyState v-else-if="!items.length" :icon="DoorOpen" title="No separation cases here"
      :subtitle="hasFilters ? 'No cases match the current filters — try clearing them.' : 'When an employee resigns or HR initiates a separation, it walks onto the gateway here.'">
      <template #action>
        <button v-if="hasFilters" class="empty-act" @click="clearFilters" type="button"><X :size="14" /> Clear filters</button>
        <button v-else class="empty-act primary" @click="openCreate" type="button"><Plus :size="14" /> New separation</button>
      </template>
    </ExEmptyState>

    <template v-else>
      <transition name="view-swap" mode="out-in">
        <div v-if="view === 'grid'" key="grid" class="rc-grid">
          <ResignationCard v-for="(c, i) in items" :key="c.id" :c="c" :index="i" @open="openDrawer" @delete="openDelete" />
        </div>
        <div v-else key="list" class="rr-list">
          <div class="rr-head">
            <span>Employee</span><span>Type</span><span class="h-dept">Department</span><span>Journey</span><span>Status</span><span class="h-dates">Timeline</span><span />
          </div>
          <ResignationRow v-for="(c, i) in items" :key="c.id" :c="c" :index="i" @open="openDrawer" @delete="openDelete" />
        </div>
      </transition>
    </template>

    <ExPager :page="filters.page" :total-pages="totalPages" :total="total" :limit="10" @update:page="setPage" />

    <ExCaseDrawer ref="drawerRef" :open="drawerOpen" :case-id="activeId" @close="drawerOpen = false"
      @action="onDrawerAction" @go="$emit('go', $event)" />
    <ExActionModal :open="modalOpen" :mode="modalMode" :employees="employees" :initial="editData" :busy="busy"
      :subtitle="activeCase?.case_number || editData?.case_number || ''" @close="modalOpen = false" @submit="runAction" />
    <ExDecisionModal :open="decisionOpen" :mode="modalMode" :case-info="activeCase" :busy="busy"
      @close="decisionOpen = false" @submit="runAction" />
    <ExDeleteModal :open="deleteOpen" :case-info="deleteCaseInfo" :busy="busy"
      @close="deleteOpen = false" @submit="runDelete" />
    <ExArchiveModal :open="archiveOpen" :case-info="archiveCaseInfo" :busy="busy"
      @close="archiveOpen = false" @submit="runArchive" @view-archive="goArchive" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { DoorOpen, Plus, Search, X, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ResignationHero from '../components/ResignationHero.vue'
import ExSelect from '../components/ExSelect.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ResignationCard from '../components/ResignationCard.vue'
import ResignationRow from '../components/ResignationRow.vue'
import ExPager from '../components/ExPager.vue'
import ExCaseDrawer from '../drawers/ExCaseDrawer.vue'
import ExActionModal from '../modals/ExActionModal.vue'
import ExDecisionModal from '../modals/ExDecisionModal.vue'
import ExDeleteModal from '../modals/ExDeleteModal.vue'
import ExArchiveModal from '../modals/ExArchiveModal.vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import {
  useExitCases, CASE_STATUS, RESIGNATION_TYPES, fetchEmployeesLite, fetchDepartments, fetchStats,
  createCase, submitCase, updateCase, acceptCase, rejectCase, cancelCase, startNotice, waiveNotice, adjustNotice,
  managerDecision, finalizeExit, archiveCase, deleteCase, errText,
  fetchCase, fetchActiveCaseForEmployee,
} from '@/composables/useExit'

const props = defineProps({ initialFilter: { type: Object, default: null } })
const emit = defineEmits(['go', 'refresh-stats', 'consumed'])
const toast = useToast()
const reduced = prefersReduced()
const route = useRoute()
const router = useRouter()

const { items, total, totalPages, loading, filters, fetchList, setFilters } = useExitCases({ limit: 10 })

const q = ref('')
const statusF = ref('')
const typeF = ref('')
const deptF = ref('')
const searchFocus = ref(false)
const view = ref(typeof localStorage !== 'undefined' && localStorage.getItem('hr.exit.resig.view') === 'list' ? 'list' : 'grid')

const statusOpts = [{ value: '', label: 'All statuses' }, ...CASE_STATUS.map(s => ({ value: s.key, label: s.label, dot: s.hex }))]
const typeOpts = [{ value: '', label: 'All types' }, ...RESIGNATION_TYPES.map(t => ({ value: t.key, label: t.label, icon: t.icon }))]
const deptOpts = ref([{ value: '', label: 'All departments' }])

const hasFilters = computed(() => !!(q.value || statusF.value || typeF.value || deptF.value))

// org-wide stats (accurate lens / horizon counts, not page-local)
const stats = ref(null)
const statsLoading = ref(false)
const byStatus = computed(() => stats.value?.by_status || {})
const kpis = computed(() => stats.value?.kpis || {})
const loadStats = async () => {
  statsLoading.value = true
  try { stats.value = await fetchStats() } catch {} finally { statsLoading.value = false }
}

let searchT = null
const onSearch = () => { clearTimeout(searchT); searchT = setTimeout(applyFilters, 350) }
const applyFilters = () => { setFilters({ q: q.value, status: statusF.value, resignation_type: typeF.value, department_id: deptF.value }); fetchList() }
const pickStatus = (s) => { statusF.value = statusF.value === s ? '' : s; applyFilters() }
const clearFilters = () => { q.value = ''; statusF.value = ''; typeF.value = ''; deptF.value = ''; applyFilters() }
const setPage = (p) => { setFilters({ page: p }); fetchList() }
const setView = (v) => { view.value = v; try { localStorage.setItem('hr.exit.resig.view', v) } catch {} }
const refreshAll = () => { fetchList(); loadStats() }

// masters for create modal + department filter
const employees = ref([])
const loadEmployees = async () => {
  try {
    const data = await fetchEmployeesLite('')
    employees.value = (data.items || []).map(e => ({
      id: e.id, code: e.employee_id || e.employee_code,
      name: e.user?.full_name || e.user?.name || e.full_name || e.name || e.employee_id,
    }))
  } catch { employees.value = [] }
}
const loadDepartments = async () => {
  try {
    const data = await fetchDepartments()
    deptOpts.value = [{ value: '', label: 'All departments' }, ...(data.items || []).map(d => ({ value: d.id, label: d.name }))]
  } catch { deptOpts.value = [{ value: '', label: 'All departments' }] }
}

// drawer + modal
const drawerRef = ref(null)
const drawerOpen = ref(false)
const activeId = ref(null)
const activeCase = ref(null)
const modalOpen = ref(false)
const decisionOpen = ref(false)
const deleteOpen = ref(false)
const deleteCaseInfo = ref(null)
const archiveOpen = ref(false)
const archiveCaseInfo = ref(null)
const modalMode = ref('create')
const busy = ref(false)
const editData = ref(null)   // case detail prefilled into ExActionModal for edit mode

const openDrawer = (c) => { activeId.value = c.id; activeCase.value = c; drawerOpen.value = true }
const openById = (id) => { const c = items.value.find(x => x.id === id); if (c) openDrawer(c) }
const openCreate = () => { activeCase.value = null; editData.value = null; modalMode.value = 'create'; modalOpen.value = true }
const openDelete = (c) => { activeId.value = c.id; activeCase.value = c; deleteCaseInfo.value = c; deleteOpen.value = true }
const onDrawerAction = ({ mode, detail }) => {
  if (mode === 'delete') { deleteCaseInfo.value = detail || activeCase.value; deleteOpen.value = true; return }
  // Archive runs its own ceremony (ExArchiveModal) — needs the full case detail
  // for the readiness checks (settlement, clearance, letters).
  if (mode === 'archive') { archiveCaseInfo.value = detail || activeCase.value; archiveOpen.value = true; return }
  if (mode === 'view-archive') { goArchive(); return }
  modalMode.value = mode
  // edit prefills the form; accept / start-notice / adjust-notice need the case detail to auto-derive dates
  editData.value = ['edit', 'accept', 'start-notice', 'adjust-notice'].includes(mode) ? (detail || activeCase.value) : null
  if (mode === 'reject' || mode === 'cancel') decisionOpen.value = true
  else modalOpen.value = true
}

const runAction = async (payload) => {
  busy.value = true
  const id = activeId.value
  try {
    if (modalMode.value === 'create') {
      const created = await createCase(payload)
      toast.success(`Case ${created.case_number} created`)
      try { await submitCase(created.id, {}) } catch {}
    } else if (modalMode.value === 'accept') await acceptCase(id, payload)
    else if (modalMode.value === 'reject') await rejectCase(id, payload.reason)
    else if (modalMode.value === 'cancel') await cancelCase(id, payload.reason)
    else if (modalMode.value === 'start-notice') { await startNotice(id, payload); emit('go', 'notice') }
    else if (modalMode.value === 'waive-notice') await waiveNotice(id, payload)
    else if (modalMode.value === 'adjust-notice') await adjustNotice(id, payload)
    else if (modalMode.value === 'manager-decision') await managerDecision(id, payload.decision, payload.notes)
    else if (modalMode.value === 'finalize-exit') await finalizeExit(id, payload)
    else if (modalMode.value === 'edit') await updateCase(id, payload)
    if (modalMode.value === 'edit') toast.success('Separation updated')
    else if (modalMode.value !== 'create') toast.success('Done')
    modalOpen.value = false
    decisionOpen.value = false
    await Promise.all([fetchList(), loadStats()])
    if (drawerOpen.value) drawerRef.value?.reload()
    emit('refresh-stats')
  } catch (e) {
    toast.error(errText(e, 'Action failed'))
  } finally { busy.value = false }
}

// Archive ceremony — consign a relieved case (employee → ARCHIVED) with a
// reasoned sign-off. Keeps `busy` true through the seal animation in the modal.
const runArchive = async (payload) => {
  if (!activeId.value) return
  busy.value = true
  const num = archiveCaseInfo.value?.case_number
  try {
    await archiveCase(activeId.value, { category: payload?.category, notes: payload?.notes })
    toast.success(num ? `Case ${num} archived` : 'Case archived')
    archiveOpen.value = false
    drawerOpen.value = false   // employee is now ARCHIVED — close the drawer
    await Promise.all([fetchList(), loadStats()])
    emit('refresh-stats')
  } catch (e) {
    toast.error(errText(e, 'Archive failed'))
  } finally { busy.value = false }
}

// "View in archive" — archived employees live on the Employees → Archived tab.
const goArchive = () => { router.push('/admin/hr/employees/archived') }

const runDelete = async (payload) => {
  if (!activeId.value) return
  busy.value = true
  const num = deleteCaseInfo.value?.case_number
  try {
    await deleteCase(activeId.value, { reason: payload?.reason })
    toast.success(num ? `Case ${num} deleted` : 'Case deleted')
    deleteOpen.value = false
    drawerOpen.value = false   // the case is gone — close the drawer if it was open
    await Promise.all([fetchList(), loadStats()])
    emit('refresh-stats')
  } catch (e) {
    toast.error(errText(e, 'Delete failed'))
  } finally { busy.value = false }
}

// Open a case in the drawer even if it isn't on the current list page (deep-link).
const focusCase = async (id) => {
  let c = items.value.find(x => String(x.id) === String(id))
  if (!c) { try { c = await fetchCase(id) } catch { c = null } }
  if (c) openDrawer(c)
}

// Handle the "Initiate Exit" deep-link from the employee profile / lifecycle
// surfaces: /admin/hr/exit/resignation?initiate=<employeeId>. Focus an existing
// open case if there is one, otherwise open the create modal pre-selected.
const handleInitiateDeepLink = async () => {
  const empId = route.query.initiate
  if (!empId) return
  // Strip the param so a refresh / back-nav doesn't re-trigger the flow.
  const { initiate, ...rest } = route.query
  router.replace({ query: rest })
  try {
    const res = await fetchActiveCaseForEmployee(empId)
    if (res?.open_case?.id) {
      toast.info(`Opening existing case ${res.open_case.case_number}`)
      await focusCase(res.open_case.id)
      return
    }
    const ls = res?.employee?.lifecycle_state
    if (ls === 'EXITED' || ls === 'ARCHIVED') {
      toast.info(`${res.employee?.name || 'This employee'} is already ${String(ls).toLowerCase()} — no exit case needed`)
      return
    }
    // Make sure the employee shows in the create modal's select even if they fall
    // outside the lite list's first page.
    if (res?.employee && !employees.value.some(e => String(e.id) === String(res.employee.id))) {
      employees.value = [{ id: res.employee.id, code: res.employee.code, name: res.employee.name }, ...employees.value]
    }
    editData.value = { employee_id: String(empId) }
    modalMode.value = 'create'
    modalOpen.value = true
  } catch (e) {
    toast.error(errText(e, 'Could not start the exit'))
  }
}

onMounted(async () => {
  if (props.initialFilter?.status) { statusF.value = props.initialFilter.status; emit('consumed') }
  applyFilters()
  loadStats()
  loadDepartments()
  await loadEmployees()
  await handleInitiateDeepLink()
})
</script>

<style scoped>
.ex-resig { color: var(--ex-text); }

/* command bar */
.cmd { position: relative; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  padding: 11px 13px; border-radius: 16px; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.cmd-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 9px 12px; border-radius: 11px;
  background: rgba(0, 0, 0, 0.28); border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: border-color 0.25s, box-shadow 0.3s, background 0.25s; }
.cmd-search.focus { border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12); color: var(--ex-violet); }
.cmd-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; font-size: 13px; font-family: inherit; color: var(--ex-text); }
.cmd-search input::placeholder { color: var(--ex-text-dim); }
.cmd-clear-x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer; background: var(--ex-steel-soft); border: none; color: var(--ex-text-muted); }
[data-theme="light"] .cmd-search { background: rgba(255, 250, 242, 0.72); }

.cmd-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cmd-filters :deep(.exs) { min-width: 132px; }
.cmd-clear { display: inline-flex; align-items: center; gap: 5px; padding: 8px 11px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;
  background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 28%, transparent); color: var(--ex-blocked); font-family: inherit; }

.cmd-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.cmd-count { font-size: 12px; font-weight: 700; color: var(--ex-text-muted); white-space: nowrap; }
.cmd-view { position: relative; display: flex; gap: 2px; padding: 3px; border-radius: 11px; background: rgba(0, 0, 0, 0.28); border: 1px solid var(--ex-border); }
[data-theme="light"] .cmd-view { background: rgba(255, 250, 242, 0.72); }
.cmd-view button { position: relative; z-index: 1; display: grid; place-items: center; width: 32px; height: 28px; border-radius: 8px; cursor: pointer; background: none; border: none; color: var(--ex-text-muted); transition: color 0.25s; }
.cmd-view button.on { color: #1a1206; }
[data-theme="light"] .cmd-view button.on { color: #fff; }
.cmd-view-pill { position: absolute; top: 3px; left: 3px; width: 32px; height: 28px; border-radius: 8px; background: var(--ex-grad-hero); box-shadow: 0 4px 12px -4px rgba(234, 88, 12, 0.6); transition: transform 0.34s var(--ex-spring); }
.cmd-view-pill.list { transform: translateX(34px); }

/* grid + list */
.rc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.rr-list { display: flex; flex-direction: column; gap: 9px; }
.rr-head { display: grid; align-items: center; gap: 14px;
  grid-template-columns: minmax(180px, 1.5fr) minmax(120px, 0.9fr) minmax(110px, 0.9fr) minmax(150px, 1.2fr) auto minmax(130px, auto) 34px;
  padding: 4px 14px 4px 17px; font-size: 10px; font-weight: 750; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
@media (max-width: 1080px) { .rr-head { grid-template-columns: minmax(160px, 1.4fr) minmax(110px, 0.9fr) minmax(140px, 1.1fr) auto 34px; } .rr-head .h-dept, .rr-head .h-dates { display: none; } }
@media (max-width: 680px) { .rr-head { display: none; } }

/* skeletons */
.skel { position: relative; overflow: hidden; height: 192px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251, 146, 60, 0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

/* empty state action */
.empty-act { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text); font-family: inherit; }
.empty-act.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }

/* pager */
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; font-size: 13px; color: var(--ex-text-secondary); }
.pager span i { color: var(--ex-text-dim); font-style: normal; }
.pager button { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.25s, transform 0.2s; }
.pager button:hover:not(:disabled) { border-color: var(--ex-violet-border); transform: translateY(-1px); }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }

.view-swap-enter-active, .view-swap-leave-active { transition: opacity 0.25s var(--ex-spring), transform 0.25s var(--ex-spring); }
.view-swap-enter-from { opacity: 0; transform: translateY(8px); }
.view-swap-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 760px) { .cmd-right { width: 100%; margin-left: 0; justify-content: space-between; } .rc-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .skel-shimmer { animation: none; }
  .cmd-view-pill { transition: none; }
  .view-swap-enter-active, .view-swap-leave-active { transition: opacity 0.15s; }
  .view-swap-enter-from, .view-swap-leave-to { transform: none; }
}
</style>
