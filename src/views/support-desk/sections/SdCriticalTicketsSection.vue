<template>
  <div class="wcr sd-tw">
    <!-- ══════════════════ WAR-ROOM HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdCriticalHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="guided"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @ack-next="ackNext" @declare="openDeclare()" @guided="toggleGuided"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the Seismograph Wall fills the hero as its full-bleed backdrop -->
        <SdCriticalInstrument v-if="hasInstrument" :tickets="rankOrdered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdCriticalHero>

    <!-- ══════════════════ RESPONDER LOAD (agents) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="wcr-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="wcr-deck sd-card">
      <div class="wcr-bar">
        <div class="wcr-views">
          <button v-for="v in views" :key="v.key" class="wcr-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <SdGroupByControl v-if="view === 'swimlanes'" v-model="groupBy" />
        <div class="wcr-tools">
          <button class="wcr-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="wcr-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="wcr-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="wcr-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="wcr-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="wcr-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="(cmdStats.insights || []).length" class="wcr-insights" :insights="cmdStats.insights || []" :reduced="reduced" @act="onInsight" />

    <!-- saved views -->
    <div v-if="savedViews.length || activeFilterCount" class="wcr-views-bar">
      <Bookmark :size="13" class="vb-ico" />
      <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
        {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared">·</span>
        <X :size="11" class="vb-x" @click.stop="removeView(v)" />
      </button>
      <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
    </div>

    <!-- filters -->
    <Transition name="wcr-flt">
      <section v-if="showFilters" class="wcr-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Type</label><SdSelect v-model="f.ticket_type" :options="opt(TICKET_TYPES, 'All types')" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="statusOptions" /></div>
        <div class="flt-field"><label>Business impact</label><SdSelect v-model="impactSelect" :options="impactOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="wcr-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="wcr-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="wcr-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="wcr-btn sm accent" :disabled="bulkBusy" @click="doBulkAck"><ShieldCheck :size="13" /> Acknowledge</button>
          <button class="wcr-btn sm" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="wcr-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
          <button class="wcr-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="wcr-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="wcr-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Siren"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" @ack="ackOne" @war="openWarRoom" />
      <SdTicketsBoard v-else-if="view === 'board'" :tickets="filtered" :columns="boardCols" :now="now" :capped="wsCapped" @open="openTicket" @move="onMove" />
      <SdSquadBoard v-else-if="view === 'swimlanes'" :tickets="filtered" :group-by="groupBy" :squad="cmdStats.squad || []"
        :now="now" :capped="wsCapped" @open="openTicket" @assign="onAssign" @move="onMove" />
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table) -->
    <div v-if="view === 'table' && pages > 1" class="wcr-pager">
      <button class="wcr-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
      <button class="wcr-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- adaptive drawer + war-room console + rich action modals + command palette -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdWarRoomConsole :open="!!warTarget" :ticket="warTarget" :agent="agent" :me="me" :now="now" :viewers="viewers"
      @close="warTarget = null" @changed="onWarChanged" @open-ticket="openTicket" @declare="(t) => openDeclare(t)" />
    <SdMajorIncidentModal :open="declareOpen" :ticket="declareTarget" :tickets="declareOptions" :agent="agent"
      @close="declareOpen = false" @done="onDeclared" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <SdFlowMoveModal :open="!!moveTarget" :ticket="moveTarget?.ticket" :from="moveTarget?.from" :to="moveTarget?.to"
      :agent="agent" :me="me" :assignees="assignees" :now="now" @close="moveTarget = null" @done="onMoved" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="assignees" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdCriticalTicketsSection — "The War Room" (Critical + major-incident ops console).
  Composition: SdCriticalHero (+ signature instrument) → squad → control deck →
  table/board/swimlanes/SLA/load → SdTicketDrawer + SdWarRoomConsole + declare-MI /
  resolve / flow-move / bulk modals + ⌘K. Data = the proven one-window pattern:
  100 rows via listScoped({scope:'critical', include_major:1}) — priority=critical ∪
  is_major_incident, terminal rows INCLUDED (powers the RCA-gap lens) — plus the
  team-sealed /me/tickets/critical/stats rollup (MTTA/MTTR/ack-coverage/squad).
  Opening this tab also runs the backend update-cadence overdue sweep. Presence
  heartbeats fire while the drawer / war-room console is open (agent collision).
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  Bookmark, BookmarkPlus, ChevronLeft, ChevronRight, Siren, ShieldCheck, ShieldAlert,
  Flame, UserX, BellRing, Timer, History, FileWarning, Table, LayoutGrid, Gauge, Users, Rows4,
} from 'lucide-vue-next'
import SdCriticalHero from '../components/SdCriticalHero.vue'
import SdCriticalInstrument from '../components/SdCriticalInstrument.vue'
import SdSquadLoad from '../components/SdSquadLoad.vue'
import SdSquadBoard from '../components/SdSquadBoard.vue'
import SdGroupByControl from '../components/SdGroupByControl.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdTicketsBoard from '../components/SdTicketsBoard.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdWarRoomConsole from '../drawers/SdWarRoomConsole.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdFlowMoveModal from '../modals/SdFlowMoveModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchCriticalStats, fetchCommandCenterStats, fetchMyWorkbench,
  managerAssignTicket, ackTicket, bulkAck, ticketPresence,
  getMe, listMyTeam, loadPickers, usePickers, listSavedViews, createSavedView, deleteSavedView,
  TICKET_TYPES, BUSINESS_IMPACTS, STALE_CRITICAL_HOURS, priorityLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'critical' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-crit-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())
// The signature instrument ships in the motif pass — the hero shows its idle core until then.
const hasInstrument = ref(true)

/* ── views ── */
const views = computed(() => {
  const v = [{ key: 'table', label: 'Situation board', icon: Table }, { key: 'board', label: 'Incident flow', icon: LayoutGrid }]
  if (agent.value) v.push({ key: 'swimlanes', label: 'Swimlanes', icon: Rows4 })
  v.push({ key: 'sla', label: 'SLA', icon: Gauge })
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const groupBy = ref('agent')
const density = ref('comfortable')
const showFilters = ref(false)

/* board = the INCIDENT lanes: triage → mitigating → war room (escalated) → resolve gate. */
const boardCols = [
  { key: 'open', label: 'Triage', color: 'var(--sd-st-open)' },
  { key: 'in_progress', label: 'Mitigating', color: 'var(--sd-crit-flare)' },
  { key: 'escalated', label: 'War room', color: 'var(--sd-st-escalated)' },
  { key: 'resolved', label: 'Resolve gate', color: 'var(--sd-st-resolved)', resolve: true },
]

/* ── server filters ── */
const f = reactive({ q: '', ticket_type: '', status: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const activeFilterCount = computed(() => ['ticket_type', 'status', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements ── */
const refine = ref('active')       // active|major|unacked|noowner|updatedue|burning|stale|reopened|rcagap
const impact = ref(null)           // business_impact refinement
const sortBy = ref('rank')         // war-room ranking by default
const sortDir = ref('asc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})              // /me/tickets/critical/stats (war-room rollup)
const cmdStats = ref({})           // command-center/workbench (squad swimlanes + insights)
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'critical', include_major: 1,
  q: f.q || undefined,
  ticket_type: f.ticket_type || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'created_at', sort_dir: 'asc',
})
const loadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), ...params(), page: 1, limit: 100 })
    workingSet.value = (r.items || []).filter(t => !t.merged_into_id)
    total.value = r.total || workingSet.value.length
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false; toast.error('Could not load this desk — check the connection and press Refresh.') } finally { wsLoading.value = false }
}
const loadStats = async () => {
  try { stats.value = await fetchCriticalStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── war-room telemetry helpers ── */
const HOUR = 3600000
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const isBreached = (t) => !!(t.sla_response_breached || t.sla_resolution_breached)
const isPaused = (t) => !!t.sla_paused_since
const dueAt = (t) => ep(t.resolution_due_at)
const isBurning = (t) => !isTerminal(t) && (isBreached(t) || (!isPaused(t) && dueAt(t) && dueAt(t) - now.value < 2 * HOUR))
const isUnacked = (t) => !isTerminal(t) && !t.acknowledged_at
const isUpdateOverdue = (t) => !isTerminal(t) && !!t.next_update_due_at && ep(t.next_update_due_at) < now.value
const isStale = (t) => !isTerminal(t) && (now.value - ep(t.updated_at)) >= STALE_CRITICAL_HOURS * HOUR
const isRcaGap = (t) => isTerminal(t) && !(t.rca_summary || '').trim()

const PRED = {
  active: t => !isTerminal(t),
  major: t => !isTerminal(t) && !!t.is_major_incident,
  unacked: isUnacked,
  noowner: t => !isTerminal(t) && !t.assigned_agent_id,
  updatedue: isUpdateOverdue,
  burning: isBurning,
  stale: isStale,
  reopened: t => !isTerminal(t) && (t.reopened_count || 0) > 0,
  rcagap: isRcaGap,
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value
  .filter(PRED[refine.value] || PRED.active)
  .filter(t => (impact.value ? (t.business_impact || 'unset') === impact.value : true)))

/* War-room rank: unacked first → breached → soonest due → oldest. Drives the default
   table order, guided mode and "Acknowledge next". */
const rankScore = (t) => {
  let s = 0
  if (!isUnacked(t)) s += 1e15
  if (!isBreached(t)) s += 1e14
  s += (dueAt(t) || 9e13) / 10
  s += ep(t.created_at) / 1e6
  return s
}
const PRI_ORD = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const sortVal = (t, key) => {
  if (key === 'rank') return rankScore(t)
  if (key === 'priority') return PRI_ORD[t.priority] || 0
  if (key === 'ack') return t.acknowledged_at ? ep(t.acknowledged_at) : 0        // unacked first asc
  if (key === 'nextUpdate') return ep(t.next_update_due_at) || Number.MAX_SAFE_INTEGER
  if (key === 'sla' || key === 'resolution_due_at') return dueAt(t) || Number.MAX_SAFE_INTEGER
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

/* instrument feed — active criticals in rank order */
const rankOrdered = computed(() => workingSet.value.filter(PRED.active).sort((a, b) => rankScore(a) - rankScore(b)))

/* ── lenses ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'active', label: 'Active', icon: Siren, color: 'var(--sd-crit-core)', value: stats.value.active_critical ?? cnt(PRED.active) },
  { key: 'major', label: 'Major', icon: ShieldAlert, color: 'var(--sd-crit-mi)', value: stats.value.major_incidents ?? cnt(PRED.major) },
  { key: 'unacked', label: 'Unacked', icon: BellRing, color: 'var(--sd-crit-flare)', value: stats.value.unacked ?? cnt(PRED.unacked) },
  { key: 'noowner', label: 'No owner', icon: UserX, color: 'var(--sd-warning)', value: stats.value.no_owner ?? cnt(PRED.noowner) },
  { key: 'burning', label: 'Breach soon', icon: Flame, color: 'var(--sd-danger)', value: cnt(PRED.burning) },
  { key: 'updatedue', label: 'Update due', icon: Timer, color: 'var(--sd-crit-deep)', value: stats.value.update_overdue ?? cnt(PRED.updatedue) },
  { key: 'stale', label: `Stale ${STALE_CRITICAL_HOURS}h+`, icon: History, color: 'var(--sd-steel)', value: cnt(PRED.stale) },
  { key: 'rcagap', label: 'RCA missing', icon: FileWarning, color: 'var(--sd-st-escalated)', value: stats.value.missing_rca ?? cnt(PRED.rcagap) },
  { key: 'resolved', label: 'Solved today', icon: CircleCheck, color: 'var(--sd-crit-ack)', value: stats.value.resolved_today ?? 0, stat: true },
])
const onLens = (l) => { if (l.stat) return; refine.value = refine.value === l.key ? 'active' : l.key; page.value = 1 }

/* refinement tokens */
const REFINE_LABEL = { major: 'Major incidents', unacked: 'Unacknowledged', noowner: 'No responder', updatedue: 'Update overdue', burning: 'Breach imminent', stale: 'Stale', reopened: 'Reopened', rcagap: 'RCA missing' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'active') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => (refine.value = 'active') })
  if (impact.value) out.push({ key: 'impact', label: `Impact · ${impact.value}`, clear: () => (impact.value = null) })
  return out
})
const clearRefine = () => { refine.value = 'active'; impact.value = null }

/* ── filter option lists ── */
const pickers = usePickers()
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const statusOptions = computed(() => [{ value: '', label: 'All statuses' },
  ...['open', 'in_progress', 'escalated', 'pending_customer', 'pending_vendor', 'on_hold', 'resolved', 'closed'].map(s => ({ value: s, label: statusLabel(s) }))])
const impactOptions = computed(() => [{ value: '', label: 'All impacts' }, ...BUSINESS_IMPACTS.map(b => ({ value: b.value, label: b.label })), { value: 'unset', label: 'Not assessed' }])
const impactSelect = computed({ get: () => impact.value || '', set: (v) => { impact.value = v || null; page.value = 1 } })
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
  else { sortBy.value = key; sortDir.value = 'asc' }
  page.value = 1
}

/* ── ACK (the signature action) ── */
const ackBusy = ref(false)
const ackOne = async (t) => {
  if (ackBusy.value) return
  ackBusy.value = true
  try { await ackTicket(t.id); toast.success(`${t.ticket_number} acknowledged — you're on it`); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') }
  finally { ackBusy.value = false }
}
const ackNext = () => {
  const next = rankOrdered.value.find(isUnacked)
  if (!next) { toast.info('Every active critical is acknowledged. Coverage 100%.'); return }
  ackOne(next)
}
const bulkBusy = ref(false)
const doBulkAck = async () => {
  if (!selected.value.length || bulkBusy.value) return
  bulkBusy.value = true
  try {
    const r = await bulkAck([...selected.value])
    if (r.updated) toast.success(`${r.updated} acknowledged`)
    if (r.skipped) toast.info(`${r.skipped} skipped (already acked / closed)`)
    const denied = (r.results || []).filter(x => x.ok === false).length
    if (denied) toast.warning(`${denied} outside your team's scope`)
    selected.value = []
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk acknowledge failed') } finally { bulkBusy.value = false }
}

/* ── guided mode — serve the most urgent critical, one at a time ── */
const guided = ref(false)
const served = ref(new Set())
const serveNext = () => {
  const next = rankOrdered.value.find(t => !served.value.has(String(t.id)))
  if (!next) {
    guided.value = false; served.value = new Set()
    toast.success('Guided sweep complete — every active critical has been reviewed.')
    return
  }
  served.value.add(String(next.id))
  openTicket(next.id)
}
const toggleGuided = () => {
  guided.value = !guided.value
  if (guided.value) { served.value = new Set(); serveNext() }
}

/* ── declare major incident ── */
const declareOpen = ref(false)
const declareTarget = ref(null)
const declareOptions = computed(() => rankOrdered.value)
const openDeclare = (t = null) => { declareTarget.value = t; declareOpen.value = true }
const onDeclared = (t) => {
  declareOpen.value = false
  refreshAll()
  if (t) { warTarget.value = t; toast.success(`${t.ticket_number} is now a MAJOR INCIDENT — war room open`) }
}

/* ── war-room console + presence ── */
const drawerId = ref(null)          // declared before presenceId (computed watch evaluates eagerly)
const warTarget = ref(null)
const viewers = ref([])
const openWarRoom = (t) => { warTarget.value = t }
const onWarChanged = (t) => { if (t) warTarget.value = t; refreshAll() }
let heartbeat = null
const presenceId = computed(() => warTarget.value?.id || drawerId.value || null)
const beat = async () => {
  const id = presenceId.value
  if (!id) { viewers.value = []; return }
  try { const r = await ticketPresence(id); viewers.value = r.viewers || [] } catch { /* non-fatal */ }
}
watch(presenceId, (v) => { if (v) beat(); else viewers.value = [] })

/* ── bulk modal (assign / escalate / resolve) ── */
const bulkOpen = ref(false)
const bulkMode = ref('assign')
const bulkPayloadTickets = ref(null)
const bulkTicketObjs = computed(() => bulkPayloadTickets.value || workingSet.value.filter(t => selected.value.includes(String(t.id))))
const openBulk = (mode, tickets = null) => {
  const objs = tickets || workingSet.value.filter(t => selected.value.includes(String(t.id)))
  if (!objs.length) { toast.info('Select tickets first.'); return }
  // A SINGLE ticket gets the full corporate escalation console (tier ladder, ITIL
  // reassessment, team routing) — same experience as My Tickets. Bulk keeps the ledger modal.
  if (mode === 'escalate' && objs.length === 1) { escalateTarget.value = objs[0]; return }
  bulkPayloadTickets.value = tickets
  bulkMode.value = mode
  bulkOpen.value = true
}
const onBulkDone = () => { bulkOpen.value = false; bulkPayloadTickets.value = null; selected.value = []; refreshAll() }

/* single-ticket escalation console (shared with My Tickets) */
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; selected.value = []; toast.success('Ticket escalated'); refreshAll() }

const resolveTarget = ref(null)
const onResolved = () => { resolveTarget.value = null; refreshAll() }

/* board drops: resolve gate → resolve ceremony · war room lane → escalate · work lanes → gated move */
const moveTarget = ref(null)
const onMove = ({ id, status }) => {
  const t = workingSet.value.find(x => String(x.id) === String(id))
  if (!t) return
  if (['resolved', 'closed'].includes(status)) { resolveTarget.value = t; return }
  if (status === 'escalated') { openBulk('escalate', [t]); return }
  moveTarget.value = { ticket: t, from: t.status, to: status }
}
const onMoved = () => { moveTarget.value = null; refreshAll() }
const onAssign = async ({ id, agentId }) => {
  if (!agentId) { toast.info('Drop a ticket onto an agent to assign it.'); return }
  try { await managerAssignTicket(id, { assigned_agent_id: agentId }); toast.success('Responder assigned'); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign'); refreshAll() }
}
const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + insights ── */
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  if (guided.value) serveNext()
}
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
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'ack-next', label: 'Acknowledge next critical', icon: ShieldCheck, run: ackNext },
  { key: 'declare', label: 'Declare major incident…', icon: Siren, run: () => openDeclare() },
  { key: 'war-room', label: 'Open war room (top major)', icon: ShieldAlert, run: () => {
      const mi = rankOrdered.value.find(t => t.is_major_incident)
      if (mi) openWarRoom(mi); else toast.info('No active major incident.')
    } },
  { key: 'guided', label: guided.value ? 'Exit guided mode' : 'Guided mode — serve next', icon: Check, run: toggleGuided },
  { key: 'lens-unacked', label: 'Lens · Unacknowledged', icon: BellRing, run: () => (refine.value = 'unacked') },
  { key: 'lens-major', label: 'Lens · Major incidents', icon: ShieldAlert, run: () => (refine.value = 'major') },
  { key: 'view-board', label: 'View · Incident flow', icon: LayoutGrid, run: () => (view.value = 'board') },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
}

/* ── saved views ── */
const savedViews = ref([])
const appliedView = ref(null)
const loadViews = async () => { try { savedViews.value = await listSavedViews({ scope: 'critical' }) } catch { savedViews.value = [] } }
const applyView = (v) => {
  appliedView.value = v.id
  Object.keys(f).forEach(k => (f[k] = (v.filters && v.filters[k]) || ''))
  if (v.sort_by) sortBy.value = v.sort_by
  if (v.sort_dir) sortDir.value = v.sort_dir
  reload()
}
const saveView = async () => {
  const name = window.prompt('Name this view:')
  if (!name || !name.trim()) return
  try {
    const v = await createSavedView({ name: name.trim(), scope: 'critical', filters: { ...f }, columns: columns.value, sort_by: sortBy.value, sort_dir: sortDir.value })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id; toast.success('View saved')
  } catch { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('critical').columns || [])
const emptyText = computed(() => refine.value === 'active'
  ? (getTicketScope('critical').empty || { title: 'No critical tickets', blurb: 'The desk is calm.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the full board.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Major incident', 'Status', 'Acknowledged by', 'Acknowledged at', 'Next update due', 'Business impact', 'Affected users', 'Agent', 'Organization', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), t.is_major_incident ? 'yes' : '', statusLabel(t.status),
    t.acknowledged_by_name || '', t.acknowledged_at || '', t.next_update_due_at || '',
    t.business_impact || '', t.affected_users ?? '', t.assigned_agent_name || '', t.organization_name || '', t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'critical-war-room.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

onMounted(async () => {
  refreshAll(); loadViews(); loadPickers().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  if (agent.value) { try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] } }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  heartbeat = setInterval(beat, 25000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(heartbeat); window.removeEventListener('keydown', onKeydown) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.wcr { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.wcr-squad { padding: 16px 18px; }
.wcr-insights { align-self: stretch; }

.wcr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.wcr-btn:hover { border-color: var(--sd-crit-core); }
.wcr-btn:active { transform: translateY(1px); }
.wcr-btn.on { border-color: var(--sd-crit-core); color: var(--sd-crit-core); background: var(--sd-crit-soft); }
.wcr-btn.accent { border-color: color-mix(in srgb, var(--sd-crit-ack) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, var(--sd-crit-ack)); }
[data-theme="light"] .wcr-btn.accent { color: #064e3b; }
.wcr-btn.sm { padding: 7px 12px; font-size: 12px; }
.wcr-btn.icon { padding: 7px 9px; }
.wcr-btn.ghost { background: transparent; }
.wcr-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wcr-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-crit-core); color: #fff; font-size: 10px; font-weight: 800; }

.wcr-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.wcr-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.wcr-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.wcr-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.wcr-view:hover { color: var(--sd-text); }
.wcr-view.on { color: var(--sd-crit-core); background: var(--sd-crit-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-crit-core) 40%, transparent); }
.wcr-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.wcr-count { font-size: 12px; color: var(--sd-text-dim); }

.wcr-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-crit-core) 44%, transparent); background: var(--sd-crit-soft); color: var(--sd-crit-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.wcr-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.vb-ico { color: var(--sd-crit-flare); flex-shrink: 0; }
.vb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.vb-chip:hover { border-color: var(--sd-crit-flare); color: var(--sd-text); }
.vb-chip.on { border-color: var(--sd-crit-flare); color: var(--sd-crit-flare); background: var(--sd-crit-flare-soft); }
.vb-shared { color: var(--sd-crit-flare); font-weight: 800; }
.vb-x { opacity: 0.5; }
.vb-x:hover { opacity: 1; color: var(--sd-danger); }
.vb-save { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.vb-save:hover { color: var(--sd-crit-flare); border-color: var(--sd-crit-flare); }

.wcr-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.wcr-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-crit-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-crit-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.wcr-stage { min-height: 40px; }
.wcr-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.wcr-flt-enter-active, .wcr-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.wcr-flt-enter-from, .wcr-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .wcr-tools { margin-left: 0; } }
</style>
