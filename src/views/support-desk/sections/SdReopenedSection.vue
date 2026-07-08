<template>
  <div class="rop sd-tw">
    <!-- ══════════════════ MÖBIUS-LOOP HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdReopenedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="runOn"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @run="toggleRun" @chronic="scrollToRail" @rebreach="refine = 'rebreached'"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the Möbius band fills the hero as its full-bleed backdrop -->
        <SdMobiusBand :tickets="lensFiltered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdReopenedHero>

    <!-- ══════════════════ CHRONIC RAIL (stuck riders — break these loops first) ══════════════════ -->
    <div ref="railEl">
      <SdChronicRail :tickets="chronicTickets" :now="now" :reduced="reduced" @open="openTicket" />
    </div>

    <!-- ══════════════════ LOOP ROSTER (who carries the returned load) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="rop-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="rop-deck sd-card">
      <div class="rop-bar">
        <div class="rop-views">
          <button v-for="v in views" :key="v.key" class="rop-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="rop-tools">
          <button class="rop-btn sm" :class="{ on: includeDone }"
            title="Re-resolved riders left the loop — include them to reconcile with the lifetime totals" @click="includeDone = !includeDone; reload()">
            <CircleCheck :size="14" /> Include re-resolved
          </button>
          <button class="rop-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="rop-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="rop-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="rop-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="rop-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="rop-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="rop-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="rop-flt">
      <section v-if="showFilters" class="rop-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="statusOptions" /></div>
        <div class="flt-field"><label>Kicked back by</label><SdSelect v-model="sourceSelect" :options="sourceOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Reopened</label>
          <SdDatePicker v-model="f.reopened_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.reopened_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="rop-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="rop-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="rop-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="rop-btn sm accent" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="rop-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
          <button class="rop-btn sm" @click="openBulk('status')"><Rows3 :size="13" /> Set status</button>
          <button class="rop-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="rop-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="rop-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="RotateCcw"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />

      <!-- LOOP — the story of each bounce: failed fix → kick-back → this cycle (unique to this desk) -->
      <SdReopenLoop v-else-if="view === 'loop'" :tickets="pagedRows" :now="now" :loading="wsLoading" :reduced="reduced" @open="openTicket" />

      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pager -->
    <div v-if="view !== 'sla' && view !== 'load' && pages > 1" class="rop-pager">
      <button class="rop-btn sm icon" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button>
      <span class="pg-info sd-mono">PAGE {{ page }} / {{ pages }}</span>
      <button class="rop-btn sm icon" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button>
    </div>

    <!-- ══════════════════ QUALITY LOOP RUN (guided, ranked by loop score) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="runOn && runCurrent && !drawerId" class="qlr-veil"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }"
          @mousedown.stop @click.stop>
          <Motion class="qlr-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }" :key="runCurrent.id">
            <div class="qlr-head sd-mono">
              <span class="qlr-eyebrow"><Repeat2 :size="13" /> QUALITY LOOP RUN</span>
              <span class="qlr-count">{{ runIdx + 1 }} / {{ runQueue.length }}</span>
            </div>
            <div class="qlr-no sd-mono">{{ runCurrent.ticket_number }} · <em>{{ (runCurrent.priority || '').toUpperCase() }}</em> · ×{{ runCurrent.reopened_count }}</div>
            <h3 class="qlr-subj">{{ runCurrent.subject }}</h3>
            <div class="qlr-prev sd-mono" v-if="runCurrent.prev_resolution_code || runCurrent.prev_resolution_summary">
              <s>{{ (runCurrent.prev_resolution_code || 'fixed').replace(/_/g, ' ').toUpperCase() }}</s>
              <span>{{ runCurrent.prev_resolution_summary || 'No summary recorded on the failed fix.' }}</span>
            </div>
            <div class="qlr-meta sd-mono">
              <span class="qlr-src">{{ reopenSourceLabel(runCurrent.reopen_source).toUpperCase() }}</span>
              <span v-if="runCurrent.reopen_reason_code" class="qlr-code">{{ reopenReasonShort(runCurrent.reopen_reason_code) }}</span>
              <span class="qlr-owner" :class="{ none: !runCurrent.assigned_agent_name }">{{ runCurrent.assigned_agent_name || 'UNOWNED' }}</span>
              <span class="qlr-status">{{ statusLabel(runCurrent.status) }}</span>
            </div>
            <div class="qlr-actions">
              <button class="qlr-btn primary" @click="openTicket(runCurrent.id)"><PanelRight :size="14" /> Open console</button>
              <button v-if="agent && !isMine(runCurrent)" class="qlr-btn" @click="runAssignMe"><UserCheck :size="14" /> Assign to me</button>
              <button class="qlr-btn" @click="resolveTarget = runCurrent"><CircleCheck :size="14" /> Resolve for good</button>
              <button class="qlr-btn ghost" @click="runNext"><ChevronRight :size="14" /> Skip</button>
            </div>
            <div class="qlr-dots" aria-hidden="true">
              <i v-for="(id, i) in runQueue" :key="id" :class="{ done: i < runIdx, on: i === runIdx }" />
            </div>
            <button class="qlr-close" title="End the run" @click="endRun"><X :size="15" /></button>
          </Motion>
        </Motion>
      </Presence>
    </Teleport>

    <!-- drawer + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="assignees" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdReopenedSection — "THE MÖBIUS LOOP" (returns desk).
  Composition: SdReopenedHero (full-bleed one-sided-band instrument, gallery pick 03) →
  SdChronicRail (≥2 cycles — break these loops first) → loop roster → control deck →
  returns board / loop / SLA / load views → QUALITY LOOP RUN (ranked guided mode) →
  adaptive drawer + bulk + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'reopened',
  active_only}) (backend team-sealed; reopened is a LIFETIME marker, not a status) + the
  sealed /me/tickets/reopened/stats rollup (rate / time-to-reopen / chronic / by-source /
  by-reason / worst rider / squad). An "Include re-resolved" toggle drops active_only so
  the board reconciles with the lifetime totals.
  Positioning vs siblings: Overdue is about DEADLINES (the clock), this desk is about
  RECURRENCE (the loop) — a ticket that came back carries its failed fix with it
  (prev_resolution_*), the kick-back source, the coded verdict, and a FRESH re-resolution
  clock stamped by the backend on every reopen.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  ChevronLeft, ChevronRight, RotateCcw, UserX, Flame, MessageSquare, User, History,
  PanelRight, Table, Gauge, Users, Activity, Repeat2, ShieldAlert,
} from 'lucide-vue-next'
import SdReopenedHero from '../components/SdReopenedHero.vue'
import SdMobiusBand from '../components/SdMobiusBand.vue'
import SdChronicRail from '../components/SdChronicRail.vue'
import SdReopenLoop from '../components/SdReopenLoop.vue'
import SdSquadLoad from '../components/SdSquadLoad.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchReopenedStats, fetchCommandCenterStats, fetchMyWorkbench,
  assignTicket, getMe, listMyTeam, loadPickers, usePickers,
  priorityLabel, statusLabel, reopenSourceLabel, reopenReasonShort,
  REOPEN_SOURCES, CHRONIC_REOPEN_THRESHOLD,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'reopened' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-rop-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views ── */
const views = computed(() => {
  const v = [
    { key: 'table', label: 'Returns board', icon: Table },
    { key: 'loop', label: 'Loop', icon: Repeat2 },
    { key: 'sla', label: 'SLA', icon: Gauge },
  ]
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)
const includeDone = ref(false)    // false = active riders only (the desk default)

/* ── server filters ── */
const f = reactive({ q: '', priority: '', status: '', reopen_source: '', assigned_agent_id: '', organization_id: '', reopened_from: '', reopened_to: '' })
const activeFilterCount = computed(() => ['priority', 'status', 'reopen_source', 'assigned_agent_id', 'organization_id', 'reopened_from', 'reopened_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements ── */
const refine = ref('all')        // hero lens: all|chronic|portal|requester|agentkick|rebreached|unowned
const sortBy = ref('reopenedAt')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})            // /me/tickets/reopened/stats (team-sealed)
const cmdStats = ref({})         // command-center/workbench (insight ticker)
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'reopened',
  active_only: includeDone.value ? undefined : 1,
  q: f.q || undefined,
  priority: f.priority || undefined,
  status: f.status || undefined,
  reopen_source: f.reopen_source || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  reopened_from: f.reopened_from || undefined,
  reopened_to: f.reopened_to || undefined,
  sort_by: 'last_reopened_at', sort_dir: 'desc',   // latest cycle first in the window
})
const loadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), ...params(), page: 1, limit: 100 })
    workingSet.value = (r.items || []).filter(t => !t.merged_into_id)
    total.value = r.total || workingSet.value.length
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false } finally { wsLoading.value = false }
}
const loadStats = async () => {
  try { stats.value = await fetchReopenedStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── loop telemetry ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const cycleAgeMin = (t) => {
  const at = ep(t.last_reopened_at)
  return at ? Math.max(0, Math.floor((now.value - at) / 60000)) : 0
}
const chronicOf = (t) => (t.reopened_count || 0) >= CHRONIC_REOPEN_THRESHOLD

const PRED = {
  all: () => true,
  chronic: t => chronicOf(t),
  portal: t => t.reopen_source === 'portal',
  requester: t => t.reopen_source === 'requester',
  agentkick: t => t.reopen_source === 'agent',
  rebreached: t => !isTerminal(t) && !!t.sla_resolution_breached,
  unowned: t => !isTerminal(t) && !t.assigned_agent_id,
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value.filter(PRED[refine.value] || PRED.all))
const chronicTickets = computed(() => workingSet.value
  .filter(t => chronicOf(t) && !isTerminal(t))
  .sort((a, b) => (b.reopened_count || 0) - (a.reopened_count || 0))
  .slice(0, 12))

/* Loop score: cycles dominate, then priority, then how long it's been back — feeds the run. */
const PRI_W = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const loopScore = (t) => (t.reopened_count || 1) * 2.2 + (PRI_W[t.priority] || 1) + Math.log2(cycleAgeMin(t) + 2) + (t.assigned_agent_id ? 0 : 3)
const rankOrdered = computed(() => workingSet.value.filter(t => !isTerminal(t)).slice().sort((a, b) => loopScore(b) - loopScore(a)))

const sortVal = (t, key) => {
  if (key === 'reopenedAt' || key === 'last_reopened_at') return ep(t.last_reopened_at)
  if (key === 'reopened' || key === 'reopened_count') return t.reopened_count || 0
  if (key === 'reopenSource') return t.reopen_source || ''
  if (key === 'prevRes') return t.prev_resolution_code || ''
  if (key === 'sla' || key === 'resolution_due_at') return ep(t.resolution_due_at) || Number.MAX_SAFE_INTEGER
  if (key === 'priority') return PRI_W[t.priority] || 0
  if (['created_at', 'updated_at'].includes(key)) return ep(t[key])
  if (key === 'number' || key === 'ticket_number') return t.ticket_number || ''
  if (key === 'subject') return (t.subject || '').toLowerCase()
  if (key === 'status') return t.status || ''
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

/* ── lenses (stats-first with client fallback; active_* keys match the default window) ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'all', label: 'On the loop', icon: Repeat2, color: 'var(--sd-rop-core)', value: (includeDone.value ? stats.value.total_reopened : stats.value.active_reopened) ?? cnt(PRED.all) },
  { key: 'chronic', label: 'Chronic ≥2×', icon: History, color: 'var(--sd-rop-hi)', value: (includeDone.value ? stats.value.chronic : stats.value.chronic_open) ?? cnt(PRED.chronic) },
  { key: 'portal', label: 'Customer reply', icon: MessageSquare, color: 'var(--sd-rop-band)', value: (stats.value.by_source || {}).portal ?? cnt(PRED.portal) },
  { key: 'requester', label: 'Requester', icon: User, color: 'var(--sd-warning)', value: (stats.value.by_source || {}).requester ?? cnt(PRED.requester) },
  { key: 'agentkick', label: 'Agent reopen', icon: UserCheck, color: 'var(--sd-steel, #9aa3ac)', value: (stats.value.by_source || {}).agent ?? cnt(PRED.agentkick) },
  { key: 'rebreached', label: 'Re-breached', icon: ShieldAlert, color: 'var(--sd-danger)', value: stats.value.re_breached ?? cnt(PRED.rebreached) },
  { key: 'unowned', label: 'Unowned', icon: UserX, color: 'var(--sd-rop-risk)', value: stats.value.unassigned_reopened ?? cnt(PRED.unowned) },
  { key: 'offramp', label: 'Re-resolved today', icon: CircleCheck, color: 'var(--sd-rop-offramp)', value: stats.value.re_resolved_today ?? 0, stat: true },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'all' : l.key
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { chronic: 'Chronic ≥2×', portal: 'Customer reply', requester: 'Requester reopen', agentkick: 'Agent reopen', rebreached: 'Re-breached', unowned: 'Unowned' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'all' } })
  if (includeDone.value) out.push({ key: 'done', label: 'Including re-resolved', clear: () => { includeDone.value = false; reload() } })
  return out
})
const clearRefine = () => { refine.value = 'all'; if (includeDone.value) { includeDone.value = false; reload() } }

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const statusOptions = computed(() => [{ value: '', label: 'All statuses' },
  ...['open', 'in_progress', 'pending_customer', 'pending_vendor', 'on_hold', 'escalated', ...(includeDone.value ? ['resolved', 'closed'] : [])].map(s => ({ value: s, label: statusLabel(s) }))])
const sourceOptions = computed(() => [{ value: '', label: 'Any source' },
  ...REOPEN_SOURCES.map(s => ({ value: s.value, label: s.label }))])
const sourceSelect = computed({
  get: () => f.reopen_source,
  set: (v) => { f.reopen_source = v || ''; page.value = 1; reload() },
})
const agentOptions = computed(() => {
  const seen = new Map()
  for (const t of workingSet.value) if (t.assigned_agent_id && t.assigned_agent_name) seen.set(String(t.assigned_agent_id), t.assigned_agent_name)
  return [{ value: '', label: 'All agents' }, ...[...seen].map(([value, label]) => ({ value, label }))]
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
  else { sortBy.value = key; sortDir.value = ['reopened', 'reopenedAt'].includes(key) ? 'desc' : 'asc' }
  page.value = 1
}

/* ── QUALITY LOOP RUN — ranked guided sweep with its own overlay ── */
const isMine = (t) => String(t.assigned_agent_id || '') === String(me.value.id || '')
const runOn = ref(false)
const runQueue = ref([])
const runIdx = ref(0)
const runCurrent = computed(() => {
  const id = runQueue.value[runIdx.value]
  return workingSet.value.find(t => String(t.id) === id) || null
})
const toggleRun = () => (runOn.value ? endRun() : startRun())
const startRun = () => {
  const q = rankOrdered.value.map(t => String(t.id))
  if (!q.length) { toast.info('The band runs empty — nothing to break.'); return }
  runQueue.value = q; runIdx.value = 0; runOn.value = true
}
const endRun = () => { runOn.value = false; runQueue.value = []; runIdx.value = 0 }
const runNext = () => {
  if (runIdx.value + 1 >= runQueue.value.length) {
    endRun()
    toast.success('Loop run complete — every returned ticket has been reviewed.')
    return
  }
  runIdx.value += 1
}
const runAssignMe = async () => {
  const t = runCurrent.value
  if (!t || !me.value.id) return
  try {
    await assignTicket(t.id, { assigned_agent_id: me.value.id })
    toast.success(`${t.ticket_number} is yours — break the loop.`)
    t.assigned_agent_id = me.value.id
    t.assigned_agent_name = me.value.full_name || me.value.name || 'You'
    runNext()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Assign failed.') }
}

/* ── resolve + bulk ── */
const resolveTarget = ref(null)
const onResolved = () => { resolveTarget.value = null; refreshAll(); if (runOn.value) runNext() }

const bulkOpen = ref(false)
const bulkMode = ref('assign')
const bulkPayloadTickets = ref(null)
const bulkTicketObjs = computed(() => bulkPayloadTickets.value || workingSet.value.filter(t => selected.value.includes(String(t.id))))
const openBulk = (mode, tickets = null) => {
  const objs = tickets || workingSet.value.filter(t => selected.value.includes(String(t.id)))
  if (!objs.length) { toast.info('Select tickets first.'); return }
  // single-ticket escalate goes through the shared SdEscalateConsole (same as the siblings)
  if (mode === 'escalate' && objs.length === 1) { escalateTarget.value = objs[0]; return }
  bulkPayloadTickets.value = tickets
  bulkMode.value = mode
  bulkOpen.value = true
}
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; selected.value = []; toast.success('Ticket escalated'); refreshAll() }
const onBulkDone = () => { bulkOpen.value = false; bulkPayloadTickets.value = null; selected.value = []; refreshAll() }

const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + rail + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => { drawerId.value = null }
const railEl = ref(null)
const scrollToRail = () => railEl.value?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'center' })
const onInsight = (ins) => {
  const ids = (ins?.ticket_ids || []).map(String)
  // An "Escalate" insight chip opens the SAME SdEscalateConsole as My Tickets — never the plain drawer.
  if (ins?.action === 'escalate' && ids.length) {
    const t = workingSet.value.find(x => String(x.id) === ids[0])
    if (t) { escalateTarget.value = t; return }
    // The flagged ticket lives outside this desk's working set (backend insights span the
    // whole sealed scope) — fetch it and STILL open the console; drawer only as fallback.
    getMyTicket(ids[0]).then((full) => { escalateTarget.value = full }).catch(() => openTicket(ids[0]))
    return
  }
  if (ids.length) { openTicket(ids[0]); return }
  if (ins?.id === 'rop-chronic') { scrollToRail(); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}
/* Reopen-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  const chUnowned = workingSet.value.filter(t => chronicOf(t) && !isTerminal(t) && !t.assigned_agent_id)
  if (chUnowned.length) out.push({ id: 'rop-chun', kind: 'breach_risk', severity: 'crit',
    title: `${chUnowned.length} chronic ticket${chUnowned.length === 1 ? '' : 's'} with no owner`,
    detail: 'Reopened twice or more and nobody owns the re-fix — these break trust fastest.', action: 'view', ticket_ids: chUnowned.map(t => t.id) })
  const reb = workingSet.value.filter(PRED.rebreached)
  if (reb.length) out.push({ id: 'rop-reb', kind: 'breach_risk', severity: 'crit',
    title: `${reb.length} reopened ticket${reb.length === 1 ? '' : 's'} missing the FRESH deadline too`,
    detail: 'The re-resolution clock was re-armed on reopen — and it has already run out again.', action: 'view', ticket_ids: reb.map(t => t.id) })
  const bySrc = stats.value.by_source || {}
  const portalN = bySrc.portal || 0
  const totalN = stats.value.total_reopened || 0
  if (totalN >= 4 && portalN / totalN >= 0.5) out.push({ id: 'rop-portal', kind: 'customer_flood', severity: 'warn',
    title: 'Customer replies are driving most reopens',
    detail: `${portalN} of ${totalN} reopens came from a customer answering a "resolved" ticket — resolutions may be landing before the customer agrees.`, action: 'view', ticket_ids: [] })
  const byReason = stats.value.by_reason || {}
  const premature = (byReason.premature_closure || 0) + (byReason.not_fixed || 0)
  if (premature >= 3) out.push({ id: 'rop-qual', kind: 'stale', severity: 'warn',
    title: `${premature} reopens coded "not fixed" / "closed too early"`,
    detail: 'A quality-loop pattern — review the resolution checklist before the next resolve.', action: 'view', ticket_ids: [] })
  if ((stats.value.chronic_open || 0) > 0) out.push({ id: 'rop-chronic', kind: 'stale', severity: 'info',
    title: `${stats.value.chronic_open} chronic rider${stats.value.chronic_open === 1 ? '' : 's'} on the band`,
    detail: 'The chronic rail has them ranked by cycles — break the worst loop first.', action: 'view', ticket_ids: [] })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'run', label: runOn.value ? 'End the quality loop run' : 'Start quality loop run — most cycles first', icon: Repeat2, run: toggleRun },
  { key: 'lens-chronic', label: 'Lens · Chronic ≥2×', icon: History, run: () => (refine.value = 'chronic') },
  { key: 'lens-rebreached', label: 'Lens · Re-breached', icon: ShieldAlert, run: () => (refine.value = 'rebreached') },
  { key: 'rail', label: 'Jump to the chronic rail', icon: History, run: scrollToRail },
  { key: 'view-loop', label: 'View · Loop (failed fix → kick-back → now)', icon: Repeat2, run: () => (view.value = 'loop') },
  { key: 'include-done', label: includeDone.value ? 'Hide re-resolved riders' : 'Include re-resolved riders', icon: CircleCheck, run: () => { includeDone.value = !includeDone.value; reload() } },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  else if (e.key === 'Escape' && runOn.value && !drawerId.value && !resolveTarget.value && !bulkOpen.value) endRun()
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('reopened').columns || [])
const emptyText = computed(() => refine.value === 'all'
  ? (getTicketScope('reopened').empty || { title: 'No reopens', blurb: 'No ticket has been reopened — resolutions are sticking.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the whole loop.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Status', 'Cycles', 'Kicked back by', 'Verdict', 'Last reopened', 'Fix held (min)', 'Prev fix code', 'Prev fix summary', 'Fresh due', 'Re-breached', 'Agent', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), statusLabel(t.status),
    t.reopened_count || 0, reopenSourceLabel(t.reopen_source), t.reopen_reason_code || '',
    t.last_reopened_at || '', t.reopen_latency_ms != null ? Math.floor(t.reopen_latency_ms / 60000) : '',
    t.prev_resolution_code || '', t.prev_resolution_summary || '',
    t.resolution_due_at || '', (!isTerminal(t) && t.sla_resolution_breached) ? 'yes' : '',
    t.assigned_agent_name || '', t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'reopened-desk.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

onMounted(async () => {
  refreshAll(); loadPickers().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  if (agent.value) { try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] } }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => { clearInterval(tick); window.removeEventListener('keydown', onKeydown) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.rop { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.rop-squad { padding: 16px 18px; }
.rop-insights { align-self: stretch; }

.rop-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.rop-btn:hover { border-color: var(--sd-rop-core); }
.rop-btn:active { transform: translateY(1px); }
.rop-btn.on { border-color: var(--sd-rop-core); color: var(--sd-rop-core); background: var(--sd-rop-soft); }
.rop-btn.accent { border-color: color-mix(in srgb, var(--sd-rop-offramp) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, var(--sd-rop-offramp)); }
[data-theme="light"] .rop-btn.accent { color: #064e3b; }
.rop-btn.sm { padding: 7px 12px; font-size: 12px; }
.rop-btn.icon { padding: 7px 9px; }
.rop-btn.ghost { background: transparent; }
.rop-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.rop-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-rop-core); color: #fff; font-size: 10px; font-weight: 800; }

.rop-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.rop-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rop-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.rop-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.rop-view:hover { color: var(--sd-text); }
.rop-view.on { color: var(--sd-rop-core); background: var(--sd-rop-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-rop-core) 40%, transparent); }
.rop-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.rop-count { font-size: 12px; color: var(--sd-text-dim); }

.rop-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-rop-core) 44%, transparent); background: var(--sd-rop-soft); color: var(--sd-rop-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.rop-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.rop-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-rop-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-rop-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.rop-stage { min-height: 40px; }
.rop-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

/* ── QUALITY LOOP RUN overlay ── */
.qlr-veil { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center;
  padding: 18px; background: color-mix(in srgb, var(--sd-rop-deep-bg) 55%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.qlr-card { position: relative; width: min(640px, 100%); border-radius: 20px; padding: 18px 20px 14px;
  border: 1px solid var(--sd-rop-brd); background: color-mix(in srgb, var(--sd-rop-deep-bg) 88%, #000);
  color: #f7edf3; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7), var(--sd-rop-glow); }
.qlr-head { display: flex; justify-content: space-between; align-items: center; padding-right: 36px; /* clear the absolute .qlr-close */ }
.qlr-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-rop-offramp); }
.qlr-count { font-size: 11px; font-weight: 800; color: rgba(247, 237, 243, 0.5); }
.qlr-no { margin-top: 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-rop-hi); }
.qlr-no em { font-style: normal; color: rgba(247, 237, 243, 0.6); }
.qlr-subj { margin: 5px 0 8px; font-size: 18px; font-weight: 750; line-height: 1.3; color: #f8f1f5; }
.qlr-prev { display: flex; flex-direction: column; gap: 3px; margin: 0 0 9px; padding: 9px 11px; border-radius: 11px;
  border: 1px dashed rgba(247, 237, 243, 0.22); background: rgba(247, 237, 243, 0.05); }
.qlr-prev s { font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; color: rgba(247, 237, 243, 0.5);
  text-decoration-color: var(--sd-rop-core); text-decoration-thickness: 1.5px; }
.qlr-prev span { font-size: 11.5px; font-weight: 600; line-height: 1.45; color: rgba(247, 237, 243, 0.75);
  font-family: var(--sd-font, inherit); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qlr-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; font-weight: 700; }
.qlr-src { color: var(--sd-rop-band); }
.qlr-code { color: var(--sd-rop-hi); }
.qlr-owner { color: rgba(247, 237, 243, 0.65); }
.qlr-owner.none { color: var(--sd-rop-risk); }
.qlr-status { color: rgba(247, 237, 243, 0.45); }
.qlr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.qlr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(247, 237, 243, 0.2); background: rgba(247, 237, 243, 0.06); color: #f7edf3;
  transition: transform 0.14s, border-color 0.2s; }
.qlr-btn:hover { transform: translateY(-1px); border-color: var(--sd-rop-hi); }
.qlr-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-rop-offramp)); }
.qlr-btn.ghost { background: transparent; }
.qlr-dots { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 14px; }
.qlr-dots i { width: 8px; height: 4px; border-radius: 3px; background: rgba(247, 237, 243, 0.16); }
.qlr-dots i.done { background: var(--sd-rop-offramp); }
.qlr-dots i.on { background: var(--sd-rop-hi); width: 16px; }
.qlr-close { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: 9px; border: 1px solid rgba(247, 237, 243, 0.16); background: transparent; color: rgba(247, 237, 243, 0.6); cursor: pointer; }
.qlr-close:hover { color: #fff; border-color: var(--sd-rop-hi); }

.rop-flt-enter-active, .rop-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.rop-flt-enter-from, .rop-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .rop-tools { margin-left: 0; } }
</style>
