<template>
  <div class="ohd sd-tw">
    <!-- ══════════════════ STASIS-CONTROL HERO + SUSPENSION DOCK ══════════════════ -->
    <SdOnHoldHero
      :lenses="lenses" :active-lens="refine" :held-total="total" :banked-ms="bankedMs"
      :stale-count="staleCount" :next-release="nextRelease" :adv-count="activeFilterCount" :loading="wsLoading"
      @resume-next="resumeNext" @extend-stale="extendStalest" @refresh="refreshAll"
      @filters="showFilters = !showFilters" @pick="onLens"
    >
      <template #instrument>
        <SdSuspensionDock :tickets="dockTickets" :reduced="reduced" :height="330"
          @open="(t) => openTicket(t.id)" @resume="(t) => openAction('resume', t)" />
      </template>
    </SdOnHoldHero>

    <!-- ══════════════════ RELEASE RUNWAY + REASON SPECTRUM ══════════════════ -->
    <SdReleaseTimeline :tickets="workingSet" :active-zone="zone" :active-reason="reason" :now="now" :reduced="reduced"
      @zone="onZone" @reason="onReason" @open="(t) => openTicket(t.id)" />

    <!-- ══════════════════ SQUAD LOAD (agents) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="ohd-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="(stats.insights || []).length" class="ohd-insights" :insights="stats.insights || []" :reduced="reduced" @act="onInsight" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="ohd-deck sd-card">
      <div class="ohd-bar">
        <div class="ohd-views">
          <button v-for="v in views" :key="v.key" class="ohd-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <SdGroupByControl v-if="view === 'swimlanes'" v-model="groupBy" />
        <div class="ohd-tools">
          <button class="ohd-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="ohd-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="ohd-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="ohd-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="ohd-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="ohd-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- saved views -->
    <div v-if="savedViews.length || activeFilterCount" class="ohd-views-bar">
      <Bookmark :size="13" class="vb-ico" />
      <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
        {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared">·</span>
        <X :size="11" class="vb-x" @click.stop="removeView(v)" />
      </button>
      <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
    </div>

    <!-- filters -->
    <Transition name="ohd-flt">
      <section v-if="showFilters" class="ohd-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="opt(PRIORITIES, 'All priorities')" /></div>
        <div class="flt-field"><label>Hold reason</label><SdSelect v-model="reasonSelect" :options="reasonOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="ohd-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="ohd-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="ohd-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="ohd-btn sm accent" :disabled="bulkBusy" @click="bulkResume"><Play :size="13" /> Resume</button>
          <button class="ohd-btn sm" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="ohd-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
          <button class="ohd-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="ohd-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="ohd-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="PauseCircle"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />
      <SdTicketsBoard v-else-if="view === 'board'" :tickets="filtered" :columns="boardCols" :now="now" :capped="wsCapped" @open="openTicket" @move="onMove" />
      <SdSquadBoard v-else-if="view === 'swimlanes'" :tickets="filtered" :group-by="groupBy" :squad="stats.squad || []"
        :now="now" :capped="wsCapped" @open="openTicket" @assign="onAssign" @move="onMove" />
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table) -->
    <div v-if="view === 'table' && pages > 1" class="ohd-pager">
      <button class="ohd-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
      <button class="ohd-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- adaptive drawer + rich action modals -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="drawerId = null" @changed="refreshAll" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <SdAgentActionModal :open="!!actionTarget" :mode="actionTarget?.mode || 'resume'" :ticket="actionTarget?.ticket"
      :agent="agent" :me="me" @close="actionTarget = null" @done="onActionDone" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="assignees" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
  </div>
</template>

<script setup>
/*
  SdOnHoldSection — "The Suspension Dock" (On-Hold stasis console). The last work-state tab
  to leave the generic flat list. Composition: SdOnHoldHero (+ SdSuspensionDock instrument)
  → SdReleaseTimeline (release runway + hold-reason spectrum) → squad/insights → control
  deck → table/board/swimlanes/SLA/workload views → drawer + hold-governance modals
  (resume-with-note, extend-hold review). Data = the proven one-window pattern: 100 rows via
  listScoped({scope:'on_hold'}) + command-center/workbench stats, then 100% client-side
  lens/zone/reason/sort/page. Opening this tab also triggers the backend hold-expiry sweep
  (expired hold_until auto-resume) via the list endpoint.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  Bookmark, BookmarkPlus, ChevronLeft, ChevronRight, Layers, PauseCircle, Snowflake,
  TriangleAlert, CalendarClock, CalendarOff, Sunrise, Link2, Timer, Play,
  Table, LayoutGrid, Gauge, Users, Rows4,
} from 'lucide-vue-next'
import SdOnHoldHero from '../components/SdOnHoldHero.vue'
import SdSuspensionDock from '../components/SdSuspensionDock.vue'
import SdReleaseTimeline from '../components/SdReleaseTimeline.vue'
import SdSquadLoad from '../components/SdSquadLoad.vue'
import SdSquadBoard from '../components/SdSquadBoard.vue'
import SdGroupByControl from '../components/SdGroupByControl.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
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
import SdAgentActionModal from '../modals/SdAgentActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchCommandCenterStats, fetchMyWorkbench, managerAssignTicket, bulkTickets,
  getMe, listMyTeam, loadPickers, usePickers, listSavedViews, createSavedView, deleteSavedView,
  PRIORITIES, HOLD_REASON_CODES, holdReasonLabel, typeLabel, statusLabel, priorityLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'on-hold' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
const emit = defineEmits(['new', 'go'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ACCENT = 'var(--sd-st-hold)'
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
  const v = [{ key: 'table', label: 'Manifest', icon: Table }, { key: 'board', label: 'Release board', icon: LayoutGrid }]
  if (agent.value) v.push({ key: 'swimlanes', label: 'Swimlanes', icon: Rows4 })
  v.push({ key: 'sla', label: 'SLA', icon: Gauge })
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const groupBy = ref('agent')
const density = ref('comfortable')
const showFilters = ref(false)

/* board = the RELEASE lanes: suspended → resume (drop-gate) → resolve (drop-gate). */
const boardCols = [
  { key: 'on_hold', label: 'Suspended', color: 'var(--sd-st-hold)' },
  { key: 'in_progress', label: 'Resume', color: 'var(--sd-st-progress)' },
  { key: 'resolved', label: 'Resolve', color: 'var(--sd-st-resolved)', resolve: true },
]

/* ── server filters ── */
const f = reactive({ q: '', priority: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const activeFilterCount = computed(() => ['priority', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements: hero lens + runway zone + reason code (compose) ── */
const refine = ref('all')          // all|scheduled|today|overdue|stale|nodate|blocked
const zone = ref(null)             // overdue|today|week|later|nodate (release runway)
const reason = ref(null)           // hold_reason_code
const sortBy = ref('release')
const sortDir = ref('asc')         // soonest release first (overdue leads)
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
  scope: 'on_hold',
  q: f.q || undefined,
  priority: f.priority || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'updated_at', sort_dir: 'asc',
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
  try { stats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() }
  catch { stats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── hold telemetry helpers ── */
const DAY = 86400000
const ep = (v) => (v ? new Date(v).getTime() : 0)
const releaseAt = (t) => ep(t.auto_resume_at) || ep(t.hold_until) || 0
const heldMs = (t) => (Number.isFinite(t.time_on_hold_ms) && t.time_on_hold_ms != null)
  ? Math.max(0, t.time_on_hold_ms)
  : (ep(t.held_at) ? Math.max(0, now.value - ep(t.held_at)) : 0)
const isOverdue = (t) => { const r = releaseAt(t); return !!r && r <= now.value }
const isToday = (t) => { const r = releaseAt(t); return !!r && r > now.value && (r - now.value) < DAY }
const isStale = (t) => t.hold_stale != null ? !!t.hold_stale : (!releaseAt(t) && heldMs(t) >= 7 * DAY)
const isBlocked = (t) => !!(t.linked_change_id || t.linked_problem_id)

const PRED = {
  all: () => true,
  scheduled: t => !!releaseAt(t) && !isOverdue(t),
  today: t => isToday(t),
  overdue: t => isOverdue(t),
  stale: t => isStale(t),
  nodate: t => !releaseAt(t),
  blocked: t => isBlocked(t),
}
const ZONE_PRED = {
  overdue: t => isOverdue(t),
  today: t => isToday(t),
  week: t => { const r = releaseAt(t); return !!r && r - now.value >= DAY && r - now.value < 7 * DAY },
  later: t => { const r = releaseAt(t); return !!r && r - now.value >= 7 * DAY },
  nodate: t => !releaseAt(t),
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value
  .filter(PRED[refine.value] || PRED.all)
  .filter(t => (zone.value ? (ZONE_PRED[zone.value] || (() => true))(t) : true))
  .filter(t => (reason.value ? (t.hold_reason_code || 'other') === reason.value : true)))
const PRI_ORD = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const sortVal = (t, key) => {
  if (key === 'priority') return PRI_ORD[t.priority] || 0
  if (key === 'release') return releaseAt(t) || Number.MAX_SAFE_INTEGER   // no-date sinks last
  if (key === 'heldFor') return heldMs(t)
  if (key === 'holdReason') return holdReasonLabel(t.hold_reason_code)
  if (['created_at', 'updated_at', 'held_at', 'hold_until'].includes(key)) return t[key] ? new Date(t[key]).getTime() : 0
  if (key === 'number') return t.ticket_number || ''
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

/* dock crates: most urgent first — overdue, then soonest release, then longest held */
const dockTickets = computed(() => [...workingSet.value].sort((a, b) => {
  const ao = isOverdue(a) ? 0 : 1, bo = isOverdue(b) ? 0 : 1
  if (ao !== bo) return ao - bo
  const ar = releaseAt(a) || Number.MAX_SAFE_INTEGER, br = releaseAt(b) || Number.MAX_SAFE_INTEGER
  if (ar !== br) return ar - br
  return heldMs(b) - heldMs(a)
}))

/* ── instrument + lens counts ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const staleCount = computed(() => cnt(PRED.stale))
const bankedMs = computed(() => workingSet.value.reduce((a, t) => a + (Number(t.sla_paused_ms) || 0) + (ep(t.sla_paused_since) ? Math.max(0, now.value - ep(t.sla_paused_since)) : 0), 0))
const nextRelease = computed(() => dockTickets.value.find(t => !!releaseAt(t)) || dockTickets.value[0] || null)

const HOUR = 3600000
const bankedLensLabel = computed(() => {
  const m = bankedMs.value
  if (m < HOUR) return `${Math.round(m / 60000)}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.floor(m / DAY)}d ${Math.round((m % DAY) / HOUR)}h`
})

const lenses = computed(() => [
  { key: 'all', label: 'In suspension', icon: Layers, color: 'var(--sd-st-hold)', value: total.value },
  { key: 'scheduled', label: 'Scheduled release', icon: CalendarClock, color: 'var(--sd-dock-ember)', value: cnt(PRED.scheduled) },
  { key: 'today', label: 'Releasing today', icon: Sunrise, color: 'var(--sd-success)', value: cnt(PRED.today) },
  { key: 'overdue', label: 'Overdue release', icon: TriangleAlert, color: 'var(--sd-danger)', value: cnt(PRED.overdue) },
  { key: 'stale', label: 'Stale · review due', icon: Snowflake, color: 'var(--sd-warning)', value: staleCount.value },
  { key: 'nodate', label: 'No release date', icon: CalendarOff, color: 'var(--sd-steel)', value: cnt(PRED.nodate) },
  { key: 'blocked', label: 'Blocked by CHG/PRB', icon: Link2, color: 'var(--sd-st-escalated)', value: cnt(PRED.blocked) },
  { key: 'banked', label: 'SLA time banked', icon: Timer, color: 'var(--sd-dock-release)', value: bankedLensLabel.value, stat: true },
])
const onLens = (l) => { if (l.stat) return; refine.value = refine.value === l.key ? 'all' : l.key; page.value = 1 }
const onZone = (z) => { zone.value = z; page.value = 1 }
const onReason = (r) => { reason.value = r; page.value = 1 }

/* refinement tokens */
const REFINE_LABEL = { scheduled: 'Scheduled release', today: 'Releasing today', overdue: 'Overdue release', stale: 'Stale · review due', nodate: 'No release date', blocked: 'Blocked by CHG/PRB' }
const ZONE_LABEL = { overdue: 'Zone · overdue', today: 'Zone · today', week: 'Zone · this week', later: 'Zone · later', nodate: 'Zone · no date' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => (refine.value = 'all') })
  if (zone.value) out.push({ key: 'zone', label: ZONE_LABEL[zone.value] || zone.value, clear: () => (zone.value = null) })
  if (reason.value) out.push({ key: 'reason', label: `Reason · ${holdReasonLabel(reason.value)}`, clear: () => (reason.value = null) })
  return out
})
const clearRefine = () => { refine.value = 'all'; zone.value = null; reason.value = null }

/* ── filter option lists ── */
const pickers = usePickers()
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const agentOptions = computed(() => {
  const seen = new Map()
  for (const t of workingSet.value) if (t.assigned_agent_id && t.assigned_agent_name) seen.set(String(t.assigned_agent_id), t.assigned_agent_name)
  return [{ value: '', label: 'All agents' }, ...[...seen].map(([value, label]) => ({ value, label }))]
})
const reasonOptions = computed(() => [{ value: '', label: 'All reasons' }, ...HOLD_REASON_CODES.map(r => ({ value: r.value, label: r.label }))])
const reasonSelect = computed({ get: () => reason.value || '', set: (v) => { reason.value = v || null; page.value = 1 } })

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
  else { sortBy.value = key; sortDir.value = key === 'release' ? 'asc' : 'desc' }
  page.value = 1
}

/* ── hold-governance actions (the signature actions of this page) ── */
const actionTarget = ref(null)      // { mode: 'resume' | 'hold-extend', ticket }
const openAction = (mode, t) => { if (t) actionTarget.value = { mode, ticket: t } }
const onActionDone = () => { actionTarget.value = null; refreshAll() }
const resumeNext = () => { if (nextRelease.value) openAction('resume', nextRelease.value); else toast.info('Nothing to resume — the dock is clear.') }
const extendStalest = () => {
  const stale = [...workingSet.value].filter(PRED.stale).sort((a, b) => heldMs(b) - heldMs(a))
  if (!stale.length) { toast.info('No stale holds — everything has a release date or a recent review.'); return }
  openAction('hold-extend', stale[0])
}

/* bulk resume — direct through the hardened /bulk endpoint (per-ticket guards + skip reasons) */
const bulkBusy = ref(false)
const bulkResume = async () => {
  if (!selected.value.length || bulkBusy.value) return
  bulkBusy.value = true
  try {
    const r = await bulkTickets({ ids: [...selected.value], action: 'resume' })
    if (r.updated) toast.success(`${r.updated} ticket${r.updated === 1 ? '' : 's'} resumed`)
    if (r.skipped) toast.info(`${r.skipped} skipped (not on hold)`)
    selected.value = []
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk resume failed') } finally { bulkBusy.value = false }
}

/* ── rich bulk modal (assign / escalate / resolve) ── */
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

/* board drops: resume lane → resume modal (returns to held_from_status) · resolve → resolve modal */
const onMove = ({ id, status }) => {
  const t = workingSet.value.find(x => String(x.id) === String(id))
  if (!t) return
  if (['resolved', 'closed'].includes(status)) { resolveTarget.value = t; return }
  if (status === 'escalated') { openBulk('escalate', [t]); return }
  openAction('resume', t)   // any active-work lane = lift the hold via the resume ceremony
}
const onAssign = async ({ id, agentId }) => {
  if (!agentId) { toast.info('Drop a ticket onto an agent to assign it.'); return }
  try { await managerAssignTicket(id, { assigned_agent_id: agentId }); toast.success('Ticket assigned'); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign'); refreshAll() }
}
const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
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
const loadViews = async () => { try { savedViews.value = await listSavedViews({ scope: 'on_hold' }) } catch { savedViews.value = [] } }
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
    const v = await createSavedView({ name: name.trim(), scope: 'on_hold', filters: { ...f }, columns: columns.value, sort_by: sortBy.value, sort_dir: sortDir.value })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id; toast.success('View saved')
  } catch { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('on-hold').columns || [])
const emptyText = computed(() => getTicketScope('on-hold').empty || { title: 'Nothing on hold', blurb: 'No tickets are parked right now.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Hold reason', 'Detail', 'Held for (h)', 'Release at', 'Reviews', 'Stale', 'Agent', 'Organization']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), holdReasonLabel(t.hold_reason_code), t.hold_reason || '',
    Math.round(heldMs(t) / 3600000), t.auto_resume_at || t.hold_until || '', t.hold_review_count || 0,
    isStale(t) ? 'yes' : '', t.assigned_agent_name || '', t.organization_name || '',
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'on-hold.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

onMounted(async () => {
  refreshAll(); loadViews(); loadPickers().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  if (agent.value) { try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] } }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => { clearInterval(tick) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.ohd { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.ohd-squad { padding: 16px 18px; }
.ohd-insights { align-self: stretch; }

.ohd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.ohd-btn:hover { border-color: var(--sd-dock-ember); }
.ohd-btn:active { transform: translateY(1px); }
.ohd-btn.on { border-color: var(--sd-dock-ember); color: var(--sd-dock-ember); background: var(--sd-dock-ember-soft); }
.ohd-btn.accent { border-color: color-mix(in srgb, var(--sd-dock-release) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, #34d399); }
.ohd-btn.sm { padding: 7px 12px; font-size: 12px; }
.ohd-btn.icon { padding: 7px 9px; }
.ohd-btn.ghost { background: transparent; }
.ohd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ohd-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-dock-ember); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .ohd-fbadge { color: #fff8ec; }

.ohd-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.ohd-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ohd-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.ohd-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.ohd-view:hover { color: var(--sd-text); }
.ohd-view.on { color: var(--sd-dock-stone); background: var(--sd-dock-stone-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-dock-stone) 40%, transparent); }
.ohd-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.ohd-count { font-size: 12px; color: var(--sd-text-dim); }

.ohd-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-dock-stone) 44%, transparent); background: var(--sd-dock-stone-soft); color: var(--sd-dock-stone); font-family: inherit; }
[data-theme="light"] .tok { color: #6d5a3f; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.ohd-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.vb-ico { color: var(--sd-dock-ember); flex-shrink: 0; }
.vb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.vb-chip:hover { border-color: var(--sd-dock-ember); color: var(--sd-text); }
.vb-chip.on { border-color: var(--sd-dock-ember); color: var(--sd-dock-ember); background: var(--sd-dock-ember-soft); }
.vb-shared { color: var(--sd-dock-ember); font-weight: 800; }
.vb-x { opacity: 0.5; }
.vb-x:hover { opacity: 1; color: var(--sd-danger); }
.vb-save { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.vb-save:hover { color: var(--sd-dock-ember); border-color: var(--sd-dock-ember); }

.ohd-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.ohd-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-st-hold); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-dock-stone); }
[data-theme="light"] .bulk-n { color: #6d5a3f; }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.ohd-stage { min-height: 40px; }
.ohd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.ohd-flt-enter-active, .ohd-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.ohd-flt-enter-from, .ohd-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .ohd-tools { margin-left: 0; } }
</style>
