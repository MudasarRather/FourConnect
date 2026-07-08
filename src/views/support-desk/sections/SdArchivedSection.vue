<template>
  <div class="arc sd-tw">
    <!-- ══════════════════ DEEP-STORAGE HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdArchivedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :agent="agent" :review-on="runOn"
      :mistake-count="mistakeCount" :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @review="toggleRun" @expiring="scrollToRail" @hold="refine = 'hold'"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- ⚑ "THE REDACTION WALL" (gallery v2 pick 07) — height=0: fills the hero as
             its full-bleed backdrop; every docket line is a real tombstone → drawer. -->
        <SdArchiveInstrument :tickets="filtered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdArchivedHero>

    <!-- ══════════════════ STORAGE INTELLIGENCE (reasons · strata · chronicle · retention) ══════════════════ -->
    <SdArchiveIntelBoard v-if="stats.total_archived != null" :stats="stats" :reduced="reduced"
      :active-reason="f.archive_reason_code" :active-archiver="archiverFilter"
      @reason="onReasonPick" @month="onMonthPick" @mistakes="refine = 'mistakes'"
      @hold="refine = 'hold'" @purge="refine = 'purge'" @archiver="onArchiverPick" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="arc-deck sd-card">
      <div class="arc-bar">
        <div class="arc-views">
          <button v-for="v in views" :key="v.key" class="arc-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="arc-tools">
          <button class="arc-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="arc-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="arc-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="arc-btn sm icon" title="Export deep storage (CSV, honors filters)" @click="doExport"><Download :size="14" /></button>
          <span class="arc-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="arc-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="arc-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="arc-flt">
      <section v-if="showFilters" class="arc-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Reason</label><SdSelect v-model="reasonSelect" :options="reasonOptions" /></div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Governance</label><SdSelect v-model="govSelect" :options="govOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Shelved</label>
          <SdDatePicker v-model="f.archived_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.archived_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="arc-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="arc-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar -->
    <Presence>
      <Motion v-if="agent && selected.length" class="arc-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="arc-btn sm restore" @click="restoreTarget = bulkTicketObjs"><ArchiveRestore :size="13" /> Restore</button>
          <button class="arc-btn sm" @click="openBulk('tag')"><Tag :size="13" /> Add tag</button>
          <button class="arc-btn sm hold" title="Place a legal hold — suspends retention on these records" @click="doBulkHold(true)"><Scale :size="13" /> Hold</button>
          <button v-if="superuser" class="arc-btn sm hold ghost" title="Release legal holds (superuser)" @click="doBulkHold(false)"><Scale :size="13" /> Release</button>
          <button v-if="superuser" class="arc-btn sm danger" title="Permanently destroy eligible records (superuser)" @click="purgeTarget = bulkTicketObjs"><Flame :size="13" /> Purge</button>
        </div>
        <button class="arc-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS — deliberately NO board: nothing drags INTO deep storage ══════════════════ -->
    <div class="arc-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Archive"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort"
        @restore="(t) => (restoreTarget = [t])" />

      <!-- LEDGER — every tombstone as one storage story (unique to this desk) -->
      <SdArchiveLedger v-else :tickets="pagedRows" :now="now" :loading="wsLoading" :reduced="reduced"
        :agent="agent" :superuser="superuser"
        @open="openTicket" @restore="(t) => (restoreTarget = [t])" @hold="doHold"
        @purge="(t) => (purgeTarget = [t])" />
    </div>

    <!-- pager -->
    <div v-if="pages > 1" class="arc-pager">
      <button class="arc-btn sm icon" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button>
      <span class="pg-info sd-mono">PAGE {{ page }} / {{ pages }}</span>
      <button class="arc-btn sm icon" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button>
    </div>

    <!-- ══════════════════ RETENTION WATCH (the burn-down rail) ══════════════════ -->
    <SdRetentionRail ref="railEl" v-if="retentionRows.length" :tickets="retentionRows" :now="now"
      :reduced="reduced" :agent="agent" :superuser="superuser" :retention-days="retentionDays"
      @open="openTicket" @restore="(t) => (restoreTarget = [t])" @hold="doHold"
      @purge="(t) => (purgeTarget = [t])" />

    <!-- ══════════════════ RECOVERY REVIEW (guided sweep over likely mistakes) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="runOn && runCurrent && !drawerId && !restoreTarget.length" class="arr-veil"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }"
          @mousedown.stop @click.stop>
          <Motion class="arr-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }" :key="String(runCurrent.id)">
            <div class="arr-head sd-mono">
              <span class="arr-eyebrow"><ArchiveRestore :size="13" /> RECOVERY REVIEW</span>
              <span class="arr-count">{{ runIdx + 1 }} / {{ runQueue.length }}</span>
            </div>
            <div class="arr-no sd-mono">{{ runCurrent.ticket_number }} ·
              <em>{{ archiveReasonLabel(archiveReasonOf(runCurrent)).toUpperCase() }}</em>
              <span class="arr-was">WAS {{ (runCurrent.status || '').replace(/_/g, ' ').toUpperCase() }}</span>
            </div>
            <h3 class="arr-subj">{{ runCurrent.subject }}</h3>
            <p class="arr-why">{{ mistakeWhy(runCurrent) }}</p>
            <div class="arr-meta sd-mono">
              SHELVED {{ agoLabel(runCurrent.archived_at) }} · BY {{ runCurrent.archived_by_name || 'System' }}
            </div>
            <div class="arr-actions">
              <button class="arr-btn primary" @click="restoreTarget = [runCurrent]"><ArchiveRestore :size="14" /> Restore</button>
              <button class="arr-btn" @click="openTicket(runCurrent.id)"><PanelRight :size="14" /> Open console</button>
              <button class="arr-btn keep" @click="keepArchived"><Check :size="14" /> Keep archived</button>
              <button class="arr-btn ghost" @click="runNext"><ChevronRight :size="14" /> Skip</button>
            </div>
            <div class="arr-dots" aria-hidden="true">
              <i v-for="(id, i) in runQueue" :key="id" :class="{ done: i < runIdx, on: i === runIdx }" />
            </div>
            <button class="arr-x" title="End the review" @click="endRun"><X :size="15" /></button>
          </Motion>
        </Motion>
      </Presence>
    </Teleport>

    <!-- drawer + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="[]" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdRestoreModal :open="restoreTarget.length > 0" :tickets="restoreTarget"
      @close="restoreTarget = []" @done="onRestored" />
    <SdPurgeModal :open="purgeTarget.length > 0" :tickets="purgeTarget" :superuser="superuser" :now="now"
      @close="purgeTarget = []" @done="onPurged" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="[]" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdArchivedSection — "DEEP STORAGE".
  Composition: SdArchivedHero (full-bleed signature instrument — visuals from the
  8-study gallery pick) → SdArchiveIntelBoard (reason spectrum / age strata / 12-month
  chronicle of storage / retention & governance / top archivers) → control deck →
  Records table / storage LEDGER views (deliberately NO kanban — nothing can be dragged
  INTO the archive) → SdRetentionRail (purge-eligibility burn-down; ⚖ shields) →
  RECOVERY REVIEW (ranked guided sweep over likely-mistake tombstones) → restore /
  purge modals (the desk's only writes) → adaptive drawer + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'archived'})
  (backend team-sealed: agents see their teams' shelf, superuser the whole desk) + the
  sealed /me/tickets/archived/stats rollup. Opening either runs the retention sweep
  server-side (closed → auto-archive after 120d), so the shelf is honest.
  Positioning vs siblings: Closed is about PERMANENCE (the record of record), this desk
  is about RECOVERY & RETENTION — what left circulation, whether it should come back,
  and when the law of the desk lets it be destroyed.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, Tag, ChevronLeft, ChevronRight,
  Table, Archive, ArchiveRestore, ScrollText, PanelRight, Scale, TimerOff, Flame,
  Zap, CalendarClock, ShieldAlert, Copy, Ban,
} from 'lucide-vue-next'
import SdArchivedHero from '../components/SdArchivedHero.vue'
import SdArchiveInstrument from '../components/SdArchiveInstrument.vue'
import SdArchiveIntelBoard from '../components/SdArchiveIntelBoard.vue'
import SdArchiveLedger from '../components/SdArchiveLedger.vue'
import SdRetentionRail from '../components/SdRetentionRail.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdRestoreModal from '../modals/SdRestoreModal.vue'
import SdPurgeModal from '../modals/SdPurgeModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchArchivedStats, fetchCommandCenterStats, fetchMyWorkbench,
  setLegalHold, bulkLegalHold, exportTicketsCsv, getMe, getTicket, loadPickers, usePickers,
  priorityLabel, archiveReasonOf, archiveReasonLabel,
  ARCHIVE_REASON_CODES, PURGE_RETENTION_DAYS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'archived' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-arc-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views (no kanban by design — a tombstone can't be dragged anywhere) ── */
const views = [
  { key: 'table', label: 'Records', icon: Table },
  { key: 'ledger', label: 'Ledger', icon: ScrollText },
]
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)

/* ── server filters ── */
const f = reactive({ q: '', archive_reason_code: '', priority: '', organization_id: '', legal_hold: '', purge_eligible: '', archived_from: '', archived_to: '' })
const activeFilterCount = computed(() => ['archive_reason_code', 'priority', 'organization_id', 'legal_hold', 'purge_eligible', 'archived_from', 'archived_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); archiverFilter.value = ''; reload() }

/* ── client refinements ── */
const refine = ref('all')        // hero lens: all|today|month|spamtest|dupes|mistakes|hold|purge
const archiverFilter = ref('')   // top-archivers pick (client-side on archived_by_id)
const sortBy = ref('archivedAt')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data (declared BEFORE any computed that reads them — TDZ) ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})            // /me/tickets/archived/stats (team-sealed)
const cmdStats = ref({})         // command-center/workbench (insight ticker tail)
const now = ref(Date.now())
const me = ref({})
const superuser = computed(() => !!me.value.is_superuser)
const retentionDays = computed(() => stats.value.retention_days || PURGE_RETENTION_DAYS)
let tick = null

const params = () => ({
  scope: 'archived',
  q: f.q || undefined,
  archive_reason_code: f.archive_reason_code || undefined,
  priority: f.priority || undefined,
  organization_id: f.organization_id || undefined,
  legal_hold: f.legal_hold === '' ? undefined : f.legal_hold === 'true',
  purge_eligible: f.purge_eligible === 'true' ? true : undefined,
  archived_from: f.archived_from || undefined,
  archived_to: f.archived_to || undefined,
  sort_by: 'archived_at', sort_dir: 'desc',   // freshest tombstone first in the window
})
const loadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), ...params(), page: 1, limit: 100 })
    workingSet.value = r.items || []
    total.value = r.total || workingSet.value.length
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false } finally { wsLoading.value = false }
}
const loadStats = async () => {
  try { stats.value = await fetchArchivedStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── deep-storage telemetry ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const startOfDay = computed(() => { const d = new Date(now.value); d.setHours(0, 0, 0, 0); return d.getTime() })
const purgeEpoch = (t) => {
  const e = ep(t.purge_eligible_at)
  if (e) return e
  const a = ep(t.archived_at)
  return a ? a + retentionDays.value * 86400000 : 0
}
const isPurgeEligible = (t) => !t.legal_hold && purgeEpoch(t) > 0 && now.value >= purgeEpoch(t)
const isExpiringSoon = (t) => !t.legal_hold && purgeEpoch(t) > 0
  && now.value < purgeEpoch(t) && purgeEpoch(t) - now.value <= 30 * 86400000
const isMistake = (t) => ['open', 'in_progress'].includes(t.status)
  || archiveReasonOf(t) === 'uncoded'
  || ['critical', 'urgent'].includes(t.priority)
const mistakeWhy = (t) => {
  if (['open', 'in_progress'].includes(t.status)) return 'This record was still being worked when it was shelved — active tickets rarely belong in deep storage.'
  if (archiveReasonOf(t) === 'uncoded') return 'No reason was ever recorded for this archive — confirm it belongs here or pull it back.'
  return `A ${t.priority} priority record was archived — high-stakes work deserves a second look before it sleeps.`
}
const agoLabel = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((now.value - ep(iso)) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const PRED = {
  all: () => true,
  today: t => ep(t.archived_at) >= startOfDay.value,
  month: t => ep(t.archived_at) >= now.value - 30 * 86400000,
  spamtest: t => ['spam', 'test_ticket'].includes(archiveReasonOf(t)),
  dupes: t => archiveReasonOf(t) === 'duplicate',
  mistakes: t => isMistake(t),
  hold: t => !!t.legal_hold,
  purge: t => isPurgeEligible(t),
}

/* ── derived sets ── */
const lensFiltered = computed(() => {
  let rows = workingSet.value.filter(PRED[refine.value] || PRED.all)
  if (archiverFilter.value) rows = rows.filter(t => String(t.archived_by_id || '') === archiverFilter.value)
  return rows
})

const sortVal = (t, key) => {
  if (key === 'archivedAt' || key === 'archived_at') return ep(t.archived_at)
  if (key === 'dormancy') return -ep(t.archived_at) || 0          // longest asleep first on desc
  if (key === 'purgeIn') return t.legal_hold ? Number.MAX_SAFE_INTEGER : (purgeEpoch(t) || Number.MAX_SAFE_INTEGER - 1)
  if (key === 'archiveReason') return archiveReasonOf(t)
  if (key === 'statusAtArchive' || key === 'status') return t.status || ''
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

/* the retention rail's population: eligible ∪ expiring-within-30d, soonest first */
const retentionRows = computed(() => workingSet.value
  .filter(t => isPurgeEligible(t) || isExpiringSoon(t))
  .sort((a, b) => purgeEpoch(a) - purgeEpoch(b))
  .slice(0, 12))

/* ── lenses (stats-first with client fallback) ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const rc = (k) => (stats.value.by_reason_code || {})[k]
const lenses = computed(() => [
  { key: 'all', label: 'The stacks', icon: Archive, color: 'var(--sd-arc-core)', value: stats.value.total_archived ?? cnt(PRED.all) },
  { key: 'today', label: 'Shelved today', icon: Zap, color: 'var(--sd-arc-hi)', value: stats.value.archived_today ?? cnt(PRED.today) },
  { key: 'month', label: 'This month', icon: CalendarClock, color: 'var(--sd-arc-bronze)', value: stats.value.archived_30d ?? cnt(PRED.month) },
  { key: 'spamtest', label: 'Spam & tests', icon: Ban, color: 'var(--sd-arc-deep)', value: ((rc('spam') ?? 0) + (rc('test_ticket') ?? 0)) || cnt(PRED.spamtest) },
  { key: 'dupes', label: 'Duplicates', icon: Copy, color: 'var(--sd-arc-bronze)', value: rc('duplicate') ?? cnt(PRED.dupes) },
  { key: 'mistakes', label: 'Likely mistakes', icon: ShieldAlert, color: 'var(--sd-arc-restore)', value: cnt(PRED.mistakes) },
  { key: 'hold', label: 'Legal hold', icon: Scale, color: 'var(--sd-arc-hold)', value: stats.value.legal_hold_count ?? cnt(PRED.hold) },
  { key: 'purge', label: 'Purge-eligible', icon: TimerOff, color: 'var(--sd-arc-purge)', value: stats.value.purge_eligible_count ?? cnt(PRED.purge) },
])
const mistakeCount = computed(() => cnt(t => isMistake(t) && !reviewed.value.has(String(t.id))))
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'all' : l.key
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { today: 'Shelved today', month: 'This month', spamtest: 'Spam & tests', dupes: 'Duplicates', mistakes: 'Likely mistakes', hold: '⚖ Legal hold', purge: 'Purge-eligible' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'all' } })
  if (f.archive_reason_code) out.push({ key: 'reason', label: archiveReasonLabel(f.archive_reason_code), clear: () => { f.archive_reason_code = ''; reload() } })
  if (archiverFilter.value) out.push({ key: 'archiver', label: 'One archiver', clear: () => { archiverFilter.value = '' } })
  if (f.archived_from || f.archived_to) out.push({ key: 'range', label: 'Shelved range', clear: () => { f.archived_from = ''; f.archived_to = ''; reload() } })
  if (f.legal_hold) out.push({ key: 'gov-h', label: f.legal_hold === 'true' ? 'Held only' : 'Unheld only', clear: () => { f.legal_hold = ''; reload() } })
  if (f.purge_eligible) out.push({ key: 'gov-p', label: 'Purge-eligible (server)', clear: () => { f.purge_eligible = ''; reload() } })
  return out
})
const clearRefine = () => {
  refine.value = 'all'; archiverFilter.value = ''
  if (f.archive_reason_code || f.archived_from || f.archived_to || f.legal_hold || f.purge_eligible) {
    f.archive_reason_code = ''; f.archived_from = ''; f.archived_to = ''; f.legal_hold = ''; f.purge_eligible = ''
    reload()
  }
}

/* ── board wiring (the board and the list always tell the same story) ── */
const onReasonPick = (key) => { f.archive_reason_code = f.archive_reason_code === key ? '' : key; reload() }
const onArchiverPick = (id) => { archiverFilter.value = archiverFilter.value === String(id) ? '' : String(id); page.value = 1 }
const onMonthPick = (b) => {
  const d = new Date(b.month)
  const from = new Date(d.getFullYear(), d.getMonth(), 1)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  f.archived_from = iso(from); f.archived_to = iso(to)
  reload()
  toast.info(`Deep storage narrowed to ${b.label} — ${b.n} record${b.n === 1 ? '' : 's'}.`)
}

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const reasonOptions = computed(() => [{ value: '', label: 'Any reason' },
  ...ARCHIVE_REASON_CODES.map(r => ({ value: r.value, label: r.label })),
  { value: 'uncoded', label: 'Uncoded (legacy)' }])
const reasonSelect = computed({
  get: () => f.archive_reason_code,
  set: (v) => { f.archive_reason_code = v || ''; page.value = 1; reload() },
})
const govOptions = [
  { value: '', label: 'Any governance' },
  { value: 'held', label: '⚖ Under legal hold' },
  { value: 'unheld', label: 'Not held' },
  { value: 'purge', label: 'Purge-eligible' },
]
const govSelect = computed({
  get: () => (f.purge_eligible === 'true' ? 'purge' : f.legal_hold === 'true' ? 'held' : f.legal_hold === 'false' ? 'unheld' : ''),
  set: (v) => {
    f.legal_hold = v === 'held' ? 'true' : v === 'unheld' ? 'false' : ''
    f.purge_eligible = v === 'purge' ? 'true' : ''
    page.value = 1; reload()
  },
})

/* ── selection ── */
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
  else { sortBy.value = key; sortDir.value = ['archivedAt', 'dormancy'].includes(key) ? 'desc' : 'asc' }
  page.value = 1
}

/* ── RECOVERY REVIEW — ranked guided sweep over likely-mistake tombstones ── */
const runOn = ref(false)
const runQueue = ref([])
const runIdx = ref(0)
const reviewed = ref(new Set())    // session memory: "Keep archived" verdicts
const runCurrent = computed(() => {
  const id = runQueue.value[runIdx.value]
  return workingSet.value.find(t => String(t.id) === id) || null
})
const mistakeScore = (t) => (['open', 'in_progress'].includes(t.status) ? 3 : 0)
  + (archiveReasonOf(t) === 'uncoded' ? 2 : 0)
  + (({ critical: 3, urgent: 2, high: 1 })[t.priority] || 0)
  + (now.value - ep(t.archived_at) <= 7 * 86400000 ? 1 : 0)
const toggleRun = () => (runOn.value ? endRun() : startRun())
const startRun = () => {
  const q = workingSet.value
    .filter(t => isMistake(t) && !reviewed.value.has(String(t.id)))
    .sort((a, b) => mistakeScore(b) - mistakeScore(a)).map(t => String(t.id))
  if (!q.length) { toast.info('Nothing suspicious on the shelf — every tombstone looks deliberate.'); return }
  runQueue.value = q; runIdx.value = 0; runOn.value = true
}
const endRun = () => { runOn.value = false; runQueue.value = []; runIdx.value = 0 }
const runNext = () => {
  if (runIdx.value + 1 >= runQueue.value.length) {
    endRun()
    toast.success('Review complete — every likely mistake has been examined.')
    return
  }
  runIdx.value += 1
}
const keepArchived = () => {
  const t = runCurrent.value
  if (t) reviewed.value = new Set([...reviewed.value, String(t.id)])
  runNext()
}

/* ── legal hold (place = any agent, release = superuser; server enforces) ── */
const doHold = async (t) => {
  const want = !t.legal_hold
  if (!want && !superuser.value) { toast.info('Only a superuser can release a legal hold.'); return }
  try {
    await setLegalHold(t.id, { hold: want })
    toast.success(want ? `${t.ticket_number} is under legal hold — retention suspended.`
      : `${t.ticket_number} released — the retention clock is running again.`)
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not change the legal hold.') }
}
const doBulkHold = async (want) => {
  const ids = bulkTicketObjs.value.map(t => t.id)
  if (!ids.length) { toast.info('Select records first.'); return }
  try {
    const r = await bulkLegalHold(ids, want)
    toast.success(`${r.updated} record${r.updated === 1 ? '' : 's'} ${want ? 'placed under' : 'released from'} legal hold${r.skipped ? ` · ${r.skipped} skipped` : ''}.`)
    selected.value = []
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not change legal holds.') }
}

/* ── restore + purge modal outcomes ── */
const restoreTarget = ref([])
const purgeTarget = ref([])
const onRestored = (n) => {
  restoreTarget.value = []
  selected.value = []
  toast.success(n > 1 ? `${n} records pulled back into circulation.` : 'Back in circulation — the record is live again.')
  refreshAll()
  if (runOn.value) runNext()
}
const onPurged = (n) => {
  purgeTarget.value = []
  selected.value = []
  if (n > 0) toast.success(`${n} record${n === 1 ? '' : 's'} permanently destroyed. The audit tombstone is the only trace.`)
  refreshAll()
}

/* ── bulk tag ── */
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
const railEl = ref(null)
const scrollToRail = () => { railEl.value?.$el?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'center' }) }
const onInsight = async (ins) => {
  const ids = (ins?.ticket_ids || []).map(String)
  if (agent.value && ins?.action === 'escalate' && ids.length) {
    let t = workingSet.value.find(x => String(x.id) === ids[0]) || null
    if (!t) { try { t = await getTicket(ids[0]) } catch { t = null } }
    if (t) { escalateTarget.value = t; return }
  }
  if (ids.length) { openTicket(ids[0]); return }
  if (ins?.id === 'arc-mist') { refine.value = 'mistakes'; return }
  if (ins?.id === 'arc-exp') { scrollToRail(); return }
  if (ins?.id === 'arc-unc') { f.archive_reason_code = 'uncoded'; reload(); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific record to open for this insight')
}
/* Storage-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  const mist = cnt(PRED.mistakes)
  if (mist > 0) out.push({ id: 'arc-mist', kind: 'breach_risk', severity: 'warn',
    title: `${mist} tombstone${mist === 1 ? '' : 's'} look like archive mistakes`,
    detail: 'Shelved while still open, uncoded, or high-priority — a recovery review settles each one in seconds.', action: 'view', ticket_ids: [] })
  if ((stats.value.expiring_soon_count || 0) > 0) out.push({ id: 'arc-exp', kind: 'breach_risk', severity: 'crit',
    title: `${stats.value.expiring_soon_count} record${stats.value.expiring_soon_count === 1 ? '' : 's'} enter purge eligibility within 14 days`,
    detail: 'Last call — restore them, shield them under legal hold, or let retention finish its work.', action: 'view', ticket_ids: [] })
  if ((stats.value.uncoded || 0) >= 5) out.push({ id: 'arc-unc', kind: 'stale', severity: 'info',
    title: `${stats.value.uncoded} legacy tombstones carry no coded reason`,
    detail: 'Archived before the taxonomy existed — the reason filter can surface them for triage.', action: 'view', ticket_ids: [] })
  const a30 = stats.value.archived_30d || 0
  if (a30 >= 4 && (stats.value.restored_30d || 0) / a30 >= 0.25) out.push({ id: 'arc-churn', kind: 'customer_flood', severity: 'warn',
    title: 'A quarter of this month\'s archives came back',
    detail: `${stats.value.restored_30d} of ${a30} shelved records were restored — the desk may be archiving too eagerly.`, action: 'view', ticket_ids: [] })
  if ((stats.value.auto_archived_30d || 0) > 0) out.push({ id: 'arc-auto', kind: 'stale', severity: 'info',
    title: `Retention swept ${stats.value.auto_archived_30d} old closed record${stats.value.auto_archived_30d === 1 ? '' : 's'} this month`,
    detail: `Closed records auto-archive after ${stats.value.autoarchive_days || 120} days — the Closed desk's lifetime counters still include them.`, action: 'view', ticket_ids: [] })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'review', label: runOn.value ? 'End the recovery review' : 'Start recovery review — likely mistakes first', icon: ArchiveRestore, run: toggleRun },
  { key: 'lens-mist', label: 'Lens · Likely mistakes', icon: ShieldAlert, run: () => (refine.value = 'mistakes') },
  { key: 'lens-hold', label: 'Lens · Legal hold', icon: Scale, run: () => (refine.value = 'hold') },
  { key: 'lens-purge', label: 'Lens · Purge-eligible', icon: TimerOff, run: () => (refine.value = 'purge') },
  { key: 'view-ledger', label: 'View · Ledger (the storage stories)', icon: ScrollText, run: () => (view.value = 'ledger') },
  { key: 'rail', label: 'Jump · Retention watch', icon: TimerOff, run: scrollToRail },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  else if (e.key === 'Escape' && runOn.value && !drawerId.value && !restoreTarget.value.length && !purgeTarget.value.length) endRun()
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('archived').columns || [])
const emptyText = computed(() => refine.value === 'all' && !activeFilterCount.value
  ? (getTicketScope('archived').empty || { title: 'Deep storage is empty', blurb: 'Archived tickets rest here.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the whole shelf.' })

/* ── CSV export — server-side, sealed, honors the storage filters ── */
const doExport = async () => {
  try {
    const blob = await exportTicketsCsv({
      scope: 'archived',
      archive_reason_code: f.archive_reason_code || undefined,
      archived_from: f.archived_from || undefined,
      archived_to: f.archived_to || undefined,
      legal_hold: f.legal_hold === '' ? undefined : f.legal_hold === 'true',
      purge_eligible: f.purge_eligible === 'true' ? true : undefined,
      priority: f.priority || undefined,
      organization_id: f.organization_id || undefined,
      q: f.q || undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'deep-storage.csv'
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch { toast.error('Could not export deep storage.') }
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
.arc { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.arc-insights { align-self: stretch; }

.arc-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.arc-btn:hover { border-color: var(--sd-arc-bronze); }
.arc-btn:active { transform: translateY(1px); }
.arc-btn.on { border-color: var(--sd-arc-bronze); color: var(--sd-arc-bronze); background: var(--sd-arc-bronze-soft); }
.arc-btn.restore { border-color: color-mix(in srgb, var(--sd-arc-restore) 55%, transparent); color: var(--sd-arc-restore); background: var(--sd-arc-restore-soft); }
.arc-btn.hold { border-color: color-mix(in srgb, var(--sd-arc-hold) 55%, transparent); color: var(--sd-arc-hold); background: var(--sd-arc-hold-soft); }
.arc-btn.danger { border-color: color-mix(in srgb, var(--sd-danger) 55%, transparent); color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 12%, transparent); }
.arc-btn.sm { padding: 7px 12px; font-size: 12px; }
.arc-btn.icon { padding: 7px 9px; }
.arc-btn.ghost { background: transparent; }
.arc-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.arc-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-arc-bronze); color: #241a03; font-size: 10px; font-weight: 800; }

.arc-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; border-color: var(--sd-arc-brd); }
.arc-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.arc-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.arc-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.arc-view:hover { color: var(--sd-text); }
.arc-view.on { color: var(--sd-arc-bronze); background: var(--sd-arc-bronze-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-arc-bronze) 40%, transparent); }
.arc-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.arc-count { font-size: 12px; color: var(--sd-text-dim); }

.arc-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-arc-bronze) 44%, transparent); background: var(--sd-arc-bronze-soft); color: var(--sd-arc-bronze); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.arc-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }
.arc-flt-enter-active, .arc-flt-leave-active { transition: opacity 0.24s ease, transform 0.24s ease; }
.arc-flt-enter-from, .arc-flt-leave-to { opacity: 0; transform: translateY(-8px); }

.arc-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-arc-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-arc-bronze); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.arc-pager { display: flex; align-items: center; justify-content: center; gap: 12px; }
.pg-info { font-size: 11px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

/* ── RECOVERY REVIEW overlay ── */
.arr-veil { position: fixed; inset: 0; z-index: 2100; display: grid; place-items: end center; padding: 0 16px 6vh;
  background: linear-gradient(0deg, rgba(9, 7, 4, 0.72), rgba(9, 7, 4, 0.3)); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.arr-card { position: relative; width: min(560px, 100%); padding: 18px 20px; border-radius: 18px;
  border: 1px solid var(--sd-arc-brd); background: var(--sd-panel); box-shadow: var(--sd-shadow); }
.arr-head { display: flex; justify-content: space-between; margin-bottom: 8px; }
.arr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-arc-restore); }
.arr-count { font-size: 10px; color: var(--sd-text-dim); }
.arr-no { font-size: 11px; font-weight: 800; color: var(--sd-arc-core); }
.arr-no em { font-style: normal; color: var(--sd-arc-bronze); }
.arr-was { margin-left: 10px; padding: 2px 7px; border-radius: 6px; font-size: 9px; letter-spacing: 0.08em;
  color: var(--sd-arc-hi); background: var(--sd-arc-soft); border: 1px solid var(--sd-arc-brd); }
.arr-subj { margin: 6px 0; font-size: 16px; font-weight: 800; color: var(--sd-text); }
.arr-why { margin: 0 0 9px; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-muted); }
.arr-meta { margin-bottom: 13px; font-size: 10px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.arr-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.arr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.arr-btn.primary { border-color: transparent; color: #04231a; background: linear-gradient(135deg, #9df0cd, var(--sd-arc-restore)); }
.arr-btn.keep { border-color: color-mix(in srgb, var(--sd-arc-bronze) 55%, transparent); color: var(--sd-arc-bronze); }
.arr-btn.ghost { background: transparent; }
.arr-dots { display: flex; gap: 4px; margin-top: 13px; }
.arr-dots i { flex: 1; height: 3px; border-radius: 2px; background: var(--sd-arc-soft); }
.arr-dots i.done { background: var(--sd-arc-restore); opacity: 0.5; }
.arr-dots i.on { background: var(--sd-arc-restore); }
.arr-x { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); cursor: pointer; }
.arr-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }
</style>
