<template>
  <div class="ovd sd-tw">
    <!-- ══════════════════ GRAVITY-WELL HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdOverdueHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="runOn"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @run="toggleRun" @nudge="nudgeAllOwners" @tipping="scrollToStrip"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the Gravity Well fills the hero as its full-bleed backdrop -->
        <SdGravityWell :tickets="lensFiltered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdOverdueHero>

    <!-- ══════════════════ THE TIPPING POINT (catch them before they fall in) ══════════════════ -->
    <div ref="stripEl">
      <SdTippingPoint :tickets="atRisk" :now="now" :reduced="reduced" @open="openTicket" />
    </div>

    <!-- ══════════════════ RECOVERY ROSTER (who carries the late load) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="ovd-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="ovd-deck sd-card">
      <div class="ovd-bar">
        <div class="ovd-views">
          <button v-for="v in views" :key="v.key" class="ovd-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="ovd-tools">
          <button class="ovd-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="ovd-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="ovd-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="ovd-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="ovd-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="ovd-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="ovd-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="ovd-flt">
      <section v-if="showFilters" class="ovd-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="statusOptions" /></div>
        <div class="flt-field"><label>Missed clock</label><SdSelect v-model="kindSelect" :options="kindOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="ovd-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="ovd-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="ovd-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="ovd-btn sm accent" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="ovd-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
          <button class="ovd-btn sm" @click="openBulk('status')"><Rows3 :size="13" /> Set status</button>
          <button class="ovd-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
          <button class="ovd-btn sm rose" title="Ping the owner of every selected ticket (24h throttle per ticket)" @click="nudgeSelected"><BellRing :size="13" /> Nudge owners</button>
        </div>
        <button class="ovd-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="ovd-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="AlarmClock"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />

      <!-- HORIZON — how far past the line each ticket has drifted (unique to this desk) -->
      <div v-else-if="view === 'horizon'" class="ovd-horizon sd-card">
        <div class="hz-scale sd-mono" aria-hidden="true">
          <span class="hz-zero">DEADLINE</span>
          <span v-for="mk in HZ_MARKS" :key="mk.label" class="hz-mark" :style="{ left: mk.pos + '%' }">{{ mk.label }}</span>
        </div>
        <div class="hz-rows">
          <Motion v-for="(t, i) in pagedRows" :key="t.id" as="button" class="hz-row"
            :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.4, delay: Math.min(i * 0.04, 0.5), ease: [0.16, 1, 0.3, 1] }"
            :title="t.subject" @click="openTicket(t.id)">
            <span class="hz-no sd-mono">{{ t.ticket_number }}</span>
            <span class="hz-subj">{{ t.subject }}</span>
            <span class="hz-track">
              <i v-for="mk in HZ_MARKS" :key="mk.label" class="hz-grid" :style="{ left: mk.pos + '%' }" aria-hidden="true" />
              <i class="hz-bar" :style="{ width: hzPct(t) + '%', background: hzGrad(t) }" aria-hidden="true" />
              <em class="hz-tip sd-mono" :class="{ in: hzPct(t) > 62 }" :style="{ left: hzPct(t) + '%' }">{{ lateLabel(lateMin(t)) }}</em>
            </span>
            <span class="hz-who sd-mono" :class="{ none: !t.assigned_agent_name }">{{ t.assigned_agent_name || 'UNOWNED' }}</span>
          </Motion>
          <div v-if="!pagedRows.length && !wsLoading" class="hz-empty sd-mono">NOTHING UNDER THIS LENS — THE WELL IS QUIET</div>
        </div>
      </div>

      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pager -->
    <div v-if="view !== 'sla' && view !== 'load' && pages > 1" class="ovd-pager">
      <button class="ovd-btn sm icon" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button>
      <span class="pg-info sd-mono">PAGE {{ page }} / {{ pages }}</span>
      <button class="ovd-btn sm icon" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button>
    </div>

    <!-- ══════════════════ RECOVERY RUN (guided, ranked by recovery score) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="runOn && runCurrent && !drawerId" class="rr-veil"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }"
          @mousedown.stop @click.stop>
          <Motion class="rr-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }" :key="runCurrent.id">
            <div class="rr-head sd-mono">
              <span class="rr-eyebrow"><Orbit :size="13" /> RECOVERY RUN</span>
              <span class="rr-count">{{ runIdx + 1 }} / {{ runQueue.length }}</span>
            </div>
            <div class="rr-no sd-mono">{{ runCurrent.ticket_number }} · <em>{{ (runCurrent.priority || '').toUpperCase() }}</em></div>
            <h3 class="rr-subj">{{ runCurrent.subject }}</h3>
            <div class="rr-meta sd-mono">
              <span class="rr-late">{{ lateLabel(lateMin(runCurrent)) }}</span>
              <span class="rr-owner" :class="{ none: !runCurrent.assigned_agent_name }">{{ runCurrent.assigned_agent_name || 'UNOWNED' }}</span>
              <span class="rr-status">{{ statusLabel(runCurrent.status) }}</span>
            </div>
            <div class="rr-actions">
              <button class="rr-btn primary" @click="openTicket(runCurrent.id)"><PanelRight :size="14" /> Open console</button>
              <button v-if="agent && !isMine(runCurrent)" class="rr-btn" @click="runAssignMe"><UserCheck :size="14" /> Assign to me</button>
              <button v-if="runCurrent.assigned_agent_id && !isMine(runCurrent)" class="rr-btn rose" @click="runNudge"><BellRing :size="14" /> Nudge owner</button>
              <button class="rr-btn" @click="resolveTarget = runCurrent"><CircleCheck :size="14" /> Resolve</button>
              <button class="rr-btn ghost" @click="runNext"><ChevronRight :size="14" /> Skip</button>
            </div>
            <div class="rr-dots" aria-hidden="true">
              <i v-for="(id, i) in runQueue" :key="id" :class="{ done: i < runIdx, on: i === runIdx }" />
            </div>
            <button class="rr-close" title="End the run" @click="endRun"><X :size="15" /></button>
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
  SdOverdueSection — "THE GRAVITY WELL" (overdue recovery desk).
  Composition: SdOverdueHero (full-bleed orbital-decay instrument, gallery pick 01) →
  SdTippingPoint (due ≤2h — catch them before they fall in) → recovery roster → control
  deck → recovery board / horizon / SLA / load views → RECOVERY RUN (ranked guided mode)
  → adaptive drawer + bulk (incl. owner-nudge) + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'overdue',
  overdue_kind:'any'}) (backend team-sealed; BOTH missed clocks — resolution and first
  response) + the sealed /me/tickets/overdue/stats rollup (kind split / lateness ladder /
  time owed / tipping point / recovered-today / squad). Opening this tab ALSO runs the
  backend breach-flag sweep — idle tickets that sailed past their deadline surface here.
  Positioning vs the Breached desk: that is the debt LEDGER (flags, overage accounting,
  RCA); this is live RECOVERY OPS — everything here is open, unpaused and still savable.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  ChevronLeft, ChevronRight, AlarmClock, UserX, Flame, MessageSquare, Hourglass,
  PanelRight, Table, Gauge, Users, Activity, BellRing, Orbit, Timer,
} from 'lucide-vue-next'
import SdOverdueHero from '../components/SdOverdueHero.vue'
import SdGravityWell from '../components/SdGravityWell.vue'
import SdTippingPoint from '../components/SdTippingPoint.vue'
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
  listScoped, fetchOverdueStats, fetchCommandCenterStats, fetchMyWorkbench,
  nudgeTicketOwner, bulkNudgeOwners, assignTicket,
  getMe, listMyTeam, loadPickers, usePickers,
  priorityLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'overdue' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-ovd-core)'
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
    { key: 'table', label: 'Recovery board', icon: Table },
    { key: 'horizon', label: 'Horizon', icon: Activity },
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
const activeFilterCount = computed(() => ['priority', 'status', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements ── */
const refine = ref('all')        // hero lens: all|response|resolution|unowned|notesc|critical|longtail
const kindLens = ref('')          // filter-drawer mirror of the missed-clock lenses
const sortBy = ref('lateBy')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})            // /me/tickets/overdue/stats (sweeps server-side first)
const cmdStats = ref({})         // command-center/workbench (insight ticker)
const atRisk = ref([])           // scope=due_soon — the tipping point
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'overdue',
  overdue_kind: 'any',           // the recovery desk watches BOTH clocks
  q: f.q || undefined,
  priority: f.priority || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'resolution_due_at', sort_dir: 'asc',   // deepest first in the window
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
  try { stats.value = await fetchOverdueStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const loadAtRisk = async () => {
  try {
    const r = await listScoped({ agent: agent.value, ...mineParams(), scope: 'due_soon', sort_by: 'resolution_due_at', sort_dir: 'asc', page: 1, limit: 10 })
    atRisk.value = (r.items || []).filter(t => !t.merged_into_id)
  } catch { atRisk.value = [] }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats(); loadAtRisk() }

/* ── lateness telemetry (governing missed clock; everything here runs unpaused) ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const resOver = (t) => { const d = ep(t.resolution_due_at); return !!d && d < now.value }
const respOver = (t) => { const d = ep(t.response_due_at); return !!d && d < now.value && !t.first_responded_at }
const lateMin = (t) => {
  const end = ep(t.sla_paused_since) || now.value
  const due = resOver(t) ? ep(t.resolution_due_at) : (respOver(t) ? ep(t.response_due_at) : 0)
  return due ? Math.max(0, Math.floor((end - due) / 60000)) : 0
}
const lateLabel = (m) => (m < 60 ? `${m}m late` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m late`
  : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h late`)

const PRED = {
  all: t => !isTerminal(t),
  response: t => !isTerminal(t) && respOver(t),
  resolution: t => !isTerminal(t) && resOver(t),
  unowned: t => !isTerminal(t) && !t.assigned_agent_id,
  notesc: t => !isTerminal(t) && !t.is_escalated,
  critical: t => !isTerminal(t) && t.priority === 'critical',
  longtail: t => !isTerminal(t) && lateMin(t) > 3 * 1440,
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value.filter(PRED[refine.value] || PRED.all))

/* Recovery rank: priority weight × log₂(lateness), unowned boosted — feeds the run. */
const PRI_W = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const recoveryScore = (t) => (PRI_W[t.priority] || 1) * Math.log2(lateMin(t) + 2) + (t.assigned_agent_id ? 0 : 3)
const rankOrdered = computed(() => workingSet.value.filter(PRED.all).slice().sort((a, b) => recoveryScore(b) - recoveryScore(a)))

const sortVal = (t, key) => {
  if (key === 'lateBy' || key === 'overdue') return lateMin(t)
  if (key === 'dueAt' || key === 'sla' || key === 'resolution_due_at') return ep(t.resolution_due_at) || Number.MAX_SAFE_INTEGER
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

/* ── lenses ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'all', label: 'In the well', icon: Orbit, color: 'var(--sd-ovd-core)', value: stats.value.total ?? cnt(PRED.all) },
  { key: 'response', label: 'No first reply', icon: MessageSquare, color: 'var(--sd-ovd-dust)', value: stats.value.response_overdue ?? cnt(PRED.response) },
  { key: 'resolution', label: 'Past resolution', icon: AlarmClock, color: 'var(--sd-ovd-hi)', value: stats.value.resolution_overdue ?? cnt(PRED.resolution) },
  { key: 'unowned', label: 'Unowned', icon: UserX, color: 'var(--sd-warning)', value: stats.value.unassigned ?? cnt(PRED.unowned) },
  { key: 'notesc', label: 'Not escalated', icon: ChevronsUp, color: 'var(--sd-esc-core)', value: stats.value.not_escalated ?? cnt(PRED.notesc) },
  { key: 'critical', label: 'Critical', icon: Flame, color: 'var(--sd-pri-critical)', value: stats.value.critical ?? cnt(PRED.critical) },
  { key: 'longtail', label: 'Long tail >3d', icon: Hourglass, color: 'var(--sd-ovd-deep)', value: (stats.value.by_late || {})['>3d'] ?? cnt(PRED.longtail) },
  { key: 'recovered', label: 'Recovered today', icon: CircleCheck, color: 'var(--sd-ovd-escape)', value: stats.value.recovered_today ?? 0, stat: true },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'all' : l.key
  kindLens.value = ['response', 'resolution'].includes(refine.value) ? refine.value : ''
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { response: 'No first reply', resolution: 'Past resolution', unowned: 'Unowned', notesc: 'Not escalated', critical: 'Critical', longtail: 'Long tail >3d' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'all'; kindLens.value = '' } })
  return out
})
const clearRefine = () => { refine.value = 'all'; kindLens.value = '' }

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const statusOptions = computed(() => [{ value: '', label: 'All statuses' },
  ...['open', 'in_progress', 'escalated'].map(s => ({ value: s, label: statusLabel(s) }))])
const kindOptions = computed(() => [{ value: '', label: 'Both clocks' },
  { value: 'response', label: 'First response missed' }, { value: 'resolution', label: 'Resolution missed' }])
const kindSelect = computed({
  get: () => kindLens.value,
  set: (v) => { kindLens.value = v || ''; refine.value = v || 'all'; page.value = 1 },
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
  else { sortBy.value = key; sortDir.value = key === 'lateBy' ? 'desc' : 'asc' }
  page.value = 1
}

/* ── OWNER NUDGE (the signature accountability action) ── */
const isMine = (t) => String(t.assigned_agent_id || '') === String(me.value.id || '')
const nudgeable = (list) => list.filter(t => !isTerminal(t) && t.assigned_agent_id && !isMine(t))
const nudgeToast = ({ ok, skipped, failed }) => {
  if (!ok && !skipped && !failed) { toast.info('Nothing to nudge — late tickets here are unowned or your own.'); return }
  let msg = `Nudged ${ok} owner${ok === 1 ? '' : 's'}`
  if (skipped) msg += ` · ${skipped} already nudged today / not nudgeable`
  if (failed) msg += ` · ${failed} failed`
  ;(ok ? toast.success : toast.info)(msg)
}
const nudgeAllOwners = async () => {
  const targets = nudgeable(lensFiltered.value).slice(0, 30)   // sanity cap per pass
  if (!targets.length) { nudgeToast({ ok: 0, skipped: 0, failed: 0 }); return }
  nudgeToast(await bulkNudgeOwners(targets.map(t => t.id)))
  refreshAll()
}
const nudgeSelected = async () => {
  const targets = nudgeable(workingSet.value.filter(t => selected.value.includes(String(t.id))))
  if (!targets.length) { nudgeToast({ ok: 0, skipped: 0, failed: 0 }); return }
  nudgeToast(await bulkNudgeOwners(targets.map(t => t.id)))
  selected.value = []
  refreshAll()
}

/* ── RECOVERY RUN — ranked guided sweep with its own overlay ── */
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
  if (!q.length) { toast.info('The well is quiet — nothing to run.'); return }
  runQueue.value = q; runIdx.value = 0; runOn.value = true
}
const endRun = () => { runOn.value = false; runQueue.value = []; runIdx.value = 0 }
const runNext = () => {
  if (runIdx.value + 1 >= runQueue.value.length) {
    endRun()
    toast.success('Recovery run complete — every overdue ticket has been reviewed.')
    return
  }
  runIdx.value += 1
}
const runAssignMe = async () => {
  const t = runCurrent.value
  if (!t || !me.value.id) return
  try {
    await assignTicket(t.id, { assigned_agent_id: me.value.id })
    toast.success(`${t.ticket_number} is yours.`)
    t.assigned_agent_id = me.value.id
    t.assigned_agent_name = me.value.full_name || me.value.name || 'You'
    runNext()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Assign failed.') }
}
const runNudge = async () => {
  const t = runCurrent.value
  if (!t) return
  try { await nudgeTicketOwner(t.id); toast.success(`${t.assigned_agent_name || 'The owner'} has been nudged.`); runNext() }
  catch (e) { toast.info(e?.response?.data?.detail || 'Nudge skipped.'); runNext() }
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
  // single-ticket escalate goes through the shared SdEscalateConsole (same as My Tickets / All Tickets)
  if (mode === 'escalate' && objs.length === 1) { escalateTarget.value = objs[0]; return }
  bulkPayloadTickets.value = tickets
  bulkMode.value = mode
  bulkOpen.value = true
}
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; selected.value = []; toast.success('Ticket escalated'); refreshAll() }
const onBulkDone = () => { bulkOpen.value = false; bulkPayloadTickets.value = null; selected.value = []; refreshAll() }

const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* ── drawer + strip + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => { drawerId.value = null }
const stripEl = ref(null)
const scrollToStrip = () => stripEl.value?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'center' })
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
  if (ins?.id === 'ovd-imm') { scrollToStrip(); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}
/* Overdue-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  const unowned = workingSet.value.filter(PRED.unowned)
  if (unowned.length) out.push({ id: 'ovd-unowned', kind: 'breach_risk', severity: 'crit',
    title: `${unowned.length} overdue ticket${unowned.length === 1 ? '' : 's'} with no owner`,
    detail: 'Late and falling with nobody on the stick — assign or escalate them first.', action: 'view', ticket_ids: unowned.map(t => t.id) })
  if ((stats.value.imminent || 0) > 0) out.push({ id: 'ovd-imm', kind: 'breach_risk', severity: 'crit',
    title: `${stats.value.imminent} ticket${stats.value.imminent === 1 ? '' : 's'} within 30 minutes of falling in`,
    detail: 'Still on time — the tipping-point strip has them ordered by margin.', action: 'view', ticket_ids: [] })
  const resp = workingSet.value.filter(PRED.response)
  const reso = workingSet.value.filter(PRED.resolution)
  if (resp.length > reso.length && resp.length > 1) out.push({ id: 'ovd-resp', kind: 'stale', severity: 'warn',
    title: 'First-response misses dominate this desk today',
    detail: `${resp.length} tickets have never been answered — a fast first reply clears half the board.`, action: 'view', ticket_ids: resp.map(t => t.id) })
  const tail = workingSet.value.filter(PRED.longtail)
  if (tail.length) out.push({ id: 'ovd-tail', kind: 'stale', severity: 'warn',
    title: `${tail.length} ticket${tail.length === 1 ? '' : 's'} more than 3 days past target`,
    detail: 'The long tail drags every average — resolve, escalate or legitimately park them.', action: 'view', ticket_ids: tail.map(t => t.id) })
  const notesc = workingSet.value.filter(PRED.notesc)
  if (notesc.length > 2) out.push({ id: 'ovd-notesc', kind: 'breach_risk', severity: 'info',
    title: `${notesc.length} overdue but never escalated`,
    detail: 'If the tier can\'t recover them, raise them — altitude is honesty.', action: 'view', ticket_ids: notesc.map(t => t.id) })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'run', label: runOn.value ? 'End the recovery run' : 'Start recovery run — ranked worst-first', icon: Orbit, run: toggleRun },
  { key: 'nudge-all', label: 'Nudge every late owner (24h throttle)', icon: BellRing, run: nudgeAllOwners },
  { key: 'lens-unowned', label: 'Lens · Unowned overdue', icon: UserX, run: () => (refine.value = 'unowned') },
  { key: 'lens-response', label: 'Lens · No first reply', icon: MessageSquare, run: () => (refine.value = 'response') },
  { key: 'tipping', label: 'Jump to the tipping point', icon: Timer, run: scrollToStrip },
  { key: 'view-horizon', label: 'View · Horizon', icon: Activity, run: () => (view.value = 'horizon') },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  else if (e.key === 'Escape' && runOn.value && !drawerId.value && !resolveTarget.value && !bulkOpen.value) endRun()
}

/* ── HORIZON view geometry (log scale over the missed-clock overage) ── */
const HZ_MAX = Math.log(7 * 1440 + 1)     // 7d pins the track
const HZ_MARKS = [
  { label: '+1h', pos: (Math.log(61) / HZ_MAX) * 100 },
  { label: '+4h', pos: (Math.log(241) / HZ_MAX) * 100 },
  { label: '+24h', pos: (Math.log(1441) / HZ_MAX) * 100 },
  { label: '+3d', pos: (Math.log(4321) / HZ_MAX) * 100 },
]
const hzPct = (t) => Math.min(100, (Math.log(lateMin(t) + 1) / HZ_MAX) * 100)
const hzGrad = (t) => {
  const deep = lateMin(t) > 1440
  return deep
    ? 'linear-gradient(90deg, var(--sd-ovd-dust), var(--sd-ovd-core) 55%, var(--sd-ovd-deep))'
    : 'linear-gradient(90deg, var(--sd-ovd-dust), var(--sd-ovd-core))'
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('overdue').columns || [])
const emptyText = computed(() => refine.value === 'all'
  ? (getTicketScope('overdue').empty || { title: 'Nothing overdue', blurb: 'No open ticket is past its target.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the whole well.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Status', 'Missed clock', 'Late (min)', 'Resolution due', 'Response due', 'First responded', 'Agent', 'Escalated', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), statusLabel(t.status),
    resOver(t) && respOver(t) ? 'both' : resOver(t) ? 'resolution' : 'response',
    lateMin(t), t.resolution_due_at || '', t.response_due_at || '', t.first_responded_at || '',
    t.assigned_agent_name || '', t.is_escalated ? 'yes' : '', t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'overdue-desk.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
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
.ovd { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.ovd-squad { padding: 16px 18px; }
.ovd-insights { align-self: stretch; }

.ovd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.ovd-btn:hover { border-color: var(--sd-ovd-core); }
.ovd-btn:active { transform: translateY(1px); }
.ovd-btn.on { border-color: var(--sd-ovd-core); color: var(--sd-ovd-core); background: var(--sd-ovd-soft); }
.ovd-btn.accent { border-color: color-mix(in srgb, var(--sd-ovd-escape) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, var(--sd-ovd-escape)); }
[data-theme="light"] .ovd-btn.accent { color: #064e3b; }
.ovd-btn.rose { border-color: color-mix(in srgb, var(--sd-ovd-core) 50%, transparent); color: var(--sd-ovd-core); background: var(--sd-ovd-soft); }
.ovd-btn.sm { padding: 7px 12px; font-size: 12px; }
.ovd-btn.icon { padding: 7px 9px; }
.ovd-btn.ghost { background: transparent; }
.ovd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ovd-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-ovd-core); color: #fff; font-size: 10px; font-weight: 800; }

.ovd-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.ovd-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ovd-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.ovd-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.ovd-view:hover { color: var(--sd-text); }
.ovd-view.on { color: var(--sd-ovd-core); background: var(--sd-ovd-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-ovd-core) 40%, transparent); }
.ovd-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.ovd-count { font-size: 12px; color: var(--sd-text-dim); }

.ovd-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-ovd-core) 44%, transparent); background: var(--sd-ovd-soft); color: var(--sd-ovd-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.ovd-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.ovd-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-ovd-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-ovd-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.ovd-stage { min-height: 40px; }
.ovd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

/* ── HORIZON view — how far past the line ── */
.ovd-horizon { padding: 18px 18px 14px; }
.hz-scale { position: relative; height: 18px; margin: 0 0 8px 372px; }
.hz-zero { position: absolute; left: 0; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-ovd-hi); }
.hz-mark { position: absolute; transform: translateX(-50%); font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.hz-rows { display: flex; flex-direction: column; }
.hz-row { display: grid; grid-template-columns: 92px 260px minmax(0, 1fr) 110px; gap: 10px; align-items: center;
  width: 100%; text-align: left; padding: 8px 6px; border: none; border-radius: 10px; cursor: pointer;
  background: transparent; font-family: inherit; color: var(--sd-text); transition: background 0.18s; }
.hz-row + .hz-row { border-top: 1px solid var(--sd-border); }
.hz-row:hover { background: var(--sd-ovd-soft); }
.hz-no { font-size: 10.5px; font-weight: 800; color: var(--sd-ovd-hi); }
.hz-subj { font-size: 12.5px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hz-track { position: relative; height: 22px; border-radius: 7px; background: var(--sd-surface-glass); overflow: hidden;
  border: 1px solid var(--sd-border); }
.hz-grid { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--sd-border-strong); opacity: 0.6; }
.hz-bar { position: absolute; inset: 3px auto 3px 0; border-radius: 5px; min-width: 6px;
  transition: width 1s linear; box-shadow: 0 0 14px -4px var(--sd-ovd-core); }
.hz-tip { position: absolute; top: 50%; transform: translate(10px, -50%); font-size: 9px; font-weight: 800;
  letter-spacing: 0.06em; color: var(--sd-text); white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.35); }
/* past 62% the outside label would ride over / clip at the track edge — flip it inside the bar tip */
.hz-tip.in { transform: translate(calc(-100% - 10px), -50%); color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.55); }
[data-theme="light"] .hz-tip { text-shadow: none; }
[data-theme="light"] .hz-tip.in { color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.45); }
.hz-who { font-size: 10px; font-weight: 700; color: var(--sd-text-muted); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hz-who.none { color: var(--sd-warning); }
.hz-empty { padding: 36px 0; text-align: center; font-size: 10.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }

/* ── RECOVERY RUN overlay ── */
.rr-veil { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center;
  padding: 18px; background: color-mix(in srgb, var(--sd-ovd-deep-bg) 55%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.rr-card { position: relative; width: min(620px, 100%); border-radius: 20px; padding: 18px 20px 14px;
  border: 1px solid var(--sd-ovd-brd); background: color-mix(in srgb, var(--sd-ovd-deep-bg) 88%, #000);
  color: #f5eee9; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7), var(--sd-ovd-glow); }
.rr-head { display: flex; justify-content: space-between; align-items: center; padding-right: 36px; /* clear the absolute .rr-close */ }
.rr-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-ovd-escape); }
.rr-count { font-size: 11px; font-weight: 800; color: rgba(245, 238, 233, 0.5); }
.rr-no { margin-top: 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-ovd-hi); }
.rr-no em { font-style: normal; color: rgba(245, 238, 233, 0.6); }
.rr-subj { margin: 5px 0 8px; font-size: 18px; font-weight: 750; line-height: 1.3; color: #f7f0ea; }
.rr-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; font-weight: 700; }
.rr-late { color: var(--sd-ovd-hi); }
.rr-owner { color: rgba(245, 238, 233, 0.65); }
.rr-owner.none { color: var(--sd-ovd-risk); }
.rr-status { color: rgba(245, 238, 233, 0.45); }
.rr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.rr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(245, 238, 233, 0.2); background: rgba(245, 238, 233, 0.06); color: #f5eee9;
  transition: transform 0.14s, border-color 0.2s; }
.rr-btn:hover { transform: translateY(-1px); border-color: var(--sd-ovd-hi); }
.rr-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-ovd-escape)); }
.rr-btn.rose { border-color: color-mix(in srgb, var(--sd-ovd-core) 60%, transparent); color: var(--sd-ovd-hi); background: rgba(225, 29, 72, 0.12); }
.rr-btn.ghost { background: transparent; }
.rr-dots { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 14px; }
.rr-dots i { width: 8px; height: 4px; border-radius: 3px; background: rgba(245, 238, 233, 0.16); }
.rr-dots i.done { background: var(--sd-ovd-escape); }
.rr-dots i.on { background: var(--sd-ovd-hi); width: 16px; }
.rr-close { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: 9px; border: 1px solid rgba(245, 238, 233, 0.16); background: transparent; color: rgba(245, 238, 233, 0.6); cursor: pointer; }
.rr-close:hover { color: #fff; border-color: var(--sd-ovd-hi); }

.ovd-flt-enter-active, .ovd-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.ovd-flt-enter-from, .ovd-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 940px) {
  .hz-row { grid-template-columns: 80px minmax(0, 1fr); }
  .hz-track { grid-column: 1 / -1; }
  .hz-who { display: none; }
  .hz-scale { margin-left: 0; }
}
@media (max-width: 720px) { .ovd-tools { margin-left: 0; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .hz-bar { transition: none; }
}
</style>
