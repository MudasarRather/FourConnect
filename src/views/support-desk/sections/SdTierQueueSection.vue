<template>
  <div class="sd-tq" :style="{ '--tc': meta.accent }">
    <!-- ═══ HERO — this tier's pit wall ═══ -->
    <SdPitWallHero :tier="tier" :lenses="lenses" :active-lens="lens" :stats="stats" :queues="queues"
      :rows="rows" :now="now" :advisory="advisory" :playing="playing" :loading="loading" :reduced="reduced"
      @pick="onLens" @serve="startPlay" @unowned="onLens({ key: 'unowned' })" @refresh="refresh"
      @status="onStatus" @stewards="stewardsOpen = true" @open="openTicket" />

    <!-- ═══ PIT BOX — now serving ═══ -->
    <SdServeNextDeck :ticket="served" :remaining="servedRemaining" :serving="serving" :now="now" :accent="meta.accent"
      :stint="stint" :skills="servedSkills" :lane="servedLane" :tier="tier"
      @open="openTicket(served)" @skip="skipTarget = served" @escalate="moveTarget = served; moveMode = 'escalate'"
      @next="serveOne" @stop="stopPlay" @resolve="resolveAndNext" @crew="onCrew" />

    <!-- ═══ CONTROL DECK ═══ -->
    <div class="tq-deck">
      <!-- lane chips -->
      <div class="tq-lanes" role="tablist" aria-label="Lanes at this tier">
        <button class="tq-lane" :class="{ on: !queueFilter }" role="tab" :aria-selected="!queueFilter" @click="setQueue('')">
          All lanes <b class="sd-mono">{{ totalOpenLanes }}</b>
        </button>
        <button v-for="qz in queues" :key="qz.id" class="tq-lane" :class="{ on: queueFilter === qz.id }"
          :style="{ '--lc': qz.color || meta.accent }" role="tab" :aria-selected="queueFilter === qz.id"
          :title="laneTitle(qz)" @click="setQueue(qz.id)">
          <i class="tq-lane-dot" />{{ qz.name }} <b class="sd-mono">{{ qz.open }}</b>
          <span v-if="qz.skill_match === false" class="tq-lane-skill" title="Skill mismatch — this lane needs skills you don't hold yet">
            <Wrench :size="10" />
          </span>
          <span v-if="(qz.max_agent_load || 0) > 0" class="tq-fuel" :class="{ full: (qz.my_active || 0) >= qz.max_agent_load }"
            :title="`WIP — you hold ${qz.my_active || 0}/${qz.max_agent_load} in this lane`" aria-hidden="true">
            <i v-for="s in qz.max_agent_load" :key="s" :class="{ lit: s <= (qz.my_active || 0) }" />
          </span>
        </button>
        <span class="tq-livewire sd-mono" :class="{ stale: fetchErr || updatedAgo > 90 }"
          :title="fetchErr ? `Last refresh failed — showing data from ${updatedAgo}s ago` : 'This board is live — auto-refreshes while you watch'">
          <i class="tq-live-dot" /> {{ fetchErr ? 'OFFLINE' : 'LIVE' }} · {{ updatedAgo }}s
        </span>
      </div>

      <div class="tq-controls">
        <div class="tq-search">
          <Search :size="13" />
          <input v-model.trim="q" placeholder="Number, subject, requester…" @keyup.enter="fetchBoard()" />
          <button v-if="q" class="tq-search-x" aria-label="Clear search" @click="q = ''; fetchBoard()"><X :size="12" /></button>
        </div>
        <SdSelect v-model="statusFilter" :options="statusOpts" placeholder="Any status" class="tq-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="priorityFilter" :options="priorityOpts" placeholder="Any priority" class="tq-sel" @update:model-value="fetchBoard()" />
        <SdSelect v-model="sortBy" :options="SORTS" class="tq-sel" @update:model-value="fetchBoard()" />
        <div class="tq-views" role="tablist" aria-label="Board layout">
          <button class="tq-vw" :class="{ on: view === 'circuit' }" role="tab" :aria-selected="view === 'circuit'" title="Circuit — car cards" @click="view = 'circuit'"><Rows3 :size="14" /></button>
          <button class="tq-vw" :class="{ on: view === 'list' }" role="tab" :aria-selected="view === 'list'" title="Manifest — table" @click="view = 'list'"><List :size="14" /></button>
          <button class="tq-vw" :class="{ on: view === 'kanban' }" role="tab" :aria-selected="view === 'kanban'" title="Pit boxes" @click="switchKanban"><Columns3 :size="14" /></button>
        </div>
        <span class="tq-kbd sd-mono" title="Wheel controls — J/K move · ↵ open · A assign to me · S serve/skip · R refresh/resolve · E escalate · U unowned · / search · Esc stop">
          <kbd>J</kbd><kbd>K</kbd> move · <kbd>↵</kbd> open · <kbd>A</kbd> assign · <kbd>S</kbd> serve
        </span>
      </div>
    </div>

    <!-- ═══ BULK BAR ═══ -->
    <Presence>
      <Motion v-if="selected.length" as="div" class="tq-bulk" :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0, y: 8 }" :transition="{ duration: 0.25 }">
        <span class="tq-bulk-n sd-mono">{{ selected.length }} COUPLED</span>
        <button class="tq-bulk-b" @click="bulk('assign')"><UserPlus :size="13" /> Assign</button>
        <button class="tq-bulk-b" @click="bulk('status')"><Activity :size="13" /> Status</button>
        <button class="tq-bulk-b" @click="bulk('priority')"><Flag :size="13" /> Priority</button>
        <button class="tq-bulk-b" @click="bulk('resolve')"><CheckCheck :size="13" /> Resolve</button>
        <button v-if="selected.length === 1" class="tq-bulk-b up" @click="singleMove('escalate')"><ArrowUpRight :size="13" /> Escalate tier</button>
        <button v-if="selected.length === 1 && tier > 1" class="tq-bulk-b down" @click="singleMove('descend')"><ArrowDownLeft :size="13" /> Send back</button>
        <button class="tq-bulk-x" @click="selected = []"><X :size="13" /> Clear</button>
      </Motion>
    </Presence>

    <!-- ═══ CIRCUIT (car cards — default) ═══ -->
    <SdPitManifest v-if="view === 'circuit'" :rows="rows" :selected="selected" :queues="queues" :now="now"
      :accent="meta.accent" :loading="loading" :empty="emptyCopy" :empty-icon="Inbox" :cursor="cursor"
      @open="openTicket" @toggle="toggleRow" />

    <!-- ═══ MANIFEST (list) ═══ -->
    <SdTicketTable v-else-if="view === 'list'" :rows="rows" :columns="COLS" :loading="loading" :now="now"
      selectable :selected="selected" :accent="meta.accent"
      :empty="emptyCopy" :empty-icon="Inbox"
      @open="openTicketById" @toggle="toggleRow" @toggle-all="toggleAll" />

    <!-- ═══ YARD BOARD (kanban) ═══ -->
    <div v-else class="tq-kanban">
      <div v-for="col in kanbanCols" :key="col.key" class="tq-col" :style="{ '--cc': col.color }">
        <header class="tq-col-h">
          <span class="tq-col-dot" /><h4>{{ col.label }}</h4><b class="sd-mono">{{ col.rows.length }}</b>
        </header>
        <TransitionGroup name="tq-card" tag="div" class="tq-col-body">
          <button v-for="(t, i) in col.rows" :key="t.id" class="tq-kcard" :style="{ '--i': i }" @click="openTicket(t)">
            <span class="tq-kcard-top sd-mono">
              <b>{{ t.ticket_number }}</b>
              <SdPill kind="priority" :value="t.priority" />
            </span>
            <span class="tq-kcard-subj">{{ t.subject }}</span>
            <span class="tq-kcard-meta sd-mono">
              <span>{{ t.assigned_agent_name || 'UNOWNED' }}</span>
              <span v-if="t.is_escalated" class="esc">L{{ t.escalation_level }}</span>
              <span :class="slaTone(t)">{{ slaShort(t) }}</span>
            </span>
          </button>
          <p v-if="!col.rows.length && !loading" :key="'e-' + col.key" class="tq-col-empty">Clear lane</p>
        </TransitionGroup>
      </div>
    </div>

    <!-- pager (circuit + list views) -->
    <div v-if="view !== 'kanban' && total > limit" class="tq-pager sd-mono">
      <button class="tq-pg" :disabled="page <= 1" @click="page--; fetchBoard()"><ChevronLeft :size="14" /></button>
      <span>{{ page }} / {{ Math.max(1, Math.ceil(total / limit)) }} · {{ total }} tickets</span>
      <button class="tq-pg" :disabled="page * limit >= total" @click="page++; fetchBoard()"><ChevronRight :size="14" /></button>
    </div>

    <!-- ═══ THE ENGINEER'S WALL ═══ -->
    <SdEngineersWall v-if="!stats.no_queues" :stats="stats" :queues="queues" :rows="rows" :roster="roster"
      :advisory="advisory" :stint="stint" :updated-ago="updatedAgo" :now="now" :accent="meta.accent"
      @open="openTicket" @status="onStatus" @crew="onCrew" />

    <!-- ═══ consoles ═══ -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="caps" :me="me" @close="onDrawerClose" @changed="onChanged" />
    <SdSkipModal :ticket="skipTarget" @close="skipTarget = null" @done="onSkipped" />
    <SdTierMoveModal :ticket="moveTarget" :mode="moveMode" :from-tier="tier"
      @close="moveTarget = null" @done="onMoved" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdStewardsModal :open="stewardsOpen" @close="stewardsOpen = false" />
  </div>
</template>

<script setup>
/* SdTierQueueSection — ONE working-queue section for all three platforms (tier prop:
   1|2|3, from the registry). Sealed /queues/tier/{n}/board feeds the manifest/yard
   board + the stats block; /queues/tier/{n}/serve-next powers PLAY MODE (guided
   serving with presence collision-avoidance + skip-with-reason governance); tier
   escalate/descend ride SdTierMoveModal. Lenses filter locally where the board
   already has the rows and re-query where they don't. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Inbox, Search, X, List, Columns3, Rows3, UserPlus, Activity, Flag, CheckCheck,
  ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, Wrench,
  HandHelping, AlarmClockOff, Timer, Flame, User, SkipForward,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdPitWallHero from '../components/SdPitWallHero.vue'
import SdServeNextDeck from '../components/SdServeNextDeck.vue'
import SdPitManifest from '../components/SdPitManifest.vue'
import SdEngineersWall from '../components/SdEngineersWall.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdPill from '../components/SdPill.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdSkipModal from '../modals/SdSkipModal.vue'
import SdTierMoveModal from '../modals/SdTierMoveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdStewardsModal from '../modals/SdStewardsModal.vue'
import {
  tierBoard, serveNext, getMe, listMyTeam, fetchCapabilities, useCapabilities,
  setMyStatus, agentStatusRoster, changeTicketStatus, assignTicket, AGENT_STATUS_META,
  TIER_META, PRIORITIES, TICKET_STATUSES,
} from '@/composables/useSupportDesk'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  tier: { type: Number, default: 1 },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
defineEmits(['go'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { cinematic } = useCinematic()
const reduced = computed(() => !cinematic.value
  && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

const meta = computed(() => TIER_META[props.tier] || TIER_META[1])
const base = computed(() => (props.panel === 'admin' ? '/admin/support-desk' : '/user/support'))
const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'agent', 'sla', 'updated']

/* ── board state ── */
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
const view = ref('circuit')
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
  if (lens.value === 'escalated') p.escalated_only = true
  return p
}
const lastFetched = ref(Date.now())
const fetchErr = ref(false)
const fetchBoard = async () => {
  loading.value = true
  try {
    const r = await tierBoard(props.tier, boardParams())
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
const refresh = () => { page.value = 1; fetchBoard() }
const setQueue = (id) => { queueFilter.value = id; page.value = 1; fetchBoard() }
const updatedAgo = computed(() => Math.max(0, Math.round((now.value - lastFetched.value) / 1000)))
const laneTitle = (qz) => {
  const bits = [`${qz.name} — serve: ${qz.serve_order}, drain ${qz.queue_priority}`]
  if ((qz.max_agent_load || 0) > 0) bits.push(`WIP ${qz.my_active || 0}/${qz.max_agent_load}`)
  if (qz.skill_match === false) bits.push('skill mismatch')
  return bits.join(' · ')
}

/* ── driver status (availability) — serve-next refuses away/offline ── */
const onStatus = async (key) => {
  try {
    await setMyStatus({ status: key })
    stats.value = { ...stats.value, my_status: key }
    toast.success(`Driver status: ${AGENT_STATUS_META[key]?.label || key}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update status') }
}

/* ── race-control advisory: workload rebalance suggestion from the roster ── */
const roster = ref([])
const advisory = computed(() => {
  const online = roster.value.filter(a => ['online', 'focus'].includes(a.status || 'online'))
  if (online.length < 2) return null
  const sorted = [...online].sort((a, b) => (b.open_count || 0) - (a.open_count || 0))
  const hi = sorted[0], lo = sorted[sorted.length - 1]
  if ((hi.open_count || 0) < 5 || (hi.open_count || 0) - (lo.open_count || 0) < 4) return null
  const first = (n) => (n || 'Agent').split(' ')[0]
  return {
    short: `REBALANCE · ${first(hi.name)} ${hi.open_count} / ${first(lo.name)} ${lo.open_count}`,
    long: `${hi.name} carries ${hi.open_count} open while ${lo.name} holds ${lo.open_count} — consider moving work across.`,
  }
})
const switchKanban = () => { view.value = 'kanban'; if (limit.value < 100) { limit.value = 100; page.value = 1; fetchBoard() } }
watch(view, (v) => { if (v !== 'kanban' && limit.value !== 25) { limit.value = 25; page.value = 1; fetchBoard() } })

/* ── lenses (breached/due-soon re-query is overkill — they filter the fetched page,
      counts come from the sealed stats block) ── */
const lenses = computed(() => ([
  { key: 'all', label: 'All work', icon: Inbox, color: meta.value.accent, value: total.value },
  { key: 'mine', label: 'My load', icon: User, color: 'var(--sd-qs-go)', value: stats.value.my_load ?? 0 },
  { key: 'unowned', label: 'Unowned', icon: HandHelping, color: 'var(--sd-qs-warn)', value: stats.value.unassigned ?? 0 },
  { key: 'breached', label: 'Breached', icon: AlarmClockOff, color: 'var(--sd-qs-halt)', value: stats.value.breached ?? 0 },
  { key: 'duesoon', label: 'Due ≤ 4h', icon: Timer, color: 'var(--sd-qs-t2)', value: stats.value.due_soon ?? 0, stat: true },
  { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-qs-halt)', value: stats.value.escalated ?? 0 },
  { key: 'skips', label: 'My skips', icon: SkipForward, color: 'var(--sd-qs-rail)', value: stats.value.skips_today ?? 0, stat: true },
]))
const onLens = (l) => {
  if (l.stat) return
  lens.value = l.key === lens.value ? 'all' : l.key
  page.value = 1
  fetchBoard()
}

/* ── kanban ── */
const KANBAN = [
  { key: 'open', label: 'On the grid', color: 'var(--sd-st-open)', match: (t) => t.status === 'open' },
  { key: 'in_progress', label: 'In the box', color: 'var(--sd-st-progress)', match: (t) => t.status === 'in_progress' },
  { key: 'paused', label: 'Clock stopped', color: 'var(--sd-st-hold)', match: (t) => ['pending_customer', 'pending_vendor', 'on_hold'].includes(t.status) },
  { key: 'escalated', label: 'Sent up', color: 'var(--sd-st-escalated)', match: (t) => t.status === 'escalated' },
  { key: 'resolved', label: 'Chequered', color: 'var(--sd-st-resolved)', match: (t) => ['resolved', 'closed'].includes(t.status) },
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

/* ── play mode (serve-next) ── */
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
const serveOne = async () => {
  serving.value = true
  try {
    const r = await serveNext(props.tier, queueFilter.value || undefined)
    if (r.ticket) {
      served.value = r.ticket
      servedRemaining.value = r.remaining || 0
      servedCount.value += 1
      // The pit box IS the console now — the drawer opens on "Work it" / Reply,
      // so the R/S/E box keys stay live between deals.
      fetchBoard()
    } else {
      served.value = null
      playing.value = false
      toast.info(r.reason === 'all_viewed'
        ? 'Everything left is being viewed by teammates right now.'
        : r.reason === 'no_queues' ? 'No lanes at this tier yet.'
          : r.reason === 'at_capacity' ? 'WIP cap reached — you\'re at capacity on every remaining lane.'
            : 'Queue drained — nothing left to serve. 🏁')
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
const stopPlay = () => { playing.value = false; served.value = null }
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

/* ── pit-box verbs: resolve & next + crew tasks ── */
const resolveAndNext = async (t) => {
  if (!t) return
  try {
    await changeTicketStatus(t.id, { status: 'resolved' })
    toast.success(`${t.ticket_number} resolved — chequered flag 🏁`)
    served.value = null
    drawerId.value = null
    if (playing.value) serveOne(); else fetchBoard()
  } catch (e) {
    // Resolution drop-gates (422) want details — hand off to the console instead.
    toast.info(e?.response?.data?.detail || 'Resolution needs details — opening the console.')
    drawerId.value = String(t.id)
  }
}
const onCrew = async (kind) => {
  const t = served.value
  if (!t) { toast.info('No car in the box — press Serve next first.'); return }
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

/* ── drawer + modals ── */
const drawerId = ref(null)
const skipTarget = ref(null)
const moveTarget = ref(null)
const moveMode = ref('escalate')
const stewardsOpen = ref(false)
const openTicket = (t) => { if (t) drawerId.value = String(t.id) }
const openTicketById = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  // Guided cadence: closing a served ticket rolls the belt forward.
  if (playing.value && served.value) serveOne()
}
const onChanged = () => fetchBoard()

/* ── identity for the drawer / bulk modal ── */
const me = ref({})
const assignees = ref([])
const caps = useCapabilities()

const emptyCopy = computed(() => (stats.value.no_queues
  ? { title: 'No lanes at this tier', blurb: 'An admin can lay one in Queue Config — until then this grid has no track.' }
  : { title: 'Grid clear', blurb: 'No tickets match the current lens — the pit lane is quiet.' }))

/* ── SLA chip helpers (kanban cards) ── */
const slaShort = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'BREACHED' : st === 'due-soon' ? 'DUE SOON' : st === 'met' ? 'MET' : ''
}
const slaTone = (t) => {
  const st = t.sla_resolution_state || t.sla_response_state
  return st === 'breached' ? 'bad' : st === 'due-soon' ? 'warn' : 'ok'
}

/* ── keyboard-first triage (wheel controls) ── */
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
const modalOpen = () => !!(drawerId.value || skipTarget.value || moveTarget.value || bulkOpen.value || stewardsOpen.value)
const onKeys = (e) => {
  const el = document.activeElement
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  if (typing || e.metaKey || e.ctrlKey || e.altKey || modalOpen()) return
  const inBox = playing.value && !!served.value // a car is in the pit box → box verbs win
  const k = e.key
  if (k === '/') {
    e.preventDefault()
    document.querySelector('.tq-search input')?.focus()
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
    moveMode.value = 'escalate'
    moveTarget.value = served.value
  } else if (k === 'u' || k === 'U') {
    onLens({ key: 'unowned' })
  } else if (k === 'Escape' && playing.value) {
    stopPlay()
  }
}

/* ── live wire: the board refreshes itself while you watch ── */
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
watch(() => props.tier, () => {
  lens.value = 'all'; queueFilter.value = ''; page.value = 1; selected.value = []
  stopPlay(); fetchBoard()
})
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })
</script>

<style scoped>
.sd-tq { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* control deck */
.tq-deck { display: flex; flex-direction: column; gap: 10px; }
.tq-lanes { display: flex; gap: 7px; flex-wrap: wrap; }
.tq-lane { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted);
  transition: border-color 0.2s, color 0.2s, background 0.2s; }
.tq-lane b { color: var(--sd-text); }
.tq-lane.on { border-color: var(--lc, var(--tc)); color: var(--sd-text);
  background: color-mix(in srgb, var(--lc, var(--tc)) 12%, transparent); }
.tq-lane-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lc, var(--tc)); }
.tq-lane-skill { display: inline-grid; place-items: center; color: var(--sd-qs-warn); }
.tq-fuel { display: inline-flex; gap: 2px; align-items: center; }
.tq-fuel i { width: 4px; height: 9px; border-radius: 2px; background: color-mix(in srgb, var(--sd-text) 14%, transparent); }
.tq-fuel i.lit { background: var(--lc, var(--tc)); }
.tq-fuel.full i.lit { background: var(--sd-qs-halt); }
.tq-livewire { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 10px;
  border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim);
  border: 1px dashed var(--sd-border); }
.tq-livewire.stale { color: var(--sd-qs-warn); border-color: color-mix(in srgb, var(--sd-qs-warn) 45%, transparent); }
.tq-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-qs-go); animation: tq-live 2.2s ease-in-out infinite; }
.tq-livewire.stale .tq-live-dot { background: var(--sd-qs-warn); }
.tq-kbd { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-dim); white-space: nowrap; }
.tq-kbd kbd { display: inline-block; min-width: 14px; padding: 1px 4px; border-radius: 4px; text-align: center;
  font-family: inherit; font-size: 8.5px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
@keyframes tq-live { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@media (max-width: 860px) { .tq-kbd { display: none; } }

.tq-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.tq-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 200px; max-width: 340px;
  padding: 8px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  color: var(--sd-text-dim); }
.tq-search input { flex: 1; border: none; background: none; outline: none; font-family: inherit; font-size: 12.5px; color: var(--sd-text); }
.tq-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-dim)); }
.tq-search-x { display: grid; place-items: center; border: none; background: none; cursor: pointer; color: var(--sd-text-dim); }
.tq-sel { min-width: 148px; }
.tq-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 11px; border: 1px solid var(--sd-border); background: var(--sd-surface); margin-left: auto; }
.tq-vw { display: grid; place-items: center; width: 32px; height: 30px; border-radius: 8px; cursor: pointer; border: none;
  background: transparent; color: var(--sd-text-muted); }
.tq-vw.on { color: var(--sd-text); background: color-mix(in srgb, var(--tc) 16%, transparent); }

/* bulk bar */
.tq-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--tc) 40%, var(--sd-border));
  background: linear-gradient(120deg, color-mix(in srgb, var(--tc) 9%, var(--sd-surface)), var(--sd-surface)); }
.tq-bulk-n { font-size: 10px; font-weight: 800; letter-spacing: 0.16em; color: var(--tc); }
.tq-bulk-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.tq-bulk-b:hover { border-color: var(--tc); color: var(--sd-text); }
.tq-bulk-b.up { color: var(--sd-qs-t2); }
.tq-bulk-b.down { color: var(--sd-qs-rail); }
.tq-bulk-x { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 7px 10px; border: none;
  background: none; cursor: pointer; font-family: inherit; font-size: 11px; font-weight: 700; color: var(--sd-text-dim); }

/* kanban */
.tq-kanban { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; align-items: start; }
.tq-col { border: 1px solid var(--sd-border); border-radius: 14px; background: color-mix(in srgb, var(--cc) 4%, var(--sd-surface)); }
.tq-col-h { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid var(--sd-border); }
.tq-col-h h4 { margin: 0; flex: 1; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-secondary); }
.tq-col-h b { font-size: 11px; color: var(--cc); }
.tq-col-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cc); }
.tq-col-body { display: flex; flex-direction: column; gap: 7px; padding: 9px; min-height: 60px; }
.tq-kcard { display: flex; flex-direction: column; gap: 5px; padding: 10px 11px; border-radius: 11px; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  animation: sd-deal 0.4s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.03s); }
.tq-kcard:hover { border-color: color-mix(in srgb, var(--cc) 50%, transparent); transform: translateY(-2px);
  box-shadow: 0 12px 26px -14px color-mix(in srgb, var(--cc) 50%, transparent); }
.tq-kcard-top { display: flex; align-items: center; justify-content: space-between; gap: 7px; font-size: 10px; }
.tq-kcard-top b { color: var(--cc); letter-spacing: 0.05em; }
.tq-kcard-subj { font-size: 12px; font-weight: 600; color: var(--sd-text); line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tq-kcard-meta { display: flex; gap: 8px; font-size: 9px; color: var(--sd-text-dim); }
.tq-kcard-meta .esc { color: var(--sd-st-escalated); font-weight: 800; }
.tq-kcard-meta .bad { color: var(--sd-qs-halt); font-weight: 800; }
.tq-kcard-meta .warn { color: var(--sd-qs-warn); font-weight: 700; }
.tq-col-empty { margin: 4px 0; text-align: center; font-size: 10px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.tq-card-enter-active, .tq-card-leave-active { transition: all 0.3s var(--sd-spring); }
.tq-card-enter-from, .tq-card-leave-to { opacity: 0; transform: translateY(6px); }

/* pager */
.tq-pager { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 10.5px;
  letter-spacing: 0.1em; color: var(--sd-text-muted); }
.tq-pg { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary); }
.tq-pg:disabled { opacity: 0.4; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tq-kcard { animation: none; }
}
</style>
