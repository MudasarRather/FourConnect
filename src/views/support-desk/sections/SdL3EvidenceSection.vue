<template>
  <div class="sd-l3" :style="{ '--tc': 'var(--sd-l3-core)' }">
    <!-- ═══ HERO — the evidence wall ═══ -->
    <SdEvidenceHero :lenses="lenses" :active-lens="lens" :stats="stats" :rows="rows" :problems="problems"
      :now="now" :playing="playing" :loading="loading" :reduced="reduced"
      @pick="onLens" @serve="startPlay" @unowned="onLens({ key: 'unowned' })" @refresh="refresh"
      @status="onStatus" @open="openTicket" @problem="focusProblem" @kedb="scrollToRack" />

    <!-- ═══ THE DESK — now serving ═══ -->
    <header class="l3q-sect">
      <h3>The desk</h3>
      <span class="sd-mono">ONE CASE AT A TIME · SERVED IN ORDER</span>
    </header>
    <div v-if="!served" class="l3q-idle">
      <Lamp :size="15" />
      <p>The desk lamp is off. <button class="l3q-idle-go" @click="startPlay">Take the next case</button>
        — priority first, oldest breach forward. <kbd>S</kbd></p>
    </div>
    <SdEvidenceConsole :ticket="served" :remaining="servedRemaining" :serving="serving" :now="now"
      :stint="stint" :skills="servedSkills" :lane="servedLane" :watching="servedWatching"
      :swarm-active="!!servedSwarm?.active" :swarm-joined="!!servedSwarm?.joined"
      :logged-minutes="servedLogged" :dossier-bump="dossierBump" :reduced="reduced"
      @open="openTicket(served)" @skip="skipTarget = served" @sendback="moveTarget = served; moveMode = 'descend'"
      @next="serveOne" @stop="stopPlay" @resolve="resolveAndNext(served)" @crew="onCrew"
      @worklog="worklogTarget = served" @watch="toggleWatch(served)" @swarm="onSwarm" @ack="onAck(served)"
      @problem="onProblemVerb" @rca="rcaTarget = served" @change="changeTarget = served" />

    <SdSwarmBar :swarm="servedSwarm" :ticket-number="served?.ticket_number || ''" :now="now"
      @join="onSwarmJoin" @end="onSwarmEnd" @open="openTicket(served)" />

    <!-- ═══ CONTROL DECK ═══ -->
    <header class="l3q-sect">
      <h3>Control deck</h3>
      <span class="sd-mono">LANES · SEARCH · VIEW</span>
    </header>
    <div class="l3q-deck">
      <div class="l3q-lanes" role="tablist" aria-label="Lanes at this tier">
        <button class="l3q-lane" :class="{ on: !queueFilter }" role="tab" :aria-selected="!queueFilter" @click="setQueue('')">
          All lanes <b class="sd-mono">{{ totalOpenLanes }}</b>
        </button>
        <button v-for="qz in queues" :key="qz.id" class="l3q-lane" :class="{ on: queueFilter === qz.id }"
          :style="{ '--lc': qz.color || 'var(--sd-l3-core)' }" role="tab" :aria-selected="queueFilter === qz.id"
          :title="laneTitle(qz)" @click="setQueue(qz.id)">
          <i class="l3q-lane-dot" />{{ qz.name }} <b class="sd-mono">{{ qz.open }}</b>
          <span v-if="qz.skill_match === false" class="l3q-lane-gap sd-mono"><Wrench :size="9" /> SKILL GAP</span>
          <span v-if="(qz.max_agent_load || 0) > 0" class="l3q-wip" :class="{ full: (qz.my_active || 0) >= qz.max_agent_load }"
            :title="`WIP — you hold ${qz.my_active || 0}/${qz.max_agent_load} in this lane`" aria-hidden="true">
            <i v-for="s in qz.max_agent_load" :key="s" :class="{ lit: s <= (qz.my_active || 0) }" />
          </span>
        </button>
        <span class="l3q-livewire sd-mono" :class="{ stale: fetchErr || updatedAgo > 90 }"
          :title="fetchErr ? `Last refresh failed — showing data from ${updatedAgo}s ago` : 'This board is live — auto-refreshes while you watch'">
          <i class="l3q-live-dot" /> {{ fetchErr ? 'OFFLINE' : 'LIVE' }} · {{ updatedAgo }}s
        </span>
      </div>

      <div class="l3q-controls">
        <div class="l3q-search">
          <Search :size="13" />
          <input v-model.trim="q" placeholder="Number, subject, requester…" @keyup.enter="fetchBoard()" />
          <button v-if="q" class="l3q-search-x" aria-label="Clear search" @click="q = ''; fetchBoard()"><X :size="12" /></button>
        </div>
        <SdSelect v-model="statusFilter" :options="statusOpts" placeholder="Any status" class="l3q-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="priorityFilter" :options="priorityOpts" placeholder="Any priority" class="l3q-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="sortBy" :options="SORTS" class="l3q-sel" @update:model-value="fetchBoard()" />
        <div class="l3q-views" role="tablist" aria-label="Board layout">
          <button class="l3q-vw sd-mono" :class="{ on: view === 'evidence' }" role="tab" :aria-selected="view === 'evidence'" title="Evidence — pinned cards" @click="view = 'evidence'">WALL</button>
          <button class="l3q-vw sd-mono" :class="{ on: view === 'list' }" role="tab" :aria-selected="view === 'list'" title="Case log — table" @click="view = 'list'">LIST</button>
          <button class="l3q-vw sd-mono" :class="{ on: view === 'kanban' }" role="tab" :aria-selected="view === 'kanban'" title="Case progress lanes" @click="switchKanban">LANES</button>
        </div>
        <span class="l3q-kbd sd-mono" title="J/K move · ↵ open · A assign/ack · S serve/skip · R refresh/resolve · P problem · D RCA · C change · B send back · W watch · L log · G swarm · U unowned · / search · Esc stop">
          <kbd>J</kbd><kbd>K</kbd> move · <kbd>↵</kbd> open · <kbd>P</kbd> problem · <kbd>D</kbd> RCA
        </span>
      </div>
    </div>

    <!-- ═══ BULK BAR ═══ -->
    <Presence>
      <Motion v-if="selected.length" as="div" class="l3q-bulk" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: 8 }" :transition="{ duration: 0.25 }">
        <span class="l3q-bulk-n sd-mono">{{ selected.length }} ON THE STRING</span>
        <button class="l3q-bulk-b" @click="bulk('assign')"><UserPlus :size="13" /> Assign</button>
        <button class="l3q-bulk-b" @click="bulk('status')"><Activity :size="13" /> Status</button>
        <button class="l3q-bulk-b" @click="bulk('priority')"><Flag :size="13" /> Priority</button>
        <button class="l3q-bulk-b" @click="bulk('resolve')"><CheckCheck :size="13" /> Resolve</button>
        <button v-if="selected.length === 1" class="l3q-bulk-b prb" @click="singleProblem"><Fingerprint :size="13" /> Link problem</button>
        <button v-if="selected.length === 1" class="l3q-bulk-b down" @click="singleMove('descend')"><ArrowDownLeft :size="13" /> Send back</button>
        <button class="l3q-bulk-x" @click="selected = []"><X :size="13" /> Clear</button>
      </Motion>
    </Presence>

    <!-- ═══ THE BOARD ═══ -->
    <header class="l3q-sect">
      <h3>{{ view === 'list' ? 'Queue — case log' : view === 'kanban' ? 'Queue — case progress' : 'Queue — pinned evidence' }}</h3>
      <span class="sd-mono">{{ rows.length }} OF {{ total }} · SERVED IN ORDER</span>
    </header>
    <SdEvidenceCards v-if="view === 'evidence'" :rows="rows" :selected="selected" :now="now"
      :loading="loading" :empty="emptyCopy" :empty-icon="Inbox" :cursor="cursor"
      @open="openTicket" @toggle="toggleRow" />

    <SdTicketTable v-else-if="view === 'list'" :rows="rows" :columns="COLS" :loading="loading" :now="now"
      selectable :selected="selected" accent="var(--sd-l3-core)"
      :empty="emptyCopy" :empty-icon="Inbox"
      @open="openTicketById" @toggle="toggleRow" @toggle-all="toggleAll" />

    <div v-else class="l3q-kanban">
      <div v-for="col in kanbanCols" :key="col.key" class="l3q-col" :style="{ '--cc': col.color }">
        <header class="l3q-col-h">
          <span class="l3q-col-dot" /><h4>{{ col.label }}</h4><b class="sd-mono">{{ col.rows.length }}</b>
        </header>
        <TransitionGroup name="l3q-card" tag="div" class="l3q-col-body">
          <button v-for="(t, i) in col.rows" :key="t.id" class="l3q-kcard" :style="{ '--i': i }" @click="openTicket(t)">
            <span class="l3q-kcard-top sd-mono">
              <b>{{ t.ticket_number }}</b>
              <SdPill kind="priority" :value="t.priority" />
            </span>
            <span class="l3q-kcard-subj">{{ t.subject }}</span>
            <span class="l3q-kcard-meta sd-mono">
              <span>{{ t.assigned_agent_name || 'UNOWNED' }}</span>
              <span v-if="t.linked_problem_id" class="prb">PRB</span>
              <span :class="slaTone(t)">{{ slaShort(t) }}</span>
            </span>
          </button>
          <p v-if="!col.rows.length && !loading" :key="'e-' + col.key" class="l3q-col-empty">Shelf clear</p>
        </TransitionGroup>
      </div>
    </div>

    <!-- pager -->
    <div v-if="view !== 'kanban' && total > limit" class="l3q-pager sd-mono">
      <button class="l3q-pg" :disabled="page <= 1" @click="page--; fetchBoard()"><ChevronLeft :size="14" /></button>
      <span>{{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }} · {{ total }} tickets</span>
      <button class="l3q-pg" :disabled="page * limit >= total" @click="page++; fetchBoard()"><ChevronRight :size="14" /></button>
    </div>

    <!-- ═══ PROBLEM WORKBENCH ═══ -->
    <div ref="rackAnchor">
      <SdProblemCaseRack ref="rackRef" :board-rows="rows" :me="me" :caps="caps"
        @new="newProblemFromDesk" @edit="p => problemEdit = p" @cascade="p => cascadeTarget = p"
        @open="openTicket" @changed="onProblemChanged" />
    </div>

    <!-- ═══ THE WALL INSTRUMENTS ═══ -->
    <SdEvidenceRail v-if="!stats.no_queues" :stats="stats" :queues="queues" :rows="rows"
      :updated-ago="updatedAgo" :now="now"
      @open="openTicket" @kedb="scrollToRack" @worklog="onWallWorklog" />

    <!-- ═══ consoles ═══ -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="caps" :me="me" @close="onDrawerClose" @changed="onChanged" />
    <SdSkipModal :ticket="skipTarget" @close="skipTarget = null" @done="onSkipped" />
    <SdTierMoveModal :ticket="moveTarget" :mode="moveMode" :from-tier="3"
      @close="moveTarget = null" @done="onMoved" />
    <SdWorklogModal :ticket="worklogTarget" :me="me" @close="worklogTarget = null" @done="onLogged" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdProblemLinkModal :ticket="problemTarget" :problem="problemEdit" :me="me"
      @close="problemTarget = null; problemEdit = null" @done="onProblemLinked" />
    <!-- RCA v2: the unified console replaced the L3-only SdRcaModal — same structured
         capture (category, five-whys, factors) + the promote-to-problem/KEDB block
         everywhere. Contract: :open :ticket :now @close @saved. -->
    <SdRcaConsole :open="!!rcaTarget" :ticket="rcaTarget" :now="now"
      @close="rcaTarget = null" @saved="onRcaDone" />
    <SdCascadeModal :problem="cascadeTarget" @close="cascadeTarget = null" @done="onCascadeDone" />
    <SdChangeLinkModal :ticket="changeTarget" @close="changeTarget = null" @done="onChangeLinked" />
  </div>
</template>

<script setup>
/* SdL3EvidenceSection — THE EVIDENCE WALL: the bespoke L3 engineering desk. Same
   sealed data contract as the other tier desks (tierBoard(3) / serveNext(3) / skip /
   tier-move / live wire / keyboard triage) plus the full L3 workbench: the handoff
   dossier + esc-ACK clock, problem linking with KEDB search, the RCA console, change
   linkage and the problem→incident cascade solve. L1 keeps the pit wall; L2 keeps
   the storm bureau — this desk speaks detective. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Inbox, Search, X, UserPlus, Activity, Flag, CheckCheck, ArrowDownLeft,
  ChevronLeft, ChevronRight, Wrench, Lamp, Fingerprint,
  HandHelping, AlarmClockOff, Timer, Flame, User, Siren, GitPullRequest,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdEvidenceHero from '../components/SdEvidenceHero.vue'
import SdEvidenceConsole from '../components/SdEvidenceConsole.vue'
import SdEvidenceCards from '../components/SdEvidenceCards.vue'
import SdEvidenceRail from '../components/SdEvidenceRail.vue'
import SdProblemCaseRack from '../components/SdProblemCaseRack.vue'
import SdSwarmBar from '../components/SdSwarmBar.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdSkipModal from '../modals/SdSkipModal.vue'
import SdTierMoveModal from '../modals/SdTierMoveModal.vue'
import SdWorklogModal from '../modals/SdWorklogModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdProblemLinkModal from '../modals/SdProblemLinkModal.vue'
import SdRcaConsole from '../modals/SdRcaConsole.vue'
import SdCascadeModal from '../modals/SdCascadeModal.vue'
import SdChangeLinkModal from '../modals/SdChangeLinkModal.vue'
import {
  tierBoard, serveNext, getMe, listMyTeam, fetchCapabilities, useCapabilities,
  setMyStatus, changeTicketStatus, assignTicket, ackEscalation, listProblems,
  AGENT_STATUS_META, PRIORITIES, TICKET_STATUSES,
  watchTicket, unwatchTicket, listWatchers, getSwarm, swarmStart, swarmJoin, swarmEnd,
} from '@/composables/useSupportDesk'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  tier: { type: Number, default: 3 },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
defineEmits(['go'])

const route = useRoute()
const toast = useToast()
const { cinematic } = useCinematic()
const reduced = computed(() => !cinematic.value
  && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

const TIER = 3
const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'agent', 'sla', 'updated']

/* ── board state (same contract as the sibling tier desks) ── */
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
const view = ref('evidence')
const lens = ref('all')
const now = ref(Date.now())
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
  if (lens.value === 'escalated' || lens.value === 'ackpending') p.escalated_only = true
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
const refresh = () => { page.value = 1; fetchBoard(); loadProblems() }
const setQueue = (id) => { queueFilter.value = id; page.value = 1; fetchBoard() }
const updatedAgo = computed(() => Math.max(0, Math.round((now.value - lastFetched.value) / 1000)))
const laneTitle = (qz) => {
  const bits = [`${qz.name} — serve: ${qz.serve_order}, drain ${qz.queue_priority}`]
  if ((qz.max_agent_load || 0) > 0) bits.push(`WIP ${qz.my_active || 0}/${qz.max_agent_load}`)
  if (qz.skill_match === false) bits.push('skill mismatch')
  return bits.join(' · ')
}

/* ── problems (feed the wall's suspect cards; the rack self-loads its own view) ── */
const problems = ref([])
const loadProblems = async () => {
  try {
    const r = await listProblems({ limit: 40 })
    problems.value = (Array.isArray(r) ? r : (r?.items || [])).filter(p => p.status !== 'closed')
  } catch { problems.value = [] }
}

/* ── availability ── */
const onStatus = async (key) => {
  try {
    await setMyStatus({ status: key })
    stats.value = { ...stats.value, my_status: key }
    toast.success(`Status: ${AGENT_STATUS_META[key]?.label || key}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update status') }
}

/* ── lenses (the L3 set: MI + ACK + fixes ride the new stats keys) ── */
const lenses = computed(() => ([
  { key: 'all', label: 'All cases', icon: Inbox, color: 'var(--sd-l3-core)', value: total.value },
  { key: 'mine', label: 'My cases', icon: User, color: 'var(--sd-l3-go)', value: stats.value.my_load ?? 0 },
  { key: 'unowned', label: 'Unowned', icon: HandHelping, color: 'var(--sd-l3-warn)', value: stats.value.unassigned ?? 0 },
  { key: 'breached', label: 'Breached', icon: AlarmClockOff, color: 'var(--sd-l3-halt)', value: stats.value.breached ?? 0 },
  { key: 'mi', label: 'Majors', icon: Siren, color: 'var(--sd-l3-halt)', value: stats.value.mi_active ?? 0, stat: true },
  { key: 'ackpending', label: 'Ack due', icon: Timer, color: 'var(--sd-l3-warn)', value: stats.value.ack_pending ?? 0 },
  { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-l3-string)', value: stats.value.escalated ?? 0 },
  { key: 'fix', label: 'Fix in flight', icon: GitPullRequest, color: 'var(--sd-l3-go)', value: stats.value.fix_in_progress ?? 0, stat: true },
]))
const onLens = (l) => {
  if (l.stat) return
  lens.value = l.key === lens.value ? 'all' : l.key
  page.value = 1
  fetchBoard()
}

/* ── kanban (case progress) ── */
const KANBAN = [
  { key: 'open', label: 'New evidence', color: 'var(--sd-st-open)', match: (t) => t.status === 'open' },
  { key: 'in_progress', label: 'Under investigation', color: 'var(--sd-st-progress)', match: (t) => t.status === 'in_progress' },
  { key: 'paused', label: 'Awaiting answers', color: 'var(--sd-st-hold)', match: (t) => ['pending_customer', 'pending_vendor', 'on_hold'].includes(t.status) },
  { key: 'escalated', label: 'Marked urgent', color: 'var(--sd-st-escalated)', match: (t) => t.status === 'escalated' },
  { key: 'resolved', label: 'Case closed', color: 'var(--sd-st-resolved)', match: (t) => ['resolved', 'closed'].includes(t.status) },
]
const kanbanCols = computed(() => KANBAN.map(c => ({ ...c, rows: rows.value.filter(c.match) })))
const switchKanban = () => { view.value = 'kanban'; if (limit.value < 100) { limit.value = 100; page.value = 1; fetchBoard() } }
watch(view, (v) => { if (v !== 'kanban' && limit.value !== 25) { limit.value = 25; page.value = 1; fetchBoard() } })

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
const singleProblem = () => {
  const t = bulkTicketObjs.value[0]
  if (!t) return
  if (!canCommandRow(t)) {
    toast.info(`${t.ticket_number} is owned by ${t.assigned_agent_name || 'another agent'} — only the owner, a collaborator, or the team lead can string it to a problem.`)
    return
  }
  problemTarget.value = t
}

/* ── play mode ── */
const playing = ref(false)
const serving = ref(false)
const served = ref(null)
const servedRemaining = ref(0)
const servedCount = ref(0)
const dossierBump = ref(0)
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

/* workbench state for the served case */
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
      hydrateWorkbench(r.ticket)
      fetchBoard()
    } else {
      served.value = null
      playing.value = false
      toast.info(r.reason === 'all_viewed'
        ? 'Everything left is being viewed by teammates right now.'
        : r.reason === 'no_queues' ? 'No lanes at this tier yet.'
          : r.reason === 'at_capacity' ? 'WIP cap reached — you\'re at capacity on every remaining lane.'
            : 'Queue drained — the wall is clear.')
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

/* ── desk verbs ── */
const resolveAndNext = async (t) => {
  if (!t) return
  try {
    await changeTicketStatus(t.id, { status: 'resolved' })
    toast.success(`${t.ticket_number} — case closed.`)
    served.value = null
    drawerId.value = null
    if (playing.value) serveOne(); else fetchBoard()
  } catch (e) {
    toast.info(e?.response?.data?.detail || 'Resolution needs the record — opening the console.')
    drawerId.value = String(t.id)
  }
}
const onCrew = async (kind) => {
  const t = served.value
  if (!t) { toast.info('Nothing on the desk — take the next case first.'); return }
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
    toast.success(`Receipt acknowledged on ${t.ticket_number} — the ack clock stops.`)
    dossierBump.value++
    fetchBoard()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') }
}
const onLogged = (totalMins) => {
  servedLogged.value = totalMins || servedLogged.value
  fetchBoard()
}
const onWallWorklog = () => {
  if (served.value) worklogTarget.value = served.value
  else toast.info('Take a case first — time is logged against a case.')
}

/* ── L3 workbench modal flow ── */
const problemTarget = ref(null)     // ticket → link/create
const problemEdit = ref(null)       // problem → edit
const rcaTarget = ref(null)
const cascadeTarget = ref(null)
const changeTarget = ref(null)
const rackRef = ref(null)
const rackAnchor = ref(null)

const onProblemVerb = () => { if (served.value) problemTarget.value = served.value }
const newProblemFromDesk = () => {
  if (served.value) { problemTarget.value = served.value; return }
  const first = bulkTicketObjs.value[0] || rows.value[0]
  if (first) problemTarget.value = first
  else toast.info('Open a case first — a problem file starts from a ticket.')
}
const afterWorkbenchChange = () => {
  dossierBump.value++
  fetchBoard()
  loadProblems()
  rackRef.value?.reload?.()
}
const onProblemLinked = () => { problemTarget.value = null; problemEdit.value = null; afterWorkbenchChange() }
const onRcaDone = () => { rcaTarget.value = null; afterWorkbenchChange() }
const onCascadeDone = () => { cascadeTarget.value = null; afterWorkbenchChange() }
const onChangeLinked = () => { changeTarget.value = null; afterWorkbenchChange() }
const onProblemChanged = () => { loadProblems() }
const scrollToRack = () => rackAnchor.value?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
const focusProblem = (p) => {
  scrollToRack()
  rackRef.value?.focus?.(String(p.id))
}

/* ── drawer + shared modals ── */
const drawerId = ref(null)
const skipTarget = ref(null)
const moveTarget = ref(null)
const moveMode = ref('descend')
const worklogTarget = ref(null)
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
  ? { title: 'No lanes at this tier', blurb: 'An admin can lay one in Queue Config — until then this wall has nothing to pin.' }
  : { title: 'The wall is clear', blurb: 'No cases match the current lens — nothing left to string.' }))

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
  || worklogTarget.value || problemTarget.value || problemEdit.value || rcaTarget.value
  || cascadeTarget.value || changeTarget.value)
const onKeys = (e) => {
  const el = document.activeElement
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  if (typing || e.metaKey || e.ctrlKey || e.altKey || modalOpen()) return
  const inDesk = playing.value && !!served.value
  const k = e.key
  if (k === '/') {
    e.preventDefault()
    document.querySelector('.l3q-search input')?.focus()
  } else if (k === 'j' || k === 'J') {
    if (rows.value.length) cursor.value = Math.min(cursor.value + 1, rows.value.length - 1)
  } else if (k === 'k' || k === 'K') {
    if (rows.value.length) cursor.value = Math.max(cursor.value - 1, 0)
  } else if (k === 'Enter') {
    const t = rows.value[cursor.value]
    if (t) { e.preventDefault(); openTicket(t) }
  } else if (k === 'a' || k === 'A') {
    if (inDesk) onAck(served.value)
    else assignCursorToMe()
  } else if (k === 's' || k === 'S') {
    if (inDesk) skipTarget.value = served.value
    else if (playing.value) serveOne()
    else startPlay()
  } else if (k === 'r' || k === 'R') {
    if (inDesk) resolveAndNext(served.value)
    else refresh()
  } else if ((k === 'p' || k === 'P') && inDesk) {
    problemTarget.value = served.value
  } else if ((k === 'd' || k === 'D') && inDesk) {
    rcaTarget.value = served.value
  } else if ((k === 'c' || k === 'C') && inDesk) {
    changeTarget.value = served.value
  } else if ((k === 'b' || k === 'B') && inDesk) {
    moveMode.value = 'descend'
    moveTarget.value = served.value
  } else if ((k === 'w' || k === 'W') && inDesk) {
    toggleWatch(served.value)
  } else if ((k === 'l' || k === 'L') && inDesk) {
    worklogTarget.value = served.value
  } else if ((k === 'g' || k === 'G') && inDesk) {
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
  loadProblems()
  fetchCapabilities().catch(() => {})
  try { me.value = await getMe() || {} } catch { /* non-fatal */ }
  try { const t = await listMyTeam(); assignees.value = (t || []).map(m => ({ value: m.id, label: m.name || m.email })) } catch { assignees.value = [] }
  if (route.query.ticket) drawerId.value = String(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  liveTick = setInterval(liveRefresh, 45000)
  window.addEventListener('keydown', onKeys)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(liveTick); window.removeEventListener('keydown', onKeys) })
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })
</script>

<style scoped>
.sd-l3 { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* section plaques */
.l3q-sect { display: flex; align-items: baseline; gap: 12px; margin-top: 4px; }
.l3q-sect h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--sd-text); }
.l3q-sect span { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-dim); }

/* dormant desk plate (console is v-if — without this the section collapses when idle) */
.l3q-idle { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 14px;
  border: 1px dashed var(--sd-border-strong); color: var(--sd-text-muted); }
.l3q-idle svg { color: var(--sd-l3-core); }
.l3q-idle p { margin: 0; font-size: 12.5px; line-height: 1.5; }
.l3q-idle kbd { padding: 1px 5px; border: 1px solid var(--sd-border-strong); border-radius: 4px; font-size: 9px;
  font-family: "Cascadia Mono", Consolas, ui-monospace, monospace; }
.l3q-idle-go { padding: 0; border: none; background: none; cursor: pointer; font-family: inherit; font-size: 12.5px;
  font-weight: 800; color: var(--sd-l3-core); text-decoration: underline; text-underline-offset: 3px; }

/* control deck */
.l3q-deck { display: flex; flex-direction: column; gap: 10px; }
.l3q-lanes { display: flex; gap: 7px; flex-wrap: wrap; }
.l3q-lane { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.l3q-lane b { color: var(--sd-text); }
.l3q-lane.on { border-color: var(--lc, var(--sd-l3-core)); color: var(--sd-text);
  background: color-mix(in srgb, var(--lc, var(--sd-l3-core)) 12%, transparent); }
.l3q-lane-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lc, var(--sd-l3-core)); }
.l3q-lane-gap { display: inline-flex; align-items: center; gap: 3px; font-size: 7.5px; letter-spacing: 0.1em;
  color: var(--sd-l3-warn); }
.l3q-wip { display: inline-flex; gap: 2px; align-items: center; }
.l3q-wip i { width: 4px; height: 9px; border-radius: 2px; background: color-mix(in srgb, var(--sd-text) 14%, transparent); }
.l3q-wip i.lit { background: var(--lc, var(--sd-l3-core)); }
.l3q-wip.full i.lit { background: var(--sd-l3-halt); }
.l3q-livewire { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 10px;
  border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim);
  border: 1px dashed var(--sd-border); }
.l3q-livewire.stale { color: var(--sd-l3-warn); border-color: color-mix(in srgb, var(--sd-l3-warn) 45%, transparent); }
.l3q-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-l3-go); animation: l3q-live 2.2s ease-in-out infinite; }
.l3q-livewire.stale .l3q-live-dot { background: var(--sd-l3-warn); }
@keyframes l3q-live { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

.l3q-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.l3q-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; max-width: 340px;
  padding: 8px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  color: var(--sd-text-dim); }
.l3q-search input { flex: 1; border: none; background: none; outline: none; font-family: inherit; font-size: 12.5px; color: var(--sd-text); }
.l3q-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-dim)); }
.l3q-search-x { display: grid; place-items: center; border: none; background: none; cursor: pointer; color: var(--sd-text-dim); }
/* SdSelect roots are width:100% (modal-first) — pin them inside this toolbar */
.l3q-controls .l3q-sel { width: 158px; flex: 0 0 auto; }
.l3q-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px; border: 1px solid var(--sd-border);
  background: var(--sd-surface); margin-left: auto; }
.l3q-vw { display: grid; place-items: center; padding: 6px 11px; border-radius: 8px; cursor: pointer; border: none;
  background: transparent; color: var(--sd-text-muted); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; }
.l3q-vw.on { color: var(--sd-text); background: var(--sd-l3-soft); }
.l3q-kbd { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-dim); white-space: nowrap; }
.l3q-kbd kbd { display: inline-block; min-width: 14px; padding: 1px 4px; border-radius: 4px; text-align: center;
  font-family: inherit; font-size: 8.5px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
@media (max-width: 860px) { .l3q-kbd { display: none; } }

/* bulk bar */
.l3q-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border-radius: 13px;
  border: 1px solid var(--sd-l3-brd);
  background: linear-gradient(120deg, color-mix(in srgb, var(--sd-l3-core) 9%, var(--sd-surface)), var(--sd-surface)); }
.l3q-bulk-n { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-l3-core); }
.l3q-bulk-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.l3q-bulk-b:hover { border-color: var(--sd-l3-core); color: var(--sd-text); }
.l3q-bulk-b.prb { color: var(--sd-l3-core); }
.l3q-bulk-b.down { color: var(--sd-text-muted); }
.l3q-bulk-x { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 7px 10px; border: none;
  background: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700; color: var(--sd-text-dim); }

/* kanban */
.l3q-kanban { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; align-items: start; }
.l3q-col { border: 1px solid var(--sd-border); border-radius: 14px; background: color-mix(in srgb, var(--cc) 4%, var(--sd-surface)); }
.l3q-col-h { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid var(--sd-border); }
.l3q-col-h h4 { margin: 0; flex: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-secondary); }
.l3q-col-h b { font-size: 11px; color: var(--cc); }
.l3q-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cc); }
.l3q-col-body { display: flex; flex-direction: column; gap: 7px; padding: 9px; min-height: 60px; }
.l3q-kcard { display: flex; flex-direction: column; gap: 5px; padding: 10px 11px; border-radius: 11px; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  animation: sd-deal 0.4s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.03s); }
.l3q-kcard:hover { border-color: color-mix(in srgb, var(--cc) 50%, transparent); transform: translateY(-2px);
  box-shadow: 0 12px 26px -14px color-mix(in srgb, var(--cc) 50%, transparent); }
.l3q-kcard-top { display: flex; align-items: center; justify-content: space-between; gap: 7px; font-size: 10px; }
.l3q-kcard-top b { color: var(--cc); letter-spacing: 0.05em; }
.l3q-kcard-subj { font-size: 12px; font-weight: 600; color: var(--sd-text); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.l3q-kcard-meta { display: flex; gap: 8px; font-size: 9px; color: var(--sd-text-dim); }
.l3q-kcard-meta .prb { color: var(--sd-l3-core); font-weight: 800; }
.l3q-kcard-meta .bad { color: var(--sd-l3-halt); font-weight: 800; }
.l3q-kcard-meta .warn { color: var(--sd-l3-warn); font-weight: 700; }
.l3q-col-empty { margin: 4px 0; text-align: center; font-size: 10px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.l3q-card-enter-active, .l3q-card-leave-active { transition: all 0.3s var(--sd-spring); }
.l3q-card-enter-from, .l3q-card-leave-to { opacity: 0; transform: translateY(6px); }

/* pager */
.l3q-pager { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 10.5px;
  letter-spacing: 0.1em; color: var(--sd-text-muted); }
.l3q-pg { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary); }
.l3q-pg:disabled { opacity: 0.4; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .l3q-kcard { animation: none; }
  html:not([data-cinematic="on"]) .l3q-live-dot { animation: none; }
}
</style>
