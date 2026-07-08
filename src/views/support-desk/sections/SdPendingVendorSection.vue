<template>
  <div class="pvn sd-tw">
    <!-- ══════════════════ FULL-BLEED COMMAND STAGE (Ground-Station Uplink) ══════════════════ -->
    <SdVendorCommandStage
      :lenses="lenses" :active-lens="refine" :overdue="overdueCount" :adv-count="activeFilterCount" :loading="wsLoading"
      @new="$emit('new')" @refresh="refreshAll" @filters="showFilters = !showFilters"
      @commands="cmdOpen = true" @pick="onLens" @chase="chaseHot"
    >
      <template #instrument>
        <SdVendorOrbital :pending="total" :overdue="overdueCount" :reactivated-today="reactivatedToday"
          :oldest-wait-ms="oldestWaitMs" :reduced="reduced" />
      </template>
    </SdVendorCommandStage>

    <!-- ══════════════════ CONTROL ROOM — vendor lanes │ hand-off cadence ══════════════════ -->
    <div class="pvn-top" :class="{ solo: !agent }">
      <!-- LEFT: vendor lanes rail (agent only) -->
      <SdVendorLaneRail v-if="agent" class="pvn-rail" :vendors="scorecard" :active="vendorFilter" :reduced="reduced" @pick="onVendorPick" />
      <!-- RIGHT: cadence -->
      <SdVendorDeck class="pvn-cad" :tickets="lensFiltered" :now="now" :active="refine" :reduced="reduced" @pick="onRefine" />
    </div>

    <!-- ══════════════════ DISPATCH BOARD (full width) ══════════════════ -->
    <div class="pvn-board">
        <!-- smart insight strip -->
        <SdInsightTicker v-if="(stats.insights || []).length" class="pvn-insights" :insights="stats.insights || []" :reduced="reduced" @act="onInsight" />

        <!-- control deck -->
        <section class="pvn-deck sd-card">
          <div class="pvn-bar">
            <div class="pvn-views">
              <button v-for="v in views" :key="v.key" class="pvn-view" :class="{ on: view === v.key }" @click="view = v.key">
                <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
              </button>
            </div>
            <SdGroupByControl v-if="view === 'swimlanes'" v-model="groupBy" />
            <div class="pvn-tools">
              <button class="pvn-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
                <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="pvn-fbadge">{{ activeFilterCount }}</span>
              </button>
              <button class="pvn-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
              <button v-if="agent" class="pvn-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
              <span class="pvn-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
            </div>
          </div>

          <div v-if="refineTokens.length" class="pvn-tokens">
            <span class="tok-lbl sd-mono">REFINED</span>
            <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
            <button class="tok clear" @click="clearRefine">Clear all</button>
          </div>
        </section>

        <!-- saved views -->
        <div v-if="savedViews.length || activeFilterCount" class="pvn-views-bar">
          <Bookmark :size="13" class="vb-ico" />
          <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
            {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared">·</span>
            <X :size="11" class="vb-x" @click.stop="removeView(v)" />
          </button>
          <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
        </div>

        <!-- filters -->
        <Transition name="pvn-flt">
          <section v-if="showFilters" class="pvn-filters sd-card">
            <div class="flt-q">
              <Search :size="14" />
              <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
              <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
            </div>
            <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="opt(PRIORITIES, 'All priorities')" /></div>
            <div v-if="agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
            <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
            <div class="flt-field flt-date"><label>Created</label>
              <SdDatePicker v-model="f.created_from" placeholder="From" @change="reload" />
              <span>→</span>
              <SdDatePicker v-model="f.created_to" placeholder="To" @change="reload" />
            </div>
            <div class="flt-actions">
              <button class="pvn-btn sm" @click="reload"><Check :size="13" /> Apply</button>
              <button v-if="activeFilterCount" class="pvn-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
            </div>
          </section>
        </Transition>

        <!-- bulk bar (agents) -->
        <Presence>
          <Motion v-if="agent && selected.length" class="pvn-bulk sd-card"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
            <span class="bulk-n">{{ selected.length }} selected</span>
            <div class="bulk-actions">
              <button class="pvn-btn sm accent" @click="chaseSelected"><Send :size="13" /> Chase</button>
              <button class="pvn-btn sm" @click="bringBackSelected"><CornerUpLeft :size="13" /> Bring back</button>
              <button class="pvn-btn sm" @click="openBulk('assign')"><UserCheck :size="13" /> Assign</button>
              <button class="pvn-btn sm" @click="openBulk('escalate')"><ChevronsUp :size="13" /> Escalate</button>
              <button class="pvn-btn sm" @click="openBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
            </div>
            <button class="pvn-btn sm ghost" @click="selected = []">Clear</button>
          </Motion>
        </Presence>

        <!-- views -->
        <div class="pvn-stage" :key="view">
          <SdTicketTable v-if="view === 'table'"
            :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
            :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
            :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Truck"
            @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />
          <SdTicketsBoard v-else-if="view === 'board'" :tickets="filtered" :columns="boardCols" :now="now" :capped="wsCapped" @open="openTicket" @move="onMove" />
          <SdSquadBoard v-else-if="view === 'swimlanes'" :tickets="filtered" :group-by="groupBy" :squad="stats.squad || []"
            :now="now" :capped="wsCapped" @open="openTicket" @assign="onAssign" @move="onMove" />
          <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
          <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
        </div>

        <!-- pagination (table) -->
        <div v-if="view === 'table' && pages > 1" class="pvn-pager">
          <button class="pvn-btn sm" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /> Prev</button>
          <span class="pg-info sd-mono">Page {{ page }} of {{ pages }}</span>
          <button class="pvn-btn sm" :disabled="page >= pages" @click="page++">Next <ChevronRight :size="14" /></button>
        </div>
    </div>

    <!-- adaptive drawer + rich action modals + command palette -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="drawerId = null" @changed="refreshAll" />
    <SdVendorDispatchModal :open="!!vendorTarget" :ticket="vendorTarget" :mode="vendorMode" :assignees="assignees"
      @close="vendorTarget = null" @done="onVendorDone" />
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
  SlidersHorizontal, Rows3, Download, Search, X, Check, UserCheck, CircleCheck, Send, CornerUpLeft, ChevronsUp,
  Bookmark, BookmarkPlus, ChevronLeft, ChevronRight, Layers, Truck, BellOff, AlarmClock,
  Table, LayoutGrid, Gauge, Users, Rows4,
} from 'lucide-vue-next'
import SdVendorCommandStage from '../components/SdVendorCommandStage.vue'
import SdVendorOrbital from '../components/SdVendorOrbital.vue'
import SdVendorLaneRail from '../components/SdVendorLaneRail.vue'
import SdVendorDeck from '../components/SdVendorDeck.vue'
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
import SdVendorDispatchModal from '../modals/SdVendorDispatchModal.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdFlowMoveModal from '../modals/SdFlowMoveModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchCommandCenterStats, fetchMyWorkbench, managerAssignTicket,
  bulkVendorChase, bulkVendorBringBack, fetchVendorScorecard,
  getMe, listMyTeam, loadPickers, usePickers, listSavedViews, createSavedView, deleteSavedView,
  PRIORITIES, priorityLabel, vendorReasonLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'pending-vendor' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
const emit = defineEmits(['new', 'go'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const ACCENT = 'var(--sd-vendor-signal)'
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
  const v = [{ key: 'table', label: 'Queue', icon: Table }, { key: 'board', label: 'Relay board', icon: LayoutGrid }]
  if (agent.value) v.push({ key: 'swimlanes', label: 'Swimlanes', icon: Rows4 })
  v.push({ key: 'sla', label: 'SLA', icon: Gauge })
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const groupBy = ref('agent')
const density = ref('comfortable')
const showFilters = ref(false)
const cmdOpen = ref(false)

/* board = the RELAY lanes: awaiting vendor → bring back (in progress) → resolve (drop-gates). */
const boardCols = [
  { key: 'pending_vendor', label: 'Awaiting vendor', color: 'var(--sd-vendor-steel)' },
  { key: 'in_progress', label: 'Bring back', color: 'var(--sd-st-progress)' },
  { key: 'resolved', label: 'Resolve', color: 'var(--sd-st-resolved)', resolve: true },
]

/* ── server filters ── */
const f = reactive({ q: '', priority: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const activeFilterCount = computed(() => ['priority', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements ── */
const refine = ref('all')          // all|fresh|aging|stale|overdue|no_chase|chased_today
const vendorFilter = ref('')       // scorecard vendor-name filter
const sortBy = ref('updated_at')
const sortDir = ref('asc')         // oldest-waiting first
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})
const scorecard = ref([])
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'pending_vendor',
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
  } catch { workingSet.value = []; total.value = 0; wsCapped.value = false } finally { wsLoading.value = false }
}
const loadStats = async () => {
  try { stats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() }
  catch { stats.value = {} }
}
const loadScorecard = async () => {
  if (!agent.value) { scorecard.value = []; return }
  try { const r = await fetchVendorScorecard(); scorecard.value = r.vendors || [] }
  catch { scorecard.value = [] }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats(); loadScorecard() }

/* ── vendor wait helpers (from hand-off / router-attached vendor_wait_ms) ── */
const DAY = 86400000
const ep = (v) => (v ? new Date(v).getTime() : 0)
const waitMs = (t) => {
  if (Number.isFinite(t.vendor_wait_ms) && t.vendor_wait_ms != null) return Math.max(0, t.vendor_wait_ms)
  const r = ep(t.vendor_dispatched_at) || ep(t.pending_since) || ep(t.updated_at) || ep(t.created_at)
  return r ? Math.max(0, now.value - r) : 0
}
const isOverdue = (t) => (t.vendor_overdue != null ? !!t.vendor_overdue : (ep(t.vendor_due_at) ? now.value > ep(t.vendor_due_at) : false))
const isToday = (v) => { const ts = ep(v); if (!ts) return false; const d = new Date(ts), n = new Date(now.value); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate() }

const PRED = {
  all: () => true,
  fresh: t => waitMs(t) < DAY,
  aging: t => waitMs(t) >= DAY && waitMs(t) < 3 * DAY,
  stale: t => waitMs(t) >= 3 * DAY,
  overdue: t => isOverdue(t),
  no_chase: t => !(Number(t.vendor_reminder_count) || 0),
  chased_today: t => isToday(t.last_vendor_reminder_at),
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value
  .filter(PRED[refine.value] || PRED.all)
  .filter(t => !vendorFilter.value || (t.vendor_name || '') === vendorFilter.value))
const PRI_ORD = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const sortVal = (t, key) => {
  if (key === 'priority') return PRI_ORD[t.priority] || 0
  if (key === 'vendorWait') return waitMs(t)
  if (key === 'vendorEta') return ep(t.vendor_due_at)
  if (key === 'vendor') return (t.vendor_name || '').toLowerCase()
  if (['created_at', 'updated_at', 'vendor_dispatched_at'].includes(key)) return t[key] ? new Date(t[key]).getTime() : 0
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

/* ── instrument + lens counts ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const overdueCount = computed(() => cnt(PRED.overdue))
const neverChasedCount = computed(() => cnt(PRED.no_chase))
const oldestWaitMs = computed(() => workingSet.value.reduce((m, t) => Math.max(m, waitMs(t)), 0))
const reactivatedToday = computed(() => Number(stats.value.reactivated_today) || 0)

const lenses = computed(() => [
  { key: 'all', label: 'Awaiting', icon: Layers, color: 'var(--sd-vendor-signal)', value: total.value },
  { key: 'overdue', label: 'Overdue vs ETA', icon: AlarmClock, color: 'var(--sd-vendor-overdue)', value: overdueCount.value },
  { key: 'no_chase', label: 'Never chased', icon: BellOff, color: 'var(--sd-amber-strong)', value: neverChasedCount.value },
  { key: 'chased_today', label: 'Chased today', icon: Send, color: 'var(--sd-vendor-return)', value: cnt(PRED.chased_today) },
  { key: 'reactivated', label: 'Came back today', icon: CornerUpLeft, color: 'var(--sd-vendor-return)', value: reactivatedToday.value, nav: 'open' },
  { key: 'escalated', label: 'Escalated', icon: ChevronsUp, color: 'var(--sd-st-escalated)', value: Number(stats.value.escalated) || 0, nav: 'escalated' },
])
const onLens = (l) => { if (l.nav) { goTab(l.nav); return } refine.value = refine.value === l.key ? 'all' : l.key; page.value = 1 }
const onRefine = (key) => { refine.value = refine.value === key ? 'all' : (key || 'all'); page.value = 1 }
const onVendorPick = (name) => { vendorFilter.value = name || ''; page.value = 1 }

/* refinement tokens */
const REFINE_LABEL = { fresh: 'Wait · <1d', aging: 'Wait · 1–3d', stale: 'Wait · >3d', overdue: 'Overdue vs ETA', no_chase: 'Never chased', chased_today: 'Chased today' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => (refine.value = 'all') })
  if (vendorFilter.value) out.push({ key: 'vendor', label: `Vendor · ${vendorFilter.value}`, clear: () => (vendorFilter.value = '') })
  return out
})
const clearRefine = () => { refine.value = 'all'; vendorFilter.value = '' }

/* ── cross-tab navigation ── */
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

/* ── vendor actions — the signature of this page ── */
const vendorTarget = ref(null)
const vendorMode = ref('chase')
const openVendor = (mode, ticket) => { vendorMode.value = mode; vendorTarget.value = ticket }
const onVendorDone = () => { vendorTarget.value = null; selected.value = []; refreshAll() }

const bulkVendor = async (fn, ids, { gerund, past, verb }) => {
  if (!ids.length) { toast.info(`Nothing to ${verb}.`); return }
  toast.info(`${gerund} ${ids.length}…`)
  try {
    const r = await fn(ids)
    const ok = r?.updated || 0, sk = r?.skipped || 0
    if (ok) toast.success(`${ok} ${past}`)
    if (sk) toast.info(`${sk} skipped`)
  } catch { toast.error(`Could not ${verb}.`) }
  selected.value = []; refreshAll()
}
const CHASE_LABELS = { gerund: 'Chasing', past: 'chased', verb: 'chase' }
const BACK_LABELS = { gerund: 'Bringing back', past: 'brought back', verb: 'bring back' }
const chaseHot = () => {
  const ids = workingSet.value.filter(PRED.overdue).map(t => String(t.id))
  const target = ids.length ? ids : workingSet.value.filter(PRED.stale).map(t => String(t.id))
  bulkVendor(bulkVendorChase, target, CHASE_LABELS)
}
const chaseSelected = () => bulkVendor(bulkVendorChase, [...selected.value], CHASE_LABELS)
const bringBackSelected = () => bulkVendor(bulkVendorBringBack, [...selected.value], BACK_LABELS)

/* ── rich action modals ── */
const bulkOpen = ref(false)
const bulkMode = ref('status')
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

/* board drops: resolve/close → resolve modal · bring back (in_progress) → vendor reply modal · escalate → console */
const moveTarget = ref(null)
const onMove = ({ id, status, from }) => {
  const t = workingSet.value.find(x => String(x.id) === String(id))
  if (['resolved', 'closed'].includes(status)) { resolveTarget.value = t || { id }; return }
  if (status === 'escalated') { if (t) openBulk('escalate', [t]); return }
  if (status === 'in_progress') { if (t) openVendor('reply', t); return }  // bring back = log the vendor reply
  if (!t) return
  moveTarget.value = { ticket: t, from: from || t.status, to: status }
}
const onMoved = () => { moveTarget.value = null; refreshAll() }
const onAssign = async ({ id, agentId }) => {
  if (!agentId) { toast.info('Drop a ticket onto an agent to assign it.'); return }
  try { await managerAssignTicket(id, { assigned_agent_id: agentId }); toast.success('Ticket assigned'); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign'); refreshAll() }
}

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
const loadViews = async () => { try { savedViews.value = await listSavedViews({ scope: 'pending_vendor' }) } catch { savedViews.value = [] } }
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
    const v = await createSavedView({ name: name.trim(), scope: 'pending_vendor', filters: { ...f }, columns: columns.value, sort_by: sortBy.value, sort_dir: sortDir.value })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id; toast.success('View saved')
  } catch { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('pending-vendor').columns || [])
const emptyText = computed(() => getTicketScope('pending-vendor').empty || { title: 'No vendor blocks', blurb: 'No tickets are waiting on a vendor.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Vendor', 'External ref', 'Waiting on', 'Vendor ETA', 'Wait (h)', 'Chases', 'Agent']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), t.vendor_name || '', t.vendor_ticket_ref || '',
    vendorReasonLabel(t.vendor_wait_reason) || '', t.vendor_due_at || '', Math.round(waitMs(t) / 3600000),
    t.vendor_reminder_count || 0, t.assigned_agent_name || '',
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'pending-vendor.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

/* ── ⌘K command palette ── */
const commands = computed(() => {
  const cmds = []
  for (const v of views.value) cmds.push({ id: 'view-' + v.key, label: `View: ${v.label}`, hint: 'Switch view', icon: v.icon, run: () => (view.value = v.key) })
  for (const l of lenses.value) cmds.push({ id: 'lens-' + l.key, label: `Lens: ${l.label}`, hint: l.nav ? 'Jump to queue' : 'Filter', icon: l.icon, run: () => onLens(l) })
  cmds.push({ id: 'chase', label: 'Chase the overdue set', hint: 'Nudge vendors past ETA', icon: Send, run: () => chaseHot() })
  cmds.push({ id: 'open', label: 'Go: Open / In Progress', hint: 'Brought-back tickets land here', icon: Layers, run: () => goTab('open') })
  cmds.push({ id: 'pending-customer', label: 'Go: Pending Customer', hint: 'Sibling tab', icon: Layers, run: () => goTab('pending-customer') })
  cmds.push({ id: 'escalated', label: 'Go: Escalated', hint: 'Sibling tab', icon: ChevronsUp, run: () => goTab('escalated') })
  cmds.push({ id: 'new', label: 'New ticket', hint: 'Raise a ticket', icon: Layers, run: () => emit('new') })
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
.pvn { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }

/* control-room top band: vendor lanes │ hand-off cadence (compact, side-by-side) */
.pvn-top { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: stretch; }
.pvn-top > * { min-height: 100%; }
.pvn-top.solo { grid-template-columns: 1fr; }
.pvn-rail { min-width: 0; }
.pvn-cad { min-width: 0; }
/* dispatch board flows FULL WIDTH under the band — no wasted column beside the short rail */
.pvn-board { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pvn-insights { align-self: stretch; }
@media (max-width: 980px) { .pvn-top { grid-template-columns: 1fr; } }

.pvn-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.pvn-btn:hover { border-color: var(--sd-vendor-signal); }
.pvn-btn:active { transform: translateY(1px); }
.pvn-btn.on { border-color: var(--sd-vendor-signal); color: var(--sd-vendor-signal); background: var(--sd-vendor-signal-soft); }
.pvn-btn.accent { border-color: var(--sd-vendor-steel-brd); color: #22160a; background: var(--sd-vendor-grad); }
.pvn-btn.sm { padding: 7px 12px; font-size: 12px; }
.pvn-btn.icon { padding: 7px 9px; }
.pvn-btn.ghost { background: transparent; }
.pvn-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.pvn-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-vendor-signal); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .pvn-fbadge { color: #fff8ec; }

.pvn-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.pvn-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.pvn-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.pvn-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.pvn-view:hover { color: var(--sd-text); }
.pvn-view.on { color: var(--sd-vendor-signal); background: var(--sd-vendor-signal-soft); box-shadow: inset 0 0 0 1px var(--sd-vendor-steel-brd); }
.pvn-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.pvn-count { font-size: 12px; color: var(--sd-text-dim); }

.pvn-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-vendor-steel-brd); background: var(--sd-vendor-signal-soft); color: var(--sd-vendor-signal); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue); }

.pvn-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.vb-ico { color: var(--sd-vendor-signal); flex-shrink: 0; }
.vb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.vb-chip:hover { border-color: var(--sd-vendor-signal); color: var(--sd-text); }
.vb-chip.on { border-color: var(--sd-vendor-signal); color: var(--sd-vendor-signal); background: var(--sd-vendor-signal-soft); }
.vb-shared { color: var(--sd-vendor-signal); font-weight: 800; }
.vb-x { opacity: 0.5; }
.vb-x:hover { opacity: 1; color: var(--sd-vendor-overdue); }
.vb-save { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.vb-save:hover { color: var(--sd-vendor-signal); border-color: var(--sd-vendor-signal); }

.pvn-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.pvn-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-vendor-steel-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-vendor-signal); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.pvn-stage { min-height: 40px; }
.pvn-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.pvn-flt-enter-active, .pvn-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.pvn-flt-enter-from, .pvn-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .pvn-tools { margin-left: 0; } }
</style>
