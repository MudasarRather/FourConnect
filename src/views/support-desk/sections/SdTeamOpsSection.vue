<template>
  <div class="sd-to">
    <!-- ═══════════════ LOCKED (not on a support team, not a manager) ═══════════════ -->
    <div v-if="mode === 'locked'" class="to-locked sd-card">
      <span class="to-locked-ring"><UsersRound :size="26" /></span>
      <h3>No crew assigned — yet.</h3>
      <p>Team Tickets lights up when you're added to a support team. Until then your own
        requests live in <b>My Tickets</b>.</p>
      <button class="to-btn primary" @click="goMyTickets"><Ticket :size="14" /> Open My Tickets</button>
    </div>

    <!-- ═══════════════ MANAGER LENS (reports, but no support team) ═══════════════ -->
    <template v-else-if="mode === 'manager'">
      <SdReportsPanel :reports="reportsOverview.reports || []" :totals="reportsOverview.totals"
        :loading="reportsLoading" :now="now" :selected-id="reportFocus"
        :drill-rows="drillRows" :drill-loading="drillLoading" :always-table="true"
        @pick="pickReport" @open="openDrawer" @refresh="refreshReports" />
    </template>

    <!-- ═══════════════ THE SQUAD COMMAND DESK ═══════════════ -->
    <template v-else-if="mode === 'desk'">
      <!-- team switcher (multi-team agents / superusers) -->
      <div v-if="(stats.teams || []).length > 1" class="to-switch" role="tablist" aria-label="My teams">
        <Motion as="button" class="to-chip" :class="{ on: !teamId }" role="tab" :aria-selected="!teamId"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="pickTeam(null)">
          <Layers :size="12" /> All my teams
        </Motion>
        <Motion v-for="tm in stats.teams" :key="String(tm.id)" as="button" class="to-chip"
          :class="{ on: String(teamId) === String(tm.id) }" :style="{ '--tc': tm.color || 'var(--sd-team-core)' }"
          role="tab" :aria-selected="String(teamId) === String(tm.id)"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="pickTeam(String(tm.id))">
          <i class="to-chip-dot" /> {{ tm.name }} <b class="sd-mono">{{ tm.open_count }}</b>
          <Crown v-if="tm.is_lead" :size="11" class="to-chip-crown" />
        </Motion>
      </div>

      <!-- hero console + signature instrument -->
      <SdTeamOpsHero :lenses="lenses" :active-lens="lens" :stats="stats" :loading="statsLoading"
        :taking="taking" :distributing="distributing"
        @pick="onLens" @take-next="takeNext" @distribute="askDistribute" @new-ticket="$emit('new')" @refresh="refreshAll">
        <template #instrument>
          <SdTeamInstrument :stats="stats" :tickets="rows" :now="now" :reduced="reduced" />
        </template>
      </SdTeamOpsHero>

      <!-- reporting-line oversight for a manager who is ALSO on a support team — a
           compact strip UNDER the Squad Command hero (not a second hero) -->
      <SdReportsPanel v-if="caps.isManager && (reportsOverview.reports || []).length" compact
        :reports="reportsOverview.reports" :totals="reportsOverview.totals"
        :loading="reportsLoading" :now="now" :selected-id="reportFocus"
        :drill-rows="drillRows" :drill-loading="drillLoading"
        @pick="pickReport" @open="openDrawer" @refresh="refreshReports" />

      <!-- smart insights -->
      <SdInsightTicker v-if="insights.length" :insights="insights" @act="onInsight" />

      <!-- crew + physics row -->
      <div class="to-mid">
        <div class="to-mid-main sd-card">
          <SdRosterDeck :roster="deckRoster" :active-agent="agentFocus" :loading="statsLoading"
            @pick="focusAgent" @drop="onRosterDrop" />
        </div>
        <div class="to-mid-side">
          <SdFlowBalance :flow="stats.flow || []" />
          <!-- collision watch -->
          <section v-if="(stats.hotspots || []).length" class="to-hot sd-card">
            <p class="to-hot-eyebrow"><Eye :size="12" /> COLLISION WATCH</p>
            <button v-for="h in stats.hotspots" :key="String(h.ticket_id)" class="to-hot-row" @click="openDrawer(h.ticket_id)">
              <span class="to-hot-no sd-mono">{{ h.ticket_number }}</span>
              <span class="to-hot-subj">{{ h.subject }}</span>
              <span class="to-hot-n" :title="h.viewer_names.join(', ')"><Eye :size="10" /> {{ h.viewer_count }}</span>
            </button>
          </section>
          <!-- weekly podium -->
          <section v-if="(stats.leaderboard || []).length" class="to-podium sd-card">
            <p class="to-hot-eyebrow"><Trophy :size="12" /> WEEK'S PODIUM</p>
            <div class="to-podium-rows">
              <div v-for="(l, i) in stats.leaderboard.slice(0, 3)" :key="String(l.agent_id)" class="to-podium-row">
                <b class="to-medal" :class="'p' + i">{{ i + 1 }}</b>
                <span class="to-podium-name">{{ l.name || 'Agent' }}</span>
                <span class="to-podium-n sd-mono">{{ l.resolved_7d }} shipped<template v-if="l.csat_avg != null"> · ★{{ l.csat_avg }}</template></span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- queue toolbar -->
      <div class="to-toolbar">
        <div class="to-search">
          <Search :size="14" />
          <input v-model="q" type="text" placeholder="Search subject or ticket #… ( / )" ref="searchEl" @keydown.escape="q = ''" />
          <button v-if="q" class="to-search-x" @click="q = ''"><X :size="12" /></button>
        </div>
        <span v-if="agentFocus" class="to-focus-chip">
          <UserRound :size="11" /> {{ focusName }}
          <button @click="focusAgent(null)"><X :size="11" /></button>
        </span>
        <div class="to-tools">
          <button class="to-tool" :class="{ on: view === 'table' }" title="Ledger view" @click="view = 'table'"><Rows3 :size="14" /></button>
          <button class="to-tool" :class="{ on: view === 'board' }" title="Crew swimlanes" @click="view = 'board'"><Columns3 :size="14" /></button>
          <button class="to-tool" title="Command palette (⌘K)" @click="paletteOpen = true"><Command :size="14" /></button>
        </div>
      </div>

      <!-- bulk bar -->
      <transition name="to-pop">
        <div v-if="selected.length" class="to-bulk sd-card">
          <span class="to-bulk-n sd-mono">{{ selected.length }} selected</span>
          <button class="to-bulk-btn" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="to-bulk-btn" @click="openBulk('status')"><ArrowRightLeft :size="13" /> Status</button>
          <button class="to-bulk-btn" @click="openBulk('priority')"><ChevronsUp :size="13" /> Priority</button>
          <button class="to-bulk-btn" @click="openBulk('escalate')"><Flame :size="13" /> Escalate</button>
          <button class="to-bulk-btn" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
          <button class="to-bulk-clear" @click="selected = []"><X :size="12" /> Clear</button>
        </div>
      </transition>

      <!-- the queue -->
      <transition name="to-fade" mode="out-in">
        <div v-if="view === 'table'" key="table" class="to-queue">
          <SdTicketTable :rows="rows" :columns="COLS" :loading="listLoading" :now="now"
            accent="var(--sd-team-core)" :selectable="canWork" :selected="selected"
            :sort-by="sortBy" :sort-dir="sortDir" draggable-rows
            :empty="emptyCopy" :empty-icon="UsersRound"
            @open="openDrawer" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" @handoff="openHandoff" />
          <div v-if="total > limit" class="to-pager sd-mono">
            <button class="to-page-btn" :disabled="page <= 1" @click="page--; loadList()"><ChevronLeft :size="14" /></button>
            <span>{{ (page - 1) * limit + 1 }}–{{ Math.min(page * limit, total) }} of {{ total }}</span>
            <button class="to-page-btn" :disabled="page * limit >= total" @click="page++; loadList()"><ChevronRight :size="14" /></button>
          </div>
        </div>
        <div v-else key="board" class="to-queue">
          <SdSquadBoard :tickets="rows" group-by="agent" :squad="boardSquad" :now="now" :capped="total > rows.length"
            @open="openDrawer" @assign="onBoardAssign" @move="onBoardMove" />
        </div>
      </transition>
    </template>

    <!-- ═══════════════ boot shimmer ═══════════════ -->
    <div v-else class="to-boot sd-card">
      <span class="to-boot-bar" /><span class="to-boot-bar w60" /><span class="to-boot-bar w80" />
    </div>

    <!-- drawers + consoles -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent: canWork }" :me="me"
      @close="drawerId = null" @changed="refreshAll" />
    <SdHandoffModal :open="handoffOpen" :ticket="handoffTicketObj" :preset-agent-id="handoffPreset" :me-id="me.id"
      @close="handoffOpen = false" @done="refreshAll" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="selectedTickets" :me="me"
      :assignees="bulkAssignees" :now="now" @close="bulkOpen = false" @done="onBulkDone" />
    <SdFlowMoveModal :open="moveOpen" :ticket="moveTicket" :from="moveTicket?.status" :to="moveTo"
      :agent="canWork" :me="me" @close="moveOpen = false" @done="refreshAll" />
    <SdCommandPalette :open="paletteOpen" :commands="paletteCommands" :tickets="rows"
      @close="paletteOpen = false" @run="c => c.run && c.run()" @open="id => { paletteOpen = false; openDrawer(id) }" />

    <!-- distribute confirm -->
    <SdModalShell :open="distributeOpen" eyebrow="TEAM OPS · DISTRIBUTE" title="Spread the unowned queue" width="440px" @close="distributeOpen = false">
      <div class="to-dist">
        <p class="to-dist-line">
          <Shuffle :size="15" />
          Assign <b>{{ Math.min(stats.unassigned || 0, 25) }}</b> unowned ticket{{ (stats.unassigned || 0) === 1 ? '' : 's' }} across
          <b>{{ workableCrew }}</b> crew member{{ workableCrew === 1 ? '' : 's' }} —
          <b>{{ stats.assignment_method === 'load_balanced' ? 'load-balanced' : 'round-robin' }}</b>, most urgent first.
        </p>
        <p class="to-dist-sub">Every assignment is audited on each ticket's timeline. Teammates get notified.</p>
      </div>
      <template #footer>
        <button class="to-btn" @click="distributeOpen = false">Cancel</button>
        <button class="to-btn primary" :disabled="distributing" @click="doDistribute">
          <component :is="distributing ? LoaderCircle : Shuffle" :size="14" :class="{ spin: distributing }" />
          {{ distributing ? 'Distributing…' : 'Distribute now' }}
        </button>
      </template>
    </SdModalShell>
  </div>
</template>

<script setup>
/* SdTeamOpsSection — the agent-side Team Tickets desk ("Squad Command").
   Backend-sealed via /me/tickets/team-queue (+/stats): tickets ROUTED TO the support
   team(s) the caller is on; superusers roam all teams. Three modes:
     desk    — on ≥1 support team (or superuser): the full cinematic ops desk
     manager — reports but no support team: the legacy manager lens (reports' tickets)
     locked  — neither: a graceful hand-off to My Tickets
   Every action rides the audited single-writers (handoff / claim-next / bulk / moves). */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  UsersRound, UserRound, UserCheck, Ticket, Layers, Crown, Search, X, Rows3, Columns3,
  Command, Eye, Trophy, RefreshCw, Shuffle, Flame, CircleCheck, ChevronsUp, ChevronLeft,
  ChevronRight, ArrowRightLeft, LoaderCircle, Zap, Inbox, Timer, MoonStar, Siren, GitBranch,
} from 'lucide-vue-next'
import SdTeamOpsHero from '../components/SdTeamOpsHero.vue'
import SdTeamInstrument from '../components/SdTeamInstrument.vue'
import SdRosterDeck from '../components/SdRosterDeck.vue'
import SdFlowBalance from '../components/SdFlowBalance.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdReportsPanel from '../components/SdReportsPanel.vue'
import SdSquadBoard from '../components/SdSquadBoard.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdHandoffModal from '../modals/SdHandoffModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdFlowMoveModal from '../modals/SdFlowMoveModal.vue'
import {
  listTeamQueue, fetchTeamQueueStats, claimNextTicket, distributeTeamQueue,
  listMyTeamTickets, getReportsOverview, fetchCapabilities, useCapabilities, getMe,
} from '@/composables/useSupportDesk'
import { useToast } from 'vue-toastification'

defineProps({ agentReveal: { type: Boolean, default: false } })
const emit = defineEmits(['open', 'go', 'changed', 'new'])
const toast = useToast()
const route = useRoute()
const router = useRouter()

/* ── identity + mode ── */
const caps = useCapabilities()
const me = ref({ id: null, name: null })
const mode = ref('boot')                 // boot | desk | manager | locked
const reduced = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'

/* ── desk state ── */
const stats = ref({})
const statsLoading = ref(false)
const rows = ref([])
const total = ref(0)
const listLoading = ref(false)
const page = ref(1)
const limit = 50
const lens = ref('all')
const teamId = ref(null)
const agentFocus = ref(null)
const q = ref('')
const sortBy = ref('updated_at')
const sortDir = ref('desc')
const view = ref('table')
const selected = ref([])
const drawerId = ref(null)
const now = ref(Date.now())
const searchEl = ref(null)
let tick = null
let softTimer = null
let qTimer = null

const canWork = computed(() => caps.isAgent || caps.isAdmin || (stats.value.teams || []).length > 0)

const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'agent', 'viewers', 'sla', 'updated', 'handoff']

/* ── hero lenses (counts ≡ stats; ≡ list filters server-side) ── */
const lenses = computed(() => {
  const s = stats.value
  return [
    { key: 'all', label: 'Queue', value: s.queue ?? 0, icon: Inbox, color: 'var(--sd-team-core)' },
    { key: 'unassigned', label: 'Unowned', value: s.unassigned ?? 0, icon: UserRound, color: 'var(--sd-team-hi)' },
    { key: 'breaching', label: 'Breaching', value: s.breached_active ?? 0, icon: Flame, color: 'var(--sd-team-strain)' },
    { key: 'due_soon', label: 'Due < 4h', value: s.due_4h ?? 0, icon: Timer, color: '#fbbf24' },
    { key: 'idle', label: 'Idle > 24h', value: s.idle_24h ?? 0, icon: MoonStar, color: 'var(--sd-team-idle)' },
    { key: 'escalated', label: 'Escalated', value: s.escalated ?? 0, icon: GitBranch, color: '#fb923c' },
    { key: 'pending', label: 'Waiting', value: (s.pending_customer ?? 0) + (s.pending_vendor ?? 0) + (s.on_hold ?? 0), icon: Timer, color: '#eab308', },
    { key: 'critical', label: 'Critical', value: s.critical ?? 0, icon: Siren, color: 'var(--sd-pri-critical, #ef4444)' },
  ]
})

/* ── roster / board mappings ── */
const deckRoster = computed(() => (stats.value.roster || []))
const boardSquad = computed(() => (stats.value.roster || [])
  .filter(r => r.role !== 'collaborator')
  .map(r => ({ agent_id: r.agent_id, name: r.name, open: r.open, breaching: r.breaching, critical: r.critical })))
const focusName = computed(() => {
  const a = (stats.value.roster || []).find(r => String(r.agent_id) === String(agentFocus.value))
  return a?.name || 'Agent'
})
const workableCrew = computed(() => (stats.value.roster || []).filter(r => r.role !== 'collaborator').length)

/* ── smart insights (client-derived from the sealed stats) ── */
const insights = computed(() => {
  const s = stats.value
  const out = []
  if ((s.breached_active || 0) > 0) out.push({
    id: 'breach', kind: 'breach_risk', severity: 'crit',
    title: `${s.breached_active} ticket${s.breached_active === 1 ? ' is' : 's are'} past SLA on this queue`,
    detail: 'Serve the deepest debt first — open the Breaching lens.', action: 'view' })
  if ((s.unassigned || 0) > 2) out.push({
    id: 'unowned', kind: 'workload', severity: 'warn',
    title: `${s.unassigned} tickets are routed to the crew but own nobody`,
    detail: s.can_distribute ? 'Distribute spreads them round-robin in one click.' : 'Take Next claims the most urgent one.', action: 'view' })
  const strained = (s.roster || []).filter(r => (r.breaching || 0) > 0)
  if (strained.length === 1) out.push({
    id: 'strain', kind: 'workload', severity: 'warn',
    title: `${strained[0].name || 'One teammate'} is carrying every breaching ticket`,
    detail: 'Drop one of their rows on a calmer tile to rebalance.', action: 'view' })
  const f = s.flow || []
  if (f.length >= 3 && f.slice(-3).every(b => (b.inflow || 0) > (b.outflow || 0))) out.push({
    id: 'tide', kind: 'category_spike', severity: 'warn',
    title: 'Inflow has outpaced outflow for 3 straight days',
    detail: 'The queue is growing — consider a triage sweep.', action: 'view' })
  if ((s.idle_24h || 0) > 0) out.push({
    id: 'idle', kind: 'stale', severity: 'info',
    title: `${s.idle_24h} active ticket${s.idle_24h === 1 ? '' : 's'} silent for over 24h`,
    detail: 'The Idle lens lists them oldest-first.', action: 'view' })
  if ((s.hotspots || []).length) out.push({
    id: 'collide', kind: 'merge', severity: 'info',
    title: `${s.hotspots.length} ticket${s.hotspots.length === 1 ? '' : 's'} have two+ agents inside right now`,
    detail: 'Check Collision Watch before double-replying.', action: 'view' })
  return out
})
const onInsight = (ins) => {
  const map = { breach: 'breaching', unowned: 'unassigned', idle: 'idle' }
  if (map[ins.id]) onLens({ key: map[ins.id] })
}

/* ── data loaders ── */
const loadStats = async () => {
  statsLoading.value = true
  try { stats.value = await fetchTeamQueueStats(teamId.value ? { team_id: teamId.value } : {}) }
  catch { /* keep last */ }
  finally { statsLoading.value = false }
}
const loadList = async () => {
  listLoading.value = true
  try {
    const r = await listTeamQueue({
      ...(teamId.value ? { team_id: teamId.value } : {}),
      ...(lens.value && lens.value !== 'all' ? { lens: lens.value } : {}),
      ...(agentFocus.value ? { assigned_agent_id: agentFocus.value } : {}),
      ...(q.value.trim() ? { q: q.value.trim() } : {}),
      sort_by: sortBy.value, sort_dir: sortDir.value, page: page.value, limit,
    })
    rows.value = r.items || []
    total.value = r.total || 0
  } catch { rows.value = []; total.value = 0 }
  finally { listLoading.value = false }
}
const refreshAll = () => { loadStats(); loadList(); emit('changed') }

/* ── lens / team / focus / search ── */
const onLens = (l) => {
  if (l.stat) return
  lens.value = l.key; page.value = 1; selected.value = []
  syncQuery(); loadList()
}
const pickTeam = (id) => {
  teamId.value = id; page.value = 1; selected.value = []; agentFocus.value = null
  syncQuery(); refreshAll()
}
const focusAgent = (id) => {
  agentFocus.value = agentFocus.value === id ? null : id
  page.value = 1; loadList()
}
watch(q, () => { clearTimeout(qTimer); qTimer = setTimeout(() => { page.value = 1; loadList() }, 320) })
const onSort = (key) => {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = 'desc' }
  loadList()
}
const emptyCopy = computed(() => ({
  title: lens.value === 'all' ? 'A quiet deck' : 'Nothing under this lens',
  blurb: lens.value === 'all'
    ? 'No active tickets are routed to your team right now. The untriaged pool lives on the Unassigned desk.'
    : 'Clear — switch lenses or clear the agent focus to widen the net.',
}))
const syncQuery = () => {
  const query = { ...route.query }
  if (teamId.value) query.team = teamId.value; else delete query.team
  if (lens.value && lens.value !== 'all') query.lens = lens.value; else delete query.lens
  router.replace({ query }).catch(() => {})
}

/* ── selection + bulk ── */
const toggleSel = (id) => {
  const s = String(id)
  selected.value = selected.value.includes(s) ? selected.value.filter(x => x !== s) : [...selected.value, s]
}
const toggleAll = () => {
  const ids = rows.value.map(t => String(t.id))
  selected.value = ids.every(id => selected.value.includes(id)) ? [] : ids
}
const selectedTickets = computed(() => rows.value.filter(t => selected.value.includes(String(t.id))))
const bulkOpen = ref(false)
const bulkMode = ref('status')
const openBulk = (m) => { bulkMode.value = m; bulkOpen.value = true }
const bulkAssignees = computed(() => (stats.value.roster || [])
  .filter(r => r.role !== 'collaborator')
  .map(r => ({ value: String(r.agent_id), label: r.name || 'Member' })))
const onBulkDone = ({ updated, skipped } = {}) => {
  bulkOpen.value = false; selected.value = []
  if (updated) toast.success(`${updated} ticket${updated === 1 ? '' : 's'} updated${skipped ? ` · ${skipped} skipped` : ''}`)
  refreshAll()
}

/* ── handoff (modal + drag-to-tile + board lane drop) ── */
/* Owner discipline (mirrors the backend actor gate): a teammate's ASSIGNED ticket is
   re-routed only by its assignee, the team lead (can_distribute), or an admin — peers
   claim unassigned work instead of poaching. */
const canRoute = (t) => !t.assigned_agent_id
  || String(t.assigned_agent_id || '') === String(me.value?.id || '')
  || !!stats.value.can_distribute
const routeDenied = (t) => toast.info(`${t.assigned_agent_name || 'A teammate'} owns this ticket — only they, the team lead, or an admin can move it.`)
const handoffOpen = ref(false)
const handoffTicketObj = ref(null)
const handoffPreset = ref(null)
const openHandoff = (t, preset = null) => {
  if (!canRoute(t)) { routeDenied(t); return }
  handoffTicketObj.value = t; handoffPreset.value = preset; handoffOpen.value = true
}
const onRosterDrop = ({ ticketId, agentId }) => {
  const t = rows.value.find(x => String(x.id) === String(ticketId))
  if (!t) return
  if (String(t.assigned_agent_id || '') === String(agentId)) { toast.info('Already on their desk.'); return }
  openHandoff(t, agentId)
}
const onBoardAssign = ({ id, agentId }) => {
  const t = rows.value.find(x => String(x.id) === String(id))
  if (t) openHandoff(t, agentId ? String(agentId) : null)
}

/* ── status move (board lane drop) ── */
const moveOpen = ref(false)
const moveTicket = ref(null)
const moveTo = ref('')
const onBoardMove = ({ id, status }) => {
  const t = rows.value.find(x => String(x.id) === String(id))
  if (!t || t.status === status) return
  if (!canRoute(t)) { routeDenied(t); return }
  moveTicket.value = t; moveTo.value = status; moveOpen.value = true
}

/* ── take next / distribute ── */
const taking = ref(false)
const takeNext = async () => {
  taking.value = true
  try {
    const t = await claimNextTicket({ lane: 'team', ...(teamId.value ? { team_id: teamId.value } : {}) })
    toast.success(`${t.ticket_number} is yours — ${t.subject}`)
    drawerId.value = String(t.id)
    refreshAll()
  } catch (e) {
    const msg = e?.response?.status === 404 ? 'Queue is clear — nothing unowned to claim.' : (e?.response?.data?.detail || 'Claim failed.')
    e?.response?.status === 404 ? toast.info(msg) : toast.error(msg)
  } finally { taking.value = false }
}
const distributing = ref(false)
const distributeOpen = ref(false)
const askDistribute = () => {
  if (!stats.value.team_id) { toast.info('Pick a single team chip first — distribution runs per team.'); return }
  if (!(stats.value.unassigned > 0)) { toast.info('No unowned tickets to distribute.'); return }
  distributeOpen.value = true
}
const doDistribute = async () => {
  distributing.value = true
  try {
    const r = await distributeTeamQueue({ team_id: stats.value.team_id })
    toast.success(`${r.assigned} ticket${r.assigned === 1 ? '' : 's'} distributed (${r.method === 'load_balanced' ? 'load-balanced' : 'round-robin'})`)
    distributeOpen.value = false
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Distribution failed.') }
  finally { distributing.value = false }
}

/* ── drawer + cross-desk ── */
const openDrawer = (id) => { drawerId.value = String(id) }
const goMyTickets = () => router.push('/user/support/tickets/my')

/* ── command palette ── */
const paletteOpen = ref(false)
const paletteCommands = computed(() => [
  { id: 'take', label: 'Take next ticket', hint: 'Claim the most urgent unowned', icon: Zap, run: takeNext },
  ...lenses.value.map(l => ({ id: 'lens-' + l.key, label: `Lens · ${l.label}`, hint: `${l.value} tickets`, icon: l.icon, run: () => onLens(l) })),
  { id: 'view', label: view.value === 'table' ? 'Switch to crew swimlanes' : 'Switch to ledger view', icon: Columns3, run: () => { view.value = view.value === 'table' ? 'board' : 'table' } },
  { id: 'refresh', label: 'Refresh the desk', icon: RefreshCw, run: refreshAll },
  { id: 'unassigned-desk', label: 'Open the Unassigned desk (triage pool)', icon: Inbox, run: () => router.push('/user/support/tickets/unassigned') },
])
const onKey = (e) => {
  if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); paletteOpen.value = !paletteOpen.value }
  else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); searchEl.value?.focus() }
}

/* ── manager lens (fallback) ── */
/* ── reporting-line oversight (manager) — reports' workload + per-report drill ── */
const reportsOverview = ref({ reports: [], totals: null, is_manager: false })
const reportsLoading = ref(false)
const reportFocus = ref(null)          // selected report user_id (null ⇒ all reports)
const drillRows = ref([])
const drillLoading = ref(false)

const loadReports = async () => {
  if (!caps.isManager) return
  reportsLoading.value = true
  try { reportsOverview.value = await getReportsOverview() || { reports: [], totals: null } }
  catch { reportsOverview.value = { reports: [], totals: null } }
  finally { reportsLoading.value = false }
}
const loadDrill = async () => {
  drillLoading.value = true
  try {
    const params = { page: 1, limit: 100, sort_by: 'updated_at', sort_dir: 'desc' }
    if (reportFocus.value) params.report_id = reportFocus.value
    const r = await listMyTeamTickets(params)
    drillRows.value = r.items || []
  } catch { drillRows.value = [] } finally { drillLoading.value = false }
}
const pickReport = async (uid) => {
  reportFocus.value = uid ? String(uid) : null
  await loadDrill()
}
// Manager surface refresh: reports strip + current drill together.
const refreshReports = async () => { await Promise.all([loadReports(), loadDrill()]) }

/* ── boot ── */
onMounted(async () => {
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onKey)
  getMe().then(m => { me.value = { id: m?.id || null, name: m?.full_name || null } }).catch(() => {})
  try { await fetchCapabilities() } catch { /* */ }
  // deep links
  if (route.query.team) teamId.value = String(route.query.team)
  if (route.query.lens) lens.value = String(route.query.lens)
  await loadStats()
  const onTeam = (stats.value.teams || []).length > 0
  if (onTeam || caps.isAdmin) {
    mode.value = 'desk'
    // a deep-linked team that isn't ours got 403'd server-side — stats came back empty; retry unscoped
    if (teamId.value && !stats.value.team_id && !(stats.value.teams || []).some(t => String(t.id) === String(teamId.value))) {
      teamId.value = null; syncQuery(); await loadStats()
    }
    loadList()
    // A manager who is ALSO on a support team still gets their reporting-line oversight
    // (the reports strip renders atop the Squad desk — it no longer vanishes on joining a team).
    if (caps.isManager) loadReports()
    softTimer = setInterval(() => { if (!document.hidden) { loadStats(); loadList() } }, 30000)
  } else if (caps.isManager) {
    mode.value = 'manager'
    await refreshReports()
  } else {
    mode.value = 'locked'
  }
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(softTimer); clearTimeout(qTimer); window.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.sd-to { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.to-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 10.5px;
  font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sd-team-core); margin: 0 0 8px; }
.to-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-team-core); box-shadow: 0 0 10px var(--sd-team-soft); }
.to-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px;
  font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.to-btn.primary { border: none; background: var(--sd-team-grad); color: #1c1204; }
[data-theme="light"] .to-btn.primary { color: #fff8ec; }
.to-btn.ghost { background: var(--sd-surface); }
.to-btn.sm { padding: 7px 12px; }
.to-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.to-btn.spin :deep(svg), .to-btn .spin { animation: to-rot 1s linear infinite; }
@keyframes to-rot { to { transform: rotate(360deg); } }

/* locked */
.to-locked { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 52px 24px; text-align: center; }
.to-locked-ring { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
  color: var(--sd-team-core); background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); }
.to-locked h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--sd-text); }
.to-locked p { margin: 0 0 8px; max-width: 420px; font-size: 13px; color: var(--sd-text-secondary); }

/* manager lens */
.to-mgr-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 22px; }
.to-mgr-title { display: inline-flex; align-items: center; gap: 10px; font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 6px; }
.to-mgr-title :deep(svg) { color: var(--sd-team-core); }
.to-mgr-sub { font-size: 13px; color: var(--sd-text-secondary); margin: 0; }

/* team switcher */
.to-switch { display: flex; flex-wrap: wrap; gap: 8px; }
.to-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
  font-family: inherit; font-size: 12.5px; font-weight: 650; color: var(--sd-text-secondary);
  background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: border-color 0.18s, color 0.18s; }
.to-chip:hover { border-color: var(--sd-team-brd); color: var(--sd-text); }
.to-chip.on { color: var(--sd-team-core); background: var(--sd-team-soft); border-color: var(--sd-team-brd); }
.to-chip-dot { width: 8px; height: 8px; border-radius: 3px; background: var(--tc, var(--sd-team-core)); }
.to-chip b { font-family: var(--sd-mono); font-size: 11px; }
.to-chip-crown { color: var(--sd-team-core); }

/* mid row */
.to-mid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr); gap: 14px; align-items: start; }
.to-mid-main { position: relative; overflow: hidden; padding: 17px 19px; }
/* cinematic frame: top accent hairline + a slow corner aura behind the crew deck */
.to-mid-main::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none; z-index: 1;
  background: linear-gradient(90deg, transparent, var(--sd-team-core), var(--sd-team-hi), transparent); opacity: 0.6; }
.to-mid-main::after { content: ''; position: absolute; top: -120px; left: -60px; width: 320px; height: 260px; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, var(--sd-team-soft), transparent 68%); filter: blur(6px); animation: to-drift 24s ease-in-out infinite; }
.to-mid-main > * { position: relative; z-index: 1; }
.to-mid-side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (max-width: 1080px) { .to-mid { grid-template-columns: 1fr; } }

/* collision watch + podium — cinematic mini-consoles */
.to-hot, .to-podium { position: relative; overflow: hidden; padding: 15px 16px; display: flex; flex-direction: column; gap: 9px; }
.to-hot::before, .to-podium::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(var(--sd-team-strain), transparent); opacity: 0.8; }
.to-podium::before { background: linear-gradient(var(--sd-team-core), transparent); }
.to-hot-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin: 0; font-family: var(--sd-mono);
  font-size: 10px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-team-core); }
.to-hot-eyebrow :deep(svg) { animation: to-eye-pulse 2.4s ease-in-out infinite; }
.to-hot-row { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 11px; cursor: pointer;
  font-family: inherit; text-align: left; background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
  transition: transform 0.18s var(--sd-spring), border-color 0.16s, box-shadow 0.2s; }
.to-hot-row:hover { border-color: var(--sd-team-brd); transform: translateX(3px); box-shadow: -3px 0 0 -1px var(--sd-team-strain); }
.to-hot-no { font-size: 10.5px; font-weight: 700; color: var(--sd-team-core); flex: 0 0 auto; }
.to-hot-subj { flex: 1; min-width: 0; font-size: 12px; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.to-hot-n { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 750; color: var(--sd-team-strain); }
.to-hot-n :deep(svg) { animation: to-eye-pulse 1.8s ease-in-out infinite; }
.to-podium-rows { display: flex; flex-direction: column; gap: 7px; }
.to-podium-row { display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 9px; transition: background 0.18s; }
.to-podium-row:hover { background: var(--sd-team-soft); }
.to-medal { position: relative; overflow: hidden; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  font-size: 11px; font-weight: 800; color: #1c1204; flex: 0 0 auto; }
/* medal shine sweep */
.to-medal::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.7) 50%, transparent 60%);
  background-size: 250% 100%; animation: to-shine 3.6s ease-in-out infinite; }
.to-medal.p0 { background: var(--sd-team-grad); box-shadow: 0 0 12px -2px var(--sd-team-core); }
.to-medal.p1 { background: linear-gradient(150deg, #e8e8e8, #b8b8b8); }
.to-medal.p2 { background: linear-gradient(150deg, #cfa46a, #a8794a); }
.to-medal.p1::after { animation-delay: 0.5s; }
.to-medal.p2::after { animation-delay: 1s; }
.to-podium-name { flex: 1; font-size: 12.5px; font-weight: 650; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.to-podium-n { font-size: 10.5px; color: var(--sd-text-muted); }

@keyframes to-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, 16px); } }
@keyframes to-eye-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes to-shine { 0% { background-position: 150% 0; } 100% { background-position: -150% 0; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .to-mid-main::after,
  html:not([data-cinematic="on"]) .to-hot-eyebrow :deep(svg),
  html:not([data-cinematic="on"]) .to-hot-n :deep(svg),
  html:not([data-cinematic="on"]) .to-medal::after { animation: none; }
}

/* toolbar */
.to-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.to-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 8px; padding: 9px 13px;
  border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.to-search:focus-within { border-color: var(--sd-team-brd); }
.to-search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit;
  font-size: 13px; color: var(--sd-text); }
.to-search input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-dim)); }
.to-search-x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer;
  border: none; background: var(--sd-surface-glass); color: var(--sd-text-muted); }
.to-focus-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 8px 7px 13px; border-radius: 999px;
  font-size: 12px; font-weight: 650; color: var(--sd-team-core); background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); }
.to-focus-chip button { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; border: none;
  cursor: pointer; background: var(--sd-team-deep-soft); color: inherit; }
.to-tools { display: flex; gap: 6px; }
.to-tool { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 11px; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-muted); transition: all 0.16s; }
.to-tool:hover { color: var(--sd-text); border-color: var(--sd-team-brd); }
.to-tool.on { color: var(--sd-team-core); background: var(--sd-team-soft); border-color: var(--sd-team-brd); }

/* bulk bar */
.to-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; border: 1px solid var(--sd-team-brd); }
.to-bulk-n { font-size: 12px; font-weight: 800; color: var(--sd-team-core); margin-right: 4px; }
.to-bulk-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; cursor: pointer;
  font-family: inherit; font-size: 12px; font-weight: 650; color: var(--sd-text); background: var(--sd-surface);
  border: 1px solid var(--sd-border-strong); transition: border-color 0.15s, transform 0.15s; }
.to-bulk-btn:hover { border-color: var(--sd-team-brd); transform: translateY(-1px); }
.to-bulk-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 10px;
  cursor: pointer; font-family: inherit; font-size: 11.5px; color: var(--sd-text-muted); background: transparent; border: 1px dashed var(--sd-border-strong); }
.to-pop-enter-active, .to-pop-leave-active { transition: all 0.25s var(--sd-spring); }
.to-pop-enter-from, .to-pop-leave-to { opacity: 0; transform: translateY(-6px); }

/* queue + pager */
.to-queue { display: flex; flex-direction: column; gap: 10px; }
.to-fade-enter-active, .to-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.to-fade-enter-from, .to-fade-leave-to { opacity: 0; transform: translateY(6px); }
.to-pager { display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 12px; color: var(--sd-text-muted); }
.to-page-btn { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.to-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* distribute confirm */
.to-dist { display: flex; flex-direction: column; gap: 8px; }
.to-dist-line { display: flex; align-items: flex-start; gap: 9px; margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--sd-text); }
.to-dist-line :deep(svg) { flex: 0 0 auto; margin-top: 2px; color: var(--sd-team-core); }
.to-dist-line b { color: var(--sd-team-core); }
.to-dist-sub { margin: 0; font-size: 12px; color: var(--sd-text-muted); }

/* boot shimmer */
.to-boot { display: flex; flex-direction: column; gap: 10px; padding: 26px; }
.to-boot-bar { height: 16px; border-radius: 8px; background: linear-gradient(100deg, transparent 30%, var(--sd-team-soft) 50%, transparent 70%);
  background-size: 200% 100%; animation: to-shimmer 1.4s linear infinite; }
.to-boot-bar.w60 { width: 60%; } .to-boot-bar.w80 { width: 80%; }
@keyframes to-shimmer { to { background-position: -200% 0; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .to-boot-bar,
  html:not([data-cinematic="on"]) .to-btn.spin :deep(svg),
  html:not([data-cinematic="on"]) .to-btn .spin { animation: none; }
}
</style>
