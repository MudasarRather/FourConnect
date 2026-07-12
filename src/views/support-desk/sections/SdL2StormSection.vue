<template>
  <div class="sd-l2" :style="{ '--tc': 'var(--sd-l2-core)' }">
    <!-- ═══ HERO — the chart room ═══ -->
    <SdStormHero :lenses="lenses" :active-lens="lens" :stats="stats" :queues="queues" :now="now"
      :playing="playing" :loading="loading" :reduced="reduced" :pulse="pulse"
      @pick="onLens" @serve="startPlay" @unowned="onLens({ key: 'unowned' })" @refresh="refresh"
      @status="onStatus" @stewards="stewardsOpen = true" @acks="showAcks" />

    <!-- ═══ FORECASTER'S DESK — now serving ═══ -->
    <header class="l2q-sect">
      <h3>Now serving</h3>
      <span class="sd-mono">FORECASTER'S DESK · SERVED IN ORDER</span>
    </header>
    <div v-if="!served" class="l2q-idle">
      <CloudSun :size="15" />
      <p>The desk is idle. <button class="l2q-idle-go" @click="startPlay">Start the watch</button>
        to pull the next case in serve order — priority first, oldest breach forward. <kbd>S</kbd></p>
    </div>
    <SdStormConsole :ticket="served" :remaining="servedRemaining" :serving="serving" :now="now"
      :stint="stint" :skills="servedSkills" :lane="servedLane" :watching="servedWatching"
      :swarm-active="!!servedSwarm?.active" :swarm-joined="!!servedSwarm?.joined"
      :logged-minutes="servedLogged" :reduced="reduced"
      @open="openTicket(served)" @skip="skipTarget = served" @escalate="diagnosisTarget = served"
      @sendback="moveTarget = served; moveMode = 'descend'" @next="serveOne" @stop="stopPlay"
      @resolve="resolveAndNext(served)" @crew="onCrew" @worklog="worklogTarget = served"
      @watch="toggleWatch(served)" @swarm="onSwarm" @ack="onAck(served)" />

    <!-- live swarm strip for the served ticket -->
    <SdSwarmBar :swarm="servedSwarm" :ticket-number="served?.ticket_number || ''" :now="now"
      @join="onSwarmJoin" @end="onSwarmEnd" @open="openTicket(served)" />

    <!-- ═══ CONTROL DECK ═══ -->
    <header class="l2q-sect">
      <h3>Control deck</h3>
      <span class="sd-mono">LANES · SEARCH · VIEW</span>
    </header>
    <div class="l2q-deck">
      <div class="l2q-lanes" role="tablist" aria-label="Lanes at this tier">
        <button class="l2q-lane" :class="{ on: !queueFilter }" role="tab" :aria-selected="!queueFilter" @click="setQueue('')">
          <span class="l2q-lane-row">All lanes <b class="sd-mono">{{ totalOpenLanes }}</b></span>
          <i class="l2q-lane-bar" :style="{ width: '100%' }" />
        </button>
        <button v-for="qz in queues" :key="qz.id" class="l2q-lane" :class="{ on: queueFilter === qz.id }"
          :style="{ '--lc': qz.color || 'var(--sd-l2-core)' }" role="tab" :aria-selected="queueFilter === qz.id"
          :title="laneTitle(qz)" @click="setQueue(qz.id)">
          <span class="l2q-lane-row">
            {{ qz.name }} <b class="sd-mono">{{ qz.open }}</b>
            <span v-if="qz.skill_match === false" class="l2q-lane-gap sd-mono"
              title="Skill mismatch — this lane needs skills you don't hold yet"><Wrench :size="9" /> SKILL GAP</span>
            <span v-if="(qz.max_agent_load || 0) > 0" class="l2q-wip" :class="{ full: (qz.my_active || 0) >= qz.max_agent_load }"
              :title="`WIP — you hold ${qz.my_active || 0}/${qz.max_agent_load} in this lane`" aria-hidden="true">
              <i v-for="s in qz.max_agent_load" :key="s" :class="{ lit: s <= (qz.my_active || 0) }" />
            </span>
          </span>
          <i class="l2q-lane-bar" :style="{ width: lanePct(qz) }" />
        </button>
        <span class="l2q-livewire sd-mono" :class="{ stale: fetchErr || updatedAgo > 90 }"
          :title="fetchErr ? `Last refresh failed — showing data from ${updatedAgo}s ago` : 'This board is live — auto-refreshes while you watch'">
          <i class="l2q-live-dot" /> {{ fetchErr ? 'OFFLINE' : 'LIVE' }} · {{ updatedAgo }}s
        </span>
      </div>

      <div class="l2q-controls">
        <div class="l2q-search">
          <Search :size="13" />
          <input v-model.trim="q" placeholder="Search tickets, tags, requester…" @keyup.enter="fetchBoard()" />
          <button v-if="q" class="l2q-search-x" aria-label="Clear search" @click="q = ''; fetchBoard()"><X :size="12" /></button>
        </div>
        <SdSelect v-model="statusFilter" :options="statusOpts" placeholder="Any status" class="l2q-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="priorityFilter" :options="priorityOpts" placeholder="Any priority" class="l2q-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="sortBy" :options="SORTS" class="l2q-sel" @update:model-value="fetchBoard()" />
        <div class="l2q-views" role="tablist" aria-label="Board layout">
          <button class="l2q-vw sd-mono" :class="{ on: view === 'reports' }" role="tab" :aria-selected="view === 'reports'" title="Station reports — cards" @click="view = 'reports'">BOARD</button>
          <button class="l2q-vw sd-mono" :class="{ on: view === 'list' }" role="tab" :aria-selected="view === 'list'" title="Log sheet — table" @click="view = 'list'">LIST</button>
          <button class="l2q-vw sd-mono" :class="{ on: view === 'kanban' }" role="tab" :aria-selected="view === 'kanban'" title="Weather board — status lanes left to right" @click="switchKanban">TIMELINE</button>
        </div>
        <span class="l2q-kbd sd-mono" title="J/K move · ↵ open · A assign · S serve/skip · R refresh/resolve · E escalate · W watch · L log time · G swarm · U unowned · / search · Esc stop">
          <kbd>J</kbd><kbd>K</kbd> move · <kbd>↵</kbd> open · <kbd>W</kbd> watch · <kbd>L</kbd> log
        </span>
      </div>
    </div>

    <!-- ═══ BULK BAR ═══ -->
    <Presence>
      <Motion v-if="selected.length" as="div" class="l2q-bulk" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: 8 }" :transition="{ duration: 0.25 }">
        <span class="l2q-bulk-n sd-mono">{{ selected.length }} SELECTED</span>
        <button class="l2q-bulk-b" @click="bulk('assign')"><UserPlus :size="13" /> Assign</button>
        <button class="l2q-bulk-b" @click="bulk('status')"><Activity :size="13" /> Status</button>
        <button class="l2q-bulk-b" @click="bulk('priority')"><Flag :size="13" /> Priority</button>
        <button class="l2q-bulk-b" @click="bulk('resolve')"><CheckCheck :size="13" /> Resolve</button>
        <button v-if="selected.length === 1" class="l2q-bulk-b up" @click="singleEscalate"><ArrowUpRight :size="13" /> Escalate L3</button>
        <button v-if="selected.length === 1" class="l2q-bulk-b down" @click="singleMove('descend')"><ArrowDownLeft :size="13" /> Send back</button>
        <button class="l2q-bulk-x" @click="selected = []"><X :size="13" /> Clear</button>
      </Motion>
    </Presence>

    <!-- ═══ STATION REPORTS (cards — default) ═══ -->
    <header class="l2q-sect">
      <h3>{{ view === 'list' ? 'Queue — log sheet' : view === 'kanban' ? 'Queue — weather timeline' : 'Queue — station reports' }}</h3>
      <span class="sd-mono">{{ rows.length }} OF {{ total }} · SERVED IN ORDER</span>
    </header>
    <SdStormCaseCards v-if="view === 'reports'" :rows="rows" :selected="selected" :queues="queues" :now="now"
      :loading="loading" :empty="emptyCopy" :empty-icon="Inbox" :cursor="cursor"
      @open="openTicket" @toggle="toggleRow" />

    <!-- ═══ LOG SHEET (list) ═══ -->
    <SdTicketTable v-else-if="view === 'list'" :rows="rows" :columns="COLS" :loading="loading" :now="now"
      selectable :selected="selected" accent="var(--sd-l2-core)"
      :empty="emptyCopy" :empty-icon="Inbox"
      @open="openTicketById" @toggle="toggleRow" @toggle-all="toggleAll" />

    <!-- ═══ WEATHER BOARD (kanban) ═══ -->
    <div v-else class="l2q-kanban">
      <div v-for="col in kanbanCols" :key="col.key" class="l2q-col" :style="{ '--cc': col.color }">
        <header class="l2q-col-h">
          <span class="l2q-col-dot" /><h4>{{ col.label }}</h4><b class="sd-mono">{{ col.rows.length }}</b>
        </header>
        <TransitionGroup name="l2q-card" tag="div" class="l2q-col-body">
          <button v-for="(t, i) in col.rows" :key="t.id" class="l2q-kcard" :style="{ '--i': i }" @click="openTicket(t)">
            <span class="l2q-kcard-top sd-mono">
              <b>{{ t.ticket_number }}</b>
              <SdPill kind="priority" :value="t.priority" />
            </span>
            <span class="l2q-kcard-subj">{{ t.subject }}</span>
            <span class="l2q-kcard-meta sd-mono">
              <span>{{ t.assigned_agent_name || 'UNOWNED' }}</span>
              <span v-if="t.is_escalated" class="esc">L{{ t.escalation_level }}</span>
              <span :class="slaTone(t)">{{ slaShort(t) }}</span>
            </span>
          </button>
          <p v-if="!col.rows.length && !loading" :key="'e-' + col.key" class="l2q-col-empty">Clear sky</p>
        </TransitionGroup>
      </div>
    </div>

    <!-- pager -->
    <div v-if="view !== 'kanban' && total > limit" class="l2q-pager sd-mono">
      <button class="l2q-pg" :disabled="page <= 1" @click="page--; fetchBoard()"><ChevronLeft :size="14" /></button>
      <span>{{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }} · {{ total }} tickets</span>
      <button class="l2q-pg" :disabled="page * limit >= total" @click="page++; fetchBoard()"><ChevronRight :size="14" /></button>
    </div>

    <!-- ═══ THE BUREAU WALL ═══ -->
    <SdStormInsightRail v-if="!stats.no_queues" :stats="stats" :queues="queues" :roster="roster"
      :advisory="advisory" :updated-ago="updatedAgo" :now="now"
      @acks="showAcks" @worklog="onWallWorklog" />

    <!-- ═══ consoles ═══ -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="caps" :me="me" @close="onDrawerClose" @changed="onChanged" />
    <SdSkipModal :ticket="skipTarget" @close="skipTarget = null" @done="onSkipped" />
    <SdTierMoveModal :ticket="moveTarget" :mode="moveMode" :from-tier="2"
      @close="moveTarget = null" @done="onMoved" />
    <SdDiagnosisModal :ticket="diagnosisTarget" @close="diagnosisTarget = null" @done="onEscalated" />
    <SdWorklogModal :ticket="worklogTarget" :me="me" @close="worklogTarget = null" @done="onLogged" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdStewardsModal :open="stewardsOpen" @close="stewardsOpen = false" />
  </div>
</template>

<script setup>
/* SdL2StormSection — THE STORM BUREAU: the bespoke L2 specialist desk. Same sealed
   data contract as the shared tier section (tierBoard(2) / serveNext(2) / skip /
   tier-move / stewards) plus the L2 workbench: worklogs, watchers, swarm, the
   escalation-ACK clock and the L3 diagnosis dossier. L1/L3 keep the pit wall —
   this desk deliberately speaks a different (meteorological) visual language. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Inbox, Search, X, UserPlus, Activity, Flag, CheckCheck,
  ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, Wrench, CloudSun,
  HandHelping, AlarmClockOff, Timer, Flame, User, Eye,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdStormHero from '../components/SdStormHero.vue'
import SdStormConsole from '../components/SdStormConsole.vue'
import SdStormCaseCards from '../components/SdStormCaseCards.vue'
import SdStormInsightRail from '../components/SdStormInsightRail.vue'
import SdSwarmBar from '../components/SdSwarmBar.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdSkipModal from '../modals/SdSkipModal.vue'
import SdTierMoveModal from '../modals/SdTierMoveModal.vue'
import SdDiagnosisModal from '../modals/SdDiagnosisModal.vue'
import SdWorklogModal from '../modals/SdWorklogModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdStewardsModal from '../modals/SdStewardsModal.vue'
import {
  tierBoard, serveNext, getMe, listMyTeam, fetchCapabilities, useCapabilities,
  setMyStatus, agentStatusRoster, changeTicketStatus, assignTicket, AGENT_STATUS_META,
  PRIORITIES, TICKET_STATUSES,
  watchTicket, unwatchTicket, listWatchers, getSwarm, swarmStart, swarmJoin, swarmEnd,
  ackEscalation,
} from '@/composables/useSupportDesk'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  tier: { type: Number, default: 2 },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
defineEmits(['go'])

const route = useRoute()
const toast = useToast()
const { cinematic } = useCinematic()
const reduced = computed(() => !cinematic.value
  && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

const TIER = 2
const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'agent', 'sla', 'updated']

/* ── board state (same contract as the shared tier section) ── */
const rows = ref([])
const total = ref(0)
const queues = ref([])
const stats = ref({})
const loading = ref(false)
const page = ref(1)
const limit = ref(25)
const q = ref('')
const queueFilter = ref('')
const statusFilter = ref('')
const priorityFilter = ref('')
const sortBy = ref('serve')
const view = ref('reports')
const lens = ref('all')
const now = ref(Date.now())
const pulse = ref(0) // gusts the synoptic chart on serve/refresh
let tick = null

const SORTS = [
  { value: 'serve', label: 'Serve order' },
  { value: 'sla', label: 'Closest to breach' },
  { value: 'priority', label: 'Priority' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'updated_at', label: 'Recently touched' },
]
const statusOpts = computed(() => [{ value: '', label: 'Any status' }, ...TICKET_STATUSES])
const priorityOpts = computed(() => [{ value: '', label: 'Any priority' }, ...PRIORITIES])
const totalOpenLanes = computed(() => queues.value.reduce((a, x) => a + (x.open || 0), 0))

const boardParams = () => {
  const p = { page: page.value, limit: limit.value, sort_by: sortBy.value }
  if (q.value) p.q = q.value
  if (queueFilter.value) p.queue_id = queueFilter.value
  if (statusFilter.value) p.status = statusFilter.value
  if (priorityFilter.value) p.priority = priorityFilter.value
  if (lens.value === 'unowned') p.unassigned_only = true
  if (lens.value === 'mine') p.mine = true
  if (lens.value === 'escalated') p.escalated_only = true
  return p
}
const lastFetched = ref(Date.now())
const fetchErr = ref(false)
const fetchBoard = async () => {
  loading.value = true
  try {
    const r = await tierBoard(TIER, boardParams())
    rows.value = r.items || []
    total.value = r.total || 0
    queues.value = r.queues || []
    stats.value = r.stats || {}
    lastFetched.value = Date.now()
    fetchErr.value = false
  } catch {
    // Keep the last good rows, but say so — a failed refresh must not keep
    // wearing the LIVE badge while the board quietly goes stale.
    fetchErr.value = true
  } finally { loading.value = false }
}
const refresh = () => { page.value = 1; pulse.value++; fetchBoard() }
const setQueue = (id) => { queueFilter.value = id; page.value = 1; fetchBoard() }
const updatedAgo = computed(() => Math.max(0, Math.round((now.value - lastFetched.value) / 1000)))
const laneTitle = (qz) => {
  const bits = [`${qz.name} — serve: ${qz.serve_order}, drain ${qz.queue_priority}`]
  if ((qz.max_agent_load || 0) > 0) bits.push(`WIP ${qz.my_active || 0}/${qz.max_agent_load}`)
  if (qz.skill_match === false) bits.push('skill mismatch')
  return bits.join(' · ')
}
/* lane load bar — this lane's share of the tier's open work */
const lanePct = (qz) => `${Math.round(((qz.open || 0) / Math.max(1, totalOpenLanes.value)) * 100)}%`

/* ── availability ── */
const onStatus = async (key) => {
  try {
    await setMyStatus({ status: key })
    stats.value = { ...stats.value, my_status: key }
    toast.success(`Status: ${AGENT_STATUS_META[key]?.label || key}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update status') }
}

/* ── roster advisory ── */
const roster = ref([])
const advisory = computed(() => {
  const online = roster.value.filter(a => ['online', 'focus'].includes(a.status || 'online'))
  if (online.length < 2) return null
  const sorted = [...online].sort((a, b) => (b.open_count || 0) - (a.open_count || 0))
  const hi = sorted[0], lo = sorted[sorted.length - 1]
  if ((hi.open_count || 0) < 5 || (hi.open_count || 0) - (lo.open_count || 0) < 4) return null
  const first = (n) => (n || 'Agent').split(' ')[0]
  return { short: `REBALANCE · ${first(hi.name)} ${hi.open_count} / ${first(lo.name)} ${lo.open_count}` }
})
const switchKanban = () => { view.value = 'kanban'; if (limit.value < 100) { limit.value = 100; page.value = 1; fetchBoard() } }
watch(view, (v) => { if (v !== 'kanban' && limit.value !== 25) { limit.value = 25; page.value = 1; fetchBoard() } })

/* ── lenses ── */
const lenses = computed(() => ([
  { key: 'all', label: 'All work', icon: Inbox, color: 'var(--sd-l2-core)', value: total.value },
  { key: 'mine', label: 'My load', icon: User, color: 'var(--sd-l2-go)', value: stats.value.my_load ?? 0 },
  { key: 'unowned', label: 'Unowned', icon: HandHelping, color: 'var(--sd-l2-warn)', value: stats.value.unassigned ?? 0 },
  { key: 'breached', label: 'Breached', icon: AlarmClockOff, color: 'var(--sd-l2-halt)', value: stats.value.breached ?? 0 },
  { key: 'duesoon', label: 'Due ≤ 4h', icon: Timer, color: 'var(--sd-l2-front)', value: stats.value.due_soon ?? 0, stat: true },
  { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-l2-halt)', value: stats.value.escalated ?? 0 },
  { key: 'watching', label: 'Watching', icon: Eye, color: 'var(--sd-l2-ink)', value: stats.value.watching ?? 0, stat: true },
]))
const onLens = (l) => {
  if (l.stat) return
  lens.value = l.key === lens.value ? 'all' : l.key
  page.value = 1
  fetchBoard()
}
const showAcks = () => { lens.value = 'escalated'; page.value = 1; fetchBoard() }

/* ── kanban (weather board) ── */
const KANBAN = [
  { key: 'open', label: 'Incoming', color: 'var(--sd-st-open)', match: (t) => t.status === 'open' },
  { key: 'in_progress', label: 'On the desk', color: 'var(--sd-st-progress)', match: (t) => t.status === 'in_progress' },
  { key: 'paused', label: 'Holding pattern', color: 'var(--sd-st-hold)', match: (t) => ['pending_customer', 'pending_vendor', 'on_hold'].includes(t.status) },
  { key: 'escalated', label: 'Storm cell', color: 'var(--sd-st-escalated)', match: (t) => t.status === 'escalated' },
  { key: 'resolved', label: 'Cleared', color: 'var(--sd-st-resolved)', match: (t) => ['resolved', 'closed'].includes(t.status) },
]
const kanbanCols = computed(() => KANBAN.map(c => ({ ...c, rows: rows.value.filter(c.match) })))

/* ── selection + bulk ── */
const selected = ref([])
const toggleRow = (id) => {
  const i = selected.value.indexOf(id)
  if (i >= 0) selected.value.splice(i, 1); else selected.value.push(id)
}
const toggleAll = () => {
  selected.value = selected.value.length === rows.value.length ? [] : rows.value.map(t => t.id)
}
const bulkOpen = ref(false)
const bulkMode = ref('assign')
const bulkTicketObjs = computed(() => rows.value.filter(t => selected.value.includes(t.id)))
const bulk = (mode) => { bulkMode.value = mode; bulkOpen.value = true }
const onBulkDone = () => { bulkOpen.value = false; selected.value = []; fetchBoard() }
/* Owner-tier pre-gate for row-level tier moves — mirrors the backend
   _require_ticket_actor (assignee ∪ collaborator ∪ team lead ∪ admin;
   unassigned = claim-eligible triage). The drawer already gates its dock this
   way; the bulk bar's single-move was the one path that skipped it. */
const canCommandRow = (t) => {
  if (!t) return false
  if (caps.isAdmin) return true
  const my = String(me.value?.id || '')
  if (!t.assigned_agent_id || String(t.assigned_agent_id) === my) return true
  if ((t.collaborators || []).map(String).includes(my)) return true
  return (caps.leadTeamIds || []).map(String).includes(String(t.team_id))
}
const rowMoveBlocked = (t) => {
  if (!t) return true
  if (['resolved', 'closed', 'archived'].includes(t.status) || t.merged_into_id) {
    toast.info(`${t.ticket_number} is ${t.status} — reopen it before a tier move.`)
    return true
  }
  if (!canCommandRow(t)) {
    toast.info(`${t.ticket_number} is owned by ${t.assigned_agent_name || 'another agent'} — only the owner, a collaborator, or the team lead can move it.`)
    return true
  }
  return false
}
const singleMove = (mode) => {
  const t = bulkTicketObjs.value[0]
  if (!t || rowMoveBlocked(t)) return
  moveMode.value = mode; moveTarget.value = t
}
const singleEscalate = () => {
  const t = bulkTicketObjs.value[0]
  if (!t || rowMoveBlocked(t)) return
  diagnosisTarget.value = t
}

/* ── play mode ── */
const playing = ref(false)
const serving = ref(false)
const served = ref(null)
const servedRemaining = ref(0)
const servedCount = ref(0)
const stint = computed(() => ({
  served: servedCount.value,
  resolved: stats.value.my_resolved_today ?? 0,
  skips: stats.value.skips_today ?? 0,
}))
const servedSkills = computed(() => {
  if (!served.value) return []
  const qz = queues.value.find(x => String(x.id) === String(served.value.queue_id))
  return qz?.skills || []
})
const servedLane = computed(() => {
  if (!served.value) return ''
  return queues.value.find(x => String(x.id) === String(served.value.queue_id))?.name || ''
})

/* ── L2 workbench state for the served ticket ── */
const servedWatching = ref(false)
const servedSwarm = ref(null)
const servedLogged = ref(0)
const hydrateWorkbench = async (t) => {
  servedWatching.value = false
  servedSwarm.value = null
  servedLogged.value = t?.time_spent_minutes || 0
  if (!t) return
  try { const w = await listWatchers(t.id); servedWatching.value = !!w.watching } catch { /* non-fatal */ }
  try { servedSwarm.value = await getSwarm(t.id) } catch { servedSwarm.value = null }
}

const serveOne = async () => {
  serving.value = true
  try {
    const r = await serveNext(TIER, queueFilter.value || undefined)
    if (r.ticket) {
      served.value = r.ticket
      servedRemaining.value = r.remaining || 0
      servedCount.value += 1
      pulse.value++
      hydrateWorkbench(r.ticket)
      fetchBoard()
    } else {
      served.value = null
      playing.value = false
      toast.info(r.reason === 'all_viewed'
        ? 'Everything left is being viewed by teammates right now.'
        : r.reason === 'no_queues' ? 'No lanes at this tier yet.'
          : r.reason === 'at_capacity' ? 'WIP cap reached — you\'re at capacity on every remaining lane.'
            : 'Queue drained — clear skies.')
    }
  } catch (e) {
    playing.value = false
    toast.error(e?.response?.data?.detail || 'Serve failed')
  } finally { serving.value = false }
}
/* Entry guard — mirrors the backend serve-next gates (away/offline 409, all-lanes-
   at-cap 'at_capacity') so every entry path (hero button, S key) explains BEFORE
   firing instead of surfacing a rejected request. */
const serveBlocked = () => {
  if (['away', 'offline'].includes(stats.value?.my_status || 'online')) {
    toast.info('You are set Away — flip your status to Available to take work.')
    return true
  }
  const lanes = queueFilter.value
    ? queues.value.filter(q => String(q.id) === String(queueFilter.value))
    : queues.value
  if (lanes.length && lanes.every(q => q.max_agent_load && (q.my_active || 0) >= q.max_agent_load)) {
    toast.info('WIP cap reached — you\'re at capacity on every lane here. Resolve or hand off something first.')
    return true
  }
  return false
}
const startPlay = () => { if (serveBlocked()) return; playing.value = true; serveOne() }
const stopPlay = () => { playing.value = false; served.value = null; servedSwarm.value = null }
const onSkipped = () => {
  skipTarget.value = null
  if (playing.value) serveOne(); else fetchBoard()
}
const onMoved = () => {
  const wasServed = playing.value && served.value && moveTarget.value
    && String(served.value.id) === String(moveTarget.value.id)
  moveTarget.value = null
  if (wasServed) { served.value = null; drawerId.value = null; serveOne() }
  else fetchBoard()
}
const onEscalated = () => {
  const wasServed = playing.value && served.value && diagnosisTarget.value
    && String(served.value.id) === String(diagnosisTarget.value.id)
  diagnosisTarget.value = null
  if (wasServed) { served.value = null; drawerId.value = null; serveOne() }
  else fetchBoard()
}

/* ── console verbs ── */
const resolveAndNext = async (t) => {
  if (!t) return
  try {
    await changeTicketStatus(t.id, { status: 'resolved' })
    toast.success(`${t.ticket_number} resolved — front passed.`)
    served.value = null
    drawerId.value = null
    if (playing.value) serveOne(); else fetchBoard()
  } catch (e) {
    toast.info(e?.response?.data?.detail || 'Resolution needs details — opening the console.')
    drawerId.value = String(t.id)
  }
}
const onCrew = async (kind) => {
  const t = served.value
  if (!t) { toast.info('Nothing on the desk — press Start the watch first.'); return }
  if (kind === 'reply') { drawerId.value = String(t.id); return }
  if (kind === 'pending') {
    try {
      await changeTicketStatus(t.id, { status: 'pending_customer' })
      toast.success('Clock stopped — waiting on the requester.')
      served.value = null
      if (playing.value) serveOne(); else fetchBoard()
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not move to pending — opening the console.')
      drawerId.value = String(t.id)
    }
  }
}

/* ── L2 workbench actions ── */
const toggleWatch = async (t) => {
  if (!t) return
  try {
    if (servedWatching.value) {
      const r = await unwatchTicket(t.id)
      servedWatching.value = !!r.watching
      toast.info(`No longer watching ${t.ticket_number}`)
    } else {
      const r = await watchTicket(t.id)
      servedWatching.value = !!r.watching
      toast.success(`Watching ${t.ticket_number} — you'll hear about status moves.`)
    }
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Watch failed') }
}
const onSwarm = async () => {
  const t = served.value
  if (!t) return
  try {
    if (!servedSwarm.value?.active) {
      servedSwarm.value = await swarmStart(t.id, {})
      toast.success(`Swarm called on ${t.ticket_number} — colleagues can join from the board.`)
    } else if (!servedSwarm.value.joined) {
      servedSwarm.value = await swarmJoin(t.id)
      toast.success('You joined the swarm.')
    } else {
      toast.info('You\'re already in this swarm — end it from the swarm strip when done.')
    }
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Swarm action failed') }
}
const onSwarmJoin = async () => {
  const t = served.value
  if (!t) return
  try { servedSwarm.value = await swarmJoin(t.id); fetchBoard() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not join') }
}
const onSwarmEnd = async () => {
  const t = served.value
  if (!t) return
  try {
    servedSwarm.value = await swarmEnd(t.id, {})
    toast.success('Swarm ended — outcome can be added as an internal note in the console.')
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not end the swarm') }
}
const onAck = async (t) => {
  if (!t) return
  try {
    await ackEscalation(t.id, {})
    toast.success(`Escalation on ${t.ticket_number} acknowledged.`)
    served.value = { ...served.value, escalation_acknowledged_at: new Date().toISOString() }
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') }
}
const onLogged = (totalMins) => {
  servedLogged.value = totalMins || servedLogged.value
  fetchBoard()
}
const onWallWorklog = () => {
  if (served.value) worklogTarget.value = served.value
  else toast.info('Serve a ticket first — time is logged against a ticket.')
}

/* ── drawer + modals ── */
const drawerId = ref(null)
const skipTarget = ref(null)
const moveTarget = ref(null)
const moveMode = ref('descend')
const diagnosisTarget = ref(null)
const worklogTarget = ref(null)
const stewardsOpen = ref(false)
const openTicket = (t) => { if (t) drawerId.value = String(t.id) }
const openTicketById = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  if (playing.value && served.value) serveOne()
}
const onChanged = () => fetchBoard()

/* ── identity ── */
const me = ref({})
const assignees = ref([])
const caps = useCapabilities()

const emptyCopy = computed(() => (stats.value.no_queues
  ? { title: 'No lanes at this tier', blurb: 'An admin can lay one in Queue Config — until then this bureau has no chart to draw.' }
  : { title: 'Chart clear', blurb: 'No tickets match the current lens — quiet skies over the specialist desk.' }))

/* ── kanban SLA chips ── */
const slaShort = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'BREACHED' : st === 'due-soon' ? 'DUE SOON' : st === 'met' ? 'MET' : ''
}
const slaTone = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'bad' : st === 'due-soon' ? 'warn' : 'ok'
}

/* ── keyboard triage ── */
const cursor = ref(-1)
watch(rows, () => { if (cursor.value >= rows.value.length) cursor.value = rows.value.length - 1 })
const assignCursorToMe = async () => {
  const t = rows.value[cursor.value]
  if (!t || !me.value?.id) return
  if (t.assigned_agent_id) { toast.info(`${t.ticket_number} already has an owner.`); return }
  try {
    await assignTicket(t.id, { assigned_agent_id: me.value.id })
    toast.success(`${t.ticket_number} — assigned to you.`)
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign') }
}
const modalOpen = () => !!(drawerId.value || skipTarget.value || moveTarget.value || bulkOpen.value
  || stewardsOpen.value || diagnosisTarget.value || worklogTarget.value)
const onKeys = (e) => {
  const el = document.activeElement
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  if (typing || e.metaKey || e.ctrlKey || e.altKey || modalOpen()) return
  const inBox = playing.value && !!served.value
  const k = e.key
  if (k === '/') {
    e.preventDefault()
    document.querySelector('.l2q-search input')?.focus()
  } else if (k === 'j' || k === 'J') {
    if (rows.value.length) cursor.value = Math.min(cursor.value + 1, rows.value.length - 1)
  } else if (k === 'k' || k === 'K') {
    if (rows.value.length) cursor.value = Math.max(cursor.value - 1, 0)
  } else if (k === 'Enter') {
    const t = rows.value[cursor.value]
    if (t) { e.preventDefault(); openTicket(t) }
  } else if (k === 'a' || k === 'A') {
    assignCursorToMe()
  } else if (k === 's' || k === 'S') {
    if (inBox) skipTarget.value = served.value
    else if (playing.value) serveOne()
    else startPlay()
  } else if (k === 'r' || k === 'R') {
    if (inBox) resolveAndNext(served.value)
    else refresh()
  } else if ((k === 'e' || k === 'E') && inBox) {
    diagnosisTarget.value = served.value
  } else if ((k === 'w' || k === 'W') && inBox) {
    toggleWatch(served.value)
  } else if ((k === 'l' || k === 'L') && inBox) {
    worklogTarget.value = served.value
  } else if ((k === 'g' || k === 'G') && inBox) {
    onSwarm()
  } else if (k === 'u' || k === 'U') {
    onLens({ key: 'unowned' })
  } else if (k === 'Escape' && playing.value) {
    stopPlay()
  }
}

/* ── live wire ── */
let liveTick = null
const liveRefresh = () => {
  if (document.visibilityState !== 'visible' || loading.value || modalOpen()) return
  fetchBoard()
}

onMounted(async () => {
  if (route.query.queue) queueFilter.value = String(route.query.queue)
  fetchBoard()
  fetchCapabilities().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] }
  try { const r = await agentStatusRoster(); roster.value = r?.agents || [] } catch { roster.value = [] }
  if (route.query.ticket) drawerId.value = String(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  liveTick = setInterval(liveRefresh, 45000)
  window.addEventListener('keydown', onKeys)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(liveTick); window.removeEventListener('keydown', onKeys) })
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })
</script>

<style scoped>
.sd-l2 { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* section headers — the bureau's plaques */
.l2q-sect { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 8px 2px -6px; }
.l2q-sect h3 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.l2q-sect > span { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); white-space: nowrap; }

/* dormant forecaster's desk */
.l2q-idle { display: flex; align-items: center; gap: 11px; padding: 16px 18px; border-radius: 16px;
  border: 1px dashed var(--sd-border-strong); color: var(--sd-text-muted); }
.l2q-idle p { margin: 0; font-size: 12.5px; line-height: 1.5; }
.l2q-idle kbd { display: inline-block; min-width: 15px; padding: 1px 5px; border-radius: 4px; text-align: center;
  font-size: 9px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
.l2q-idle-go { border: none; background: none; padding: 0; cursor: pointer; font-family: inherit;
  font-size: 12.5px; font-weight: 800; color: var(--sd-l2-core); text-decoration: underline; text-underline-offset: 3px; }

/* control deck — contained, like the artifact's deck panel */
.l2q-deck { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; border-radius: 16px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.l2q-lanes { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.l2q-lane { display: flex; flex-direction: column; gap: 6px; padding: 9px 13px 10px; border-radius: 11px;
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  cursor: pointer; font-family: inherit; text-align: left;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.l2q-lane b { color: var(--sd-text); }
.l2q-lane.on { border-color: var(--lc, var(--sd-l2-core)); color: var(--sd-text);
  background: color-mix(in srgb, var(--lc, var(--sd-l2-core)) 10%, transparent); }
.l2q-lane-row { display: inline-flex; align-items: center; gap: 7px; }
.l2q-lane-bar { display: block; height: 4px; min-width: 14px; border-radius: 999px;
  background: linear-gradient(90deg, var(--lc, var(--sd-l2-core)), color-mix(in srgb, var(--lc, var(--sd-l2-core)) 55%, var(--sd-l2-front, #f5c04e)));
  transition: width 0.5s var(--sd-spring); }
.l2q-lane-gap { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: #26120a;
  background: var(--sd-l2-warn); }
.l2q-wip { display: inline-flex; gap: 2px; align-items: center; }
.l2q-wip i { width: 4px; height: 9px; border-radius: 2px; background: color-mix(in srgb, var(--sd-text) 14%, transparent); }
.l2q-wip i.lit { background: var(--lc, var(--sd-l2-core)); }
.l2q-wip.full i.lit { background: var(--sd-l2-halt); }
.l2q-livewire { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 10px;
  border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim);
  border: 1px dashed var(--sd-border); }
.l2q-livewire.stale { color: var(--sd-l2-warn); border-color: color-mix(in srgb, var(--sd-l2-warn) 45%, transparent); }
.l2q-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-l2-go); animation: l2q-live 2.2s ease-in-out infinite; }
.l2q-livewire.stale .l2q-live-dot { background: var(--sd-l2-warn); }
.l2q-kbd { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-dim); white-space: nowrap; }
.l2q-kbd kbd { display: inline-block; min-width: 14px; padding: 1px 4px; border-radius: 4px; text-align: center;
  font-family: inherit; font-size: 8.5px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
@keyframes l2q-live { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@media (max-width: 860px) { .l2q-kbd { display: none; } }

.l2q-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.l2q-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; max-width: 340px;
  padding: 8px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  color: var(--sd-text-dim); }
.l2q-search input { flex: 1; border: none; background: none; outline: none; font-family: inherit; font-size: 12.5px; color: var(--sd-text); }
.l2q-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-dim)); }
.l2q-search-x { display: grid; place-items: center; border: none; background: none; cursor: pointer; color: var(--sd-text-dim); }
/* SdSelect's root is width:100% by design (modal use) — pin it here or each select
   claims a full flex row and renders as a giant accordion bar. */
.l2q-controls .l2q-sel { width: 168px; flex: 0 0 auto; }
.l2q-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px; border: 1px solid var(--sd-border); background: var(--sd-surface); margin-left: auto; }
.l2q-vw { display: grid; place-items: center; padding: 0 13px; height: 30px; border-radius: 8px; cursor: pointer; border: none;
  font-family: inherit; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em;
  background: transparent; color: var(--sd-text-muted); }
.l2q-vw.on { color: var(--sd-text); background: color-mix(in srgb, var(--sd-l2-core) 16%, transparent); }

/* bulk bar */
.l2q-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--sd-l2-core) 40%, var(--sd-border));
  background: linear-gradient(120deg, color-mix(in srgb, var(--sd-l2-core) 9%, var(--sd-surface)), var(--sd-surface)); }
.l2q-bulk-n { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-l2-core); }
.l2q-bulk-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.l2q-bulk-b:hover { border-color: var(--sd-l2-core); color: var(--sd-text); }
.l2q-bulk-b.up { color: var(--sd-l2-core); }
.l2q-bulk-b.down { color: var(--sd-text-secondary); }
.l2q-bulk-x { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 7px 10px; border: none;
  background: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700; color: var(--sd-text-dim); }

/* kanban */
.l2q-kanban { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; align-items: start; }
.l2q-col { border: 1px solid var(--sd-border); border-radius: 14px; background: color-mix(in srgb, var(--cc) 4%, var(--sd-surface)); }
.l2q-col-h { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid var(--sd-border); }
.l2q-col-h h4 { margin: 0; flex: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-secondary); }
.l2q-col-h b { font-size: 11px; color: var(--cc); }
.l2q-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cc); }
.l2q-col-body { display: flex; flex-direction: column; gap: 7px; padding: 9px; min-height: 60px; }
.l2q-kcard { display: flex; flex-direction: column; gap: 5px; padding: 10px 11px; border-radius: 11px; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  animation: sd-deal 0.4s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.03s); }
.l2q-kcard:hover { border-color: color-mix(in srgb, var(--cc) 50%, transparent); transform: translateY(-2px);
  box-shadow: 0 12px 26px -14px color-mix(in srgb, var(--cc) 50%, transparent); }
.l2q-kcard-top { display: flex; align-items: center; justify-content: space-between; gap: 7px; font-size: 10px; }
.l2q-kcard-top b { color: var(--cc); letter-spacing: 0.05em; }
.l2q-kcard-subj { font-size: 12px; font-weight: 600; color: var(--sd-text); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.l2q-kcard-meta { display: flex; gap: 8px; font-size: 9px; color: var(--sd-text-dim); }
.l2q-kcard-meta .esc { color: var(--sd-st-escalated); font-weight: 800; }
.l2q-kcard-meta .bad { color: var(--sd-l2-halt); font-weight: 800; }
.l2q-kcard-meta .warn { color: var(--sd-l2-warn); font-weight: 700; }
.l2q-col-empty { margin: 4px 0; text-align: center; font-size: 10px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.l2q-card-enter-active, .l2q-card-leave-active { transition: all 0.3s var(--sd-spring); }
.l2q-card-enter-from, .l2q-card-leave-to { opacity: 0; transform: translateY(6px); }

/* pager */
.l2q-pager { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 10.5px;
  letter-spacing: 0.1em; color: var(--sd-text-muted); }
.l2q-pg { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary); }
.l2q-pg:disabled { opacity: 0.4; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .l2q-kcard { animation: none; }
  html:not([data-cinematic="on"]) .l2q-live-dot { animation: none; }
}
</style>
