<template>
  <div class="sd-tls" :style="{ '--acc': sc.accent }">
    <!-- ░ Scope hero — identity + KPI lenses ░ -->
    <header class="tls-hero sd-card">
      <div class="tls-hero-main">
        <p class="tls-eyebrow"><span class="tls-dot" /> SUPPORT · {{ sc.eyebrow }}</p>
        <h2 class="tls-title"><component :is="sc.icon" :size="22" /> {{ sc.label }}</h2>
        <p class="tls-sub">{{ sc.sub }}</p>
      </div>
      <div class="tls-hero-cta">
        <button class="tls-btn primary" @click="$emit('new')"><Plus :size="15" /> New ticket</button>
        <button class="tls-btn" :class="{ on: showFilters }" @click="showFilters = !showFilters">
          <SlidersHorizontal :size="15" /> Filters <span v-if="activeFilterCount" class="tls-fbadge">{{ activeFilterCount }}</span>
        </button>
        <button class="tls-btn icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'">
          <Rows3 :size="15" />
        </button>
        <button v-if="agent" class="tls-btn icon" title="Export CSV" :disabled="exporting" @click="doExport"><Download :size="15" /></button>
        <button class="tls-btn icon" title="Refresh" @click="reload"><RefreshCw :size="15" :class="{ spin: loading }" /></button>
      </div>
    </header>

    <!-- ░ Saved views bar ░ -->
    <div v-if="savedViews.length || activeFilterCount" class="tls-views-bar">
      <Bookmark :size="13" class="vb-ico" />
      <button v-for="v in savedViews" :key="v.id" class="vb-chip" :class="{ on: appliedView === v.id }" @click="applyView(v)">
        {{ v.name }}<span v-if="v.is_shared" class="vb-shared" title="Shared">·</span>
        <XIcon :size="11" class="vb-x" @click.stop="removeView(v)" />
      </button>
      <button v-if="activeFilterCount" class="vb-save" @click="saveView"><BookmarkPlus :size="12" /> Save view</button>
    </div>

    <!-- KPI lenses -->
    <div v-if="kpis.length" class="tls-kpis">
      <SdKpiTile v-for="(k, i) in kpis" :key="k.key" :icon="k.icon" :label="k.label" :value="k.value"
        :accent="k.color" :sub="k.sub" :suffix="k.suffix" :decimals="k.decimals || 0" :index="i" />
    </div>

    <!-- ░ Filter drawer ░ -->
    <Transition name="tls-flt">
      <section v-if="showFilters" class="tls-filters sd-card">
        <div v-if="has('q')" class="flt-field flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div v-if="has('priority')" class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="opt(PRIORITIES, 'All priorities')" /></div>
        <div v-if="has('type')" class="flt-field"><label>Type</label><SdSelect v-model="f.ticket_type" :options="opt(TICKET_TYPES, 'All types')" /></div>
        <div v-if="has('status')" class="flt-field"><label>Status</label><SdSelect v-model="f.status" :options="opt(TICKET_STATUSES, 'Any status')" /></div>
        <div v-if="has('agent') && agent" class="flt-field"><label>Agent</label><SdSelect v-model="f.assigned_agent_id" :options="agentOptions" /></div>
        <div v-if="has('org') && agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div v-if="has('date')" class="flt-field flt-date"><label>Created</label>
          <input type="date" v-model="f.created_from" /><span>→</span><input type="date" v-model="f.created_to" />
        </div>
        <div class="flt-actions">
          <button class="tls-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="tls-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- ░ Toolbar: view switch + result count ░ -->
    <div class="tls-toolbar">
      <div class="tls-views">
        <button v-for="v in VIEWS" :key="v.key" class="tls-view" :class="{ on: view === v.key }" @click="view = v.key">
          <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
        </button>
      </div>
      <span class="tls-count">
        {{ total }} {{ total === 1 ? 'ticket' : 'tickets' }}<template v-if="wsCapped && view !== 'table'"> · stats over first 100</template>
      </span>
    </div>

    <!-- ░ Bulk bar (agents only) ░ -->
    <Transition name="tls-flt">
      <div v-if="agent && selected.length" class="tls-bulk sd-card">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button v-if="hasBulk('assignMe')" class="tls-btn sm" @click="doBulk('assign', { assigned_agent_id: myId })" :disabled="!myId"><UserCheck :size="13" /> Assign to me</button>
          <button v-if="hasBulk('escalate')" class="tls-btn sm" @click="doBulk('escalate')"><Flame :size="13" /> Escalate</button>
          <button v-if="hasBulk('resolve')" class="tls-btn sm" @click="doBulk('resolve')"><CircleCheck :size="13" /> Resolve</button>
          <div v-if="hasBulk('setStatus')" class="bulk-status">
            <SdSelect v-model="bulkStatus" :options="opt(TICKET_STATUSES, 'Set status…')" />
            <button class="tls-btn sm" :disabled="!bulkStatus" @click="doBulk('set_status', { status: bulkStatus })">Apply</button>
          </div>
          <button v-if="hasBulk('addTag')" class="tls-btn sm" @click="promptTag"><Tag :size="13" /> Tag</button>
          <button v-if="hasBulk('restore')" class="tls-btn sm" @click="doRestore"><ArchiveRestore :size="13" /> Restore</button>
        </div>
        <button class="tls-btn sm ghost" @click="clearSel">Clear</button>
      </div>
    </Transition>

    <!-- ░ Views ░ -->
    <SdTicketTable
      v-if="view === 'table'"
      :rows="rows" :columns="columns" :loading="loading"
      :selectable="agent && (sc.bulkActions || []).length > 0"
      :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
      :density="density" :accent="sc.accent" :empty="sc.empty" :empty-icon="sc.icon"
      @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort"
    />
    <SdTicketsBoard v-else-if="view === 'board'" :tickets="workingSet" :now="now" :capped="wsCapped" @open="openTicket" @move="onMove" />
    <SdSlaPulse v-else-if="view === 'sla'" :tickets="workingSet" :now="now" :loading="wsLoading" @open="openTicket" />
    <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="workingSet" :now="now" :loading="wsLoading" />

    <!-- ░ Pagination (table) ░ -->
    <div v-if="view === 'table' && total > limit" class="tls-pager">
      <button class="tls-btn sm" :disabled="page <= 1" @click="go(page - 1)"><ChevronLeft :size="14" /> Prev</button>
      <span class="pg-info">Page {{ page }} of {{ pages }}</span>
      <button class="tls-btn sm" :disabled="page >= pages" @click="go(page + 1)">Next <ChevronRight :size="14" /></button>
    </div>

    <!-- One adaptive drawer: it resolves agent vs worker vs requester data + actions
         from the passed capability, so every scope tab shows the same rich console. -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="drawerId = null" @changed="reload" />
    <!-- Terminal board drops capture a structured resolution (the backend rejects a bare
         set-status into resolved/closed) — same drop-gate as the Open desk. -->
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" :close-mode="resolveCloseMode"
      @close="resolveTarget = null" @done="onResolved" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import {
  Plus, SlidersHorizontal, Rows3, RefreshCw, Search, X, Check, UserCheck, Flame, CircleCheck,
  Tag, Layers, Activity, Inbox, AlertTriangle, Timer, AlarmClock, Clock, RotateCcw, Star,
  LayoutGrid, Gauge, Users, Table, ChevronLeft, ChevronRight, ArchiveRestore,
  Download, Bookmark, BookmarkPlus, X as XIcon,
} from 'lucide-vue-next'
import SdKpiTile from '../components/SdKpiTile.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdSelect from '../components/SdSelect.vue'
import SdTicketsBoard from '../components/SdTicketsBoard.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, bulkTickets, changeTicketStatus, restoreTicket, getMe, loadPickers, usePickers,
  listSavedViews, createSavedView, deleteSavedView, exportTicketsCsv,
  PRIORITIES, TICKET_TYPES, TICKET_STATUSES,
} from '@/composables/useSupportDesk'
import { useToast } from 'vue-toastification'

const props = defineProps({
  scope: { type: String, default: 'all' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const sc = computed(() => getTicketScope(props.scope))
const agent = computed(() => props.panel === 'admin' || props.agentReveal)

const VIEWS = [
  { key: 'table', label: 'Table', icon: Table },
  { key: 'board', label: 'Board', icon: LayoutGrid },
  { key: 'sla', label: 'SLA', icon: Gauge },
  { key: 'load', label: 'Workload', icon: Users },
]
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)

/* filters */
const f = reactive({ q: '', priority: '', ticket_type: '', status: '', assigned_agent_id: '', organization_id: '', created_from: '', created_to: '' })
const has = (k) => (sc.value.filters || []).includes(k)
const hasBulk = (k) => (sc.value.bulkActions || []).includes(k)
const activeFilterCount = computed(() => ['priority', 'ticket_type', 'status', 'assigned_agent_id', 'organization_id', 'created_from', 'created_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* sort + paging */
const sortBy = ref(sc.value.defaultSort?.by || 'created_at')
const sortDir = ref(sc.value.defaultSort?.dir || 'desc')
const page = ref(1)
const limit = 20
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

/* data */
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const now = ref(Date.now())
let tick = null
const myId = ref(null)

const params = () => ({
  scope: sc.value.backendScope,
  q: f.q || undefined,
  priority: f.priority || undefined,
  ticket_type: f.ticket_type || undefined,
  status: f.status || undefined,
  assigned_agent_id: f.assigned_agent_id || undefined,
  organization_id: f.organization_id || undefined,
  created_from: f.created_from || undefined,
  created_to: f.created_to || undefined,
  sort_by: sortBy.value,
  sort_dir: sortDir.value,
})

const loadTable = async () => {
  loading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...params(), page: page.value, limit })
    rows.value = r.items || []
    total.value = r.total || 0
  } catch { rows.value = []; total.value = 0 } finally { loading.value = false }
}
const loadWorkingSet = async () => {
  wsLoading.value = true
  try {
    const r = await listScoped({ agent: agent.value, ...params(), page: 1, limit: 100 })
    workingSet.value = r.items || []
    wsCapped.value = (r.total || 0) > 100
  } catch { workingSet.value = []; wsCapped.value = false } finally { wsLoading.value = false }
}
const reload = () => { page.value = 1; loadTable(); loadWorkingSet() }
const go = (p) => { page.value = Math.min(Math.max(1, p), pages.value); loadTable() }
const onSort = (key) => {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = 'desc' }
  page.value = 1; loadTable()
}

/* re-init when the scope (tab) changes */
watch(() => props.scope, () => {
  Object.keys(f).forEach(k => (f[k] = ''))
  sortBy.value = sc.value.defaultSort?.by || 'created_at'
  sortDir.value = sc.value.defaultSort?.dir || 'desc'
  selected.value = []
  appliedView.value = null
  reload(); loadViews()
})
watch(agent, reload)

/* KPI stats from the working set (+ server total) */
const OPEN_SET = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated']
const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const terminal = (t) => ['resolved', 'closed'].includes(t.status)
const stats = computed(() => {
  const ws = workingSet.value
  const ages = ws.map(t => (now.value - new Date(t.created_at).getTime()) / 86400000)
  const rated = ws.filter(t => t.csat_score)
  const breaching = ws.filter(t => t.sla_resolution_breached || (dueMs(t) != null && now.value > dueMs(t) && !terminal(t)))
  const dueSoon = ws.filter(t => !terminal(t) && dueMs(t) != null && (dueMs(t) - now.value) > 0 && (dueMs(t) - now.value) < 7200000)
  return {
    total: total.value,
    open: ws.filter(t => OPEN_SET.includes(t.status)).length,
    unassigned: ws.filter(t => !t.assigned_agent_id && OPEN_SET.includes(t.status)).length,
    critical: ws.filter(t => t.priority === 'critical').length,
    escalated: ws.filter(t => t.is_escalated).length,
    breaching: breaching.length,
    dueSoon: dueSoon.length,
    oldestAge: ages.length ? Math.round(Math.max(...ages)) : 0,
    avgAge: ages.length ? Math.round((ages.reduce((a, b) => a + b, 0) / ages.length) * 10) / 10 : 0,
    reopened: ws.filter(t => (t.reopened_count || 0) > 0).length,
    csatAvg: rated.length ? Math.round((rated.reduce((a, t) => a + t.csat_score, 0) / rated.length) * 10) / 10 : 0,
  }
})
const KPI_DEFS = {
  total: { label: 'In scope', icon: Layers, color: 'var(--acc)' },
  open: { label: 'Open', icon: Activity, color: 'var(--sd-st-progress)' },
  unassigned: { label: 'Unassigned', icon: Inbox, color: 'var(--sd-amber-strong)' },
  critical: { label: 'Critical', icon: AlertTriangle, color: 'var(--sd-pri-critical)' },
  escalated: { label: 'Escalated', icon: Flame, color: 'var(--sd-st-escalated)' },
  breaching: { label: 'Breaching', icon: Timer, color: 'var(--sd-danger)' },
  dueSoon: { label: 'Due soon', icon: AlarmClock, color: 'var(--sd-warning)' },
  oldestAge: { label: 'Oldest', icon: Clock, color: 'var(--sd-text-secondary)', suffix: 'd' },
  avgAge: { label: 'Avg age', icon: Clock, color: 'var(--sd-text-secondary)', suffix: 'd', decimals: 1 },
  reopened: { label: 'Reopened', icon: RotateCcw, color: 'var(--sd-st-escalated)' },
  csatAvg: { label: 'CSAT', icon: Star, color: 'var(--sd-success)', suffix: '/5', decimals: 1 },
}
const kpis = computed(() => (sc.value.kpis || []).map(key => {
  const d = KPI_DEFS[key]; if (!d) return null
  return { key, ...d, value: stats.value[key] ?? 0, sub: wsCapped.value && key !== 'total' ? 'first 100' : '' }
}).filter(Boolean))

const columns = computed(() => sc.value.columns || [])

/* filter option lists */
const pickers = usePickers()
const opt = (arr, allLabel) => [{ value: '', label: allLabel }, ...arr.map(x => ({ value: x.value, label: x.label }))]
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const agentOptions = computed(() => {
  const seen = new Map()
  for (const t of workingSet.value) if (t.assigned_agent_id && t.assigned_agent_name) seen.set(String(t.assigned_agent_id), t.assigned_agent_name)
  return [{ value: '', label: 'All agents' }, ...[...seen].map(([value, label]) => ({ value, label }))]
})

/* selection + bulk */
const selected = ref([])
const bulkStatus = ref('')
const isSel = (id) => selected.value.includes(String(id))
const toggleSel = (id) => { const s = String(id); selected.value = isSel(id) ? selected.value.filter(x => x !== s) : [...selected.value, s] }
const toggleAll = () => {
  const ids = rows.value.map(r => String(r.id))
  const all = ids.every(i => selected.value.includes(i))
  selected.value = all ? selected.value.filter(i => !ids.includes(i)) : [...new Set([...selected.value, ...ids])]
}
const clearSel = () => { selected.value = [] }
const doBulk = async (action, payload = {}) => {
  if (!selected.value.length) return
  try {
    const r = await bulkTickets({ ids: selected.value, action, ...payload })
    toast.success(`${r.updated} ticket${r.updated === 1 ? '' : 's'} updated`)
    clearSel(); bulkStatus.value = ''; reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk action failed') }
}
const promptTag = () => {
  const tag = window.prompt('Tag to add to selected tickets:')
  if (tag && tag.trim()) doBulk('add_tag', { tag: tag.trim() })
}
// Restore isn't part of the server bulk endpoint — loop the per-ticket endpoint.
const doRestore = async () => {
  if (!selected.value.length) return
  try {
    const res = await Promise.allSettled(selected.value.map(id => restoreTicket(id)))
    const ok = res.filter(r => r.status === 'fulfilled').length
    toast.success(`${ok} ticket${ok === 1 ? '' : 's'} restored`)
    clearSel(); reload()
  } catch (e) { toast.error('Restore failed') }
}

/* board drag → status change. Terminal targets must capture a resolution (the backend
   rejects a bare set-status into resolved/closed) — route them through SdResolveModal. */
const resolveTarget = ref(null)
const resolveCloseMode = ref(false)
const onResolved = () => { resolveTarget.value = null; loadWorkingSet(); loadTable() }
const onMove = async ({ id, status }) => {
  if (status === 'resolved' || status === 'closed') {
    const t = workingSet.value.find(x => String(x.id) === String(id))
    if (t) { resolveCloseMode.value = status === 'closed'; resolveTarget.value = t }
    return
  }
  try { await changeTicketStatus(id, { status }); loadWorkingSet(); loadTable() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not move ticket') }
}

/* ── saved views ── */
const savedViews = ref([])
const appliedView = ref(null)
const loadViews = async () => {
  try { savedViews.value = await listSavedViews({ scope: sc.value.backendScope }) } catch { savedViews.value = [] }
}
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
    const v = await createSavedView({
      name: name.trim(), scope: sc.value.backendScope,
      filters: { ...f }, columns: sc.value.columns || [], sort_by: sortBy.value, sort_dir: sortDir.value,
    })
    savedViews.value = [...savedViews.value, v]; appliedView.value = v.id
    toast.success('View saved')
  } catch (e) { toast.error('Could not save view') }
}
const removeView = async (v) => {
  try { await deleteSavedView(v.id); savedViews.value = savedViews.value.filter(x => x.id !== v.id); if (appliedView.value === v.id) appliedView.value = null }
  catch { toast.error('Could not delete view') }
}

/* ── CSV export ── */
const exporting = ref(false)
const doExport = async () => {
  exporting.value = true
  try {
    const blob = await exportTicketsCsv(params())
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `tickets-${props.scope}.csv`; document.body.appendChild(a); a.click()
    a.remove(); URL.revokeObjectURL(url)
  } catch (e) { toast.error('Export failed') } finally { exporting.value = false }
}

/* drawer */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }

onMounted(async () => {
  reload()
  loadViews()
  loadPickers().catch(() => {})
  try { const me = await getMe(); myId.value = me?.id || null } catch { /* non-fatal */ }
  if (route.query.ticket) openTicket(route.query.ticket)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(tick))
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
</script>

<style scoped>
.sd-tls { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }

/* hero */
.tls-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px; border-color: color-mix(in srgb, var(--acc) 24%, var(--sd-border)); position: relative; overflow: hidden; }
.tls-hero::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--acc), transparent 70%); opacity: 0.7; }
.tls-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--acc); margin: 0 0 8px; }
.tls-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 10px color-mix(in srgb, var(--acc) 60%, transparent); }
.tls-title { display: inline-flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0 0 6px; }
.tls-title :deep(svg) { color: var(--acc); }
.tls-sub { font-size: 13.5px; color: var(--sd-text-secondary); margin: 0; max-width: 60ch; }
.tls-hero-cta { display: flex; flex-wrap: wrap; gap: 8px; flex-shrink: 0; }

.tls-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.15s; }
.tls-btn:hover { border-color: var(--acc); }
.tls-btn:active { transform: translateY(1px); }
.tls-btn.on { border-color: var(--acc); color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); }
.tls-btn.primary { border: none; background: var(--sd-grad-hero); color: #1a1206; box-shadow: 0 6px 18px rgba(251,146,60,0.22); }
[data-theme="light"] .tls-btn.primary { color: #fff8ec; }
.tls-btn.icon { padding: 9px 10px; }
.tls-btn.sm { padding: 7px 12px; font-size: 12px; }
.tls-btn.ghost { background: transparent; }
.tls-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.tls-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--acc); color: #1a1206; font-size: 10px; font-weight: 800; }
[data-theme="light"] .tls-fbadge { color: #fff8ec; }
.spin { animation: sd-orbit-spin 0.8s linear infinite; }

/* kpis */
.tls-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap: 10px; }

/* saved views bar */
.tls-views-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.vb-ico { color: var(--acc); flex-shrink: 0; }
.vb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary); }
.vb-chip:hover { border-color: var(--acc); color: var(--sd-text); }
.vb-chip.on { border-color: var(--acc); color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); }
.vb-shared { color: var(--acc); font-weight: 800; }
.vb-x { opacity: 0.5; }
.vb-x:hover { opacity: 1; color: var(--sd-danger); }
.vb-save { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.vb-save:hover { color: var(--acc); border-color: var(--acc); }

/* filters */
.tls-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-q { flex: 1; min-width: 220px; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-date { flex-direction: row; align-items: center; gap: 6px; }
.flt-date input { padding: 8px 10px; border-radius: 9px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); font-family: inherit; font-size: 12.5px; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

/* toolbar */
.tls-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tls-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.tls-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); transition: color 0.18s, background 0.18s; }
.tls-view:hover { color: var(--sd-text); }
.tls-view.on { color: var(--acc); background: color-mix(in srgb, var(--acc) 12%, transparent); }
.tls-count { font-size: 12px; color: var(--sd-text-dim); font-family: var(--sd-mono); }

/* bulk */
.tls-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--acc); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--acc); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.bulk-status { display: inline-flex; align-items: center; gap: 6px; }
.bulk-status :deep(.sd-select) { min-width: 150px; }

/* pager */
.tls-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); font-family: var(--sd-mono); }

.tls-flt-enter-active, .tls-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.tls-flt-enter-from, .tls-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) {
  .tls-hero { flex-direction: column; }
  .flt-actions { margin-left: 0; }
}
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .spin { animation: none; } }
</style>
