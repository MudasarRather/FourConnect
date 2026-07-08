<template>
  <div class="opn sd-tw">
    <!-- ══════════════════ LIVE OPS HERO + MOMENTUM PIPELINE ══════════════════ -->
    <SdActiveOpsHero
      :stats="stats" :lenses="lenses" :active-lens="lens" :adv-count="activeFilterCount" :loading="wsLoading"
      @new="$emit('new')" @refresh="refreshAll" @filters="showFilters = !showFilters"
      @commands="cmdOpen = true" @pick="onLens"
    >
      <template #instrument>
        <SdFlowPipeline :stats="stats" :active-stage="lens" :reduced="reduced" @pick="onStage" />
      </template>
    </SdActiveOpsHero>

    <!-- ══════════════════ AGING & SLA BURN-DOWN + STALL ══════════════════ -->
    <SdAgingLadder :tickets="lensFiltered" :now="now" :active="ageBucket" :reduced="reduced" @pick="onAge" />

    <!-- ══════════════════ SQUAD LOAD (agents) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="opn-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="(stats.insights || []).length" class="opn-insights" :insights="stats.insights || []" :reduced="reduced" @act="onInsight" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="opn-deck sd-card">
      <div class="opn-bar">
        <div class="opn-views">
          <button v-for="v in views" :key="v.key" class="opn-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <SdGroupByControl v-if="view === 'swimlanes'" v-model="groupBy" />
        <div class="opn-tools">
          <button class="opn-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="opn-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="opn-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="opn-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="opn-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <!-- active client refinement chips -->
      <div v-if="refineTokens.length" class="opn-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">
          {{ tk.label }} <X :size="11" />
        </button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- saved views -->
    <div v-if="savedViews.length || activeFilterCount" class="opn-views-bar">
      <Bookmark :size="13" class="vb-ico" />
      <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
        {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared">·</span>
        <X :size="11" class="vb-x" @click.stop="removeView(v)" />
      </button>
      <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
    </div>

    <!-- filters -->
    <Transition name="opn-flt">
      <section v-if="showFilters" class="opn-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="opt(PRIORITIES, 'All priorities')" /></div>
        <div class="flt-field"><label>Type</label><SdSelect v-model="f.ticket_type" :options="opt(TICKET_TYPES, 'All types')" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="opn-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="opn-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="opn-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="opn-btn sm" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="opn-btn sm" @click="openBulk('status')"><RefreshCw :size="13" /> Status</button>
          <button class="opn-btn sm" @click="openBulk('priority')"><Flag :size="13" /> Priority</button>
          <button class="opn-btn sm" @click="openBulk('escalate')"><Flame :size="13" /> Escalate</button>
          <button class="opn-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
          <button class="opn-btn sm" @click="openBulk('merge')"><GitMerge :size="13" /> Merge</button>
        </div>
        <button class="opn-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="opn-stage" :key="view">
      <SdTicketsBoard v-if="view === 'board'" :tickets="filtered" :columns="boardCols" :now="now" :capped="wsCapped" @open="openTicket" @move="onMove" />
      <SdSquadBoard v-else-if="view === 'swimlanes'" :tickets="filtered" :group-by="groupBy" :squad="stats.squad || []"
        :now="now" :capped="wsCapped" @open="openTicket" @assign="onAssign" @move="onMove" />
      <SdTicketTable v-else-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Activity"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table) -->
    <div v-if="view === 'table' && pages > 1" class="opn-pager">
      <button class="opn-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
      <button class="opn-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- adaptive drawer + rich action modals + command palette -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="drawerId = null" @changed="refreshAll" />
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
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, RefreshCw, Flag, Flame, CircleCheck, GitMerge,
  Bookmark, BookmarkPlus, ChevronLeft, ChevronRight, Layers, Activity, PlayCircle, Inbox, AlertTriangle, Timer, AlarmClock,
  Table, LayoutGrid, Gauge, Users,
} from 'lucide-vue-next'
import SdActiveOpsHero from '../components/SdActiveOpsHero.vue'
import SdFlowPipeline from '../components/SdFlowPipeline.vue'
import SdAgingLadder from '../components/SdAgingLadder.vue'
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
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdFlowMoveModal from '../modals/SdFlowMoveModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchCommandCenterStats, fetchMyWorkbench, managerAssignTicket,
  getMe, listMyTeam, loadPickers, usePickers, listSavedViews, createSavedView, deleteSavedView,
  PRIORITIES, TICKET_TYPES, typeLabel, statusLabel, priorityLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'open' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
const emit = defineEmits(['new', 'go'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ACCENT = 'var(--sd-st-progress)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views ── */
const views = computed(() => {
  const v = [{ key: 'board', label: 'Flow board', icon: LayoutGrid }]
  if (agent.value) v.push({ key: 'swimlanes', label: 'Swimlanes', icon: Rows3 })
  v.push({ key: 'table', label: 'Table', icon: Table }, { key: 'sla', label: 'SLA', icon: Gauge })
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('board')
const groupBy = ref('agent')
const density = ref('comfortable')
const showFilters = ref(false)
const cmdOpen = ref(false)

/* board = focused active-work lanes + a Resolve drop-gate */
const boardCols = [
  { key: 'open', label: 'Open', color: 'var(--sd-st-open)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--sd-st-progress)' },
  { key: 'pending_customer', label: 'Pending Customer', color: 'var(--sd-st-pending)' },
  { key: 'pending_vendor', label: 'Pending Vendor', color: 'var(--sd-st-pending)' },
  { key: 'on_hold', label: 'On Hold', color: 'var(--sd-st-hold)' },
  { key: 'resolved', label: 'Resolve', color: 'var(--sd-st-resolved)', resolve: true },
]

/* ── server filters (drive the 100-row team-scoped window) ── */
const f = reactive({ q: '', priority: '', ticket_type: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const activeFilterCount = computed(() => ['priority', 'ticket_type', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements (instant, over the working set) ── */
const lens = ref('all')            // all|open|in_progress|unassigned|critical|breaching|dueSoon
const ageBucket = ref('')          // fresh|today|d1_3|d3_7|stuck|stalled
const sortBy = ref('priority')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'open',
  q: f.q || undefined,
  priority: f.priority || undefined,
  ticket_type: f.ticket_type || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'priority', sort_dir: 'desc',
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
  try { stats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() }
  catch { stats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── predicates ── */
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const breachP = (t) => t.sla_resolution_breached || t.sla_resolution_state === 'breached' || (dueMs(t) != null && now.value > dueMs(t) && !isTerminal(t))
const dueSoonP = (t) => !isTerminal(t) && dueMs(t) != null && (dueMs(t) - now.value) > 0 && (dueMs(t) - now.value) < 7200000
const lensPred = (t) => {
  switch (lens.value) {
    case 'open': return t.status === 'open'
    case 'in_progress': return t.status === 'in_progress'
    case 'unassigned': return !t.assigned_agent_id
    case 'critical': return t.priority === 'critical'
    case 'breaching': return breachP(t)
    case 'dueSoon': return dueSoonP(t)
    default: return true
  }
}
const HOUR = 3600000, DAY = 86400000
const ageOf = (t) => (t.created_at ? now.value - new Date(t.created_at).getTime() : 0)
const idleOf = (t) => { const r = t.updated_at || t.last_viewed_at || t.created_at; return r ? now.value - new Date(r).getTime() : 0 }
const agePred = (t) => {
  switch (ageBucket.value) {
    case 'fresh': return ageOf(t) < HOUR
    case 'today': return ageOf(t) >= HOUR && ageOf(t) < DAY
    case 'd1_3': return ageOf(t) >= DAY && ageOf(t) < 3 * DAY
    case 'd3_7': return ageOf(t) >= 3 * DAY && ageOf(t) < 7 * DAY
    case 'stuck': return ageOf(t) >= 7 * DAY
    case 'stalled': return idleOf(t) > 8 * HOUR
    default: return true
  }
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value.filter(lensPred))
const PRI_ORD = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const sortVal = (t, key) => {
  if (key === 'priority') return PRI_ORD[t.priority] || 0
  if (['created_at', 'updated_at', 'resolution_due_at'].includes(key)) return t[key] ? new Date(t[key]).getTime() : 0
  if (key === 'sla') return dueMs(t) || Infinity
  if (key === 'number') return t.ticket_number || ''
  if (key === 'subject') return (t.subject || '').toLowerCase()
  return t[key] ?? ''
}
const filtered = computed(() => {
  const arr = lensFiltered.value.filter(agePred)
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...arr].sort((a, b) => {
    const av = sortVal(a, sortBy.value), bv = sortVal(b, sortBy.value)
    return av < bv ? -dir : av > bv ? dir : 0
  })
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE)))
const pagedRows = computed(() => filtered.value.slice((page.value - 1) * PAGE, page.value * PAGE))
watch(filtered, () => { if (page.value > pages.value) page.value = pages.value })

/* ── hero lenses ── */
const num = (v) => Number(v) || 0
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'all', label: 'In scope', icon: Layers, color: 'var(--sd-st-progress)', value: total.value },
  { key: 'open', label: 'Open', icon: Activity, color: 'var(--sd-st-open)', value: cnt(t => t.status === 'open') },
  { key: 'in_progress', label: 'In Progress', icon: PlayCircle, color: 'var(--sd-st-progress)', value: cnt(t => t.status === 'in_progress') },
  { key: 'unassigned', label: 'Unassigned', icon: Inbox, color: 'var(--sd-amber-strong)', value: cnt(t => !t.assigned_agent_id) },
  { key: 'critical', label: 'Critical', icon: AlertTriangle, color: 'var(--sd-pri-critical)', value: cnt(t => t.priority === 'critical') },
  { key: 'breaching', label: 'Breaching', icon: Timer, color: 'var(--sd-danger)', value: cnt(breachP) },
  { key: 'dueSoon', label: 'Due soon', icon: AlarmClock, color: 'var(--sd-warning)', value: cnt(dueSoonP) },
  { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-st-escalated)', value: num(stats.value.escalated), nav: 'escalated' },
])
const onLens = (l) => {
  if (l.nav) { goTab(l.nav); return }
  lens.value = lens.value === l.key ? 'all' : l.key
  page.value = 1
}
/* pipeline node click: open/in_progress filter locally; pending/hold/escalated cross-navigate */
const onStage = (node) => {
  if (node.action === 'nav' && node.navTab) { goTab(node.navTab); return }
  lens.value = lens.value === node.filter ? 'all' : node.filter
  page.value = 1
}
const onAge = (key) => { ageBucket.value = key; page.value = 1 }

/* refinement tokens */
const LENS_LABEL = { open: 'Open', in_progress: 'In Progress', unassigned: 'Unassigned', critical: 'Critical', breaching: 'Breaching', dueSoon: 'Due soon' }
const AGE_LABEL = { fresh: 'Age · <1h', today: 'Age · Today', d1_3: 'Age · 1–3d', d3_7: 'Age · 3–7d', stuck: 'Age · >7d', stalled: 'Stalled >8h' }
const refineTokens = computed(() => {
  const out = []
  if (lens.value !== 'all') out.push({ key: 'lens', label: LENS_LABEL[lens.value] || lens.value, clear: () => (lens.value = 'all') })
  if (ageBucket.value) out.push({ key: 'age', label: AGE_LABEL[ageBucket.value] || ageBucket.value, clear: () => (ageBucket.value = '') })
  return out
})
const clearRefine = () => { lens.value = 'all'; ageBucket.value = '' }

/* ── cross-tab navigation (connectivity) ── */
const goTab = (tab) => { router.push(`${base.value}/tickets/${tab}`) }

/* ── filter option lists ── */
const pickers = usePickers()
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
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
  else { sortBy.value = key; sortDir.value = 'desc' }
  page.value = 1
}

/* ── rich action modals ── */
const bulkOpen = ref(false)
const bulkMode = ref('status')
const bulkPayloadTickets = ref(null)   // explicit set (single-ticket board actions); else the selection
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

/* every board drop opens an animated confirmation with the FROM→TO process, the
   requester + owner, a reason (persisted to the timeline) and the workflow it triggers.
   Resolve/close → the ITIL resolve modal; escalate → the escalate console; every other
   work-state move → the Flow Move modal (which requires an owner inline for In Progress). */
const moveTarget = ref(null)
const onMove = ({ id, status, from }) => {
  const t = workingSet.value.find(x => String(x.id) === String(id))
  if (['resolved', 'closed'].includes(status)) { resolveTarget.value = t || { id }; return }
  if (status === 'escalated') { if (t) openBulk('escalate', [t]); return }
  if (!t) return
  moveTarget.value = { ticket: t, from: from || t.status, to: status }
}
const onMoved = () => { moveTarget.value = null; refreshAll() }
const onAssign = async ({ id, agentId }) => {
  if (!agentId) { toast.info('Drop a ticket onto an agent to assign it.'); return }
  try { await managerAssignTicket(id, { assigned_agent_id: agentId }); toast.success('Ticket assigned'); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign'); refreshAll() }
}
const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
// Never a dead click: open the flagged ticket; the "heavy workload" heads-up has no
// ticket_ids so switch to the Workload view (agents); otherwise echo the detail.
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
  if (ins?.kind === 'workload' && agent.value) { view.value = 'load'; toast.info(ins?.detail || 'Showing the workload view'); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}

/* ── saved views ── */
const savedViews = ref([])
const appliedView = ref(null)
const loadViews = async () => { try { savedViews.value = await listSavedViews({ scope: 'open' }) } catch { savedViews.value = [] } }
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
    const v = await createSavedView({ name: name.trim(), scope: 'open', filters: { ...f }, columns: columns.value, sort_by: sortBy.value, sort_dir: sortDir.value })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id; toast.success('View saved')
  } catch { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('open').columns || [])
const emptyText = computed(() => getTicketScope('open').empty || { title: 'Nothing in progress', blurb: 'No open or in-progress tickets right now.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Type', 'Priority', 'Status', 'Agent', 'Organization', 'Created', 'Resolution due', 'SLA breached']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, typeLabel(t.ticket_type), priorityLabel(t.priority), statusLabel(t.status),
    t.assigned_agent_name || '', t.organization_name || '', t.created_at || '', t.resolution_due_at || '', t.sla_resolution_breached ? 'yes' : 'no',
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'open-tickets.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

/* ── ⌘K command palette ── */
const commands = computed(() => {
  const cmds = []
  for (const v of views.value) cmds.push({ id: 'view-' + v.key, label: `View: ${v.label}`, hint: 'Switch view', icon: v.icon, run: () => (view.value = v.key) })
  for (const l of lenses.value) cmds.push({ id: 'lens-' + l.key, label: `Lens: ${l.label}`, hint: l.nav ? 'Jump to queue' : 'Filter', icon: l.icon, run: () => onLens(l) })
  cmds.push({ id: 'new', label: 'New ticket', hint: 'Raise a ticket', icon: Layers, run: () => emit('new') })
  cmds.push({ id: 'refresh', label: 'Refresh', hint: 'Reload tickets + stats', icon: RefreshCw, run: () => refreshAll() })
  cmds.push({ id: 'unassigned', label: 'Go: Unassigned queue', hint: 'Claim field', icon: Inbox, run: () => goTab('unassigned') })
  cmds.push({ id: 'escalated', label: 'Go: Escalated', hint: 'Sibling tab', icon: Flame, run: () => goTab('escalated') })
  cmds.push({ id: 'breached', label: 'Go: SLA Breached', hint: 'Sibling tab', icon: Timer, run: () => goTab('breached') })
  cmds.push({ id: 'overdue', label: 'Go: Overdue', hint: 'Sibling tab', icon: AlarmClock, run: () => goTab('overdue') })
  if (agent.value) cmds.push({ id: 'export', label: 'Export CSV', hint: 'Download current set', icon: Download, run: () => doExport() })
  return cmds
})
const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); cmdOpen.value = !cmdOpen.value } }

onMounted(async () => {
  refreshAll(); loadViews(); loadPickers().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  if (agent.value) { try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] } }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => { clearInterval(tick); window.removeEventListener('keydown', onKey) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.opn { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.opn-squad { padding: 16px 18px; }
.opn-insights { align-self: stretch; }

/* buttons */
.opn-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.opn-btn:hover { border-color: var(--sd-amber); }
.opn-btn:active { transform: translateY(1px); }
.opn-btn.on { border-color: var(--sd-amber); color: var(--sd-amber); background: var(--sd-amber-soft); }
.opn-btn.sm { padding: 7px 12px; font-size: 12px; }
.opn-btn.icon { padding: 7px 9px; }
.opn-btn.ghost { background: transparent; }
.opn-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.opn-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-amber); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .opn-fbadge { color: #fff8ec; }

/* control deck */
.opn-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.opn-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.opn-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.opn-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.opn-view:hover { color: var(--sd-text); }
.opn-view.on { color: var(--sd-st-progress); background: color-mix(in srgb, var(--sd-st-progress) 12%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-st-progress) 30%, transparent); }
.opn-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.opn-count { font-size: 12px; color: var(--sd-text-dim); }

/* refinement tokens */
.opn-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-st-progress) 40%, transparent); background: color-mix(in srgb, var(--sd-st-progress) 10%, transparent); color: var(--sd-st-progress); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

/* saved views */
.opn-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.vb-ico { color: var(--sd-amber); flex-shrink: 0; }
.vb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.vb-chip:hover { border-color: var(--sd-amber); color: var(--sd-text); }
.vb-chip.on { border-color: var(--sd-amber); color: var(--sd-amber); background: var(--sd-amber-soft); }
.vb-shared { color: var(--sd-amber); font-weight: 800; }
.vb-x { opacity: 0.5; }
.vb-x:hover { opacity: 1; color: var(--sd-danger); }
.vb-save { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.vb-save:hover { color: var(--sd-amber); border-color: var(--sd-amber); }

/* filters */
.opn-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

/* bulk */
.opn-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-st-progress); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-st-progress); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

/* stage + pager */
.opn-stage { min-height: 40px; }
.opn-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.opn-flt-enter-active, .opn-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.opn-flt-enter-from, .opn-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .opn-tools { margin-left: 0; } }
</style>
