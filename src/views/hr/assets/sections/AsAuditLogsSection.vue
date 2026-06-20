<template>
  <div class="alog">
    <!-- ════ Console hero ════ -->
    <LedgerConsole
      :active="categoryFilter" :lens-counts="lensCounts" :total="total" :sample-size="sample.length"
      :today-count="todayCount" :distinct-assets="distinctAssets" :integrity-pct="integrityPct"
      :buckets="bucketData.buckets" :max-count="bucketData.maxCount" :min-time="bucketData.minTime" :max-time="bucketData.maxTime"
      :loading="loadingSample" @pick="onPick" @refresh="refresh" />

    <!-- ════ Command bar ════ -->
    <Motion as="div" class="alog-bar"
      :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.1 }">
      <div class="alog-search" :class="{ active: search }">
        <Search :size="15" />
        <input v-model="search" type="text" placeholder="Search by asset, actor, note or event…" @keydown.esc="search = ''" />
        <button v-if="search" class="alog-search-x" @click="search = ''" aria-label="Clear"><X :size="13" /></button>
      </div>
      <div class="alog-type">
        <span class="alog-type-ic"><ListFilter :size="14" /></span>
        <AsSelect v-model="eventTypeFilter" :options="EVENT_TYPE_OPTIONS" placeholder="All event types" />
      </div>
      <Transition name="alog-fade">
        <span v-if="!serverMode" class="alog-mode as-mono"><CircleDot :size="10" /> filtering recent {{ sample.length }}</span>
      </Transition>
    </Motion>

    <!-- ════ Stream ════ -->
    <div v-if="initialLoading" class="alog-stream">
      <div v-for="n in 7" :key="n" class="as-skel alog-skel" :style="{ '--i': n }" />
    </div>

    <AssetEmptyState v-else-if="!displayedRows.length" :icon="ScrollText"
      :title="anyFilter ? 'No entries match' : 'No activity yet'"
      :sub="anyFilter ? 'Adjust the family lens, event type or search to widen the stream.' : 'Asset lifecycle events will stream into the ledger as they happen.'">
      <button v-if="anyFilter" class="as-btn as-btn-ghost" @click="clearAll"><FilterX :size="14" /> Clear filters</button>
    </AssetEmptyState>

    <template v-else>
      <div class="alog-stream" :key="streamKey">
        <div v-for="grp in grouped" :key="grp.key" class="alog-day">
          <Motion as="div" class="alog-day-h"
            :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.35 }">
            <span class="alog-day-dot" />
            <span class="alog-day-label">{{ grp.label }}</span>
            <span class="alog-day-rule" />
            <span class="alog-day-n as-mono">{{ grp.items.length }}</span>
          </Motion>
          <ul class="alog-list">
            <LedgerEntryRow v-for="item in grp.items" :key="item.ev.id" :ev="item.ev" :index="item.idx"
              @detail="(id) => $emit('detail', id)" @go="(t) => $emit('go', t)" />
          </ul>
        </div>
      </div>

      <LedgerPager :page="page" :total-pages="displayedTotalPages" :total="displayedTotal" :page-size="PAGE_SIZE"
        :loading="loadingPage" @update:page="goPage" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ScrollText, Search, X, ListFilter, FilterX, CircleDot } from 'lucide-vue-next'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import AsSelect from '../components/AsSelect.vue'
import LedgerConsole from '../components/LedgerConsole.vue'
import LedgerEntryRow from '../components/LedgerEntryRow.vue'
import LedgerPager from '../components/LedgerPager.vue'
import { fetchAuditLogs, errText } from '@/composables/useAssets'
import { eventMeta, EVENT_CATEGORIES } from '../components/histEventMeta.js'
import { EVENT_TYPE_OPTIONS, eventCategory, computeBuckets } from '../components/ledgerMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

defineEmits(['go', 'detail'])
const toast = useToast()
const reduced = prefersReduced()

const PAGE_SIZE = 10
const SAMPLE = 100

// ── data ──
const sample = ref([])          // recent ≤100 — powers telemetry + filtered (client) mode
const serverRows = ref([])      // server page (unfiltered deep browse)
const total = ref(0)            // grand total on record
const serverTotalPages = ref(1)
const loadingSample = ref(true)
const loadingPage = ref(true)

const page = ref(1)
const categoryFilter = ref('all')
const eventTypeFilter = ref('')
const search = ref('')

// Unfiltered browse → deep server pagination. Any filter/search → instant
// client-side filtering over the recent sample (capped, clearly labelled).
const serverMode = computed(() => categoryFilter.value === 'all' && !eventTypeFilter.value && !search.value.trim())
const anyFilter = computed(() => !serverMode.value)
const initialLoading = computed(() => (loadingSample.value || loadingPage.value) && !sample.value.length)

// ── client-side filter over the sample ──
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return sample.value.filter(ev => {
    if (categoryFilter.value !== 'all' && eventCategory(ev.event_type) !== categoryFilter.value) return false
    if (eventTypeFilter.value && ev.event_type !== eventTypeFilter.value) return false
    if (term) {
      const hay = `${ev.asset_code || ''} ${ev.actor_name || ''} ${ev.actor_employee_name || ''} ${ev.note || ''} ${eventMeta(ev.event_type).label} ${ev.event_type}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
})

const displayedRows = computed(() => {
  if (serverMode.value) return serverRows.value
  const s = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(s, s + PAGE_SIZE)
})
const displayedTotal = computed(() => serverMode.value ? total.value : filtered.value.length)
const displayedTotalPages = computed(() => serverMode.value ? serverTotalPages.value : Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const streamKey = computed(() => `${page.value}|${categoryFilter.value}|${eventTypeFilter.value}`)

// ── telemetry (derived from recent sample) ──
const bucketData = computed(() => computeBuckets(sample.value, 32))
const lensCounts = computed(() => {
  const m = {}
  for (const c of EVENT_CATEGORIES) m[c.key] = 0
  for (const ev of sample.value) { const k = eventCategory(ev.event_type); if (k in m) m[k] += 1 }
  return m
})
const todayCount = computed(() => {
  const now = new Date(); const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
  return sample.value.filter(ev => { const x = new Date(ev.created_at); return x.getFullYear() === y && x.getMonth() === mo && x.getDate() === d }).length
})
const distinctAssets = computed(() => new Set(sample.value.map(ev => ev.asset_id).filter(Boolean)).size)
const integrityPct = computed(() => {
  if (!sample.value.length) return 0
  const withActor = sample.value.filter(ev => ev.actor_name || ev.actor_employee_name).length
  return Math.round((withActor / sample.value.length) * 100)
})

// ── day grouping (+ running stagger index) ──
const grouped = computed(() => {
  const out = []; const map = new Map(); let idx = 0
  for (const ev of displayedRows.value) {
    const k = dayKey(ev.created_at)
    if (!map.has(k)) { const g = { key: k, label: dayLabel(ev.created_at), items: [] }; map.set(k, g); out.push(g) }
    map.get(k).items.push({ ev, idx: idx++ })
  }
  return out
})
function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}` }
function dayLabel(d) {
  const x = new Date(d); const now = new Date()
  const a = new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((b - a) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return x.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })
}

// ── fetching ──
async function fetchSample() {
  loadingSample.value = true
  try {
    const res = await fetchAuditLogs({ page: 1, limit: SAMPLE })
    sample.value = res.items || []
    total.value = res.total || 0
  } catch (e) { toast.error(errText(e, 'Failed to load activity')) }
  finally { loadingSample.value = false }
}
async function fetchPage() {
  loadingPage.value = true
  try {
    const res = await fetchAuditLogs({ page: page.value, limit: PAGE_SIZE })
    serverRows.value = res.items || []
    total.value = res.total || 0
    serverTotalPages.value = res.total_pages || 1
  } catch (e) { toast.error(errText(e, 'Failed to load activity')) }
  finally { loadingPage.value = false }
}

function goPage(p) { page.value = p; if (serverMode.value) fetchPage() }
function onFilterChange() { page.value = 1; if (serverMode.value) fetchPage() }
function onPick(key) {
  if (key === 'all') categoryFilter.value = 'all'
  else categoryFilter.value = categoryFilter.value === key ? 'all' : key
}
function clearAll() { categoryFilter.value = 'all'; eventTypeFilter.value = ''; search.value = '' }
function refresh() { page.value = 1; fetchSample(); fetchPage() }

watch([categoryFilter, eventTypeFilter, search], onFilterChange)
onMounted(() => { fetchSample(); fetchPage() })
</script>

<style scoped>
.alog { display: flex; flex-direction: column; gap: 16px; }

/* command bar */
.alog-bar { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.alog-search { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 13px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); transition: border-color 0.22s, box-shadow 0.22s; }
.alog-search.active, .alog-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 10%, transparent); }
.alog-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.alog-search input::placeholder { color: var(--as-text-dim); }
.alog-search-x { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0; cursor: pointer;
  border: 1px solid var(--as-border-soft); background: var(--as-surface); color: var(--as-text-muted); transition: all 0.2s; }
.alog-search-x:hover { color: var(--as-text); transform: rotate(90deg); }
.alog-type { display: flex; align-items: center; gap: 8px; min-width: 220px; }
.alog-type-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); }
.alog-type :deep(.asel) { flex: 1; }
.alog-mode { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--as-text-dim); letter-spacing: 0.04em;
  padding: 6px 10px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); white-space: nowrap; }
.alog-mode :deep(svg) { color: var(--as-amber); }

/* stream */
.alog-stream { display: flex; flex-direction: column; gap: 18px; }
.alog-skel { height: 56px; border-radius: 14px; animation-delay: calc(var(--i) * 0.05s) !important; }
.alog-day { display: flex; flex-direction: column; gap: 9px; }
.alog-day-h { display: flex; align-items: center; gap: 10px; padding: 2px 2px 0; }
.alog-day-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--as-amber); box-shadow: 0 0 9px var(--as-amber); flex-shrink: 0; }
.alog-day-label { font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-secondary); white-space: nowrap; }
.alog-day-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--as-border-strong), transparent); }
.alog-day-n { font-size: 10.5px; color: var(--as-text-dim); padding: 2px 8px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.alog-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }

.alog-fade-enter-active, .alog-fade-leave-active { transition: opacity 0.25s ease; }
.alog-fade-enter-from, .alog-fade-leave-to { opacity: 0; }

@media (max-width: 620px) {
  .alog-type { min-width: 0; flex: 1; }
}
</style>
