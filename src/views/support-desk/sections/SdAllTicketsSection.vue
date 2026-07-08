<template>
  <div class="cmd sd-tw">
    <!-- ══════════════════ COMMAND BRIDGE HERO ══════════════════ -->
    <section ref="heroEl" class="cmd-hero" @mousemove="onHeroMove" @mouseleave="resetHero">
      <div class="cmd-atm" aria-hidden="true">
        <span class="orb a1" :style="orbStyle(1)" />
        <span class="orb a2" :style="orbStyle(0.62)" />
        <span class="orb a3" :style="orbStyle(0.34)" />
        <span class="orb a4" :style="orbStyle(-0.42)" />
        <span class="cmd-grain" />
        <span class="cmd-grid" />
        <svg class="cmd-mesh" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path class="ml" d="M-40,320 C300,250 520,360 760,250 C980,150 1100,230 1260,150" />
          <path class="ml m2" d="M-40,250 C260,180 480,300 720,190 C940,90 1120,180 1260,90" />
          <path class="ml m3" d="M-40,372 C320,320 560,400 820,310 C1020,240 1160,300 1260,230" />
        </svg>
      </div>

      <div class="cmd-hero-row">
        <!-- identity + CTAs -->
        <div class="cmd-lead">
          <Motion as="span" class="cmd-eyebrow sd-mono" :initial="{ y: -8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <span class="eb-glyph"><span class="eb-ring" /><span class="eb-core" /></span>
            SUPPORT · TEAM COMMAND CENTER
            <span class="eb-sep" /><span class="eb-live"><i /> LIVE</span>
          </Motion>
          <h2 class="cmd-title">
            <Motion as="span" :initial="{ y: 22, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.7, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">Team </Motion><Motion as="span" class="cmd-accent" :initial="{ y: 22, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :transition="{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">Operations</Motion>
          </h2>
          <p class="cmd-sub">{{ subline }}</p>

          <div class="cmd-cta">
            <Motion as="button" type="button" class="cmd-btn primary" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="$emit('new')"><Plus :size="15" /> New ticket</Motion>
            <Motion as="button" type="button" class="cmd-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="cmdOpen = true"><Command :size="14" /> <span>Commands</span> <kbd>⌘K</kbd></Motion>
            <Motion as="button" type="button" class="cmd-btn icon" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.95 }" title="Refresh" @click="refreshAll"><RefreshCw :size="15" :class="{ spin: loading }" /></Motion>
          </div>

          <div class="cmd-pulse">
            <span class="cmd-scan"><Radar :size="13" /> Scanning <b>{{ workingSet.length }}{{ wsCapped ? '+' : '' }}</b> live across <b>{{ stats.team_count || 0 }}</b> {{ (stats.team_count === 1) ? 'team' : 'teams' }}</span>
            <span class="cmd-pdiv" />
            <span class="cmd-chip danger" title="Breaching SLA"><i /><b>{{ stats.breaching || 0 }}</b> breaching</span>
            <span class="cmd-chip warn" title="Due soon"><i /><b>{{ stats.due_soon || 0 }}</b> due soon</span>
            <span class="cmd-chip amber" title="Unassigned"><i /><b>{{ stats.unassigned_in_scope || 0 }}</b> unassigned</span>
          </div>
        </div>

        <!-- signature triage scope -->
        <Motion as="div" class="cmd-scope" :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <SdTriageSonar :tickets="workingSet" :now="now" :breaching="stats.breaching || 0" @open="openTicket" />
        </Motion>
      </div>
    </section>

    <!-- ══════════════════ SQUAD TELEMETRY ══════════════════ -->
    <section class="cmd-squad sd-card">
      <SdSquadLoad :squad="stats.squad || []" :active="f.assigned_agent_id" :reduced="reduced" @pick="onSquadPick" />
    </section>

    <!-- ══════════════════ SLA FLAG BOARD ══════════════════ -->
    <SdFlagBoard :stats="stats" :reduced="reduced" @pick="setLens" />

    <!-- ══════════════════ KPI BENTO ══════════════════ -->
    <div class="cmd-kpis">
      <SdKpiTile v-for="(k, i) in kpis" :key="k.key" :icon="k.icon" :label="k.label" :value="k.value"
        :accent="k.color" :suffix="k.suffix || ''" :index="i" :live="k.live || false" />
    </div>

    <!-- smart insight strip -->
    <SdInsightTicker class="cmd-insights" :insights="stats.insights || []" :reduced="reduced" @act="onInsight" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="cmd-deck sd-card">
      <div class="cmd-lenses">
        <button v-for="l in LENSES" :key="l.key" class="lens" :class="{ on: lens === l.key }" :style="{ '--lc': l.color }" @click="setLens(l.key)">
          <component :is="l.icon" :size="14" />
          <span class="lens-l">{{ l.label }}</span>
          <span v-if="l.count != null" class="lens-n sd-mono">{{ l.count }}</span>
        </button>
      </div>

      <div class="cmd-bar">
        <div class="cmd-views">
          <button v-for="v in VIEWS" :key="v.key" class="cmd-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <SdGroupByControl v-if="view === 'swimlanes'" v-model="groupBy" />
        <div class="cmd-tools">
          <button class="cmd-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="cmd-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="cmd-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button class="cmd-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="cmd-count sd-mono">{{ total }} {{ total === 1 ? 'ticket' : 'tickets' }}<template v-if="wsCapped && view !== 'table'"> · stats over first 150</template></span>
        </div>
      </div>
    </section>

    <!-- saved views -->
    <div v-if="savedViews.length || activeFilterCount" class="cmd-views-bar">
      <Bookmark :size="13" class="vb-ico" />
      <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
        {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared with team">·</span>
        <X :size="11" class="vb-x" @click.stop="removeView(v)" />
      </button>
      <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
    </div>

    <!-- filters -->
    <Transition name="cmd-flt">
      <section v-if="showFilters" class="cmd-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="opt(PRIORITIES, 'All priorities')" /></div>
        <div class="flt-field"><label>Type</label><SdSelect v-model="f.ticket_type" :options="opt(TICKET_TYPES, 'All types')" /></div>
        <div class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="opt(TICKET_STATUSES, 'Any status')" /></div>
        <div class="flt-actions">
          <button class="cmd-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="cmd-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar -->
    <Presence>
      <Motion v-if="agent && selected.length" class="cmd-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="cmd-btn sm" :disabled="!myId" @click="doBulk('assign', { assigned_agent_id: myId })"><UserCheck :size="13" /> Claim</button>
          <button class="cmd-btn sm" @click="openBulkModal('status')"><RefreshCw :size="13" /> Status</button>
          <button class="cmd-btn sm" @click="openBulkModal('escalate')"><Flame :size="13" /> Escalate</button>
          <button class="cmd-btn sm" @click="openBulkModal('resolve')"><CircleCheck :size="13" /> Resolve</button>
        </div>
        <button class="cmd-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="cmd-stage" :key="view">
      <SdSquadBoard v-if="view === 'swimlanes'" :tickets="workingSet" :group-by="groupBy" :squad="stats.squad || []"
        :now="now" :capped="wsCapped" @open="openTicket" @assign="onAssign" @move="onMove" />
      <SdTicketTable v-else-if="view === 'table'"
        :rows="rows" :columns="columns" :loading="loading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="Layers"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />
      <SdSlaPulse v-else-if="view === 'sla'" :tickets="workingSet" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="workingSet" :now="now" :loading="wsLoading" />
    </div>

    <!-- pagination (table) -->
    <SdPagination v-if="view === 'table'" :page="page" :pages="pages" :total="total" :limit="limit"
      :accent="ACCENT" @go="go" />

    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="drawerId = null" @changed="refreshAll" />
    <SdBulkActionModal :open="bulkModalOpen" :mode="bulkMode" :tickets="selectedTickets" :me="me" :assignees="[]" :now="now"
      @close="bulkModalOpen = false" @done="onBulkDone" />
    <SdEscalateConsole :open="!!escalateTarget" :ticket="escalateTarget" :me="me" :assignees="[]" :now="now"
      @close="escalateTarget = null" @done="onEscalated" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="workingSet" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Plus, Command, RefreshCw, Radar, SlidersHorizontal, Rows3, Download, Search, X, Check,
  UserCheck, Flame, CircleCheck, Bookmark, BookmarkPlus, ChevronLeft, ChevronRight,
  Layers, Inbox, AlertTriangle, Timer, Activity, RotateCcw, Table, LayoutGrid, Gauge, Users, AlarmClock,
} from 'lucide-vue-next'
import SdTriageSonar from '../components/SdTriageSonar.vue'
import SdFlagBoard from '../components/SdFlagBoard.vue'
import SdSquadLoad from '../components/SdSquadLoad.vue'
import SdSquadBoard from '../components/SdSquadBoard.vue'
import SdGroupByControl from '../components/SdGroupByControl.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdKpiTile from '../components/SdKpiTile.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdPagination from '../components/SdPagination.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listCommandCenter, fetchCommandCenterStats, managerAssignTicket, bulkTickets, changeTicketStatus,
  getMe, loadPickers, usePickers, listSavedViews, createSavedView, deleteSavedView,
  PRIORITIES, TICKET_TYPES, TICKET_STATUSES, typeLabel, statusLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'all' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
const emit = defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-amber)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* hero pointer parallax (decorative ambient layer) */
const heroEl = ref(null)
const hmx = ref(0)
const hmy = ref(0)
const onHeroMove = (e) => {
  if (reduced.value) return
  const r = heroEl.value?.getBoundingClientRect?.(); if (!r) return
  hmx.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  hmy.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const resetHero = () => { hmx.value = 0; hmy.value = 0 }
const orbStyle = (d) => ({ transform: `translate3d(${(hmx.value * d * 22).toFixed(1)}px, ${(hmy.value * d * 18).toFixed(1)}px, 0)` })

/* views + grouping */
const VIEWS = [
  { key: 'swimlanes', label: 'Swimlanes', icon: LayoutGrid },
  { key: 'table', label: 'Table', icon: Table },
  { key: 'sla', label: 'SLA', icon: Gauge },
  { key: 'load', label: 'Workload', icon: Users },
]
const view = ref('swimlanes')
const groupBy = ref('agent')
const density = ref('comfortable')
const showFilters = ref(false)
const cmdOpen = ref(false)

/* filters + lens */
const f = reactive({ q: '', priority: '', ticket_type: '', status: '', assigned_agent_id: '' })
const lens = ref('all')
const LENS_SCOPE = { all: '', unassigned: 'unassigned', critical: 'critical', breached: 'sla_breached', escalated: 'escalated', reopened: 'reopened', my: 'my' }
const activeFilterCount = computed(() => ['priority', 'ticket_type', 'status', 'assigned_agent_id'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* sort + paging */
const sortBy = ref('updated_at')
const sortDir = ref('desc')
const page = ref(1)
const limit = 10
const total = ref(0)
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

/* data */
const rows = ref([])
const loading = ref(false)
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const stats = ref({})
const now = ref(Date.now())
const myId = ref(null)
const me = ref({})
let tick = null

const params = () => ({
  scope: LENS_SCOPE[lens.value] || undefined,
  q: f.q || undefined,
  priority: f.priority || undefined,
  ticket_type: f.ticket_type || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  sort_by: sortBy.value,
  sort_dir: sortDir.value,
})

const loadTable = async () => {
  loading.value = true
  try { const r = await listCommandCenter({ ...params(), page: page.value, limit }); rows.value = r.items || []; total.value = r.total || 0 }
  catch { rows.value = []; total.value = 0 } finally { loading.value = false }
}
const loadWorkingSet = async () => {
  wsLoading.value = true
  try { const r = await listCommandCenter({ ...params(), page: 1, limit: 150 }); workingSet.value = r.items || []; wsCapped.value = (r.total || 0) > 150 }
  catch { workingSet.value = []; wsCapped.value = false } finally { wsLoading.value = false }
}
const loadStats = async () => { try { stats.value = await fetchCommandCenterStats() } catch { stats.value = {} } }
const reload = () => { page.value = 1; loadTable(); loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }
const go = (p) => { page.value = Math.min(Math.max(1, p), pages.value); loadTable() }
const onSort = (key) => {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = 'desc' }
  page.value = 1; loadTable()
}
const setLens = (key) => { lens.value = lens.value === key && key !== 'all' ? 'all' : key; if (key === 'my') f.assigned_agent_id = ''; reload() }
const onSquadPick = (agentId) => { f.assigned_agent_id = f.assigned_agent_id === agentId ? '' : agentId; reload() }

/* lenses (counts from stats) */
const LENSES = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'all', label: 'All', icon: Layers, color: 'var(--sd-amber)', count: s.total },
    { key: 'unassigned', label: 'Unassigned · Triage', icon: Inbox, color: 'var(--sd-amber-strong)', count: s.unassigned_in_scope },
    { key: 'critical', label: 'Critical', icon: AlertTriangle, color: 'var(--sd-pri-critical)', count: s.critical },
    { key: 'breached', label: 'Breaching', icon: Timer, color: 'var(--sd-danger)', count: s.breaching },
    { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-st-escalated)', count: s.escalated },
    { key: 'reopened', label: 'Reopened', icon: RotateCcw, color: 'var(--sd-st-escalated)', count: null },
    { key: 'my', label: 'Mine', icon: UserCheck, color: 'var(--sd-amber)', count: null },
  ]
})

/* KPI bento from team stats */
const kpis = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'open', label: 'Open', icon: Activity, color: 'var(--sd-st-progress)', value: s.open || 0 },
    { key: 'triage', label: 'Triage pool', icon: Inbox, color: 'var(--sd-amber-strong)', value: s.triage_pool || 0 },
    { key: 'unassigned', label: 'Unassigned', icon: Inbox, color: 'var(--sd-amber)', value: s.unassigned_in_scope || 0 },
    { key: 'breaching', label: 'Breaching', icon: Timer, color: 'var(--sd-danger)', value: s.breaching || 0, live: (s.breaching || 0) > 0 },
    { key: 'dueSoon', label: 'Due soon', icon: AlarmClock, color: 'var(--sd-warning)', value: s.due_soon || 0 },
    { key: 'critical', label: 'Critical', icon: AlertTriangle, color: 'var(--sd-pri-critical)', value: s.critical || 0 },
    { key: 'resolved', label: 'Resolved today', icon: CircleCheck, color: 'var(--sd-success)', value: s.resolved_today || 0 },
    { key: 'load', label: 'Team load', icon: Gauge, color: 'var(--sd-amber)', value: s.workload_score || 0 },
  ]
})

const subline = computed(() => {
  const names = stats.value?.team_names || []
  if (names.length) return `Live queue for ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''} — triage, route and resolve against the SLA frontier.`
  return 'Your team’s live ticket queue — triage, route and resolve against the SLA frontier.'
})

/* table columns / empty from the existing scope descriptor */
const columns = computed(() => getTicketScope('all').columns || [])
const emptyText = computed(() => getTicketScope('all').empty || 'No tickets in your team’s queue.')

/* filter option lists */
const pickers = usePickers()
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]

/* selection + bulk (table) */
const selected = ref([])
const bulkStatus = ref('')
const isSel = (id) => selected.value.includes(String(id))
const toggleSel = (id) => { const s = String(id); selected.value = isSel(id) ? selected.value.filter(x => x !== s) : [...selected.value, s] }
const toggleAll = () => {
  const ids = rows.value.map(r => String(r.id))
  const all = ids.every(i => selected.value.includes(i))
  selected.value = all ? selected.value.filter(i => !ids.includes(i)) : [...new Set([...selected.value, ...ids])]
}
const doBulk = async (action, payload = {}) => {
  if (!selected.value.length) return
  try {
    const r = await bulkTickets({ ids: selected.value, action, ...payload })
    toast.success(`${r.updated ?? selected.value.length} ticket${(r.updated ?? 2) === 1 ? '' : 's'} updated`)
    selected.value = []; bulkStatus.value = ''; refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk action failed') }
}

/* status / escalate / resolve run through the governed bulk modal (per-ticket eligibility,
   hold + vendor metadata, ITIL resolution codes) — a single-ticket escalation gets the
   full corporate escalation console, same as My Tickets. */
const bulkModalOpen = ref(false)
const bulkMode = ref('status')
const selectedTickets = computed(() => workingSet.value.filter(t => selected.value.includes(String(t.id))))
const escalateTarget = ref(null)
const openBulkModal = (mode) => {
  if (!selected.value.length) return
  if (mode === 'escalate' && selectedTickets.value.length === 1) { escalateTarget.value = selectedTickets.value[0]; return }
  bulkMode.value = mode; bulkModalOpen.value = true
}
const onBulkDone = ({ updated = 0, skipped = 0 } = {}) => {
  bulkModalOpen.value = false; selected.value = []
  if (updated) toast.success(`${updated} ticket${updated === 1 ? '' : 's'} updated${skipped ? ` · ${skipped} skipped` : ''}`)
  refreshAll()
}
const onEscalated = () => { escalateTarget.value = null; selected.value = []; toast.success('Ticket escalated'); refreshAll() }

/* swimlane drag → assign (squad-guarded, stamps triage team) / status move */
const onAssign = async ({ id, agentId }) => {
  if (!agentId) { toast.info('Drop a ticket onto an agent to assign it.'); return }
  try { await managerAssignTicket(id, { assigned_agent_id: agentId }); toast.success('Ticket assigned'); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not assign'); refreshAll() }
}
const onMove = async ({ id, status }) => {
  try { await changeTicketStatus(id, { status }); refreshAll() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not move ticket'); refreshAll() }
}

/* saved views (shared team presets) */
const savedViews = ref([])
const appliedView = ref(null)
const loadViews = async () => { try { savedViews.value = await listSavedViews({ scope: 'command-center' }) } catch { savedViews.value = [] } }
const applyView = (v) => {
  appliedView.value = v.id
  Object.keys(f).forEach(k => (f[k] = (v.filters && v.filters[k]) || ''))
  if (v.sort_by) sortBy.value = v.sort_by
  if (v.sort_dir) sortDir.value = v.sort_dir
  reload()
}
const saveView = async () => {
  const name = window.prompt('Name this team view:')
  if (!name || !name.trim()) return
  try {
    const v = await createSavedView({ name: name.trim(), scope: 'command-center', filters: { ...f }, columns: columns.value, sort_by: sortBy.value, sort_dir: sortDir.value, is_shared: true })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id; toast.success('Team view saved')
  } catch { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* CSV export (client-side from the team-scoped working set — matches what's shown) */
const doExport = () => {
  const rowsCsv = workingSet.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Type', 'Priority', 'Status', 'Team', 'Agent', 'Created', 'Resolution due', 'SLA breached']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, typeLabel(t.ticket_type), t.priority, statusLabel(t.status),
    t.team_name || '', t.assigned_agent_name || '', t.created_at || '', t.resolution_due_at || '', t.sla_resolution_breached ? 'yes' : 'no',
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'team-tickets.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

/* drawer + insights */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
// Never a dead click: open the flagged ticket; the "heavy workload" heads-up has no
// ticket_ids so switch to the Workload view; otherwise echo the detail.
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
  if (ins?.kind === 'workload') { view.value = 'load'; toast.info(ins?.detail || 'Showing the workload view'); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}

/* ⌘K command palette */
const commands = computed(() => {
  const cmds = []
  for (const v of VIEWS) cmds.push({ id: 'view-' + v.key, label: `View: ${v.label}`, hint: 'Switch board view', icon: v.icon, run: () => (view.value = v.key) })
  for (const l of LENSES.value) cmds.push({ id: 'lens-' + l.key, label: `Lens: ${l.label}`, hint: 'Filter the queue', icon: l.icon, run: () => setLens(l.key) })
  cmds.push({ id: 'new', label: 'New ticket', hint: 'Raise a ticket', icon: Plus, run: () => emit('new') })
  cmds.push({ id: 'refresh', label: 'Refresh queue', hint: 'Reload tickets + stats', icon: RefreshCw, run: () => refreshAll() })
  cmds.push({ id: 'export', label: 'Export CSV', hint: 'Download the current set', icon: Download, run: () => doExport() })
  cmds.push({ id: 'filters', label: 'Toggle filters', hint: 'Show / hide filters', icon: SlidersHorizontal, run: () => (showFilters.value = !showFilters.value) })
  return cmds
})

const onKey = (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
}

onMounted(async () => {
  refreshAll(); loadViews(); loadPickers().catch(() => {})
  try { const m = await getMe(); me.value = m || {}; myId.value = m?.id || null } catch { /* non-fatal */ }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => { clearInterval(tick); window.removeEventListener('keydown', onKey) })
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
watch(agent, refreshAll)
</script>

<style scoped>
.cmd { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* ═══════════════ HERO ═══════════════ */
.cmd-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 28px 30px 26px; isolation: isolate;
  background: var(--sd-grad-hero), var(--sd-panel); background-blend-mode: overlay, normal;
  border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); }
.cmd-hero::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg, rgba(8,10,12,0.88), rgba(10,12,14,0.8)); }
[data-theme="light"] .cmd-hero::before { background: linear-gradient(135deg, rgba(255,251,245,0.84), rgba(255,248,238,0.72)); }

.cmd-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(64px); will-change: transform; transition: transform 0.5s var(--sd-spring); }
.orb.a1 { width: 360px; height: 360px; top: -130px; left: -80px; background: radial-gradient(circle, rgba(251,191,36,0.4), transparent 65%); animation: cmd-orb 23s ease-in-out infinite; }
.orb.a2 { width: 300px; height: 300px; top: -70px; right: 14%; background: radial-gradient(circle, rgba(251,146,60,0.32), transparent 66%); animation: cmd-orb 28s ease-in-out infinite reverse; }
.orb.a3 { width: 240px; height: 240px; bottom: -130px; left: 30%; background: radial-gradient(circle, rgba(234,88,12,0.26), transparent 68%); animation: cmd-orb 31s ease-in-out infinite; }
.orb.a4 { width: 300px; height: 300px; bottom: -150px; right: -80px; background: radial-gradient(circle, rgba(252,211,77,0.24), transparent 67%); animation: cmd-orb 26s ease-in-out infinite reverse; }
.cmd-grain { position: absolute; inset: 0; opacity: 0.05; mix-blend-mode: overlay;
  background-image: radial-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), radial-gradient(rgba(234,88,12,0.4) 1px, transparent 1px);
  background-size: 5px 5px, 7px 7px; background-position: 0 0, 2px 3px; }
.cmd-grid { position: absolute; inset: 0; opacity: 0.4; background-image: radial-gradient(rgba(251,191,36,0.06) 1px, transparent 1px); background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 75%); }
.cmd-mesh { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.45; }
.ml { fill: none; stroke: rgba(251,191,36,0.3); stroke-width: 1.4; stroke-dasharray: 6 11; animation: cmd-mesh 26s linear infinite; }
.ml.m2 { stroke: rgba(251,146,60,0.26); animation-duration: 32s; }
.ml.m3 { stroke: rgba(234,88,12,0.2); animation-duration: 38s; }

.cmd-hero-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1.04fr 1.16fr; gap: 26px; align-items: center; }

.cmd-lead { display: flex; flex-direction: column; min-width: 0; }
.cmd-eyebrow { display: inline-flex; align-items: center; gap: 9px; width: fit-content; font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: var(--sd-amber); padding: 6px 13px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.eb-glyph { position: relative; width: 13px; height: 13px; }
.eb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.4px solid var(--sd-amber); border-top-color: transparent; animation: cmd-spin 2.6s linear infinite; }
.eb-core { position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-amber); animation: cmd-blip 2s ease-in-out infinite; }
.eb-sep { width: 1px; height: 11px; background: var(--sd-amber-border); }
.eb-live { display: inline-flex; align-items: center; gap: 5px; color: var(--sd-success); }
.eb-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: cmd-blip 1.6s ease-in-out infinite; }

.cmd-title { margin: 15px 0 0; font-weight: 850; letter-spacing: -0.03em; line-height: 1.0; font-size: clamp(30px, 3.8vw, 46px); }
.cmd-accent { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cmd-sub { margin: 13px 0 0; font-size: 14px; line-height: 1.55; color: var(--sd-text-secondary); max-width: 48ch; }

.cmd-cta { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 20px; }
.cmd-pulse { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 20px; }
.cmd-scan { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); }
.cmd-scan svg { color: var(--sd-amber); }
.cmd-scan b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 700; }
.cmd-pdiv { width: 1px; height: 16px; background: var(--sd-border-strong); }
.cmd-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; color: var(--sd-text-secondary);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.cmd-chip i { width: 7px; height: 7px; border-radius: 50%; }
.cmd-chip b { color: var(--sd-text); font-weight: 800; font-family: var(--sd-mono); }
.cmd-chip.danger i { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.cmd-chip.warn i { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.cmd-chip.amber i { background: var(--sd-amber); box-shadow: 0 0 7px var(--sd-amber); }

.cmd-scope { min-height: 322px; }

/* ═══════════════ SQUAD / KPI / INSIGHT ═══════════════ */
.cmd-squad { padding: 16px 18px; }
.cmd-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; }
.cmd-insights { align-self: stretch; }

/* ═══════════════ BUTTONS ═══════════════ */
.cmd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.cmd-btn:hover { border-color: var(--sd-amber); }
.cmd-btn:active { transform: translateY(1px); }
.cmd-btn.on { border-color: var(--sd-amber); color: var(--sd-amber); background: var(--sd-amber-soft); }
.cmd-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 8px 22px rgba(251,146,60,0.28); }
[data-theme="light"] .cmd-btn.primary { color: #fff8ec; }
.cmd-btn.sm { padding: 7px 12px; font-size: 12px; }
.cmd-btn.icon { padding: 9px 10px; }
.cmd-btn.sm.icon { padding: 7px 9px; }
.cmd-btn.ghost { background: transparent; }
.cmd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.cmd-btn kbd { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; color: var(--sd-text-dim); padding: 2px 5px; border-radius: 5px; border: 1px solid var(--sd-border); }
.cmd-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-amber); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .cmd-fbadge { color: #fff8ec; }
.spin { animation: cmd-spin 0.8s linear infinite; }

/* ═══════════════ CONTROL DECK ═══════════════ */
.cmd-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.cmd-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.lens { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary); transition: border-color 0.18s, color 0.18s, background 0.18s; }
.lens:hover { border-color: var(--lc); color: var(--sd-text); }
.lens.on { border-color: var(--lc); color: var(--lc); background: color-mix(in srgb, var(--lc) 12%, transparent); }
.lens svg { color: var(--lc); }
.lens-n { font-size: 11px; font-weight: 800; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--lc) 16%, transparent); }

.cmd-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.cmd-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.cmd-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.cmd-view:hover { color: var(--sd-text); }
.cmd-view.on { color: var(--sd-amber); background: var(--sd-amber-soft); box-shadow: inset 0 0 0 1px var(--sd-amber-border); }
.cmd-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.cmd-count { font-size: 12px; color: var(--sd-text-dim); }

/* saved views */
.cmd-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
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
.cmd-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

/* bulk */
.cmd-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-amber); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-amber); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bulk-status { display: inline-flex; align-items: center; gap: 6px; }
.bulk-status :deep(.sd-select) { min-width: 150px; }

/* stage + pager */
.cmd-stage { min-height: 40px; }
.cmd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

.cmd-flt-enter-active, .cmd-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.cmd-flt-enter-from, .cmd-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@keyframes cmd-orb { 0%, 100% { translate: 0 0; } 50% { translate: 24px -18px; } }
@keyframes cmd-mesh { to { stroke-dashoffset: -200; } }
@keyframes cmd-spin { to { transform: rotate(360deg); } }
@keyframes cmd-blip { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.82); } }

/* responsive */
@media (max-width: 1080px) {
  .cmd-hero-row { grid-template-columns: 1fr; }
  .cmd-scope { order: -1; min-height: 300px; }
  .cmd-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .cmd-hero { padding: 22px 18px; }
  .cmd-tools { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb,
  html:not([data-cinematic="on"]) .ml,
  html:not([data-cinematic="on"]) .eb-ring,
  html:not([data-cinematic="on"]) .eb-core,
  html:not([data-cinematic="on"]) .eb-live i,
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .cmd-live { animation: none; }
}
</style>
