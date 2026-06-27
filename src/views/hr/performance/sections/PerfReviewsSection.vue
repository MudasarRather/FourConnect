<template>
  <div class="pr-sec">
    <PerfHero eyebrow="People · Reviews" title="Review" accent="Pipeline" :icon="ClipboardList"
      sub="Every performance review in flight along the lifecycle. Watch them flow from reflection to sign-off, open one to score it against its rubric, advance the workflow, then drive the merit increment.">
      <template #actions>
        <button class="perf-btn" type="button" :disabled="loading" @click="reloadAll"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /></button>
        <button class="perf-btn perf-btn-steel" type="button" @click="openModal('launch')"><Rocket :size="15" /> Launch cycle</button>
        <button class="perf-btn perf-btn-primary" type="button" @click="openModal('single')"><Plus :size="15" /> New review</button>
      </template>

      <template #lenses>
        <div class="pr-lenses">
          <button class="pr-lens" :class="{ on: !fStatus }" @click="setStatus(null)">
            <span class="pr-lens-ic all"><Layers :size="15" /></span>
            <span class="pr-lens-body"><b>{{ stats.total ?? total }}</b><i>All reviews</i></span>
            <span class="pr-lens-bar" />
          </button>
          <button v-for="s in LENS_KEYS" :key="s" class="pr-lens" :class="{ on: fStatus === s }" :style="{ '--c': statusMeta(s).color }" @click="setStatus(s)">
            <span class="pr-lens-ic"><component :is="statusMeta(s).icon" :size="15" /></span>
            <span class="pr-lens-body"><b>{{ byStatus[s] || 0 }}</b><i>{{ statusMeta(s).label }}</i></span>
            <span class="pr-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- signature instrument -->
    <ReviewFluxPipeline :stats="stats" :active-status="fStatus" @pick="onPipePick" @go="(t) => $emit('go', t)" />

    <!-- filter bar -->
    <div class="pr-filters">
      <div class="pr-search">
        <Search :size="14" />
        <input v-model="search" class="pr-search-in" placeholder="Filter loaded reviews by name…" />
        <button v-if="search" class="pr-search-x" type="button" @click="search = ''"><X :size="13" /></button>
      </div>
      <div class="pr-filters-right">
        <div class="pr-cyc-wrap">
          <PerfSelect v-model="fCycle" :options="cycleOptions" placeholder="All cycles" @update:model-value="reload(1)" />
        </div>
        <span class="pr-count">{{ shown.length }} of {{ total }}</span>
      </div>
    </div>

    <div v-if="loading" class="pr-loading"><Loader2 :size="20" class="perf-spin" /> Loading reviews…</div>
    <div v-else-if="!reviews.length" class="pr-empty">
      <span class="pr-empty-ic"><ClipboardList :size="26" /></span>
      <b>{{ fStatus || fCycle ? 'No reviews match' : 'No reviews yet' }}</b>
      <p v-if="!fStatus && !fCycle">Launch a cycle to open reviews across a cohort, or create a single review against an appraisal rubric.</p>
      <div class="pr-empty-acts">
        <button v-if="fStatus || fCycle" class="perf-btn perf-btn-steel" type="button" @click="clearFilters">Clear filters</button>
        <button class="perf-btn perf-btn-primary" type="button" @click="openModal('launch')"><Rocket :size="14" /> Launch a cycle</button>
      </div>
    </div>
    <div v-else-if="!shown.length" class="pr-empty">
      <span class="pr-empty-ic"><Search :size="24" /></span>
      <b>No loaded reviews match “{{ search }}”</b>
      <p>Search filters the reviews already loaded on this page. Clear it or page through for more.</p>
      <div class="pr-empty-acts"><button class="perf-btn perf-btn-steel" type="button" @click="search = ''">Clear search</button></div>
    </div>
    <template v-else>
      <div class="pr-grid">
        <PerfReviewCard v-for="(r, i) in shown" :key="r.id" :review="r" :index="i" @open="openDrawer" />
      </div>
      <div v-if="totalPages > 1" class="pr-pager">
        <button class="perf-btn perf-btn-ghost" :disabled="page <= 1" @click="reload(page - 1)"><ChevronLeft :size="15" /></button>
        <span class="pr-pager-txt">Page {{ page }} / {{ totalPages }} · {{ total }} reviews</span>
        <button class="perf-btn perf-btn-ghost" :disabled="page >= totalPages" @click="reload(page + 1)"><ChevronRight :size="15" /></button>
      </div>
    </template>

    <PerfReviewModal :open="modalOpen" :mode="modalMode" :templates="templates" :saving="saving"
      @close="modalOpen = false" @save="onSave" />
    <PerfReviewDrawer :open="drawerOpen" :review="selected" @close="drawerOpen = false"
      @mutated="onMutated" @go="(t) => $emit('go', t)" @request-delete="openDelete" />
    <PerfReviewDeleteModal :open="deleteOpen" :review="deleteTarget" :busy="deleteBusy"
      @close="deleteOpen = false" @confirm="confirmDelete" @cancel-review="cancelInstead" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ClipboardList, Plus, Rocket, Loader2, ChevronLeft, ChevronRight, Layers, Search, X, RefreshCw } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import PerfSelect from '../components/PerfSelect.vue'
import ReviewFluxPipeline from '../components/ReviewFluxPipeline.vue'
import PerfReviewCard from '../components/PerfReviewCard.vue'
import PerfReviewModal from '../components/PerfReviewModal.vue'
import PerfReviewDrawer from '../components/PerfReviewDrawer.vue'
import PerfReviewDeleteModal from '../components/PerfReviewDeleteModal.vue'
import { fetchReviews, fetchPerformanceStats, createReview, bulkCreateReviews, deleteReview, transitionReview, statusMeta, STATUS_ORDER } from '@/composables/usePerformance'
import { listAppraisalTemplates } from '@/views/hr/settings/composables/useHrSettings'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

defineEmits(['go'])
const toast = useToast()
const route = useRoute()
const LENS_KEYS = [...STATUS_ORDER, 'CANCELLED']
const LIMIT = 24

const reviews = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const fStatus = ref(null)
const fCycle = ref(null)
const search = ref('')
const templates = ref([])
const stats = ref({})

const byStatus = computed(() => stats.value.by_status || {})
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / LIMIT)))
const cycleOptions = computed(() => [{ value: null, label: 'All cycles' }, ...CYCLES.map(c => ({ value: c, label: cycleMeta(c).label }))])
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return reviews.value
  return reviews.value.filter(r => `${r.employee_name || ''} ${r.employee_code || ''} ${r.designation_name || ''}`.toLowerCase().includes(q))
})

async function reload(p = 1) {
  page.value = p
  loading.value = true
  try {
    const params = { page: p, limit: LIMIT }
    if (fStatus.value) params.status = fStatus.value
    if (fCycle.value) params.cycle = fCycle.value
    const data = await fetchReviews(params)
    reviews.value = data.items || []
    total.value = data.total || 0
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load reviews') }
  finally { loading.value = false }
}
async function reloadStats() { try { stats.value = await fetchPerformanceStats() } catch { /* non-fatal */ } }
async function reloadAll() { await Promise.all([reload(page.value), reloadStats()]) }

const setStatus = (s) => { fStatus.value = fStatus.value === s ? null : s; reload(1) }
const onPipePick = (key) => { if (key === 'overdue') return; setStatus(key) }
const clearFilters = () => { fStatus.value = null; fCycle.value = null; search.value = ''; reload(1) }

// modal
const modalOpen = ref(false)
const modalMode = ref('single')
const saving = ref(false)
const openModal = (mode) => { modalMode.value = mode; modalOpen.value = true }
async function onSave(payload) {
  saving.value = true
  try {
    if (modalMode.value === 'launch') {
      const res = await bulkCreateReviews(payload)
      toast.success(`Launched ${res.created} review${res.created === 1 ? '' : 's'}${res.skipped ? ` · ${res.skipped} skipped` : ''}`)
    } else {
      await createReview(payload)
      toast.success('Review created')
    }
    modalOpen.value = false
    await reloadAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create') }
  finally { saving.value = false }
}

// drawer
const drawerOpen = ref(false)
const selected = ref(null)
const openDrawer = (r) => { selected.value = r; drawerOpen.value = true }
function onMutated(updated) {
  const i = reviews.value.findIndex(r => r.id === updated.id)
  if (i >= 0) reviews.value[i] = updated
  selected.value = updated
  reloadStats()
}

// delete
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleteBusy = ref(false)
const openDelete = (r) => { deleteTarget.value = r; deleteOpen.value = true }
async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteBusy.value = 'delete'
  try {
    const id = deleteTarget.value.id
    await deleteReview(id)
    reviews.value = reviews.value.filter(r => r.id !== id)
    total.value = Math.max(0, total.value - 1)
    deleteOpen.value = false
    drawerOpen.value = false
    toast.success('Review deleted')
    reloadStats()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { deleteBusy.value = false }
}
async function cancelInstead(reason) {
  if (!deleteTarget.value) return
  deleteBusy.value = 'cancel'
  try {
    const updated = await transitionReview(deleteTarget.value.id, { to: 'CANCELLED', note: reason || null })
    onMutated(updated)
    deleteOpen.value = false
    toast.success('Review cancelled — kept for audit')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not cancel') }
  finally { deleteBusy.value = false }
}

onMounted(async () => {
  // deep-link from the Cycles tab: pre-filter by the cycle that was opened
  const qc = route.query.cycle
  if (qc && typeof qc === 'string') fCycle.value = qc
  reloadAll()
  try {
    const t = await listAppraisalTemplates()
    templates.value = (t || []).filter(x => x.is_active !== false && (x.sections || []).length)
  } catch { templates.value = [] }
})
</script>

<style scoped>
.pr-sec { display: flex; flex-direction: column; gap: 16px; }

/* telemetry lenses */
.pr-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; }
.pr-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 14px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.22s var(--perf-spring), transform 0.22s var(--perf-spring), background 0.22s; --c: var(--perf-gold); }
.pr-lens:hover { transform: translateY(-2px); border-color: var(--perf-border-strong); }
.pr-lens.on { border-color: color-mix(in srgb, var(--c) 42%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--perf-surface)); }
.pr-lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.pr-lens-ic.all { color: var(--perf-gold); }
.pr-lens-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.pr-lens-body b { font-size: 18px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pr-lens-body i { font-size: 9.5px; font-weight: 700; font-style: normal; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pr-lens.on .pr-lens-body i { color: var(--c); }
.pr-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--perf-spring); }
.pr-lens.on .pr-lens-bar { transform: scaleX(1); }

/* filters */
.pr-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pr-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 220px; max-width: 360px; height: 40px; padding: 0 12px; border-radius: 12px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.pr-search:focus-within { border-color: var(--perf-border-warm); }
.pr-search :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; }
.pr-search-in { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--perf-text); }
.pr-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; cursor: pointer; color: var(--perf-text-muted); background: var(--perf-track); border: none; flex-shrink: 0; }
.pr-search-x:hover { color: var(--perf-text); }
.pr-filters-right { display: flex; align-items: center; gap: 12px; }
.pr-cyc-wrap { width: 200px; }
.pr-count { font-size: 11.5px; font-weight: 650; color: var(--perf-text-muted); white-space: nowrap; }

.pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(262px, 1fr)); gap: 13px; }
.pr-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.pr-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pr-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pr-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pr-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.5; }
.pr-empty-acts { display: flex; gap: 9px; margin-top: 4px; }

.pr-pager { display: flex; align-items: center; justify-content: center; gap: 14px; }
.pr-pager-txt { font-size: 12px; font-weight: 650; color: var(--perf-text-muted); }

@media (max-width: 1080px) { .pr-lenses { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .pr-lenses { grid-template-columns: repeat(2, 1fr); } .pr-cyc-wrap { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .pr-lens:hover { transform: none; } }
</style>
