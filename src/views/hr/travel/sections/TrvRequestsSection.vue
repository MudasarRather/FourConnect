<template>
  <div class="reqs">
    <!-- ══ Console hero ══ -->
    <Motion as="section" class="reqs-hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <span class="hero-runway" aria-hidden="true" />

      <div class="hero-top">
        <div class="hero-lead">
          <span class="hero-eyebrow"><Plane :size="13" /> Travel · Departures Control</span>
          <h1 class="hero-title">Boarding Pass <span class="grad">Ledger</span></h1>
          <p class="hero-sub">Every official journey on one board — trace each request from draft through the runway to settlement.</p>
        </div>
        <div class="hero-cta">
          <Motion as="button" type="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openNew">
            <Plus :size="16" /> Raise a request
          </Motion>
          <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="reloadAll">
            <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
          </Motion>
        </div>
      </div>

      <DepartureSkyField :requests="items" :total="total" @open="openDetail" />

      <div class="hero-lenses">
        <button class="lens" :class="{ on: !filters.status }" @click="setStatus('')">
          <Layers :size="13" /> <span>All</span> <b><TrvCountUp :value="statTotal" /></b>
        </button>
        <button v-for="st in primaryLenses" :key="st.key" class="lens" :class="{ on: filters.status === st.key }"
          :style="{ '--c': st.hex }" @click="setStatus(st.key)">
          <component :is="st.icon" :size="13" /> <span>{{ st.label }}</span> <b><TrvCountUp :value="statusCount(st.key)" /></b>
        </button>
        <button class="lens more" :class="{ on: moreOpen }" @click="moreOpen = !moreOpen">
          <component :is="moreOpen ? ChevronUp : ChevronDown" :size="13" /> More
        </button>
      </div>
      <Motion v-if="moreOpen" as="div" class="hero-lenses sub"
        :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :transition="{ duration: 0.3 }">
        <button v-for="st in secondaryLenses" :key="st.key" class="lens" :class="{ on: filters.status === st.key }"
          :style="{ '--c': st.hex }" @click="setStatus(st.key)">
          <component :is="st.icon" :size="13" /> <span>{{ st.label }}</span> <b><TrvCountUp :value="statusCount(st.key)" /></b>
        </button>
      </Motion>
    </Motion>

    <!-- ══ Command bar ══ -->
    <div class="reqs-bar">
      <div class="search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search ref, route, traveller or purpose…" @input="debouncedSearch"
          @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="search-x" @click="clearSearch"><X :size="13" /></button>
      </div>
      <HrSelect v-model="filters.travel_type" :options="typeOpts" placeholder="All types" class="bar-sel" @change="reload" />
      <HrSelect v-model="filters.department_id" :options="deptOpts" placeholder="All departments" class="bar-sel" @change="reload" />
      <HrSelect v-model="sortMode" :options="sortOpts" class="bar-sel sort" />
      <div class="view-toggle">
        <button :class="{ on: view === 'grid' }" title="Card view" @click="setView('grid')"><LayoutGrid :size="15" /></button>
        <button :class="{ on: view === 'list' }" title="List view" @click="setView('list')"><Rows3 :size="15" /></button>
      </div>
      <button v-if="hasFilters" class="reset" @click="resetFilters"><X :size="13" /> Clear</button>
    </div>

    <!-- ══ Results ══ -->
    <div v-if="loading" class="grid"><div v-for="n in 6" :key="n" class="skel" /></div>

    <template v-else-if="sortedItems.length">
      <div v-if="view === 'grid'" class="grid">
        <BoardingPassCard v-for="(r, i) in sortedItems" :key="r.id" :req="r" :index="i" @open="openDetail" @action="handleAction" />
      </div>
      <div v-else class="list">
        <RequestFlightStrip v-for="(r, i) in sortedItems" :key="r.id" :req="r" :index="i" @open="openDetail" @action="handleAction" />
      </div>
    </template>

    <TrvEmptyState v-else :icon="Plane" title="No travel requests"
      :subtitle="hasFilters ? 'No requests match this view — try clearing filters.' : 'No requests yet. Raise one to get the first journey on the board.'"
      cta="Raise a request" :cta-icon="Plus" @cta="openNew" />

    <div v-if="totalPages > 1" class="pager">
      <button :disabled="filters.page <= 1" @click="go(filters.page - 1)"><ChevronLeft :size="16" /></button>
      <span class="trv-mono">Page {{ filters.page }} / {{ totalPages }}</span>
      <button :disabled="filters.page >= totalPages" @click="go(filters.page + 1)"><ChevronRight :size="16" /></button>
    </div>

    <NewTravelRequestModal :open="showModal" :edit-request="editReq" @close="closeModal" @saved="onSaved" />
    <TravelDetailDrawer :open="showDetail" :request-id="detailId" @close="showDetail = false"
      @changed="onSaved" @edit="onDrawerEdit" @go="$emit('go', $event)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Plane, Plus, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X,
  RefreshCw, Layers, LayoutGrid, Rows3, Hourglass, CheckCircle2, PlaneTakeoff,
  BadgeCheck, Clock, Undo2, XCircle, Ban,
} from 'lucide-vue-next'
import DepartureSkyField from '../components/DepartureSkyField.vue'
import BoardingPassCard from '../components/BoardingPassCard.vue'
import RequestFlightStrip from '../components/RequestFlightStrip.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import NewTravelRequestModal from '../modals/NewTravelRequestModal.vue'
import TravelDetailDrawer from '../components/TravelDetailDrawer.vue'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { useToast } from 'vue-toastification'
import {
  useTravelRequests, TRAVEL_TYPES, errText,
  fetchStats, fetchDepartments, executeRequest, completeRequest,
} from '@/composables/useTravel'

const props = defineProps({ initialFilter: { type: Object, default: null } })
const emit = defineEmits(['go', 'refresh-stats', 'consumed'])
const toast = useToast()

const { items, total, totalPages, loading, filters, fetchList, setFilters } = useTravelRequests()
const q = ref('')
const searchFocus = ref(false)
const moreOpen = ref(false)
const showModal = ref(false)
const editReq = ref(null)
const showDetail = ref(false)
const detailId = ref(null)
const view = ref(localStorage.getItem('trv_req_view') || 'grid')
const sortMode = ref('newest')
const statBuckets = ref({})
const statTotalRef = ref(0)

const primaryLenses = [
  { key: 'PENDING_APPROVAL', label: 'In review', icon: Hourglass, hex: '#fbbf24' },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2, hex: '#34d399' },
  { key: 'IN_PROGRESS', label: 'In flight', icon: PlaneTakeoff, hex: '#fb923c' },
  { key: 'COMPLETED', label: 'Completed', icon: BadgeCheck, hex: '#60d394' },
]
const secondaryLenses = [
  { key: 'DRAFT', label: 'Draft', icon: Clock, hex: '#9ca3af' },
  { key: 'RETURNED', label: 'Returned', icon: Undo2, hex: '#f59e0b' },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle, hex: '#ef4444' },
  { key: 'CANCELLED', label: 'Cancelled', icon: Ban, hex: '#6b7280' },
]

const typeOpts = [{ value: '', label: 'All types' }, ...TRAVEL_TYPES.map(t => ({ value: t.key, label: t.key, icon: t.icon }))]
const deptOpts = ref([{ value: '', label: 'All departments' }])
const sortOpts = [
  { value: 'newest', label: 'Newest first' },
  { value: 'departure', label: 'Departure soonest' },
  { value: 'cost', label: 'Cost — high to low' },
  { value: 'priority', label: 'Priority — urgent first' },
]

const statTotal = computed(() => statTotalRef.value || total.value)
const statusCount = (k) => statBuckets.value[k] || 0

const hasFilters = computed(() => !!(filters.value.status || filters.value.travel_type || filters.value.department_id || filters.value.q))

const PRI_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
const sortedItems = computed(() => {
  const arr = [...items.value]
  if (sortMode.value === 'departure') arr.sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date))
  else if (sortMode.value === 'cost') arr.sort((a, b) => Number(b.est_total_cost || 0) - Number(a.est_total_cost || 0))
  else if (sortMode.value === 'priority') arr.sort((a, b) => (PRI_RANK[a.priority] ?? 2) - (PRI_RANK[b.priority] ?? 2))
  return arr
})

let t = null
const debouncedSearch = () => { clearTimeout(t); t = setTimeout(() => { setFilters({ q: q.value }); fetchList() }, 320) }
const clearSearch = () => { q.value = ''; setFilters({ q: '' }); fetchList() }
const reload = () => { setFilters({}); fetchList() }
const setStatus = (s) => { setFilters({ status: s }); fetchList() }
const setView = (v) => { view.value = v; localStorage.setItem('trv_req_view', v) }
const go = (p) => { filters.value.page = p; fetchList() }
const resetFilters = () => { q.value = ''; setFilters({ status: '', travel_type: '', department_id: '', q: '' }); fetchList() }

const openNew = () => { editReq.value = null; showModal.value = true }
const openEdit = (r) => { editReq.value = r; showModal.value = true }
const closeModal = () => { showModal.value = false; editReq.value = null }
const openDetail = (r) => { detailId.value = r.id; showDetail.value = true }
const onDrawerEdit = (r) => { showDetail.value = false; openEdit(r) }

const loadLensStats = async () => {
  try {
    const s = await fetchStats()
    const map = {}
    ;(s.by_status || []).forEach(r => { map[r.status] = r.count })
    statBuckets.value = map
    statTotalRef.value = s.total_requests || 0
  } catch { /* lenses fall back to list total */ }
}

const onSaved = () => { fetchList(); loadLensStats(); emit('refresh-stats') }
const reloadAll = () => { fetchList(); loadLensStats() }

const handleAction = async ({ type, req }) => {
  if (type === 'edit') return openEdit(req)
  if (type === 'booking') return openDetail(req)
  if (type === 'execute') {
    try { await executeRequest(req.id); toast.success(`${req.travel_reference_number} is airborne · attendance marked ON_DUTY`); onSaved() }
    catch (e) { toast.error(errText(e, 'Could not start travel')) }
  } else if (type === 'complete') {
    try { await completeRequest(req.id); toast.success(`${req.travel_reference_number} completed · settlement opened`); onSaved() }
    catch (e) { toast.error(errText(e, 'Could not complete tour')) }
  }
}

onMounted(async () => {
  if (props.initialFilter) { setFilters(props.initialFilter); emit('consumed') }
  fetchList()
  loadLensStats()
  try {
    const d = await fetchDepartments()
    deptOpts.value = [{ value: '', label: 'All departments' }, ...(d.items || []).map(x => ({ value: x.id, label: x.name }))]
  } catch { /* keep default */ }
})
watch(() => props.initialFilter, (f) => { if (f) { setFilters(f); fetchList(); emit('consumed') } })
</script>

<style scoped>
.reqs { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.reqs-hero {
  position: relative; overflow: hidden; border-radius: 22px; padding: 24px 26px 20px;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-shadow);
}
.hero-aura { position: absolute; inset: -30% 30% 50% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 28% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 9s ease-in-out infinite; }
.hero-runway { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--trv-grad-runway); background-size: 200% 100%; animation: trv-runway-flow 4s linear infinite; }
.hero-top { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; flex-wrap: wrap; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber); padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-title { font-size: clamp(24px, 3.6vw, 36px); font-weight: 850; margin: 11px 0 5px; line-height: 1.05; color: var(--trv-text); }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 13.5px; color: var(--trv-text-secondary); margin: 0; max-width: 480px; }
.hero-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.hero-lenses { position: relative; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.hero-lenses.sub { margin-top: 8px; overflow: hidden; }
.lens { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lens:hover { border-color: var(--c, var(--trv-amber-border)); color: var(--trv-text-secondary); }
.lens.on { color: var(--c, var(--trv-amber)); border-color: var(--c, var(--trv-amber-border)); background: color-mix(in srgb, var(--c, #fbbf24) 13%, transparent); }
.lens b { color: var(--trv-text); font-variant-numeric: tabular-nums; }
.lens.more { color: var(--trv-text-muted); }

/* ── command bar ── */
.reqs-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 12px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: border-color 0.2s, box-shadow 0.2s; }
.search.focus { border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }
.search input { flex: 1; background: none; border: none; outline: none; padding: 11px 0; font-size: 13px; color: var(--trv-text); }
.search-x { display: grid; place-items: center; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 2px; }
.bar-sel { width: 184px; }
.bar-sel.sort { width: 196px; }
.view-toggle { display: flex; gap: 3px; padding: 3px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.view-toggle button { display: grid; place-items: center; width: 34px; height: 32px; border-radius: 8px; cursor: pointer; background: none; border: none; color: var(--trv-text-muted); transition: all 0.2s; }
.view-toggle button.on { background: var(--trv-amber-soft); color: var(--trv-amber); }
.reset { display: inline-flex; align-items: center; gap: 5px; padding: 9px 13px; border-radius: 11px; cursor: pointer; font-size: 12px; font-weight: 650; background: var(--trv-st-rejected-soft); color: var(--trv-st-rejected); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 28%, transparent); }

/* ── results ── */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.skel { height: 220px; border-radius: 16px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 8px; }
.pager button { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-secondary); }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager span { font-size: 12.5px; color: var(--trv-text-muted); }

@media (max-width: 720px) { .bar-sel, .bar-sel.sort { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .hero-aura, .hero-runway { animation: none; } .spin { animation: none; } }
</style>
