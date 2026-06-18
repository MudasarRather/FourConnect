<template>
  <div class="trn-sec">
    <AuditConsoleHero
      :total="serverTotal" :sample="sample"
      v-model:search="search" v-model:entityType="entityType" v-model:action="action" v-model:range="range"
      @refresh="refreshAll" />

    <!-- stream -->
    <section class="al-stream-wrap trn-card">
      <header class="al-stream-head">
        <h3><GitCommitHorizontal :size="16" /> Event stream</h3>
        <div class="al-stream-meta">
          <span v-if="searching" class="al-scope"><Search :size="11" /> recent activity</span>
          <span class="al-showing trn-mono" v-if="displayTotal">{{ rangeFrom }}–{{ rangeTo }} of {{ displayTotal }}</span>
          <button v-if="hasFilters" class="al-clear" @click="clearAll"><FilterX :size="13" /> Clear</button>
        </div>
      </header>

      <!-- loading -->
      <div v-if="loading" class="al-timeline">
        <span class="al-spine" aria-hidden="true" />
        <div v-for="n in 6" :key="n" class="al-skel-row">
          <div class="trn-skel" style="width: 52px; height: 13px" />
          <div class="al-skel-node trn-skel" />
          <div class="trn-skel" style="flex: 1; height: 58px; border-radius: 15px" />
        </div>
      </div>

      <!-- empty -->
      <TrnEmptyState v-else-if="!displayItems.length" :icon="ScrollText" :title="emptyTitle" :sub="emptySub" />

      <!-- timeline -->
      <Transition v-else :name="'al-pg-' + dir" mode="out-in">
        <div :key="page + ':' + (searching ? 'q' : 's')" class="al-timeline">
          <span class="al-spine" aria-hidden="true" />
          <div v-for="g in dayGroups" :key="g.key" class="al-day">
            <div class="al-day-head">
              <span class="al-day-pip" aria-hidden="true" />
              <span class="al-day-label">{{ g.label }}</span>
              <span class="al-day-n trn-mono">{{ g.items.length }}</span>
            </div>
            <div class="al-day-rows">
              <div v-for="(ev, i) in g.items" :key="ev.id" class="al-row">
                <div class="al-time">
                  <span class="al-clock trn-mono">{{ fmtTime(ev.created_at) }}</span>
                </div>
                <AuditEventCard :ev="ev" :index="i" @go="$emit('go', $event)" />
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- cinematic pagination -->
      <nav v-if="!loading && totalPages > 1" class="al-pager" aria-label="Pagination">
        <button class="al-pg-btn" :disabled="page <= 1" @click="go(page - 1)" aria-label="Previous">
          <ChevronLeft :size="16" />
        </button>
        <div class="al-pages">
          <template v-for="(p, i) in pageNumbers" :key="i">
            <span v-if="p === '…'" class="al-ellipsis">⋯</span>
            <Motion v-else as="button" type="button" class="al-page" :class="{ on: p === page }"
              :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.92 }" @click="go(p)">
              <span v-if="p === page" class="al-page-glow" aria-hidden="true" />
              <span class="al-page-n">{{ p }}</span>
            </Motion>
          </template>
        </div>
        <button class="al-pg-btn" :disabled="page >= totalPages" @click="go(page + 1)" aria-label="Next">
          <ChevronRight :size="16" />
        </button>
      </nav>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ScrollText, FilterX, ChevronLeft, ChevronRight, Search, GitCommitHorizontal,
} from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import AuditConsoleHero from '../components/AuditConsoleHero.vue'
import AuditEventCard from '../components/AuditEventCard.vue'
import { prettyLabel, dayKey, dayLabel } from '../components/auditMeta.js'
import { fetchTrainingAuditLogs } from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

defineEmits(['go'])
const toast = useToast()
const reduced = prefersReduced()

const PAGE_SIZE = 10
const SAMPLE_SIZE = 200

const loading = ref(true)
const items = ref([])          // current server page
const serverTotal = ref(0)
const sample = ref([])         // recent window for hero + search
const page = ref(1)
const dir = ref('next')

const search = ref('')
const entityType = ref('')
const action = ref('')
const range = ref('all')

const searching = computed(() => !!search.value.trim())
const hasFilters = computed(() => searching.value || !!entityType.value || !!action.value || range.value !== 'all')

// ── range → date params ───────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0')
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isoDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localISO(d) }
const rangeParams = () => range.value === '7d' ? { date_from: isoDaysAgo(7) }
  : range.value === '30d' ? { date_from: isoDaysAgo(30) } : {}
const baseParams = () => {
  const p = { ...rangeParams() }
  if (entityType.value) p.entity_type = entityType.value
  if (action.value) p.action = action.value
  return p
}

// ── client search over the recent sample ──────────────────────────────────────
const filteredSample = computed(() => {
  if (!searching.value) return []
  const q = search.value.trim().toLowerCase()
  return sample.value.filter(e =>
    (e.note && e.note.toLowerCase().includes(q)) ||
    (e.actor_name && e.actor_name.toLowerCase().includes(q)) ||
    prettyLabel(e.entity_type).toLowerCase().includes(q) ||
    prettyLabel(e.action).toLowerCase().includes(q) ||
    (e.to_status && prettyLabel(e.to_status).toLowerCase().includes(q)) ||
    (e.from_status && prettyLabel(e.from_status).toLowerCase().includes(q)))
})

const displayItems = computed(() => {
  if (searching.value) {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredSample.value.slice(start, start + PAGE_SIZE)
  }
  return items.value
})
const displayTotal = computed(() => searching.value ? filteredSample.value.length : serverTotal.value)
const totalPages = computed(() => Math.max(1, Math.ceil(displayTotal.value / PAGE_SIZE)))
const rangeFrom = computed(() => displayTotal.value ? (page.value - 1) * PAGE_SIZE + 1 : 0)
const rangeTo = computed(() => Math.min(page.value * PAGE_SIZE, displayTotal.value))

// ── day grouping (newest day first) ───────────────────────────────────────────
const dayGroups = computed(() => {
  const map = {}
  for (const ev of displayItems.value) (map[dayKey(ev.created_at)] ||= []).push(ev)
  return Object.keys(map).sort().reverse().map(key => ({ key, label: dayLabel(key), items: map[key] }))
})

const pageNumbers = computed(() => {
  const t = totalPages.value, c = page.value
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const out = [1]
  const s = Math.max(2, c - 1), e = Math.min(t - 1, c + 1)
  if (s > 2) out.push('…')
  for (let i = s; i <= e; i++) out.push(i)
  if (e < t - 1) out.push('…')
  out.push(t)
  return out
})

const emptyTitle = computed(() => searching.value ? 'No matches in recent activity'
  : hasFilters.value ? 'No events match these filters' : 'No audit events yet')
const emptySub = computed(() => searching.value ? 'Try a different term, or clear the search to page through everything.'
  : hasFilters.value ? 'Widen the lens — clear a filter or extend the range.'
    : 'Activity will appear here as programs, certifications, requests and more are touched.')

const fmtTime = (iso) => {
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ── loaders ───────────────────────────────────────────────────────────────────
const loadPage = async () => {
  loading.value = true
  try {
    const res = await fetchTrainingAuditLogs({ page: page.value, limit: PAGE_SIZE, ...baseParams() })
    items.value = res?.items || []
    serverTotal.value = res?.total ?? items.value.length
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load audit logs')
    items.value = []; serverTotal.value = 0
  } finally { loading.value = false }
}
const loadStats = async () => {
  try {
    const res = await fetchTrainingAuditLogs({ page: 1, limit: SAMPLE_SIZE, ...baseParams() })
    sample.value = res?.items || []
  } catch { sample.value = [] }
}
const refreshAll = () => { page.value = 1; loadPage(); loadStats() }
const clearAll = () => { search.value = ''; entityType.value = ''; action.value = ''; range.value = 'all' }

// filters (server) → reset + reload both
watch([entityType, action, range], () => { page.value = 1; loadPage(); loadStats() })
// search toggles client mode → reset page (sample already loaded)
watch(search, () => { page.value = 1 })

const go = (p) => {
  if (p < 1 || p > totalPages.value || p === page.value) return
  dir.value = p > page.value ? 'next' : 'prev'
  page.value = p
  if (!searching.value) loadPage()
  // smooth-scroll the stream into view on page change
  document.querySelector('.al-stream-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => { loadPage(); loadStats() })
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

.al-stream-wrap { padding: 18px 20px 20px; }
.al-stream-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.al-stream-head h3 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 750; color: var(--trn-text); }
.al-stream-head h3 :deep(svg) { color: var(--trn-amber-strong); }
.al-stream-meta { display: flex; align-items: center; gap: 12px; }
.al-scope { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
  color: var(--trn-amber-strong); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }
.al-showing { font-size: 11.5px; color: var(--trn-text-muted); }
.al-clear { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 5px 10px;
  border-radius: 9px; cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.al-clear:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 34%, transparent); }

/* timeline */
.al-timeline { position: relative; display: flex; flex-direction: column; gap: 6px; }
.al-spine { position: absolute; left: 71px; top: 14px; bottom: 14px; width: 1.5px; pointer-events: none;
  background: linear-gradient(180deg, transparent, var(--trn-border-strong) 8%, var(--trn-border-strong) 92%, transparent); }
.al-day { position: relative; }
.al-day-head { position: relative; display: flex; align-items: center; gap: 10px; padding: 12px 0 12px 88px; }
.al-day-pip { position: absolute; left: 66px; width: 11px; height: 11px; border-radius: 50%; background: var(--trn-amber);
  border: 2px solid var(--trn-canvas); box-shadow: 0 0 0 1px color-mix(in srgb, var(--trn-amber) 60%, transparent), 0 0 10px var(--trn-dome-glow); }
.al-day-label { font-size: 12px; font-weight: 750; color: var(--trn-text); letter-spacing: -0.01em; }
.al-day-n { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: 999px; color: var(--trn-text-muted);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.al-day-rows { display: flex; flex-direction: column; gap: 8px; }
.al-row { display: grid; grid-template-columns: 56px 1fr; align-items: start; gap: 14px; }
.al-time { display: flex; justify-content: flex-end; padding-top: 15px; }
.al-clock { font-size: 11.5px; font-weight: 700; color: var(--trn-text-secondary); white-space: nowrap; }

.al-skel-row { display: grid; grid-template-columns: 52px 24px 1fr; align-items: center; gap: 12px; }
.al-skel-node { width: 11px; height: 11px; border-radius: 50%; justify-self: center; }

/* pager */
.al-pager { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; padding-top: 18px;
  border-top: 1px solid var(--trn-border-soft); }
.al-pg-btn { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; cursor: pointer;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-secondary); transition: all 0.22s var(--trn-spring); }
.al-pg-btn:hover:not(:disabled) { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 40%, transparent); transform: translateY(-1px); }
.al-pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.al-pages { display: flex; align-items: center; gap: 5px; }
.al-page { position: relative; display: grid; place-items: center; min-width: 36px; height: 36px; padding: 0 6px; border-radius: 11px;
  font: inherit; cursor: pointer; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-secondary);
  transition: color 0.25s, border-color 0.25s, background 0.25s; overflow: hidden; }
.al-page:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); }
.al-page.on { color: #1a1206; border-color: transparent; }
[data-theme="light"] .al-page.on { color: #2a1a06; }
.al-page-glow { position: absolute; inset: 0; border-radius: 11px;
  background: var(--hr-gradient-hero, linear-gradient(120deg, var(--trn-amber), var(--trn-ember)));
  box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--trn-amber) 75%, transparent); animation: al-page-pop 0.4s var(--trn-spring); }
.al-page-n { position: relative; z-index: 1; font-size: 13px; font-weight: 700; font-family: var(--trn-mono); }
.al-ellipsis { padding: 0 4px; color: var(--trn-text-dim); font-weight: 700; }

/* page transitions (direction-aware) */
.al-pg-next-enter-active, .al-pg-prev-enter-active { transition: opacity 0.32s var(--trn-spring), transform 0.32s var(--trn-spring); }
.al-pg-next-leave-active, .al-pg-prev-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.al-pg-next-enter-from { opacity: 0; transform: translateY(16px); }
.al-pg-prev-enter-from { opacity: 0; transform: translateY(-16px); }
.al-pg-next-leave-to, .al-pg-prev-leave-to { opacity: 0; transform: scale(0.99); }

@keyframes al-page-pop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

@media (max-width: 600px) {
  .al-spine, .al-day-pip { display: none; }
  .al-day-head { padding-left: 0; }
  .al-row { grid-template-columns: 1fr; gap: 4px; }
  .al-time { justify-content: flex-start; padding-top: 0; padding-left: 2px; }
}
@media (prefers-reduced-motion: reduce) {
  .al-pg-next-enter-active, .al-pg-prev-enter-active, .al-pg-next-leave-active, .al-pg-prev-leave-active { transition: opacity 0.18s; }
  .al-pg-next-enter-from, .al-pg-prev-enter-from, .al-pg-next-leave-to, .al-pg-prev-leave-to { transform: none; }
  .al-page-glow { animation: none; }
}
</style>
