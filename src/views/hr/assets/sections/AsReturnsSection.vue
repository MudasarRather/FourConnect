<template>
  <div class="ret">
    <ReturnConsole
      :outstanding="active.length"
      :overdue="overdueCount"
      :due-soon="dueSoonCount"
      :recovered="recoveredCount"
      :on-time-rate="onTimeRate"
      :open-ended="openCount"
      :requested="requestedCount"
      :markers="markers"
      :gate="GATE"
      @go="$emit('go', $event)"
      @pick="onPick" />

    <Motion as="section" class="ret-bay as-card"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.08 }">
      <header class="bay-head">
        <div class="bay-head-text">
          <span class="bay-ic"><PackageOpen :size="16" /></span>
          <div>
            <h3 class="bay-title">Re-entry corridor</h3>
            <p class="bay-sub">{{ active.length }} in the field · {{ overdueCount }} overdue · {{ dueSoonCount }} due soon</p>
          </div>
        </div>
        <button class="bay-refresh" @click="reload" :disabled="loading" title="Refresh">
          <RefreshCw :size="14" :class="{ spin: loading }" />
        </button>
      </header>

      <div class="ret-tools">
        <div class="ret-search">
          <Search :size="14" />
          <input v-model="search" placeholder="Search holder or asset code…" />
        </div>
        <div class="ret-chips">
          <button v-for="f in FILTERS" :key="f.key" class="ret-chip" :class="{ on: filter === f.key }"
            :data-tone="f.key" @click="filter = f.key">
            {{ f.label }}<span v-if="counts[f.key]" class="ret-chip-n">{{ counts[f.key] }}</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="ret-skel">
        <div v-for="n in 5" :key="n" class="as-skel" style="height: 74px; border-radius: 16px;" />
      </div>
      <AssetEmptyState v-else-if="!filteredActive.length" :icon="filtered ? Filter : PackageCheck"
        :title="filtered ? 'No matches' : 'Nothing to recover'"
        :sub="filtered ? 'Clear the filter to see every asset in the field.' : 'Every allocated asset is accounted for. Deploy assets from the bay and they will queue here for return.'">
        <button v-if="!filtered" class="as-btn as-btn-ghost" @click="$emit('go', 'allocations')"><Send :size="14" /> Deployment bay</button>
      </AssetEmptyState>
      <div v-else class="ret-corridor">
        <RetReentryCard v-for="(al, i) in filteredActive" :key="al.id" :alloc="al" :index="i"
          @return="openReturn" @history="$emit('detail', $event)" />
      </div>
    </Motion>

    <ReturnModal :open="retOpen" :alloc="retTarget" @close="retOpen = false" @returned="onReturned" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { PackageOpen, RefreshCw, Search, Filter, PackageCheck, Send } from 'lucide-vue-next'
import ReturnConsole from '../components/ReturnConsole.vue'
import RetReentryCard from '../components/RetReentryCard.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import ReturnModal from '../modals/ReturnModal.vue'
import { fetchAllocations, errText } from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const allocations = ref([])
const loading = ref(true)
const today = new Date().toISOString().slice(0, 10)

// ── horizon window (shared with ReturnConsole / RetReentryCard) ──
const HWIN_MIN = -14, HWIN_MAX = 30
const GATE = (0 - HWIN_MIN) / (HWIN_MAX - HWIN_MIN)   // x of "now"
const horizonX = (d) => (Math.max(HWIN_MIN, Math.min(HWIN_MAX, d)) - HWIN_MIN) / (HWIN_MAX - HWIN_MIN)
const daysToDue = (al) => al.expected_return_date
  ? Math.round((new Date(al.expected_return_date) - new Date(today)) / 86400000) : null
const toneOf = (al) => {
  const d = daysToDue(al)
  if (d === null) return 'open'
  if (d < 0) return 'over'
  if (d <= 3) return 'soon'
  return 'ok'
}

// active = still out; recovered = already returned (for the recovery telemetry)
const active = computed(() => allocations.value.filter(a => a.status === 'ALLOCATED'))
const returnedRows = computed(() => allocations.value.filter(a => a.status === 'RETURNED'))

const overdueCount = computed(() => active.value.filter(a => toneOf(a) === 'over').length)
const dueSoonCount = computed(() => active.value.filter(a => toneOf(a) === 'soon').length)
const openCount = computed(() => active.value.filter(a => toneOf(a) === 'open').length)
const requestedCount = computed(() => active.value.filter(a => a.return_requested).length)
const recoveredCount = computed(() => returnedRows.value.length)
const onTimeRate = computed(() => {
  const withDue = returnedRows.value.filter(a => a.expected_return_date && a.returned_date)
  if (!withDue.length) return 0
  const onTime = withDue.filter(a => a.returned_date <= a.expected_return_date).length
  return Math.round((onTime / withDue.length) * 100)
})

// markers for the console horizon (only the ones with a real due date)
const markers = computed(() => active.value
  .filter(a => a.expected_return_date)
  .map((a, i) => ({
    id: a.id, x: horizonX(daysToDue(a)), tone: toneOf(a),
    off: ((i % 3) - 1) * 11, label: `${a.asset_code} · ${dueLabel(a)}`,
  })))
function dueLabel(al) {
  const d = daysToDue(al)
  if (d === null) return 'open-ended'
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'due today'
  return `due in ${d}d`
}

// ── corridor ordering + filter ──
// Employee-requested returns bubble to the top (HR should action them first),
// then by urgency (soonest due first, open-ended last).
const ordered = computed(() => [...active.value].sort((a, b) => {
  if (!!a.return_requested !== !!b.return_requested) return a.return_requested ? -1 : 1
  const da = daysToDue(a), db = daysToDue(b)
  if (da === null && db === null) return 0
  if (da === null) return 1
  if (db === null) return -1
  return da - db
}))
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'soon', label: 'Due soon' },
  { key: 'open', label: 'Open-ended' },
]
const filter = ref('all')
const search = ref('')
const counts = computed(() => ({
  all: active.value.length, requested: requestedCount.value,
  overdue: overdueCount.value, soon: dueSoonCount.value, open: openCount.value,
}))
const filtered = computed(() => filter.value !== 'all' || !!search.value.trim())
const filteredActive = computed(() => {
  const q = search.value.trim().toLowerCase()
  return ordered.value.filter(al => {
    const t = toneOf(al)
    if (filter.value === 'requested' && !al.return_requested) return false
    if (filter.value === 'overdue' && t !== 'over') return false
    if (filter.value === 'soon' && t !== 'soon') return false
    if (filter.value === 'open' && t !== 'open') return false
    if (q && !((al.employee_name || '').toLowerCase().includes(q) || (al.asset_code || '').toLowerCase().includes(q))) return false
    return true
  })
})
function onPick(key) { filter.value = ['requested', 'overdue', 'soon', 'open'].includes(key) ? key : 'all' }

// ── load (all allocations so recovered + on-time telemetry is real) ──
async function reload() {
  loading.value = true
  try { allocations.value = await fetchAllocations({}) }
  catch (e) { toast.error(errText(e, 'Failed to load returns')) }
  finally { loading.value = false }
}
onMounted(reload)

// ── return modal ──
const retOpen = ref(false)
const retTarget = ref(null)
const openReturn = (al) => { retTarget.value = al; retOpen.value = true }
function onReturned() { reload(); emit('refresh-stats') }
</script>

<style scoped>
.ret { display: flex; flex-direction: column; gap: 16px; }
.ret-bay { padding: 16px 16px 18px; display: flex; flex-direction: column; gap: 14px; }

.bay-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bay-head-text { display: flex; align-items: center; gap: 11px; }
.bay-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 12%, transparent); }
.bay-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--as-text); }
.bay-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--as-text-muted); }
.bay-refresh { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, transform 0.2s; }
.bay-refresh:hover { color: var(--as-text); background: var(--as-surface-elevated); transform: rotate(40deg); }
.bay-refresh:disabled { cursor: default; }

.ret-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.ret-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 11px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.ret-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); }
.ret-search input { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--as-text); }
.ret-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.ret-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s var(--as-spring); }
.ret-chip:hover { border-color: var(--as-border-strong); transform: translateY(-1px); }
.ret-chip.on { color: var(--as-text); background: color-mix(in srgb, var(--as-amber) 12%, transparent); border-color: color-mix(in srgb, var(--as-amber) 32%, transparent); }
.ret-chip.on[data-tone="overdue"] { background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 34%, transparent); }
.ret-chip.on[data-tone="soon"] { background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 34%, transparent); }
.ret-chip.on[data-tone="requested"] { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); border-color: color-mix(in srgb, var(--as-amber) 38%, transparent); }
.ret-chip-n { font-family: var(--as-mono); font-size: 11px; font-weight: 800; padding: 0 5px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); }

.ret-skel { display: flex; flex-direction: column; gap: 11px; }

/* corridor spine */
.ret-corridor { position: relative; display: flex; flex-direction: column; gap: 11px; padding-left: 0; }
.ret-corridor::before { content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px; width: 2px; transform: translateX(-1px); border-radius: 2px; pointer-events: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-al-lost) 45%, transparent), color-mix(in srgb, var(--as-st-reserved) 35%, transparent) 40%, color-mix(in srgb, var(--as-st-available) 30%, transparent));
  -webkit-mask: linear-gradient(180deg, transparent, #000 6%, #000 94%, transparent); mask: linear-gradient(180deg, transparent, #000 6%, #000 94%, transparent); }
[data-theme="light"] .ret-corridor::before { opacity: 0.7; }

.spin { animation: as-spin 0.9s linear infinite; }
@media (max-width: 560px) { .ret-tools { flex-direction: column; align-items: stretch; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
