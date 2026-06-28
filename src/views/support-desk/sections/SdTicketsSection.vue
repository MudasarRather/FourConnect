<template>
  <div class="sd-cmd">
    <!-- ── Command header ── -->
    <header class="cmd-head">
      <div class="cmd-lead">
        <span class="cmd-eyebrow"><Radar :size="13" /> TICKETS · COMMAND DECK</span>
        <h1 class="cmd-title">Every ticket, <span class="grad">in motion</span></h1>
        <p class="cmd-sub">Triage, route and resolve — intake to closure, watched against the SLA frontier.</p>
      </div>
      <div class="cmd-cta">
        <Motion as="button" type="button" class="cmd-btn ghost" :class="{ on: bulkMode }"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="toggleBulk">
          <SquareCheck :size="15" /> {{ bulkMode ? 'Done selecting' : 'Bulk actions' }}
        </Motion>
        <Motion as="button" type="button" class="cmd-btn primary"
          :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="16" /> New Ticket
        </Motion>
      </div>
    </header>

    <!-- ── Signature instrument ── -->
    <SdTriageField :tickets="workingSet" :now="now" :loading="wsLoading" @open="openDrawer" />

    <!-- ── Telemetry lenses ── -->
    <div class="cmd-lenses">
      <button v-for="l in LENSES" :key="l.key" class="lens" :class="{ on: lens === l.key }"
        :style="{ '--lc': l.color }" @click="setLens(l.key)">
        <component :is="l.icon" :size="14" class="lens-ic" />
        <span class="lens-label">{{ l.label }}</span>
        <span class="lens-count">{{ lensCount(l.key) }}</span>
      </button>
    </div>

    <!-- ── Toolbar ── -->
    <div class="cmd-toolbar">
      <div class="cmd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reloadAll" />
        <button v-if="q" class="srch-x" @click="q = ''; reloadAll()"><X :size="13" /></button>
      </div>
      <button class="cmd-btn flt" :class="{ on: showFilters || activeFilterCount }" @click="showFilters = !showFilters">
        <SlidersHorizontal :size="15" /> Filters
        <span v-if="activeFilterCount" class="flt-badge">{{ activeFilterCount }}</span>
      </button>
      <div class="cmd-views" role="tablist">
        <button v-for="v in VIEWS" :key="v.key" class="vbtn" :class="{ on: view === v.key }"
          :title="v.label" @click="setView(v.key)">
          <component :is="v.icon" :size="15" /><span class="vbtn-l">{{ v.label }}</span>
        </button>
      </div>
    </div>

    <!-- ── Filter drawer ── -->
    <transition name="cmd-fade">
      <div v-if="showFilters" class="cmd-filters">
        <div class="flt-field"><label>Priority</label><SdSelect v-model="fPriority" :options="priorityOpts" placeholder="All priorities" /></div>
        <div class="flt-field"><label>Type</label><SdSelect v-model="fType" :options="typeOpts" placeholder="All types" /></div>
        <div class="flt-field"><label>Agent / Team</label><SdSelect v-model="fAgent" :options="agentOpts" placeholder="All agents" /></div>
        <div class="flt-field"><label>Organization</label><SdSelect v-model="fOrg" :options="orgOpts" placeholder="All organizations" /></div>
        <button v-if="activeFilterCount" class="flt-clear" @click="clearFilters"><X :size="13" /> Clear all</button>
      </div>
    </transition>

    <!-- ── Active filter chips ── -->
    <div v-if="activeFilterCount" class="cmd-chips">
      <span v-if="fPriority" class="chip" @click="fPriority = ''; reloadAll()">Priority: {{ labelOf(priorityOpts, fPriority) }} <X :size="11" /></span>
      <span v-if="fType" class="chip" @click="fType = ''; reloadAll()">Type: {{ labelOf(typeOpts, fType) }} <X :size="11" /></span>
      <span v-if="fAgent" class="chip" @click="fAgent = ''; reloadAll()">Agent: {{ labelOf(agentOpts, fAgent) }} <X :size="11" /></span>
      <span v-if="fOrg" class="chip" @click="fOrg = ''; reloadAll()">Org: {{ labelOf(orgOpts, fOrg) }} <X :size="11" /></span>
    </div>

    <!-- ── Views ── -->
    <transition name="cmd-view" mode="out-in">
      <!-- STREAM -->
      <div v-if="view === 'stream'" key="stream" class="cmd-view-stream">
        <div v-if="bulkMode && stream.length" class="cmd-selbar">
          <button class="sel-all" @click="toggleSelectAll">
            <component :is="allSelected ? SquareCheck : Square" :size="15" /> {{ allSelected ? 'Deselect page' : 'Select page' }}
          </button>
          <span class="sel-count">{{ selected.size }} selected</span>
        </div>

        <div v-if="stream.length" class="cmd-cards">
          <SdTicketCard v-for="(t, i) in stream" :key="t.id" :ticket="t" :index="i" :now="now"
            :selectable="bulkMode" :selected="selected.has(t.id)"
            @open="openDrawer" @toggle="toggleSelect" />
        </div>
        <div v-else class="cmd-empty">
          <Inbox :size="34" />
          <p>{{ streamLoading ? 'Reading the basin…' : 'No tickets match this view.' }}</p>
          <button v-if="!streamLoading" class="cmd-btn primary sm" @click="openCreate"><Plus :size="15" /> Create a ticket</button>
        </div>

        <div v-if="streamTotal > streamLimit" class="cmd-pager">
          <button class="pg" :disabled="streamPage <= 1" @click="reloadStream(streamPage - 1)"><ChevronLeft :size="15" /> Prev</button>
          <span class="pg-info">{{ streamPage }} / {{ streamPages }} · {{ streamTotal }} tickets</span>
          <button class="pg" :disabled="streamPage >= streamPages" @click="reloadStream(streamPage + 1)">Next <ChevronRight :size="15" /></button>
        </div>
      </div>

      <!-- BOARD -->
      <div v-else-if="view === 'board'" key="board">
        <SdTicketsBoard :tickets="workingSet" :now="now" :capped="wsCapped" @open="openDrawer" @move="onMove" />
      </div>

      <!-- PULSE -->
      <div v-else-if="view === 'pulse'" key="pulse">
        <SdSlaPulse :tickets="workingSet" :now="now" :loading="wsLoading" @open="openDrawer" />
      </div>

      <!-- LOAD -->
      <div v-else key="load">
        <SdWorkloadMonitor :tickets="workingSet" :now="now" :loading="wsLoading" />
      </div>
    </transition>

    <!-- ── Bulk action bar ── -->
    <transition name="cmd-rise">
      <div v-if="bulkMode && selected.size" class="cmd-bulkbar">
        <span class="bb-count"><b>{{ selected.size }}</b> selected</span>
        <div class="bb-actions">
          <button class="bb-btn" :disabled="bulkBusy" @click="bulkAssignMe"><UserCheck :size="14" /> Assign to me</button>
          <button class="bb-btn" :disabled="bulkBusy" @click="bulkEscalate"><Flame :size="14" /> Escalate</button>
          <button class="bb-btn ok" :disabled="bulkBusy" @click="bulkStatus('resolved')"><CircleCheck :size="14" /> Resolve</button>
          <div class="bb-status">
            <SdSelect v-model="bulkSetStatus" :options="statusOpts" placeholder="Set status…" />
          </div>
        </div>
        <button class="bb-x" @click="clearSelection"><X :size="16" /></button>
      </div>
    </transition>

    <SdTicketCreateModal :open="createOpen" @close="createOpen = false" @created="onCreated" />
    <SdTicketDrawer :ticket-id="drawerId" @close="drawerId = null" @changed="onDrawerChanged" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Motion } from 'motion-v'
import {
  Radar, Search, Plus, Inbox, X, SlidersHorizontal, SquareCheck, Square,
  LayoutList, Kanban, Activity, Users, UserCheck, Flame, CircleCheck,
  ChevronLeft, ChevronRight, Layers, AlertTriangle, Timer, Hourglass, CircleSlash, CheckCircle2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdTriageField from '../components/SdTriageField.vue'
import SdTicketCard from '../components/SdTicketCard.vue'
import SdTicketsBoard from '../components/SdTicketsBoard.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketCreateModal from '../modals/SdTicketCreateModal.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import {
  listTickets, changeTicketStatus, assignTicket, escalateTicket, getMe,
  loadPickers, usePickers, PRIORITIES, TICKET_TYPES, TICKET_STATUSES,
} from '@/composables/useSupportDesk'

const props = defineProps({
  createSignal: { type: Number, default: 0 },
  dashboard: { type: Object, default: null },
  scope: { type: String, default: '' }, // preset the active lens (from a Tickets tab)
  initialView: { type: String, default: 'stream' }, // stream | board | pulse | load
})
const emit = defineEmits(['go', 'changed'])
const toast = useToast()
const route = useRoute()

/* ── Lenses (all server-backed scopes / status filters) ── */
const LENSES = [
  { key: 'all', label: 'All', color: 'var(--sd-amber)', icon: Layers },
  { key: 'my', label: 'My Tickets', color: 'var(--sd-amber)', icon: UserCheck },
  { key: 'unassigned', label: 'Unassigned', color: 'var(--sd-steel)', icon: Inbox },
  { key: 'critical', label: 'Critical', color: 'var(--sd-pri-critical)', icon: AlertTriangle },
  { key: 'escalated', label: 'Escalated', color: 'var(--sd-st-escalated)', icon: Flame },
  { key: 'sla_breached', label: 'SLA Breached', color: 'var(--sd-danger)', icon: Timer },
  { key: 'in_progress', label: 'In Progress', color: 'var(--sd-st-progress)', icon: Activity },
  { key: 'pending_customer', label: 'Pending Customer', color: 'var(--sd-st-pending)', icon: Hourglass },
  { key: 'pending_vendor', label: 'Pending Vendor', color: 'var(--sd-st-pending)', icon: Hourglass },
  { key: 'resolved', label: 'Resolved', color: 'var(--sd-success)', icon: CheckCircle2 },
  { key: 'closed', label: 'Closed', color: 'var(--sd-steel)', icon: CircleSlash },
]
// lens → query fragment
const lensQuery = (k) => {
  if (k === 'all') return {}
  if (['in_progress', 'pending_customer', 'pending_vendor'].includes(k)) return { status: k }
  return { scope: k }
}

const VIEWS = [
  { key: 'stream', label: 'Stream', icon: LayoutList },
  { key: 'board', label: 'Board', icon: Kanban },
  { key: 'pulse', label: 'SLA Pulse', icon: Activity },
  { key: 'load', label: 'Workload', icon: Users },
]

/* ── State ── */
const lens = ref(LENSES.some(l => l.key === props.scope) ? props.scope : 'all')
const view = ref(['stream', 'board', 'pulse', 'load'].includes(props.initialView) ? props.initialView : 'stream')
const q = ref('')
const fPriority = ref('')
const fType = ref('')
const fAgent = ref('')
const fOrg = ref('')
const showFilters = ref(false)

const stream = ref([])
const streamTotal = ref(0)
const streamPage = ref(1)
const streamLimit = ref(20)
const streamLoading = ref(true)
const streamPages = computed(() => Math.max(1, Math.ceil(streamTotal.value / streamLimit.value)))

const workingSet = ref([])
const wsLoading = ref(true)
const wsCapped = ref(false)

const createOpen = ref(false)
const drawerId = ref(null)
const myId = ref(null)
const myCount = ref(0)

const bulkMode = ref(false)
const selected = ref(new Set())
const bulkBusy = ref(false)
const bulkSetStatus = ref('')

const pickers = usePickers()
const now = ref(Date.now())
let tick = null

/* ── Filter options ── */
const priorityOpts = computed(() => [{ value: '', label: 'All priorities' }, ...PRIORITIES])
const typeOpts = computed(() => [{ value: '', label: 'All types' }, ...TICKET_TYPES])
const statusOpts = computed(() => TICKET_STATUSES)
const orgOpts = computed(() => [{ value: '', label: 'All organizations' }, ...pickers.organizations.map(o => ({ value: o.id, label: o.name }))])
const agentOpts = computed(() => {
  const seen = new Map()
  for (const t of workingSet.value) if (t.assigned_agent_id && t.assigned_agent_name && !seen.has(t.assigned_agent_id)) seen.set(t.assigned_agent_id, t.assigned_agent_name)
  return [{ value: '', label: 'All agents' }, ...[...seen].map(([value, label]) => ({ value, label }))]
})
const activeFilterCount = computed(() => [fPriority, fType, fAgent, fOrg].filter(r => r.value).length)
const labelOf = (opts, v) => opts.find(o => o.value === v)?.label || v

/* ── Param assembly ── */
const baseParams = () => {
  const p = { ...lensQuery(lens.value) }
  if (q.value.trim()) p.q = q.value.trim()
  if (fPriority.value) p.priority = fPriority.value
  if (fType.value) p.ticket_type = fType.value
  if (fAgent.value) p.assigned_agent_id = fAgent.value
  if (fOrg.value) p.organization_id = fOrg.value
  return p
}

/* ── Loaders ── */
const reloadStream = async (toPage = 1) => {
  streamLoading.value = true
  streamPage.value = toPage
  try {
    const res = await listTickets({ ...baseParams(), page: streamPage.value, limit: streamLimit.value })
    stream.value = res.items || []
    streamTotal.value = res.total || 0
  } catch { stream.value = []; streamTotal.value = 0 } finally { streamLoading.value = false }
}
const reloadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const res = await listTickets({ ...baseParams(), page: 1, limit: 100 })
    workingSet.value = res.items || []
    wsCapped.value = (res.total || 0) > 100
  } catch { workingSet.value = []; wsCapped.value = false } finally { wsLoading.value = false }
}
const reloadMyCount = async () => {
  try { myCount.value = (await listTickets({ scope: 'my', limit: 1 })).total || 0 } catch { /* keep */ }
}
const reloadAll = async () => {
  await Promise.all([reloadWorkingSet(), view.value === 'stream' ? reloadStream(1) : Promise.resolve()])
}

/* ── Lens counts (from live dashboard) ── */
const lensCount = (k) => {
  const d = props.dashboard || {}
  const sc = d.status_counts || {}
  switch (k) {
    case 'all': return d.total_tickets ?? '—'
    case 'my': return myCount.value
    case 'unassigned': return d.unassigned ?? 0
    case 'critical': return d.critical ?? 0
    case 'escalated': return d.escalated ?? 0
    case 'sla_breached': return d.sla_breached ?? 0
    case 'in_progress': return sc.in_progress ?? 0
    case 'pending_customer': return sc.pending_customer ?? 0
    case 'pending_vendor': return sc.pending_vendor ?? 0
    case 'resolved': return sc.resolved ?? 0
    case 'closed': return sc.closed ?? 0
    default: return 0
  }
}

/* ── Interactions ── */
const setLens = (k) => { if (lens.value === k) return; lens.value = k; clearSelection(); reloadAll() }
const setView = (v) => {
  if (view.value === v) return
  view.value = v
  if (v === 'stream' && !stream.value.length) reloadStream(1)
}
const openCreate = () => { createOpen.value = true }
const openDrawer = (id) => { drawerId.value = String(id) }
const onCreated = () => { createOpen.value = false; reloadAll(); reloadMyCount(); emit('changed') }
const onDrawerChanged = () => { reloadAll(); reloadMyCount(); emit('changed') }

/* ── Bulk ── */
const toggleBulk = () => { bulkMode.value = !bulkMode.value; if (bulkMode.value && view.value !== 'stream') setView('stream'); if (!bulkMode.value) clearSelection() }
const toggleSelect = (id) => { const s = new Set(selected.value); s.has(id) ? s.delete(id) : s.add(id); selected.value = s }
const allSelected = computed(() => stream.value.length > 0 && stream.value.every(t => selected.value.has(t.id)))
const toggleSelectAll = () => { selected.value = allSelected.value ? new Set() : new Set(stream.value.map(t => t.id)) }
const clearSelection = () => { selected.value = new Set() }

const runBulk = async (label, fn) => {
  const ids = [...selected.value]
  if (!ids.length) return
  bulkBusy.value = true
  const res = await Promise.allSettled(ids.map(fn))
  const ok = res.filter(r => r.status === 'fulfilled').length
  const fail = res.length - ok
  bulkBusy.value = false
  if (ok) toast.success(`${label}: ${ok} ticket${ok > 1 ? 's' : ''} updated${fail ? `, ${fail} failed` : ''}.`)
  else toast.error(`${label} failed for all ${fail} tickets.`)
  clearSelection()
  await reloadAll(); reloadMyCount(); emit('changed')
}
const bulkAssignMe = () => {
  if (!myId.value) { toast.error('Could not resolve your user id.'); return }
  runBulk('Assigned', (id) => assignTicket(id, { assigned_agent_id: myId.value }))
}
const bulkEscalate = () => runBulk('Escalated', (id) => escalateTicket(id))
const bulkStatus = (status) => runBulk(`Status → ${status.replace('_', ' ')}`, (id) => changeTicketStatus(id, { status }))
watch(bulkSetStatus, (v) => { if (v) { bulkStatus(v); bulkSetStatus.value = '' } })

/* ── Board drag → status change (optimistic) ── */
const onMove = async ({ id, status, from }) => {
  const t = workingSet.value.find(x => x.id === id)
  if (t) t.status = status
  try {
    await changeTicketStatus(id, { status })
    toast.success(`Moved to ${status.replace('_', ' ')}.`)
    reloadMyCount(); emit('changed')
    reloadWorkingSet()
  } catch (e) {
    if (t) t.status = from
    toast.error(e?.response?.data?.detail || 'Could not change status.')
  }
}

const clearFilters = () => { fPriority.value = ''; fType.value = ''; fAgent.value = ''; fOrg.value = ''; reloadAll() }

/* ── Filter watchers (debounced search) ── */
let searchTimer = null
watch(q, () => { clearTimeout(searchTimer); searchTimer = setTimeout(reloadAll, 350) })
watch([fPriority, fType, fAgent, fOrg], reloadAll)
watch(() => props.createSignal, (v) => { if (v) openCreate() })

/* ── Deep-link: lens / view from the rail's Tickets sub-views (?lens / ?view) ── */
const LENS_KEYS = new Set(LENSES.map(l => l.key))
const VIEW_KEYS = new Set(VIEWS.map(v => v.key))
const applyQuery = () => {
  let changed = false
  const ql = route.query.lens, qv = route.query.view
  if (ql && LENS_KEYS.has(ql) && lens.value !== ql) { lens.value = ql; changed = true }
  if (qv && VIEW_KEYS.has(qv) && view.value !== qv) { view.value = qv; changed = true }
  return changed
}
watch(() => [route.query.lens, route.query.view], () => { if (applyQuery()) { clearSelection(); reloadAll() } })

/* ── Deep-link from notification ── */
watch(() => route.query.ticket, (v) => { if (v) drawerId.value = String(v) })

onMounted(() => {
  applyQuery()
  reloadWorkingSet()
  reloadStream(1)
  reloadMyCount()
  loadPickers()
  getMe().then(u => { myId.value = u.id }).catch(() => {})
  if (route.query.ticket) drawerId.value = String(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { clearInterval(tick); clearTimeout(searchTimer) })
</script>

<style scoped>
.sd-cmd { display: flex; flex-direction: column; gap: 16px; position: relative; }

/* Staged cinematic entrance — header → instrument → lenses → toolbar.
   Applied to containers (not the interactive children) so per-item hover
   transforms never fight a fill-locked entrance transform. */
.cmd-head { animation: cmd-up 0.55s var(--sd-spring) both; }
.cmd-lenses { animation: cmd-up 0.55s var(--sd-spring) both; animation-delay: 0.14s; }
.cmd-toolbar { animation: cmd-up 0.55s var(--sd-spring) both; animation-delay: 0.2s; }
@keyframes cmd-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* Header */
.cmd-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.cmd-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--sd-amber); font-family: var(--sd-mono); }
.cmd-title { font-size: clamp(24px, 3.4vw, 34px); font-weight: 800; color: var(--sd-text); margin: 8px 0 5px; letter-spacing: -0.02em; line-height: 1.05; }
.cmd-title .grad { background: var(--sd-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.cmd-sub { font-size: 13.5px; color: var(--sd-text-muted); margin: 0; max-width: 540px; }
.cmd-cta { display: flex; gap: 9px; }

.cmd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); white-space: nowrap; transition: border-color 0.2s, background 0.2s; }
.cmd-btn.sm { padding: 9px 14px; }
.cmd-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 6px 20px rgba(251, 146, 60, 0.28); }
[data-theme="light"] .cmd-btn.primary { color: #fff8ec; }
.cmd-btn.ghost.on { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); color: var(--sd-amber); }

/* Lenses */
.cmd-lenses { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.cmd-lenses::-webkit-scrollbar { height: 5px; }
.cmd-lenses::-webkit-scrollbar-thumb { background: var(--sd-border-strong); border-radius: 999px; }
.lens {
  display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; cursor: pointer; white-space: nowrap; flex-shrink: 0;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-secondary); font-size: 12.5px; font-weight: 600;
  transition: all 0.2s var(--sd-spring);
}
.lens-ic { color: var(--lc); opacity: 0.85; }
.lens-count { font-size: 11px; font-weight: 800; color: var(--sd-text-muted); padding: 1px 7px; border-radius: 999px; background: var(--sd-surface); font-variant-numeric: tabular-nums; }
.lens:hover { color: var(--sd-text); border-color: var(--sd-border-strong); transform: translateY(-1px); }
.lens.on { color: #1a1206; background: var(--sd-grad-rail); border-color: transparent; }
.lens.on .lens-ic { color: #1a1206; opacity: 1; }
.lens.on .lens-count { background: rgba(0, 0, 0, 0.16); color: #1a1206; }
[data-theme="light"] .lens.on { color: #fff8ec; }
[data-theme="light"] .lens.on .lens-ic, [data-theme="light"] .lens.on .lens-count { color: #fff8ec; }
[data-theme="light"] .lens.on .lens-count { background: rgba(255, 255, 255, 0.22); }

/* Toolbar */
.cmd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.cmd-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.cmd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.cmd-search input::placeholder { color: var(--sd-text-dim); }
.srch-x { background: none; border: none; color: var(--sd-text-dim); cursor: pointer; display: grid; place-items: center; }
.cmd-btn.flt { position: relative; }
.cmd-btn.flt.on { border-color: var(--sd-amber-border); color: var(--sd-amber); }
.flt-badge { font-size: 10px; font-weight: 800; background: var(--sd-grad-hero); color: #1a1206; border-radius: 999px; padding: 0 6px; min-width: 16px; text-align: center; }
[data-theme="light"] .flt-badge { color: #fff8ec; }

.cmd-views { display: inline-flex; gap: 3px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.vbtn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; background: none; border: none; cursor: pointer; color: var(--sd-text-muted); font-size: 12.5px; font-weight: 600; transition: background 0.18s, color 0.18s; }
.vbtn:hover { color: var(--sd-text); }
.vbtn.on { background: var(--sd-surface-elevated); color: var(--sd-amber); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }

/* Filters drawer */
.cmd-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: end; padding: 16px; border-radius: 14px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.flt-field { display: flex; flex-direction: column; gap: 6px; }
.flt-field label { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); }
.flt-clear { display: inline-flex; align-items: center; gap: 6px; align-self: center; padding: 10px 13px; border-radius: 10px; background: var(--sd-danger-soft); border: 1px solid color-mix(in srgb, var(--sd-danger) 30%, transparent); color: var(--sd-danger); font-size: 12.5px; font-weight: 600; cursor: pointer; }

.cmd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; color: var(--sd-text-secondary); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); cursor: pointer; }

/* Stream */
.cmd-view-stream { display: flex; flex-direction: column; gap: 10px; }
.cmd-selbar { display: flex; align-items: center; gap: 14px; padding: 4px 2px; }
.sel-all { display: inline-flex; align-items: center; gap: 7px; background: none; border: none; cursor: pointer; color: var(--sd-amber); font-size: 12.5px; font-weight: 600; }
.sel-count { font-size: 12px; color: var(--sd-text-muted); }
.cmd-cards { display: flex; flex-direction: column; gap: 10px; }

.cmd-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.cmd-empty p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

.cmd-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 10px; }
.pg { display: inline-flex; align-items: center; gap: 4px; padding: 8px 15px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text); }
.pg:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }

/* Bulk bar */
.cmd-bulkbar {
  position: sticky; bottom: 16px; z-index: 20; margin: 4px auto 0; display: flex; align-items: center; gap: 16px;
  padding: 12px 16px; border-radius: 16px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-amber-border);
  box-shadow: var(--sd-shadow); backdrop-filter: blur(12px); max-width: 760px; width: 100%;
}
.bb-count { font-size: 13px; color: var(--sd-text-secondary); white-space: nowrap; }
.bb-count b { color: var(--sd-amber); font-size: 16px; }
.bb-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
.bb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.bb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bb-btn.ok { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.bb-status { min-width: 150px; }
.bb-x { background: none; border: none; color: var(--sd-text-muted); cursor: pointer; display: grid; place-items: center; }

/* transitions */
.cmd-fade-enter-active, .cmd-fade-leave-active { transition: opacity 0.22s, transform 0.22s; }
.cmd-fade-enter-from, .cmd-fade-leave-to { opacity: 0; transform: translateY(-6px); }
.cmd-view-enter-active, .cmd-view-leave-active { transition: opacity 0.24s var(--sd-spring), transform 0.24s var(--sd-spring); }
.cmd-view-enter-from { opacity: 0; transform: translateY(10px); }
.cmd-view-leave-to { opacity: 0; transform: translateY(-6px); }
.cmd-rise-enter-active, .cmd-rise-leave-active { transition: opacity 0.26s var(--sd-spring), transform 0.26s var(--sd-spring); }
.cmd-rise-enter-from, .cmd-rise-leave-to { opacity: 0; transform: translateY(20px); }

@media (max-width: 640px) {
  .cmd-views .vbtn-l { display: none; }
  .cmd-bulkbar { flex-wrap: wrap; }
}
/* Motion policy: respect OS Reduce Motion UNLESS the in-app Cinematic mode is on. */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cmd-head,
  html:not([data-cinematic="on"]) .cmd-lenses,
  html:not([data-cinematic="on"]) .cmd-toolbar { animation: none; }
  html:not([data-cinematic="on"]) .cmd-view-enter-active, html:not([data-cinematic="on"]) .cmd-view-leave-active,
  html:not([data-cinematic="on"]) .cmd-rise-enter-active, html:not([data-cinematic="on"]) .cmd-rise-leave-active,
  html:not([data-cinematic="on"]) .cmd-fade-enter-active, html:not([data-cinematic="on"]) .cmd-fade-leave-active { transition: opacity 0.18s linear; }
  html:not([data-cinematic="on"]) .cmd-view-enter-from, html:not([data-cinematic="on"]) .cmd-view-leave-to,
  html:not([data-cinematic="on"]) .cmd-rise-enter-from, html:not([data-cinematic="on"]) .cmd-rise-leave-to { transform: none; }
}
</style>
