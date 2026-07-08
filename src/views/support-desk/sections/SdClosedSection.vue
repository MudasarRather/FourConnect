<template>
  <div class="cls sd-tw">
    <!-- ══════════════════ ARCHIVE HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdClosedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :agent="agent" :harvest-on="runOn"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @harvest="toggleRun" @followups="refine = 'chained'" @exhumed="refine = 'exhumed'"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the instrument fills the hero as its full-bleed backdrop.
             (Deep-Archive ambient until the 8-concept gallery winner is picked —
              the winner replaces SdClosedInstrument's internals only.) -->
        <SdClosedInstrument :tickets="lensFiltered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdClosedHero>

    <!-- ══════════════════ CLOSURE INTELLIGENCE (provenance · chronicle · permanence) ══════════════════ -->
    <SdArchiveBoard v-if="stats.closed_total != null" :stats="stats" :reduced="reduced"
      :active-source="f.close_source" :active-closer="closerFilter"
      @source="onSourcePick" @month="onMonthPick" @exhumed="refine = 'exhumed'"
      @kb="refine = 'kb'" @followups="refine = 'chained'" @closer="onCloserPick" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="cls-deck sd-card">
      <div class="cls-bar">
        <div class="cls-views">
          <button v-for="v in views" :key="v.key" class="cls-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="cls-tools">
          <button class="cls-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="cls-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="cls-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="cls-btn sm icon" title="Export the archive (CSV, honors filters)" @click="doExport"><Download :size="14" /></button>
          <span class="cls-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="cls-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="cls-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="cls-flt">
      <section v-if="showFilters" class="cls-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Provenance</label><SdSelect v-model="sourceSelect" :options="sourceOptions" /></div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Fix code</label><SdSelect v-model="f.resolution_code" :options="codeOptions" /></div>
        <div class="flt-field"><label>Root cause</label><SdSelect v-model="f.resolution_category" :options="causeOptions" /></div>
        <div class="flt-field"><label>Rating</label><SdSelect v-model="f.csat" :options="csatOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Sealed</label>
          <SdDatePicker v-model="f.closed_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.closed_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="cls-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="cls-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents; the archive is read-mostly — tagging only) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="cls-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="cls-btn sm accent" @click="openBulk('tag')"><Tag :size="13" /> Add tag</button>
        </div>
        <button class="cls-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS — deliberately NO board: nothing drags INTO closed ══════════════════ -->
    <div class="cls-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Landmark"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort"
        @certificate="(t) => (certTarget = t)" />

      <!-- LEDGER — every record as one closure story (unique to this desk) -->
      <SdClosureLedger v-else :tickets="pagedRows" :now="now" :loading="wsLoading" :reduced="reduced"
        @open="openTicket" @certificate="(t) => (certTarget = t)" />
    </div>

    <!-- pager -->
    <div v-if="pages > 1" class="cls-pager">
      <button class="cls-btn sm icon" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button>
      <span class="pg-info sd-mono">PAGE {{ page }} / {{ pages }}</span>
      <button class="cls-btn sm icon" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button>
    </div>

    <!-- ══════════════════ KNOWLEDGE HARVEST RUN (guided sweep over promotable fixes) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="runOn && runCurrent && !drawerId && !kbTarget" class="khr-veil"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }"
          @mousedown.stop @click.stop>
          <Motion class="khr-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }" :key="String(runCurrent.id)">
            <div class="khr-head sd-mono">
              <span class="khr-eyebrow"><BookMarked :size="13" /> KNOWLEDGE HARVEST</span>
              <span class="khr-count">{{ runIdx + 1 }} / {{ runQueue.length }}</span>
            </div>
            <div class="khr-no sd-mono">{{ runCurrent.ticket_number }} · <em>{{ (runCurrent.resolution_code || '').replace(/_/g, ' ').toUpperCase() }}</em>
              <span v-if="runCurrent.csat_score" class="khr-csat"><Star :size="10" /> {{ runCurrent.csat_score }}/5</span>
            </div>
            <h3 class="khr-subj">{{ runCurrent.subject }}</h3>
            <p class="khr-fix">{{ runCurrent.resolution_summary }}</p>
            <div class="khr-actions">
              <button class="khr-btn primary" @click="kbTarget = runCurrent"><BookMarked :size="14" /> Harvest into the KB</button>
              <button class="khr-btn" @click="openTicket(runCurrent.id)"><PanelRight :size="14" /> Open console</button>
              <button class="khr-btn ghost" @click="runNext"><ChevronRight :size="14" /> Skip</button>
            </div>
            <div class="khr-dots" aria-hidden="true">
              <i v-for="(id, i) in runQueue" :key="id" :class="{ done: i < runIdx, on: i === runIdx }" />
            </div>
            <button class="khr-x" title="End the harvest" @click="endRun"><X :size="15" /></button>
          </Motion>
        </Motion>
      </Presence>
    </Teleport>

    <!-- ══════════════════ EXHUME OVERLAY (agent-only reopen with a coded verdict) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="exhumeFor" class="exh-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
          :transition="{ duration: 0.22 }" @mousedown.stop @click.self="cancelExhume">
          <Motion class="exh-card" :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 12, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
            <div class="exh-h sd-mono"><Shovel :size="13" /> EXHUME {{ exhumeFor.ticket_number }}</div>
            <p class="exh-sub">Reopening a sealed record is on the record. The case returns to the floor with a
              fresh resolution clock; the CSAT verdict stays as history.</p>
            <div class="exh-chips">
              <button v-for="rc in REOPEN_REASON_CODES" :key="rc.value" class="exh-chip"
                :class="{ on: exhumeCode === rc.value }" @click="exhumeCode = rc.value">{{ rc.short }}</button>
            </div>
            <input v-model="exhumeNote" class="exh-note" type="text" placeholder="One line for the record (optional)…" />
            <div class="exh-actions">
              <button class="exh-btn danger" :disabled="!exhumeCode || exhumeBusy" @click="confirmExhume">
                <Shovel :size="13" /> {{ exhumeBusy ? 'Exhuming…' : 'Reopen the case' }}
              </button>
              <button class="exh-btn ghost" @click="cancelExhume">Leave it sealed</button>
            </div>
          </Motion>
        </Motion>
      </Presence>
    </Teleport>

    <!-- drawer + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <!-- the ONE corporate escalation console (same surface as My Tickets / every list
         desk) — reached from the insight strip's escalate actions; closed records
         themselves are terminal and never offer escalate. -->
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="[]" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdClosureCertificate :open="!!certTarget" :ticket="certTarget" :agent="agent"
      @close="certTarget = null" @open="onCertJump"
      @reopen="startExhume" @followup="(t) => (fuTarget = t)" @promote="(t) => (kbTarget = t)" />
    <SdFollowUpModal :open="!!fuTarget" :ticket="fuTarget" @close="fuTarget = null" @done="onFollowUpDone" />
    <SdKbPromoteModal :open="!!kbTarget" :ticket="kbTarget" @close="kbTarget = null" @done="onKbDone" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="[]" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdClosedSection — "THE ARCHIVE OF RECORD".
  Composition: SdClosedHero (full-bleed signature instrument — visuals from the 8-concept
  gallery pick) → SdArchiveBoard (provenance spectrum / permanence dial / 12-month
  chronicle / CSAT-of-record / lifespan / top closers) → control deck → Records table /
  Closure LEDGER views (deliberately NO kanban — nothing can be dragged INTO closed) →
  KNOWLEDGE HARVEST RUN (ranked guided sweep over promotable fixes) → closure
  CERTIFICATE (read-only integrity record) → follow-up + KB-promote modals → EXHUME
  overlay (agent-only reopen with a coded verdict) → adaptive drawer + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'closed'})
  (backend team-sealed: agents see their teams' archive, superuser the whole desk,
  plain employees their own records) + the sealed /me/tickets/closed/stats rollup.
  Opening either runs the auto-close sweep server-side, so the archive is honest.
  Positioning vs siblings: Resolved is about PROOF (the 3-day quality gate), this desk
  is about PERMANENCE — provenance, the verdict of record, and what the archive teaches
  (knowledge harvest, follow-up chains, exhumations).
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, Tag, ChevronLeft, ChevronRight,
  Table, Landmark, ScrollText, BookMarked, PanelRight, Star, Shovel, Link2, Stamp, Timer,
  GitMerge, Undo2, BellOff, ThumbsDown, Zap, CalendarClock,
} from 'lucide-vue-next'
import SdClosedHero from '../components/SdClosedHero.vue'
import SdClosedInstrument from '../components/SdClosedInstrument.vue'
import SdArchiveBoard from '../components/SdArchiveBoard.vue'
import SdClosureLedger from '../components/SdClosureLedger.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdClosureCertificate from '../modals/SdClosureCertificate.vue'
import SdFollowUpModal from '../modals/SdFollowUpModal.vue'
import SdKbPromoteModal from '../modals/SdKbPromoteModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchClosedStats, fetchCommandCenterStats, fetchMyWorkbench,
  reopenTicket, exportTicketsCsv, getMe, getTicket, loadPickers, usePickers,
  priorityLabel, closeSourceOf, closeSourceLabel,
  CLOSE_SOURCES, RESOLUTION_CODES, ROOT_CAUSES, REOPEN_REASON_CODES,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'closed' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-cls-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views (no kanban by design — a sealed record can't be dragged anywhere) ── */
const views = [
  { key: 'table', label: 'Records', icon: Table },
  { key: 'ledger', label: 'Ledger', icon: ScrollText },
]
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)

/* ── server filters ── */
const f = reactive({ q: '', close_source: '', priority: '', resolution_code: '', resolution_category: '', csat: '', organization_id: '', closed_from: '', closed_to: '' })
const activeFilterCount = computed(() => ['close_source', 'priority', 'resolution_code', 'resolution_category', 'csat', 'organization_id', 'closed_from', 'closed_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); closerFilter.value = ''; reload() }

/* ── client refinements ── */
const refine = ref('all')      // hero lens: all|today|month|auto|merged|withdrawn|exhumed|kb|chained|lowcsat
const closerFilter = ref('')   // leaderboard pick (client-side: closed_by → resolved_by → assignee)
const sortBy = ref('closedAt')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})          // /me/tickets/closed/stats (team-sealed)
const cmdStats = ref({})       // command-center/workbench (insight ticker tail)
const now = ref(Date.now())
const me = ref({})
let tick = null

const params = () => ({
  scope: 'closed',
  status: 'closed',            // belt-and-braces: pins the archive on BOTH panels
  q: f.q || undefined,
  close_source: f.close_source || undefined,
  priority: f.priority || undefined,
  resolution_code: f.resolution_code || undefined,
  resolution_category: f.resolution_category || undefined,
  csat: f.csat || undefined,
  organization_id: f.organization_id || undefined,
  closed_from: f.closed_from || undefined,
  closed_to: f.closed_to || undefined,
  sort_by: 'closed_at', sort_dir: 'desc',   // freshest seal first in the window
})
const loadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), ...params(), page: 1, limit: 100 })
    workingSet.value = r.items || []          // merged tombstones ARE records here
    total.value = r.total || workingSet.value.length
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false } finally { wsLoading.value = false }
}
const loadStats = async () => {
  try { stats.value = await fetchClosedStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── archive telemetry ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const startOfDay = computed(() => { const d = new Date(now.value); d.setHours(0, 0, 0, 0); return d.getTime() })
const KB_CODES = ['solved', 'workaround', 'known_error', 'configuration']
const isKbCandidate = (t) => !((t.links || {}).kb_article_id)
  && KB_CODES.includes(t.resolution_code)
  && !!(t.resolution_summary || '').trim() && !t.merged_into_id
const lifespanMs = (t) => (t.closed_at && t.created_at)
  ? Math.max(0, ep(t.closed_at) - ep(t.created_at) - (t.sla_paused_ms || 0)) : 0

const PRED = {
  all: () => true,
  today: t => ep(t.closed_at) >= startOfDay.value,
  month: t => ep(t.closed_at) >= now.value - 30 * 86400000,
  auto: t => closeSourceOf(t) === 'auto_sweep',
  merged: t => closeSourceOf(t) === 'merged',
  withdrawn: t => closeSourceOf(t) === 'withdrawn',
  exhumed: t => (t.reopened_count || 0) > 0,
  kb: t => isKbCandidate(t),
  chained: t => !!t.follow_up_of_id || !!t.follow_up_of_number,
  lowcsat: t => t.csat_score != null && t.csat_score <= 2,
}

/* ── derived sets ── */
const closerOf = (t) => String(t.closed_by_id || t.resolved_by_id || t.assigned_agent_id || '')
const lensFiltered = computed(() => {
  let rows = workingSet.value.filter(PRED[refine.value] || PRED.all)
  if (closerFilter.value) rows = rows.filter(t => closerOf(t) === closerFilter.value)
  return rows
})

const sortVal = (t, key) => {
  if (key === 'closedAt' || key === 'closed_at') return ep(t.closed_at)
  if (key === 'lifespan') return lifespanMs(t)
  if (key === 'closeSource') return closeSourceOf(t)
  if (key === 'resolutionCode') return t.resolution_code || ''
  if (key === 'csat' || key === 'csat_score') return t.csat_score ?? -1
  if (key === 'priority') return ({ critical: 5, urgent: 4, high: 3, medium: 2, low: 1 })[t.priority] || 0
  if (['created_at', 'updated_at'].includes(key)) return ep(t[key])
  if (key === 'number' || key === 'ticket_number') return t.ticket_number || ''
  if (key === 'subject') return (t.subject || '').toLowerCase()
  return t[key] ?? ''
}
const filtered = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...lensFiltered.value].sort((a, b) => {
    const av = sortVal(a, sortBy.value), bv = sortVal(b, sortBy.value)
    return av < bv ? -dir : av > bv ? dir : 0
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE)))
const pagedRows = computed(() => filtered.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch(filtered, () => { if (page.value > pages.value) page.value = pages.value })

/* ── lenses (stats-first with client fallback) ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const src30 = (k) => (stats.value.by_close_source || {})[k]
const lenses = computed(() => [
  { key: 'all', label: 'The archive', icon: Landmark, color: 'var(--sd-cls-core)', value: stats.value.closed_total ?? cnt(PRED.all) },
  { key: 'today', label: 'Sealed today', icon: Zap, color: 'var(--sd-cls-hi)', value: stats.value.closed_today ?? cnt(PRED.today) },
  { key: 'month', label: 'This month', icon: CalendarClock, color: 'var(--sd-cls-frost)', value: stats.value.closed_30d ?? cnt(PRED.month) },
  { key: 'auto', label: 'Auto-sealed', icon: Timer, color: 'var(--sd-cls-frost)', value: src30('auto_sweep') ?? cnt(PRED.auto) },
  { key: 'merged', label: 'Merged', icon: GitMerge, color: 'var(--sd-cls-deep)', value: stats.value.merged_total ?? cnt(PRED.merged) },
  { key: 'withdrawn', label: 'Withdrawn', icon: Undo2, color: 'var(--sd-text-dim)', value: src30('withdrawn') ?? cnt(PRED.withdrawn) },
  { key: 'kb', label: 'KB candidates', icon: BookMarked, color: 'var(--sd-cls-seal)', value: stats.value.kb_candidates_30d ?? cnt(PRED.kb) },
  { key: 'exhumed', label: 'Exhumed', icon: Shovel, color: 'var(--sd-cls-risk)', value: stats.value.reopened_from_closed_30d ?? cnt(PRED.exhumed) },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'all' : l.key
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { today: 'Sealed today', month: 'This month', auto: 'Auto-sealed', merged: 'Merged duplicates', withdrawn: 'Withdrawn', exhumed: 'Exhumed records', kb: 'KB candidates', chained: 'In a follow-up chain', lowcsat: 'Low CSAT ≤2★' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'all' } })
  if (f.close_source) out.push({ key: 'src', label: closeSourceLabel(f.close_source), clear: () => { f.close_source = ''; reload() } })
  if (closerFilter.value) out.push({ key: 'closer', label: 'One closer', clear: () => { closerFilter.value = '' } })
  if (f.closed_from || f.closed_to) out.push({ key: 'range', label: 'Sealed range', clear: () => { f.closed_from = ''; f.closed_to = ''; reload() } })
  return out
})
const clearRefine = () => {
  refine.value = 'all'; closerFilter.value = ''
  if (f.close_source || f.closed_from || f.closed_to) { f.close_source = ''; f.closed_from = ''; f.closed_to = ''; reload() }
}

/* ── board wiring (the board and the list always tell the same story) ── */
const onSourcePick = (key) => { f.close_source = f.close_source === key ? '' : key; reload() }
const onCloserPick = (id) => { closerFilter.value = closerFilter.value === id ? '' : id; page.value = 1 }
const onMonthPick = (b) => {
  const d = new Date(b.month)
  const from = new Date(d.getFullYear(), d.getMonth(), 1)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  f.closed_from = iso(from); f.closed_to = iso(to)
  reload()
  toast.info(`Archive narrowed to ${b.label} — ${b.n} record${b.n === 1 ? '' : 's'}.`)
}

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const sourceOptions = computed(() => [{ value: '', label: 'Any provenance' }, ...CLOSE_SOURCES.map(s => ({ value: s.value, label: s.label }))])
const codeOptions = computed(() => [{ value: '', label: 'Any fix code' }, ...RESOLUTION_CODES.map(c => ({ value: c.value, label: c.label }))])
const causeOptions = computed(() => [{ value: '', label: 'Any root cause' }, ...ROOT_CAUSES.map(c => ({ value: c.value, label: c.label }))])
const csatOptions = [
  { value: '', label: 'Any rating' },
  { value: 'rated', label: 'Rated' },
  { value: 'unrated', label: 'Unrated' },
  { value: 'low', label: 'Low (≤2★)' },
]
const sourceSelect = computed({
  get: () => f.close_source,
  set: (v) => { f.close_source = v || ''; page.value = 1; reload() },
})

/* ── selection (read-mostly: tagging only) ── */
const selected = ref([])
const isSel = (id) => selected.value.includes(String(id))
const toggleSel = (id) => { const s = String(id); selected.value = isSel(id) ? selected.value.filter(x => x !== s) : [...selected.value, s] }
const toggleAll = () => {
  const ids = pagedRows.value.map(r => String(r.id))
  const all = ids.every(i => selected.value.includes(i))
  selected.value = all ? selected.value.filter(i => !ids.includes(i)) : [...new Set([...selected.value, ...ids])]
}
const onSort = (key) => {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = ['closedAt', 'csat', 'lifespan'].includes(key) ? 'desc' : 'asc' }
  page.value = 1
}

/* ── KNOWLEDGE HARVEST RUN — ranked guided sweep over promotable fixes ── */
const runOn = ref(false)
const runQueue = ref([])
const runIdx = ref(0)
const runCurrent = computed(() => {
  const id = runQueue.value[runIdx.value]
  return workingSet.value.find(t => String(t.id) === id) || null
})
const harvestScore = (t) => (t.csat_score || 3) * 2 + Math.max(0, 6 - (now.value - ep(t.closed_at)) / 86400000 / 5)
const toggleRun = () => (runOn.value ? endRun() : startRun())
const startRun = () => {
  const q = workingSet.value.filter(isKbCandidate).sort((a, b) => harvestScore(b) - harvestScore(a)).map(t => String(t.id))
  if (!q.length) { toast.info('Nothing to harvest — every promotable fix is already in the KB.'); return }
  runQueue.value = q; runIdx.value = 0; runOn.value = true
}
const endRun = () => { runOn.value = false; runQueue.value = []; runIdx.value = 0 }
const runNext = () => {
  if (runIdx.value + 1 >= runQueue.value.length) {
    endRun()
    toast.success('Harvest complete — every promotable fix has been reviewed.')
    return
  }
  runIdx.value += 1
}

/* ── EXHUME — agent-only reopen with a coded verdict (single-writer apply_reopen) ── */
const exhumeFor = ref(null)
const exhumeCode = ref('')
const exhumeNote = ref('')
const exhumeBusy = ref(false)
const startExhume = (t) => {
  if (!agent.value) { toast.info('Closed records need a support agent to reopen them.'); return }
  certTarget.value = null
  exhumeFor.value = t; exhumeCode.value = ''; exhumeNote.value = ''
}
const cancelExhume = () => { exhumeFor.value = null; exhumeCode.value = ''; exhumeNote.value = '' }
const confirmExhume = async () => {
  const t = exhumeFor.value
  if (!t || !exhumeCode.value) return
  exhumeBusy.value = true
  try {
    await reopenTicket(t.id, { reason: exhumeNote.value || 'Exhumed from the archive', reason_code: exhumeCode.value })
    toast.success(`${t.ticket_number} exhumed — back on the floor with a fresh clock.`)
    cancelExhume()
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not reopen the record.') }
  finally { exhumeBusy.value = false }
}

/* ── certificate + follow-up + KB modals ── */
const certTarget = ref(null)
const fuTarget = ref(null)
const kbTarget = ref(null)
const onCertJump = (id) => { certTarget.value = null; openTicket(id) }
const onFollowUpDone = (child) => {
  fuTarget.value = null
  refreshAll()
  if (child?.id) openTicket(child.id)   // walk straight into the new case
}
const onKbDone = () => {
  const id = kbTarget.value?.id
  kbTarget.value = null
  // reflect the harvest locally so the candidate lens/board stay honest pre-refresh
  const row = workingSet.value.find(t => String(t.id) === String(id))
  if (row) row.links = { ...(row.links || {}), kb_article_id: 'pending' }
  loadStats()
  if (runOn.value) runNext()
}

/* ── bulk (tagging only — the archive is read-mostly) ── */
const bulkOpen = ref(false)
const bulkMode = ref('tag')
const bulkTicketObjs = computed(() => workingSet.value.filter(t => selected.value.includes(String(t.id))))
const openBulk = (mode) => {
  if (!bulkTicketObjs.value.length) { toast.info('Select records first.'); return }
  bulkMode.value = mode
  bulkOpen.value = true
}
const onBulkDone = () => { bulkOpen.value = false; selected.value = []; refreshAll() }

/* ── drawer + escalate console + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => { drawerId.value = null }
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; toast.success('Ticket escalated'); refreshAll() }
const onInsight = async (ins) => {
  const ids = (ins?.ticket_ids || []).map(String)
  // The command-center feed's escalate actions open the SAME corporate escalation
  // console as My Tickets — never a bare drawer. The flagged ticket usually lives on
  // another desk (breaches are open work, not closed records), so fetch it by id.
  if (agent.value && ins?.action === 'escalate' && ids.length) {
    let t = workingSet.value.find(x => String(x.id) === ids[0]) || null
    if (!t) { try { t = await getTicket(ids[0]) } catch { t = null } }
    if (t) { escalateTarget.value = t; return }
  }
  if (ids.length) { openTicket(ids[0]); return }
  if (ins?.id === 'cls-kb') { refine.value = 'kb'; return }
  if (ins?.id === 'cls-exh') { refine.value = 'exhumed'; return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific record to open for this insight')
}
/* Archive-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  if ((stats.value.kb_candidates_30d || 0) >= 3) out.push({ id: 'cls-kb', kind: 'stale', severity: 'info',
    title: `${stats.value.kb_candidates_30d} sealed fixes are knowledge-base candidates`,
    detail: 'Good, rated resolutions nobody has harvested — one harvest run turns them into draft articles.', action: 'view', ticket_ids: [] })
  if ((stats.value.reopened_from_closed_30d || 0) > 0) out.push({ id: 'cls-exh', kind: 'breach_risk', severity: 'warn',
    title: `${stats.value.reopened_from_closed_30d} record${stats.value.reopened_from_closed_30d === 1 ? '' : 's'} exhumed this month`,
    detail: 'A reopen from CLOSED means the seal did not hold — review what the failed fixes have in common.', action: 'view', ticket_ids: [] })
  const srcs = stats.value.by_close_source || {}
  const t30 = stats.value.closed_30d || 0
  if (t30 >= 5 && (srcs.no_response || 0) / t30 >= 0.3) out.push({ id: 'cls-noresp', kind: 'customer_flood', severity: 'warn',
    title: '"No response" is a growing share of the archive',
    detail: `${srcs.no_response} of ${t30} closures sealed on customer silence — check whether requesters get what they need.`, action: 'view', ticket_ids: [] })
  if (stats.value.closure_survival_pct_30d != null && stats.value.closure_survival_pct_30d < 70) out.push({ id: 'cls-surv', kind: 'breach_risk', severity: 'crit',
    title: `Only ${stats.value.closure_survival_pct_30d}% of seals held this month`,
    detail: 'The archive is leaking — records keep coming back. Tighten the quality gate on the Resolved desk.', action: 'view', ticket_ids: [] })
  if ((stats.value.open_follow_ups || 0) > 0) out.push({ id: 'cls-fu', kind: 'stale', severity: 'info',
    title: `${stats.value.open_follow_ups} follow-up case${stats.value.open_follow_ups === 1 ? '' : 's'} still live`,
    detail: 'Stories continued from sealed records are being worked on the operational desks.', action: 'view', ticket_ids: [] })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'harvest', label: runOn.value ? 'End the knowledge harvest' : 'Start knowledge harvest — best fixes first', icon: BookMarked, run: toggleRun },
  { key: 'lens-kb', label: 'Lens · KB candidates', icon: BookMarked, run: () => (refine.value = 'kb') },
  { key: 'lens-exh', label: 'Lens · Exhumed records', icon: Shovel, run: () => (refine.value = 'exhumed') },
  { key: 'lens-auto', label: 'Lens · Auto-sealed', icon: Timer, run: () => (refine.value = 'auto') },
  { key: 'lens-merged', label: 'Lens · Merged duplicates', icon: GitMerge, run: () => (refine.value = 'merged') },
  { key: 'view-ledger', label: 'View · Ledger (the closure stories)', icon: ScrollText, run: () => (view.value = 'ledger') },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  else if (e.key === 'Escape' && runOn.value && !drawerId.value && !certTarget.value && !kbTarget.value && !fuTarget.value) endRun()
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('closed').columns || [])
const emptyText = computed(() => refine.value === 'all' && !activeFilterCount.value
  ? (getTicketScope('closed').empty || { title: 'The archive is empty', blurb: 'Sealed records will collect here.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the whole archive.' })

/* ── CSV export — server-side, sealed, honors the archive filters ── */
const doExport = async () => {
  try {
    const blob = await exportTicketsCsv({
      scope: 'closed', status: 'closed',
      close_source: f.close_source || undefined,
      closed_from: f.closed_from || undefined,
      closed_to: f.closed_to || undefined,
      priority: f.priority || undefined,
      organization_id: f.organization_id || undefined,
      q: f.q || undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'closed-archive.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch { toast.error('Could not export the archive.') }
}

onMounted(async () => {
  refreshAll(); loadPickers().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => { clearInterval(tick); window.removeEventListener('keydown', onKeydown) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.cls { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.cls-insights { align-self: stretch; }

.cls-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.cls-btn:hover { border-color: var(--sd-cls-seal); }
.cls-btn:active { transform: translateY(1px); }
.cls-btn.on { border-color: var(--sd-cls-seal); color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); }
.cls-btn.accent { border-color: color-mix(in srgb, var(--sd-cls-seal) 55%, transparent); color: #241703; background: linear-gradient(135deg, #ecd9a8, var(--sd-cls-seal)); }
[data-theme="light"] .cls-btn.accent { color: #3b2a05; }
.cls-btn.sm { padding: 7px 12px; font-size: 12px; }
.cls-btn.icon { padding: 7px 9px; }
.cls-btn.ghost { background: transparent; }
.cls-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.cls-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-cls-seal); color: #241703; font-size: 10px; font-weight: 800; }

.cls-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; border-color: var(--sd-cls-brd); }
.cls-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cls-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.cls-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.cls-view:hover { color: var(--sd-text); }
.cls-view.on { color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); }
.cls-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.cls-count { font-size: 12px; color: var(--sd-text-dim); }

.cls-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-cls-seal) 44%, transparent); background: var(--sd-cls-seal-soft); color: var(--sd-cls-seal); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.cls-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }
.cls-flt-enter-active, .cls-flt-leave-active { transition: opacity 0.24s ease, transform 0.24s ease; }
.cls-flt-enter-from, .cls-flt-leave-to { opacity: 0; transform: translateY(-8px); }

.cls-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-cls-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-cls-seal); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.cls-pager { display: flex; align-items: center; justify-content: center; gap: 12px; }
.pg-info { font-size: 11px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

/* ── KNOWLEDGE HARVEST RUN overlay ── */
.khr-veil { position: fixed; inset: 0; z-index: 2100; display: grid; place-items: end center; padding: 0 16px 6vh;
  background: linear-gradient(0deg, rgba(5, 6, 9, 0.72), rgba(5, 6, 9, 0.3)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.khr-card { position: relative; width: min(560px, 100%); padding: 18px 20px; border-radius: 18px;
  border: 1px solid var(--sd-cls-brd); background: var(--sd-panel); box-shadow: var(--sd-shadow); }
.khr-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.khr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-cls-seal); }
.khr-count { font-size: 10px; color: var(--sd-text-dim); }
.khr-no { font-size: 11px; font-weight: 800; color: var(--sd-cls-frost); }
.khr-no em { font-style: normal; color: var(--sd-cls-seal); }
.khr-csat { margin-left: 10px; display: inline-flex; align-items: center; gap: 3px; color: var(--sd-cls-seal); }
.khr-subj { margin: 6px 0; font-size: 16px; font-weight: 800; color: var(--sd-text); }
.khr-fix { margin: 0 0 13px; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-muted);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.khr-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.khr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.khr-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ecd9a8, var(--sd-cls-seal)); }
.khr-btn.ghost { background: transparent; }
.khr-dots { display: flex; gap: 4px; margin-top: 13px; }
.khr-dots i { flex: 1; height: 3px; border-radius: 2px; background: var(--sd-cls-soft); }
.khr-dots i.done { background: var(--sd-cls-seal); opacity: 0.5; }
.khr-dots i.on { background: var(--sd-cls-seal); }
.khr-x { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); cursor: pointer; }
.khr-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

/* ── EXHUME overlay ── */
.exh-veil { position: fixed; inset: 0; z-index: 2400; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(5, 6, 9, 0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .exh-veil { background: rgba(30, 25, 15, 0.4); }
.exh-card { display: flex; flex-direction: column; gap: 11px; width: min(440px, 100%); padding: 18px 20px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--sd-cls-risk) 40%, transparent); background: var(--sd-panel); box-shadow: var(--sd-shadow); }
.exh-h { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-cls-risk); }
.exh-sub { margin: 0; font-size: 12px; line-height: 1.55; color: var(--sd-text-muted); }
.exh-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.exh-chip { padding: 6px 11px; border-radius: 999px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); transition: all 0.16s; }
.exh-chip.on { border-color: var(--sd-cls-risk); color: var(--sd-cls-risk); background: var(--sd-cls-risk-soft); }
.exh-note { padding: 9px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; outline: none; }
.exh-note:focus { border-color: var(--sd-cls-risk); }
.exh-actions { display: flex; gap: 8px; }
.exh-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.exh-btn.danger { border-color: transparent; color: #fff; background: linear-gradient(135deg, #fb7185, #e11d48); }
.exh-btn.ghost { background: transparent; }
.exh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
