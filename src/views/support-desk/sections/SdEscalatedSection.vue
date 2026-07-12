<template>
  <div class="eup sd-tw">
    <!-- ══════════════════ THERMAL-UPDRAFT HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdEscalatedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="guided"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @ack-next="ackNext" @guided="toggleGuided" @candidates="goCandidates"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the Thermal Updraft fills the hero as its full-bleed backdrop -->
        <SdEscalationInstrument :tickets="rankOrdered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdEscalatedHero>

    <!-- ══════════════════ TIER LEDGER (strata + reason spectrum) ══════════════════ -->
    <SdTierLedger :tickets="activeSet" :now="now" :active-tier="tierLens" :active-reason="reasonLens"
      :reduced="reduced" @pick="onLedgerPick" @open="openTicket" />

    <!-- ══════════════════ CARRIER LOAD (agents) ══════════════════ -->
    <section v-if="agent && (stats.squad || []).length" class="eup-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="eup-deck sd-card">
      <div class="eup-bar">
        <div class="eup-views">
          <button v-for="v in views" :key="v.key" class="eup-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="eup-tools">
          <button class="eup-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="eup-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="eup-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="eup-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="eup-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="eup-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="eup-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="eup-flt">
      <section v-if="showFilters" class="eup-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="statusOptions" /></div>
        <div class="flt-field"><label>Direction</label><SdSelect v-model="typeSelect" :options="typeOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Created</label>
          <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="eup-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="eup-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="eup-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="eup-btn sm accent" :disabled="bulkBusy" @click="doBulkEscAck"><ShieldCheck :size="13" /> Acknowledge</button>
          <button class="eup-btn sm" @click="openDeEscalate()"><TrendingDown :size="13" /> De-escalate</button>
          <button class="eup-btn sm" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
          <button class="eup-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Raise again</button>
          <button class="eup-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="eup-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="eup-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="ChevronsUp"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" @esc-ack="escAckOne" />
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table) -->
    <div v-if="view === 'table' && pages > 1" class="eup-pager">
      <button class="eup-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
      <button class="eup-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- drawer + consoles + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :now="now"
      :assignees="assignees" @close="escalateTarget = null" @done="onEscalated" />
    <SdDeEscalateModal :open="deEscOpen" :tickets="deEscTickets" @close="deEscOpen = false" @done="onDeEscalated" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdEscalatedSection — "THE THERMAL UPDRAFT" (chain-of-command escalation console).
  Composition: SdEscalatedHero (full-bleed updraft instrument, gallery pick 06) →
  SdTierLedger (tier strata + reason spectrum) → squad → control deck → table/SLA/load →
  adaptive drawer + SdEscalateConsole (raise again) + SdDeEscalateModal + bulk + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'escalated'})
  (backend team-sealed; is_escalated == true incl. terminal history rows) + the sealed
  /me/tickets/escalated/stats rollup (by_level/eMTTA/dwell/candidates/squad). Opening
  this tab also runs the backend SLA-breach auto-escalation + response-overdue sweeps.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, ChevronsUp,
  ChevronLeft, ChevronRight, ShieldCheck, TrendingDown, Flame, UserX, BellRing, Timer,
  Bot, Layers2, Table, Gauge, Users,
} from 'lucide-vue-next'
import SdEscalatedHero from '../components/SdEscalatedHero.vue'
import SdEscalationInstrument from '../components/SdEscalationInstrument.vue'
import SdTierLedger from '../components/SdTierLedger.vue'
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
import SdDeEscalateModal from '../modals/SdDeEscalateModal.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchEscalationStats, fetchCommandCenterStats, fetchMyWorkbench,
  ackEscalation, bulkEscalationAck,
  getMe, listMyTeam, loadPickers, usePickers,
  ESCALATION_TYPES, escReasonLabel, STALE_ESCALATION_HOURS, priorityLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'escalated' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ACCENT = 'var(--sd-esc-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views ── */
const views = computed(() => {
  const v = [{ key: 'table', label: 'Escalation board', icon: Table }, { key: 'sla', label: 'SLA', icon: Gauge }]
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
const refine = ref('active')     // hero lens: active|t2|t3|unacked|overdue|breaching|noowner|auto
const tierLens = ref('')          // ledger lane: ''|t1|t2|t3 (mirrors refine when tier-shaped)
const reasonLens = ref('')        // ledger spectrum: reason_code
const escType = ref('')           // hierarchical|functional
const sortBy = ref('rank')
const sortDir = ref('asc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})            // /me/tickets/escalated/stats
const cmdStats = ref({})         // command-center/workbench (insight ticker)
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'escalated',
  q: f.q || undefined,
  priority: f.priority || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: 'escalation_level', sort_dir: 'desc',
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
  try { stats.value = await fetchEscalationStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── escalation telemetry helpers ── */
const HOUR = 3600000
const ep = (v) => (v ? new Date(v).getTime() : 0)
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const isBreached = (t) => !!(t.sla_response_breached || t.sla_resolution_breached)
const isUnacked = (t) => !isTerminal(t) && !t.escalation_acknowledged_at
const isOverdue = (t) => !isTerminal(t) && (t.esc_response_overdue != null
  ? !!t.esc_response_overdue
  : (!t.escalation_acknowledged_at && !!t.escalation_response_due_at && ep(t.escalation_response_due_at) < now.value))
const dwellMs = (t) => (Number.isFinite(t.time_since_escalated_ms) && t.time_since_escalated_ms != null
  ? t.time_since_escalated_ms : (ep(t.escalated_at) ? Math.max(0, now.value - ep(t.escalated_at)) : 0))
const lvl = (t) => t.escalation_level || 1

const PRED = {
  active: t => !isTerminal(t),
  t1: t => !isTerminal(t) && lvl(t) === 1,
  t2: t => !isTerminal(t) && lvl(t) === 2,
  t3: t => !isTerminal(t) && lvl(t) >= 3,
  unacked: isUnacked,
  overdue: isOverdue,
  breaching: t => !isTerminal(t) && isBreached(t),
  noowner: t => !isTerminal(t) && !t.assigned_agent_id,
  auto: t => !isTerminal(t) && !!(t.auto_escalated || t.auto_escalated_at),
  stalled: t => !isTerminal(t) && dwellMs(t) >= STALE_ESCALATION_HOURS * HOUR,
}

/* ── derived sets ── */
const activeSet = computed(() => workingSet.value.filter(PRED.active))
const lensFiltered = computed(() => workingSet.value
  .filter(PRED[refine.value] || PRED.active)
  .filter(t => (reasonLens.value ? (t.escalation_reason_code || 'unset') === reasonLens.value : true))
  .filter(t => (escType.value ? (t.escalation_type || '') === escType.value : true)))

/* Updraft rank: response-clock lapsed first → unacked → highest tier → longest at tier. */
const rankScore = (t) => {
  let s = 0
  if (!isOverdue(t)) s += 1e15
  if (!isUnacked(t)) s += 1e14
  s += (9 - Math.min(9, lvl(t))) * 1e12
  s -= Math.min(dwellMs(t), 90 * 24 * HOUR) / 100
  return s
}
const sortVal = (t, key) => {
  if (key === 'rank') return rankScore(t)
  if (key === 'priority') return { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }[t.priority] || 0
  if (key === 'tier' || key === 'escalation_level') return lvl(t)
  if (key === 'escAck') return t.escalation_acknowledged_at ? ep(t.escalation_acknowledged_at) : 0
  if (key === 'escDue') return ep(t.escalation_response_due_at) || Number.MAX_SAFE_INTEGER
  if (key === 'dwell') return dwellMs(t)
  if (key === 'sla' || key === 'resolution_due_at') return ep(t.resolution_due_at) || Number.MAX_SAFE_INTEGER
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

/* instrument feed — active escalations in updraft rank order */
const rankOrdered = computed(() => activeSet.value.slice().sort((a, b) => rankScore(a) - rankScore(b)))

/* ── lenses ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'active', label: 'In ascent', icon: ChevronsUp, color: 'var(--sd-esc-core)', value: stats.value.active_escalations ?? cnt(PRED.active) },
  { key: 't2', label: 'Tier 2', icon: Layers2, color: 'var(--sd-esc-hi)', value: (stats.value.by_level || {})['2'] ?? cnt(PRED.t2) },
  { key: 't3', label: 'Tier 3+', icon: Flame, color: 'var(--sd-esc-deep)', value: (stats.value.by_level || {})['3+'] ?? cnt(PRED.t3) },
  { key: 'unacked', label: 'Unacked', icon: BellRing, color: 'var(--sd-esc-auto)', value: stats.value.unacked ?? cnt(PRED.unacked) },
  { key: 'overdue', label: 'Ack overdue', icon: Timer, color: 'var(--sd-danger)', value: stats.value.esc_response_overdue ?? cnt(PRED.overdue) },
  { key: 'breaching', label: 'SLA breaching', icon: Flame, color: 'var(--sd-crit-core)', value: stats.value.breaching_sla ?? cnt(PRED.breaching) },
  { key: 'noowner', label: 'No owner', icon: UserX, color: 'var(--sd-warning)', value: stats.value.no_owner ?? cnt(PRED.noowner) },
  { key: 'auto', label: 'Auto-raised', icon: Bot, color: 'var(--sd-esc-auto)', value: stats.value.auto_escalated_count ?? cnt(PRED.auto) },
  { key: 'deesc', label: 'Stood down today', icon: TrendingDown, color: 'var(--sd-esc-ack)', value: stats.value.de_escalated_today ?? 0, stat: true },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'active' : l.key
  tierLens.value = ['t1', 't2', 't3'].includes(refine.value) ? refine.value : ''
  page.value = 1
}
const onLedgerPick = ({ kind, value }) => {
  if (kind === 'tier') { tierLens.value = value; refine.value = value || 'active' }
  else if (kind === 'reason') reasonLens.value = value
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { t1: 'Tier 1', t2: 'Tier 2', t3: 'Tier 3+', unacked: 'Unacknowledged', overdue: 'Ack overdue', breaching: 'SLA breaching', noowner: 'No owner', auto: 'Auto-escalated', stalled: 'Stalled at tier' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'active') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'active'; tierLens.value = '' } })
  if (reasonLens.value) out.push({ key: 'reason', label: `Reason · ${reasonLens.value === 'unset' ? 'Uncoded' : escReasonLabel(reasonLens.value)}`, clear: () => (reasonLens.value = '') })
  if (escType.value) out.push({ key: 'type', label: `Direction · ${escType.value}`, clear: () => (escType.value = '') })
  return out
})
const clearRefine = () => { refine.value = 'active'; tierLens.value = ''; reasonLens.value = ''; escType.value = '' }

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const statusOptions = computed(() => [{ value: '', label: 'All statuses' },
  ...['escalated', 'open', 'in_progress', 'pending_customer', 'pending_vendor', 'on_hold', 'resolved', 'closed'].map(s => ({ value: s, label: statusLabel(s) }))])
const typeOptions = computed(() => [{ value: '', label: 'Both directions' }, ...ESCALATION_TYPES.map(t => ({ value: t.value, label: t.label }))])
const typeSelect = computed({ get: () => escType.value, set: (v) => { escType.value = v || ''; page.value = 1 } })
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

/* ── ESCALATION ACK (the signature action) ── */
const ackBusy = ref(false)
const escAckOne = async (t) => {
  if (ackBusy.value) return
  ackBusy.value = true
  try { await ackEscalation(t.id); toast.success(`${t.ticket_number} — the receiving tier is on it`); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge the escalation') }
  finally { ackBusy.value = false }
}
const ackNext = () => {
  const next = rankOrdered.value.find(isUnacked)
  if (!next) { toast.info('Every active escalation is acknowledged. Coverage 100%.'); return }
  escAckOne(next)
}
const bulkBusy = ref(false)
const doBulkEscAck = async () => {
  if (!selected.value.length || bulkBusy.value) return
  bulkBusy.value = true
  try {
    const r = await bulkEscalationAck([...selected.value])
    if (r.updated) toast.success(`${r.updated} escalation${r.updated === 1 ? '' : 's'} acknowledged`)
    if (r.skipped) toast.info(`${r.skipped} skipped (already acked / not escalated)`)
    const denied = (r.results || []).filter(x => x.ok === false).length
    if (denied) toast.warning(`${denied} outside your team's scope`)
    selected.value = []
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk acknowledge failed') } finally { bulkBusy.value = false }
}

/* ── guided sweep — serve the hottest escalation, one at a time ── */
const guided = ref(false)
const served = ref(new Set())
const serveNext = () => {
  const next = rankOrdered.value.find(t => !served.value.has(String(t.id)))
  if (!next) {
    guided.value = false; served.value = new Set()
    toast.success('Guided sweep complete — every active escalation has been reviewed.')
    return
  }
  served.value.add(String(next.id))
  openTicket(next.id)
}
const toggleGuided = () => {
  guided.value = !guided.value
  if (guided.value) { served.value = new Set(); serveNext() }
}

/* ── raise again (SdEscalateConsole) + de-escalate + resolve + bulk ── */
const escalateTarget = ref(null)
const onEscalated = () => { escalateTarget.value = null; selected.value = []; refreshAll() }

const deEscOpen = ref(false)
const deEscTickets = ref([])
const openDeEscalate = (t = null) => {
  deEscTickets.value = t ? [t] : workingSet.value.filter(x => selected.value.includes(String(x.id)))
  if (!deEscTickets.value.length) { toast.info('Select tickets first.'); return }
  deEscOpen.value = true
}
const onDeEscalated = () => { deEscOpen.value = false; selected.value = []; refreshAll() }

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

/* ── drawer + insights + cross-links ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => {
  drawerId.value = null
  if (guided.value) serveNext()
}
const base = computed(() => (route.path.startsWith('/admin') ? '/admin/support-desk' : '/user/support'))
const goCandidates = () => router.push(`${base.value}/tickets/breached`)
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
/* Escalation-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  const od = workingSet.value.filter(PRED.overdue)
  if (od.length) out.push({ id: 'esc-od', kind: 'breach_risk', severity: 'crit',
    title: `${od.length} escalation${od.length === 1 ? '' : 's'} past the response clock`,
    detail: 'The receiving tier has not acknowledged in time.', action: 'view', ticket_ids: od.map(t => t.id) })
  const stalled = workingSet.value.filter(PRED.stalled)
  if (stalled.length) out.push({ id: 'esc-stall', kind: 'stale', severity: 'warn',
    title: `${stalled.length} stalled ${STALE_ESCALATION_HOURS}h+ at tier`,
    detail: 'Long dwell without resolution — consider raising again or standing down.', action: 'view', ticket_ids: stalled.map(t => t.id) })
  const frozen = workingSet.value.filter(t => !isTerminal(t) && t.sla_paused_since)
  if (frozen.length) out.push({ id: 'esc-frozen', kind: 'pending_nudge', severity: 'info',
    title: `${frozen.length} escalated with a frozen SLA clock`,
    detail: 'Waiting on customer/vendor/hold — the escalation stands but the clock is stopped.', action: 'view', ticket_ids: frozen.map(t => t.id) })
  if ((stats.value.sla_breach_candidates || 0) > 0) out.push({ id: 'esc-cand', kind: 'breach_risk', severity: 'warn',
    title: `${stats.value.sla_breach_candidates} breached ticket${stats.value.sla_breach_candidates === 1 ? '' : 's'} not yet escalated`,
    detail: 'Unowned or response-breached tickets the auto-sweep leaves for a human call.', action: 'view', ticket_ids: [] })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'ack-next', label: 'Acknowledge next escalation', icon: ShieldCheck, run: ackNext },
  { key: 'guided', label: guided.value ? 'Exit guided sweep' : 'Guided sweep — serve hottest', icon: Check, run: toggleGuided },
  { key: 'lens-overdue', label: 'Lens · Ack overdue', icon: Timer, run: () => (refine.value = 'overdue') },
  { key: 'lens-t3', label: 'Lens · Tier 3+', icon: Flame, run: () => { refine.value = 't3'; tierLens.value = 't3' } },
  { key: 'candidates', label: 'Review breach candidates (Breached tab)', icon: Flame, run: goCandidates },
  { key: 'view-sla', label: 'View · SLA', icon: Gauge, run: () => (view.value = 'sla') },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('escalated').columns || [])
const emptyText = computed(() => refine.value === 'active' && !reasonLens.value && !escType.value
  ? (getTicketScope('escalated').empty || { title: 'Nothing escalated', blurb: 'The column runs cool.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the full board.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Tier', 'Direction', 'Reason code', 'Raised by', 'Raised to', 'Tier acked by', 'Tier acked at', 'Ack deadline', 'Auto', 'Agent', 'Status', 'Escalated at', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), `L${lvl(t)}`, t.escalation_type || '',
    t.escalation_reason_code || '', t.escalated_by_name || '', t.escalated_to_team_name || '',
    t.escalation_acknowledged_by_name || '', t.escalation_acknowledged_at || '', t.escalation_response_due_at || '',
    t.auto_escalated ? 'yes' : '', t.assigned_agent_name || '', statusLabel(t.status), t.escalated_at || '', t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'escalated-desk.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
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
.eup { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.eup-squad { padding: 16px 18px; }
.eup-insights { align-self: stretch; }

.eup-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.eup-btn:hover { border-color: var(--sd-esc-core); }
.eup-btn:active { transform: translateY(1px); }
.eup-btn.on { border-color: var(--sd-esc-core); color: var(--sd-esc-core); background: var(--sd-esc-soft); }
.eup-btn.accent { border-color: color-mix(in srgb, var(--sd-esc-ack) 55%, transparent); color: #06281c; background: linear-gradient(135deg, #6ee7b7, var(--sd-esc-ack)); }
[data-theme="light"] .eup-btn.accent { color: #064e3b; }
.eup-btn.sm { padding: 7px 12px; font-size: 12px; }
.eup-btn.icon { padding: 7px 9px; }
.eup-btn.ghost { background: transparent; }
.eup-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.eup-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-esc-core); color: #fff; font-size: 10px; font-weight: 800; }

.eup-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.eup-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.eup-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.eup-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.eup-view:hover { color: var(--sd-text); }
.eup-view.on { color: var(--sd-esc-core); background: var(--sd-esc-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-esc-core) 40%, transparent); }
.eup-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.eup-count { font-size: 12px; color: var(--sd-text-dim); }

.eup-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-esc-core) 44%, transparent); background: var(--sd-esc-soft); color: var(--sd-esc-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.eup-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.eup-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-esc-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-esc-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.eup-stage { min-height: 40px; }
.eup-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.eup-flt-enter-active, .eup-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.eup-flt-enter-from, .eup-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .eup-tools { margin-left: 0; } }
</style>
