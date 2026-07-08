<template>
  <div class="brd sd-tw">
    <!-- ══════════════════ TIME-DEBT-METER HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdBreachedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="guided"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @rca-next="rcaNext" @guided="toggleGuided" @at-risk="scrollToRail"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the Time-Debt Meter fills the hero as its full-bleed backdrop -->
        <SdBreachInstrument :tickets="rankOrdered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdBreachedHero>

    <!-- ══════════════════ AT-RISK RAIL (prevent the NEXT breach) ══════════════════ -->
    <div ref="railEl">
      <SdAtRiskRail :tickets="atRisk" :now="now" :reduced="reduced" @open="openTicket" />
    </div>

    <!-- ══════════════════ DEBT CARRIERS (agents) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="brd-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="brd-deck sd-card">
      <div class="brd-bar">
        <div class="brd-views">
          <button v-for="v in views" :key="v.key" class="brd-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="brd-tools">
          <button class="brd-btn sm" :class="{ on: includeRepaired }"
            title="Also show breached tickets that were later resolved/closed" @click="toggleRepaired">
            <CircleCheck :size="14" /> Include repaired
          </button>
          <button class="brd-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="brd-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="brd-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="brd-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="brd-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="brd-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="brd-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="brd-flt">
      <section v-if="showFilters" class="brd-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="statusOptions" /></div>
        <div class="flt-field"><label>Breach kind</label><SdSelect v-model="kindSelect" :options="kindOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="brd-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="brd-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="brd-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="brd-btn sm accent" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="brd-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
          <button class="brd-btn sm" @click="openBulk('status')"><Rows3 :size="13" /> Set status</button>
          <button class="brd-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="brd-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="brd-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Timer"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" @rca="openRca" />
      <div v-else-if="view === 'anatomy'" class="brd-anatomy">
        <Motion v-for="(t, i) in pagedRows" :key="t.id" class="brd-ana-card"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: Math.min(i * 0.05, 0.5), ease: [0.16, 1, 0.3, 1] }">
          <SdSlaAnatomy :ticket="t" :now="now" />
          <div class="brd-ana-actions">
            <button class="brd-btn sm" @click="openTicket(t.id)"><PanelRight :size="13" /> Open</button>
            <button v-if="agent && !t.rca_summary" class="brd-btn sm rca" @click="openRca(t)"><FileSearch :size="13" /> Capture RCA</button>
            <span v-else-if="t.rca_summary" class="brd-ana-filed sd-mono"><Check :size="12" /> RCA FILED</span>
          </div>
        </Motion>
        <div v-if="!pagedRows.length && !wsLoading" class="brd-ana-empty sd-mono">NO BREACHES UNDER THIS LENS</div>
      </div>
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table + anatomy) -->
    <div v-if="['table', 'anatomy'].includes(view) && pages > 1" class="brd-pager">
      <button class="brd-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
      <button class="brd-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- drawer + consoles + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdRcaConsole :open="!!rcaTarget" :ticket="rcaTarget" :now="now" @close="rcaTarget = null" @saved="onRcaSaved" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <!-- The SAME corporate escalation console every list surface uses (single-ticket path). -->
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="assignees" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdBreachedSection — "THE TIME-DEBT METER" (SLA-breach triage + root-cause desk).
  Composition: SdBreachedHero (full-bleed compounding-odometer instrument, gallery pick
  02) → SdAtRiskRail (prevent the NEXT breach, scope=due_soon) → squad → control deck →
  debt board / anatomy / SLA / load views → adaptive drawer + SdRcaConsole + bulk + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'sla_breached'})
  (backend team-sealed; ACTIVE by default, "include repaired" widens) + the sealed
  /me/tickets/breached/stats rollup (debt/overage/kind/age/RCA-coverage/at-risk/squad).
  Opening this tab ALSO runs the backend breach-flag sweep — idle tickets that silently
  sailed past their deadline get flipped, stamped and surfaced right here.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  ChevronLeft, ChevronRight, Timer, UserX, Flame, AlarmClock, MessageSquare, Snowflake,
  FileSearch, PanelRight, Table, Gauge, Users, Activity, ShieldAlert,
} from 'lucide-vue-next'
import SdBreachedHero from '../components/SdBreachedHero.vue'
import SdBreachInstrument from '../components/SdBreachInstrument.vue'
import SdAtRiskRail from '../components/SdAtRiskRail.vue'
import SdSlaAnatomy from '../components/SdSlaAnatomy.vue'
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
import SdRcaConsole from '../modals/SdRcaConsole.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchBreachedStats, fetchCommandCenterStats, fetchMyWorkbench,
  getMe, listMyTeam, loadPickers, usePickers,
  BREACH_KINDS, priorityLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'breached' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-brc-core)'
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
    { key: 'table', label: 'Debt board', icon: Table },
    { key: 'anatomy', label: 'Anatomy', icon: Activity },
    { key: 'sla', label: 'SLA', icon: Gauge },
  ]
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)

/* ── server filters ── */
const f = reactive({ q: '', priority: '', status: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const includeRepaired = ref(false)
const activeFilterCount = computed(() => ['priority', 'status', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }
const toggleRepaired = () => { includeRepaired.value = !includeRepaired.value; reload() }

/* ── client refinements ── */
const refine = ref('active')     // hero lens: active|response|resolution|both|unowned|notesc|norca|frozen
const kindLens = ref('')          // filter-drawer mirror of the kind lenses
const sortBy = ref('overage')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})            // /me/tickets/breached/stats (sweeps server-side first)
const cmdStats = ref({})         // command-center/workbench (insight ticker)
const atRisk = ref([])           // scope=due_soon — the prevention rail
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'sla_breached',
  active_only: includeRepaired.value ? undefined : true,
  q: f.q || undefined,
  priority: f.priority || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'sla_resolution_breached_at', sort_dir: 'asc',   // oldest breach first in the window
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
  try { stats.value = await fetchBreachedStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const loadAtRisk = async () => {
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), scope: 'due_soon', sort_by: 'resolution_due_at', sort_dir: 'asc', page: 1, limit: 8 })
    atRisk.value = (r.items || []).filter(t => !t.merged_into_id)
  } catch { atRisk.value = [] }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats(); loadAtRisk() }

/* ── breach telemetry helpers ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const respB = (t) => !!t.sla_response_breached
const resoB = (t) => !!t.sla_resolution_breached
const breachStamp = (t) => t.sla_resolution_breached_at || t.sla_response_breached_at ||
  (resoB(t) ? t.resolution_due_at : null) || (respB(t) ? t.response_due_at : null) || null
/* pause-aware overage minutes (frozen at sla_paused_since; sealed at resolved_at) */
const overMin = (t) => {
  const due = ep(resoB(t) ? t.resolution_due_at : (respB(t) ? t.response_due_at : null))
  if (!due) return 0
  const end = resoB(t)
    ? (ep(t.resolved_at) || ep(t.sla_paused_since) || now.value)
    : (ep(t.first_responded_at) || ep(t.sla_paused_since) || now.value)
  return Math.max(0, Math.floor((end - due) / 60000))
}
const noRca = (t) => !t.rca_summary && !t.breach_reason

const PRED = {
  active: t => !isTerminal(t),
  response: t => !isTerminal(t) && respB(t) && !resoB(t),
  resolution: t => !isTerminal(t) && resoB(t) && !respB(t),
  both: t => !isTerminal(t) && respB(t) && resoB(t),
  unowned: t => !isTerminal(t) && !t.assigned_agent_id,
  notesc: t => !isTerminal(t) && !t.is_escalated,
  norca: noRca,
  frozen: t => !isTerminal(t) && !!t.sla_paused_since,
}

/* ── derived sets ── */
const activeSet = computed(() => workingSet.value.filter(PRED.active))
const lensFiltered = computed(() => workingSet.value.filter(PRED[refine.value] || PRED.active))

/* Debt rank: deepest overage first — feeds guided mode + the instrument's ledger. */
const rankOrdered = computed(() => activeSet.value.slice().sort((a, b) => overMin(b) - overMin(a)))

const sortVal = (t, key) => {
  if (key === 'overage') return overMin(t)
  if (key === 'breachedAt') return ep(breachStamp(t)) || Number.MAX_SAFE_INTEGER
  if (key === 'rca') return t.rca_summary ? 0 : t.breach_reason ? 1 : 2
  if (key === 'priority') return { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }[t.priority] || 0
  if (key === 'sla' || key === 'resolution_due_at' || key === 'sla_resolution_breached_at') return ep(t.resolution_due_at) || Number.MAX_SAFE_INTEGER
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

/* ── lenses ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'active', label: 'In debt', icon: Timer, color: 'var(--sd-brc-core)', value: stats.value.active_breached ?? cnt(PRED.active) },
  { key: 'response', label: 'Response', icon: MessageSquare, color: 'var(--sd-brc-brass)', value: (stats.value.by_kind || {}).response ?? cnt(PRED.response) },
  { key: 'resolution', label: 'Resolution', icon: AlarmClock, color: 'var(--sd-brc-hi)', value: (stats.value.by_kind || {}).resolution ?? cnt(PRED.resolution) },
  { key: 'both', label: 'Both missed', icon: Flame, color: 'var(--sd-brc-deep)', value: (stats.value.by_kind || {}).both ?? cnt(PRED.both) },
  { key: 'unowned', label: 'Unowned', icon: UserX, color: 'var(--sd-warning)', value: stats.value.unassigned_breached ?? cnt(PRED.unowned) },
  { key: 'notesc', label: 'Not escalated', icon: ChevronsUp, color: 'var(--sd-esc-core)', value: stats.value.not_escalated ?? cnt(PRED.notesc) },
  { key: 'norca', label: 'RCA missing', icon: FileSearch, color: 'var(--sd-brc-core)', value: stats.value.missing_rca ?? cnt(PRED.norca) },
  { key: 'frozen', label: 'Clock frozen', icon: Snowflake, color: 'var(--sd-brc-brass)', value: cnt(PRED.frozen) },
  { key: 'repaired', label: 'Repaired today', icon: CircleCheck, color: 'var(--sd-brc-repair)', value: stats.value.repaired_today ?? 0, stat: true },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'active' : l.key
  kindLens.value = ['response', 'resolution', 'both'].includes(refine.value) ? refine.value : ''
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { response: 'Response missed', resolution: 'Resolution missed', both: 'Both targets missed', unowned: 'Unowned', notesc: 'Not escalated', norca: 'RCA missing', frozen: 'Clock frozen' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'active') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'active'; kindLens.value = '' } })
  if (includeRepaired.value) out.push({ key: 'repaired', label: 'Including repaired', clear: toggleRepaired })
  return out
})
const clearRefine = () => { refine.value = 'active'; kindLens.value = ''; if (includeRepaired.value) toggleRepaired() }

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const statusOptions = computed(() => [{ value: '', label: 'All statuses' },
  ...['open', 'in_progress', 'escalated', 'pending_customer', 'pending_vendor', 'on_hold', 'resolved', 'closed'].map(s => ({ value: s, label: statusLabel(s) }))])
const kindOptions = computed(() => [{ value: '', label: 'All breach kinds' }, ...BREACH_KINDS.map(k => ({ value: k.value, label: k.label }))])
const kindSelect = computed({
  get: () => kindLens.value,
  set: (v) => { kindLens.value = v || ''; refine.value = v || 'active'; page.value = 1 },
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
  else { sortBy.value = key; sortDir.value = key === 'overage' ? 'desc' : 'asc' }
  page.value = 1
}

/* ── RCA CAPTURE (the signature action) ── */
const rcaTarget = ref(null)
const openRca = (t) => { rcaTarget.value = t }
const rcaNext = () => {
  const next = rankOrdered.value.find(noRca)
  if (!next) { toast.info('Every breach on the board has a root cause on record. Coverage held.'); return }
  openRca(next)
}
const onRcaSaved = () => { rcaTarget.value = null; refreshAll(); if (guided.value) serveNext() }

/* ── guided sweep — serve the deepest debt, one at a time ── */
const guided = ref(false)
const served = ref(new Set())
const serveNext = () => {
  const next = rankOrdered.value.find(t => !served.value.has(String(t.id)))
  if (!next) {
    guided.value = false; served.value = new Set()
    toast.success('Guided sweep complete — every active breach has been reviewed.')
    return
  }
  served.value.add(String(next.id))
  openTicket(next.id)
}
const toggleGuided = () => {
  guided.value = !guided.value
  if (guided.value) { served.value = new Set(); serveNext() }
}

/* ── escalate (SdEscalateConsole) + resolve + bulk ── */
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; selected.value = []; refreshAll() }

const resolveTarget = ref(null)
const onResolved = () => { resolveTarget.value = null; refreshAll() }

const bulkOpen = ref(false)
const bulkMode = ref('assign')
const bulkPayloadTickets = ref(null)
const bulkTicketObjs = computed(() => bulkPayloadTickets.value || workingSet.value.filter(t => selected.value.includes(String(t.id))))
const openBulk = (mode, tickets = null) => {
  const objs = tickets || workingSet.value.filter(t => selected.value.includes(String(t.id)))
  if (!objs.length) { toast.info('Select tickets first.'); return }
  // single-ticket escalate goes through the shared SdEscalateConsole (same as My Tickets / All Tickets)
  if (mode === 'escalate' && objs.length === 1) { escalateTarget.value = objs[0]; return }
  bulkPayloadTickets.value = tickets
  bulkMode.value = mode
  bulkOpen.value = true
}
const onBulkDone = () => { bulkOpen.value = false; bulkPayloadTickets.value = null; selected.value = []; refreshAll() }

const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + rail + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  if (guided.value) serveNext()
}
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
  if (ins?.id === 'brc-imm') { scrollToRail(); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}
/* Breach-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  const unowned = workingSet.value.filter(PRED.unowned)
  if (unowned.length) out.push({ id: 'brc-unowned', kind: 'breach_risk', severity: 'crit',
    title: `${unowned.length} breached ticket${unowned.length === 1 ? '' : 's'} with no owner`,
    detail: 'Debt is accruing with nobody on the hook — assign them first.', action: 'view', ticket_ids: unowned.map(t => t.id) })
  if ((stats.value.imminent || 0) > 0) out.push({ id: 'brc-imm', kind: 'breach_risk', severity: 'crit',
    title: `${stats.value.imminent} ticket${stats.value.imminent === 1 ? '' : 's'} within 30 minutes of breaching`,
    detail: 'Still saveable — the at-risk rail has them ordered by fuse.', action: 'view', ticket_ids: [] })
  const norca = workingSet.value.filter(noRca)
  if (norca.length) out.push({ id: 'brc-norca', kind: 'stale', severity: 'warn',
    title: `${norca.length} breach${norca.length === 1 ? '' : 'es'} with no root cause on record`,
    detail: 'Every breach owes an RCA — coverage drives the prevention loop.', action: 'view', ticket_ids: norca.map(t => t.id) })
  const frozen = workingSet.value.filter(PRED.frozen)
  if (frozen.length) out.push({ id: 'brc-frozen', kind: 'pending_nudge', severity: 'info',
    title: `${frozen.length} breached with a frozen clock`,
    detail: 'Waiting on customer/vendor/hold — the debt stands but is not accruing.', action: 'view', ticket_ids: frozen.map(t => t.id) })
  const notesc = workingSet.value.filter(PRED.notesc)
  if (notesc.length) out.push({ id: 'brc-notesc', kind: 'breach_risk', severity: 'warn',
    title: `${notesc.length} breached but never escalated`,
    detail: 'The auto-sweep lifts owned resolution breaches — these need a human call.', action: 'view', ticket_ids: notesc.map(t => t.id) })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'rca-next', label: 'Capture next root cause', icon: FileSearch, run: rcaNext },
  { key: 'guided', label: guided.value ? 'Exit guided sweep' : 'Guided sweep — serve deepest debt', icon: Check, run: toggleGuided },
  { key: 'lens-unowned', label: 'Lens · Unowned breaches', icon: UserX, run: () => (refine.value = 'unowned') },
  { key: 'lens-norca', label: 'Lens · RCA missing', icon: FileSearch, run: () => (refine.value = 'norca') },
  { key: 'at-risk', label: 'Jump to the at-risk rail', icon: ShieldAlert, run: scrollToRail },
  { key: 'view-anatomy', label: 'View · SLA anatomy', icon: Activity, run: () => (view.value = 'anatomy') },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('breached').columns || [])
const emptyText = computed(() => refine.value === 'active' && !includeRepaired.value
  ? (getTicketScope('breached').empty || { title: 'No breaches', blurb: 'Every clock is within target.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the full ledger.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Status', 'Breach kind', 'Overage (min)', 'Breached at', 'Paused (min)', 'Breach reason', 'RCA filed', 'Agent', 'Resolution due', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), statusLabel(t.status),
    respB(t) && resoB(t) ? 'both' : resoB(t) ? 'resolution' : 'response',
    overMin(t), breachStamp(t) || '', Math.floor((t.sla_paused_ms || 0) / 60000),
    t.breach_reason || '', t.rca_summary ? 'yes' : '', t.assigned_agent_name || '',
    t.resolution_due_at || '', t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'breached-desk.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
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
.brd { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.brd-squad { padding: 16px 18px; }
.brd-insights { align-self: stretch; }

.brd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.brd-btn:hover { border-color: var(--sd-brc-core); }
.brd-btn:active { transform: translateY(1px); }
.brd-btn.on { border-color: var(--sd-brc-core); color: var(--sd-brc-core); background: var(--sd-brc-soft); }
.brd-btn.accent { border-color: color-mix(in srgb, var(--sd-brc-repair) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, var(--sd-brc-repair)); }
[data-theme="light"] .brd-btn.accent { color: #064e3b; }
.brd-btn.rca { border-color: color-mix(in srgb, var(--sd-brc-core) 50%, transparent); color: var(--sd-brc-core); background: var(--sd-brc-soft); }
.brd-btn.sm { padding: 7px 12px; font-size: 12px; }
.brd-btn.icon { padding: 7px 9px; }
.brd-btn.ghost { background: transparent; }
.brd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.brd-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-brc-core); color: #fff; font-size: 10px; font-weight: 800; }

.brd-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.brd-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.brd-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.brd-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.brd-view:hover { color: var(--sd-text); }
.brd-view.on { color: var(--sd-brc-core); background: var(--sd-brc-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-brc-core) 40%, transparent); }
.brd-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.brd-count { font-size: 12px; color: var(--sd-text-dim); }

.brd-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-brc-core) 44%, transparent); background: var(--sd-brc-soft); color: var(--sd-brc-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.brd-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.brd-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-brc-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-brc-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.brd-stage { min-height: 40px; }
.brd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

/* anatomy view */
.brd-anatomy { display: flex; flex-direction: column; gap: 12px; }
.brd-ana-card { border: 1px solid var(--sd-border); border-radius: 16px; background: var(--sd-surface); padding: 6px 8px 10px; }
.brd-ana-actions { display: flex; gap: 8px; align-items: center; padding: 0 10px; }
.brd-ana-filed { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-brc-repair); }
.brd-ana-empty { padding: 36px 0; text-align: center; font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }

.brd-flt-enter-active, .brd-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.brd-flt-enter-from, .brd-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .brd-tools { margin-left: 0; } }
</style>
