<template>
  <div class="wb">
    <!-- HERO -->
    <SdMyTicketsHero
      :panel="panel" :caps="caps" :me="me" :tickets="all" :stats="stats"
      :active-lens="lens" :adv-count="advCount" :now="now" :loading="loading"
      @pick="setLens" @new="goNew" @refresh="reload"
      @filters="filterOpen = true" @team="goTeam" @open="openTicket"
    />

    <!-- SMART INSIGHTS -->
    <SdInsightTicker :insights="stats.insights || []" :reduced="reduced" @act="onInsight" />

    <!-- TOOLBAR: search + utilities -->
    <Motion as="div" class="wb-toolbar"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="wb-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search ticket #, subject, requester, email, tag…" />
        <button v-if="q" class="srch-x" @click="q = ''"><X :size="13" /></button>
      </div>
      <div class="wb-util">
        <div class="wb-views" ref="viewsRef">
          <button class="wb-btn ghost" :class="{ on: viewsOpen }" @click="viewsOpen = !viewsOpen"><Bookmark :size="15" /> Views <ChevronDown :size="13" /></button>
          <Motion v-if="viewsOpen" class="views-pop" :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.18 }">
            <p class="vp-h">Default views</p>
            <button v-for="v in DEFAULT_VIEWS" :key="v.id" class="vp-item" @click="applyView(v)"><component :is="v.icon" :size="13" /> {{ v.name }}</button>
            <template v-if="savedViews.length">
              <p class="vp-h">Saved</p>
              <div v-for="v in savedViews" :key="v.id" class="vp-item saved">
                <button class="vp-apply" @click="applyView(v)"><Star :size="12" /> {{ v.name }}</button>
                <button class="vp-del" @click="deleteView(v.id)"><X :size="12" /></button>
              </div>
            </template>
            <button class="vp-save" @click="saveCurrentView"><BookmarkPlus :size="13" /> Save current view</button>
          </Motion>
        </div>
        <button class="wb-btn ghost" title="Export current view (CSV)" @click="exportCsv()"><Download :size="15" /> Export</button>
        <button v-if="caps.agent" class="wb-btn ghost" title="Assign unassigned in view to me" @click="quickAssign"><UserPlus :size="15" /> Quick assign</button>
      </div>
    </Motion>

    <!-- quick-filter pills -->
    <div class="wb-pills">
      <Motion as="button" v-for="(p, i) in PILLS" :key="p.key" type="button" class="pill" :class="{ on: lens === p.key }" :style="{ '--pc': p.color }"
        :initial="{ opacity: 0, y: 8, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.36, delay: 0.12 + i * 0.035, ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="setLens(p.key)">
        <component :is="p.icon" :size="13" /> {{ p.label }}
        <span class="pill-n">{{ lensCount(p.key) }}</span>
      </Motion>
    </div>

    <!-- transient insight filter chip -->
    <div v-if="idFilter.length" class="wb-idfilter">
      <Sparkles :size="13" /> Showing {{ idFilter.length }} ticket{{ idFilter.length === 1 ? '' : 's' }} from a smart insight
      <button @click="idFilter = []"><X :size="12" /> clear</button>
    </div>

    <!-- TABLE — same proven component as /all (no horizontal scroll; subject column flexes) -->
    <SdTicketTable
      :rows="paged" :columns="TABLE_COLUMNS" :loading="loading"
      :selectable="caps.agent" :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
      density="comfortable" accent="var(--sd-amber)" :empty="emptyCfg" :empty-icon="Inbox"
      @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort"
    />

    <!-- PAGINATION — client-side over the filtered set (10 per page) -->
    <SdPagination :page="pageNo" :pages="pageCount" :total="sorted.length" :limit="PAGE_SIZE"
      accent="var(--sd-amber)" @go="goPage" />

    <!-- BULK BAR -->
    <Presence>
      <Motion
        v-if="selected.length && caps.agent" class="bulk-bar"
        :initial="{ y: 80, opacity: 0 }" :animate="{ y: 0, opacity: 1 }" :exit="{ y: 80, opacity: 0 }"
        :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
      >
        <span class="bb-count"><CheckCheck :size="15" /> {{ selected.length }} selected</span>
        <div class="bb-acts">
          <button class="bb-a" @click="openBulkModal('assign')"><UserCheck :size="14" /> Assign</button>
          <button class="bb-a" @click="openBulkModal('status')"><RefreshCw :size="14" /> Status</button>
          <button class="bb-a" @click="openBulkModal('priority')"><Flag :size="14" /> Priority</button>
          <button class="bb-a" @click="openBulkModal('escalate')"><Flame :size="14" /> Escalate</button>
          <button class="bb-a" @click="openBulkModal('resolve')"><CircleCheck :size="14" /> Resolve</button>
          <button v-if="selected.length >= 2" class="bb-a" @click="openBulkModal('merge')"><GitMerge :size="14" /> Merge</button>
          <button class="bb-a" @click="exportCsv(true)"><Download :size="14" /> Export</button>
        </div>
        <button class="bb-clear" @click="selected = []"><X :size="15" /></button>
      </Motion>
    </Presence>

    <!-- DRAWERS + MODAL -->
    <!-- One adaptive drawer for everyone: agent console for agents/admins, work actions
         for assignees/managers/collaborators, read+reply+rate for pure requesters. -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="caps" :me="me" @close="drawerId = null" @changed="onChanged" />
    <SdAdvancedFilterDrawer :open="filterOpen" :filters="adv" :category-opts="categoryOpts" :org-opts="orgOpts"
      :assignee-opts="assigneeOpts" :preview-count="previewCount"
      @close="filterOpen = false" @apply="onApplyAdv" />
    <SdWorkbenchActionDrawer :open="actionOpen" :mode="actionMode" :ticket="actionTicket" :ids="selected" :me="me"
      @close="actionOpen = false" @done="onActionDone" />
    <SdEscalateConsole :open="escalateOpen" :ticket="escalateTicketObj" :me="me" :assignees="assigneeOpts" :now="now"
      @close="escalateOpen = false" @done="onEscalated" />
    <!-- Bulk-bar actions all flow through ONE corporate modal: per-ticket workflow eligibility,
         reasons + process, and an apply-eligible/skip-rest result ledger. -->
    <SdBulkActionModal :open="bulkModalOpen" :mode="bulkMode" :tickets="selectedTickets" :me="me"
      :assignees="assigneeOpts" :now="now" @close="bulkModalOpen = false" @done="onBulkDone" />
    <SdTicketCreateModal :open="createOpen" :panel="panel" @close="createOpen = false" @created="onCreated" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Plus, RefreshCw, UserPlus, Download, Bookmark, BookmarkPlus, ChevronDown, SlidersHorizontal,
  Search, X, Star, Sparkles, CheckCheck, UserCheck, Flag, Flame, CircleCheck, GitMerge,
  Activity, Hourglass, Timer, AlertOctagon, RotateCcw, Inbox,
} from 'lucide-vue-next'
import SdMyTicketsHero from '../components/SdMyTicketsHero.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdPagination from '../components/SdPagination.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdAdvancedFilterDrawer from '../drawers/SdAdvancedFilterDrawer.vue'
import SdWorkbenchActionDrawer from '../drawers/SdWorkbenchActionDrawer.vue'
import SdEscalateConsole from '../drawers/SdEscalateConsole.vue'
import SdTicketCreateModal from '../modals/SdTicketCreateModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import {
  listTickets, listMyTickets, listCommandCenter, fetchWorkbench, fetchMyWorkbench, getMe,
  loadPickers, usePickers,
  fetchCapabilities, useCapabilities, listMyTeam,
} from '@/composables/useSupportDesk'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const panel = computed(() => (route.path.startsWith('/user') ? 'employee' : 'admin'))

const reduced = ref(false)
try { reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.getAttribute('data-cinematic') !== 'on' } catch { /* ssr */ }

/* ── capabilities (role-adaptive) ── */
const me = ref({ id: null, name: '', email: '' })
const capsState = useCapabilities()
const caps = computed(() => {
  const admin = panel.value === 'admin'
  const agent = admin || capsState.isAgent
  return { isAgent: agent, isManager: capsState.isManager, isAdmin: admin || capsState.isAdmin, agent, manage: admin || capsState.isAdmin }
})
const teamMembers = ref([])
const assigneeOpts = computed(() => teamMembers.value.map(m => ({ value: m.id, label: m.name || m.email || 'Member' })))
const goTeam = () => router.push(panel.value === 'admin' ? '/admin/support-desk/tickets/team' : '/user/support/tickets/team')
// "Raise a ticket" routes to the full-page Intelligent Intake console (one canonical create experience).
const goNew = () => router.push(panel.value === 'admin' ? '/admin/support-desk/tickets/new' : '/user/support/tickets/new')

/* ── data ── */
const all = ref([])
const stats = ref({})
const loading = ref(true)
const now = ref(Date.now())
let tick = null

const loadList = async () => {
  try {
    // "My Tickets" = tickets ASSIGNED TO ME.
    //  · admin panel   → agent list scope=my (assigned==me).
    //  · employee AGENT → command-center scope=my (assigned==me, team-scoped) — this
    //    deliberately EXCLUDES unassigned + raised-only tickets so the agent's active
    //    queue isn't polluted; those live in the Unassigned "Claim Field".
    //  · plain employee → /me/tickets (raised OR assigned OR collaborator) — their own
    //    filed-ticket tracking view (kept, since nothing is assigned to a non-agent).
    const res = panel.value === 'admin'
      ? await listTickets({ scope: 'my', page: 1, limit: 100, sort_by: 'updated_at', sort_dir: 'desc' })
      : caps.value.agent
        ? await listCommandCenter({ scope: 'my', page: 1, limit: 100, sort_by: 'updated_at', sort_dir: 'desc' })
        : await listMyTickets({ page: 1, limit: 100, sort_by: 'updated_at', sort_dir: 'desc' })
    // Merged duplicates fold INTO their master: the master survives with the full history,
    // the duplicates are closed + cross-noted. Hide the tombstones so a merged set shows as
    // ONE (the master) instead of N rows — the data isn't deleted, just collapsed in the view.
    all.value = (res.items || []).filter(t => !t.merged_into_id)
  } catch { all.value = [] }
}
const loadStats = async () => {
  try { stats.value = (panel.value === 'admin' ? await fetchWorkbench() : await fetchMyWorkbench()) || {} }
  catch { stats.value = {} }
}
const reload = async () => { loading.value = true; await Promise.all([loadList(), loadStats()]); loading.value = false }

/* ── lenses + pills ── */
const isTerminal = (t) => ['resolved', 'closed'].includes(t.status)
const slaState = (t) => (t.sla_resolution_breached ? 'breached' : t.sla_resolution_state || (isTerminal(t) ? 'met' : 'ok'))
const PRED = {
  all: () => true,
  open: t => ['open', 'in_progress'].includes(t.status),
  pending: t => ['pending_customer', 'pending_vendor', 'on_hold'].includes(t.status),
  pending_customer: t => t.status === 'pending_customer',
  pending_vendor: t => t.status === 'pending_vendor',
  risk: t => slaState(t) === 'due-soon',
  breached: t => slaState(t) === 'breached',
  escalated: t => t.is_escalated,
  critical: t => t.priority === 'critical',
  overdue: t => !isTerminal(t) && t.resolution_due_at && new Date(t.resolution_due_at).getTime() < now.value,
  resolved: t => isTerminal(t),
}
const lens = ref('all')
const setLens = (k) => { lens.value = lens.value === k && k !== 'all' ? 'all' : k; idFilter.value = [] }
const PILLS = [
  { key: 'open', label: 'Open', icon: Activity, color: 'var(--sd-st-progress)' },
  { key: 'critical', label: 'Critical', icon: AlertOctagon, color: 'var(--sd-pri-critical)' },
  { key: 'pending_customer', label: 'Awaiting customer', icon: Hourglass, color: 'var(--sd-st-pending)' },
  { key: 'pending_vendor', label: 'Awaiting vendor', icon: Hourglass, color: 'var(--sd-st-pending)' },
  { key: 'escalated', label: 'Escalated', icon: Flame, color: 'var(--sd-st-escalated)' },
  { key: 'risk', label: 'SLA risk', icon: Timer, color: 'var(--sd-warning)' },
  { key: 'overdue', label: 'Overdue', icon: Timer, color: 'var(--sd-danger)' },
  { key: 'resolved', label: 'Resolved', icon: CircleCheck, color: 'var(--sd-success)' },
]
const lensCount = (k) => all.value.filter(PRED[k] || PRED.all).length

/* ── search + advanced filters ── */
const q = ref('')
const blankAdv = () => ({ statuses: [], priorities: [], impact: '', urgency: '', sla: '', category_id: '', org_id: '', assignee: '', created_from: '', created_to: '', unassigned: false, escalated: false })
const adv = ref(blankAdv())
const filterOpen = ref(false)
const advCount = computed(() => {
  const v = adv.value
  return v.statuses.length + v.priorities.length + (v.impact ? 1 : 0) + (v.urgency ? 1 : 0) + (v.sla ? 1 : 0)
    + (v.category_id ? 1 : 0) + (v.org_id ? 1 : 0) + (v.assignee ? 1 : 0) + (v.created_from ? 1 : 0) + (v.created_to ? 1 : 0) + (v.unassigned ? 1 : 0) + (v.escalated ? 1 : 0)
})
const advActive = computed(() => advCount.value > 0)
const onApplyAdv = (f) => { adv.value = f; filterOpen.value = false }

const matchAdvWith = (t, v) => {
  if (v.statuses.length && !v.statuses.includes(t.status)) return false
  if (v.priorities.length && !v.priorities.includes(t.priority)) return false
  if (v.impact && t.impact !== v.impact) return false
  if (v.urgency && t.urgency !== v.urgency) return false
  if (v.sla) { const s = slaState(t); if (v.sla === 'ok' ? !['ok', 'met'].includes(s) : s !== v.sla) return false }
  if (v.category_id && t.category_id !== v.category_id) return false
  if (v.org_id && t.organization_id !== v.org_id) return false
  if (v.assignee && String(t.assigned_agent_id) !== String(v.assignee)) return false
  // Both bounds anchored to the LOCAL calendar day (inclusive) — from-start-of-day .. to-end-of-day.
  // (Previously the from-bound used new Date('yyyy-mm-dd') = UTC midnight while to used local, so a
  //  ticket created on the from-date in IST could be wrongly excluded.)
  if (v.created_from && new Date(t.created_at) < new Date(v.created_from + 'T00:00:00')) return false
  if (v.created_to && new Date(t.created_at) > new Date(v.created_to + 'T23:59:59.999')) return false
  if (v.unassigned && t.assigned_agent_id) return false
  if (v.escalated && !t.is_escalated) return false
  return true
}
const matchAdv = (t) => matchAdvWith(t, adv.value)
const previewCount = (f) => all.value.filter(t => matchAdvWith(t, f)).length

const idFilter = ref([])
const filtered = computed(() => {
  let list = all.value
  if (idFilter.value.length) { const s = new Set(idFilter.value.map(String)); return list.filter(t => s.has(String(t.id))) }
  list = list.filter(PRED[lens.value] || PRED.all).filter(matchAdv)
  const term = q.value.trim().toLowerCase()
  if (term) list = list.filter(t =>
    [t.subject, t.ticket_number, t.raised_by_name, t.contact_name, t.contact_email, t.organization_name, ...(t.tags || [])]
      .some(x => String(x || '').toLowerCase().includes(term)))
  return list
})

/* ── table (same SdTicketTable as /all → identical layout, no horizontal scroll) ── */
const TABLE_COLUMNS = ['flag', 'number', 'subject', 'type', 'priority', 'status', 'requester', 'agent', 'sla', 'updated']
const emptyCfg = { title: 'No tickets in this view', blurb: 'Clear a filter or switch lens — anything matching surfaces here instantly.' }
const sortBy = ref('updated_at')
const sortDir = ref('desc')
const onSort = (key) => {
  if (sortBy.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = key; sortDir.value = (key === 'subject' || key === 'ticket_number') ? 'asc' : 'desc' }
}
const PRI_RANK = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 }
const ST_RANK = { open: 1, in_progress: 2, escalated: 3, pending_customer: 4, pending_vendor: 5, on_hold: 6, resolved: 7, closed: 8 }
const sortVal = (t, key) => {
  switch (key) {
    case 'ticket_number': return t.ticket_number || ''
    case 'subject': return (t.subject || '').toLowerCase()
    case 'priority': return PRI_RANK[t.priority] || 0
    case 'status': return ST_RANK[t.status] || 0
    case 'resolution_due_at': return t.resolution_due_at ? new Date(t.resolution_due_at).getTime() : 9e15
    case 'escalation_level': return t.escalation_level || 0
    case 'reopened_count': return t.reopened_count || 0
    case 'created_at': return new Date(t.created_at).getTime()
    default: return new Date(t.updated_at || t.created_at).getTime()
  }
}
const sorted = computed(() => {
  const arr = [...filtered.value]
  const key = sortBy.value, dir = sortDir.value
  arr.sort((a, b) => { const va = sortVal(a, key), vb = sortVal(b, key); const c = va < vb ? -1 : va > vb ? 1 : 0; return dir === 'asc' ? c : -c })
  return arr
})

/* ── client-side pagination (10 per page over the filtered view) ── */
const PAGE_SIZE = 10
const pageNo = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const paged = computed(() => sorted.value.slice((pageNo.value - 1) * PAGE_SIZE, pageNo.value * PAGE_SIZE))
const goPage = (p) => { pageNo.value = Math.min(Math.max(1, p), pageCount.value) }
// any change to what's in the view resets to page 1 (and clamp when the list shrinks)
watch([lens, q, adv, idFilter, sortBy, sortDir], () => { pageNo.value = 1 })
watch(pageCount, (n) => { if (pageNo.value > n) pageNo.value = n })

/* ── selection (string-id set; SdTicketTable emits toggle / toggle-all) ── */
const isSel = (id) => selected.value.includes(String(id))
const toggleSel = (id) => { const s = String(id); selected.value = isSel(id) ? selected.value.filter(x => x !== s) : [...selected.value, s] }
const toggleAll = () => {
  // header checkbox operates on the VISIBLE page — never silently selects rows on other pages
  const ids = paged.value.map(t => String(t.id))
  const everySel = ids.length > 0 && ids.every(x => selected.value.includes(x))
  selected.value = everySel
    ? selected.value.filter(x => !ids.includes(x))
    : [...new Set([...selected.value, ...ids])]
}

/* ── selection + drawer ── */
const selected = ref([])
// Full ticket objects for the current selection — the bulk modal needs them to compute
// per-ticket workflow eligibility (assignment gate, terminal-state guards) and show requester info.
const selectedTickets = computed(() => {
  const s = new Set(selected.value.map(String))
  return all.value.filter(t => s.has(String(t.id)))
})
const drawerId = ref(null)
const createOpen = ref(false)
// One adaptive drawer; it self-resolves agent vs worker vs requester data + actions
// (and stamps last-viewed for agents internally), so the section just hands it an id.
const openTicket = (id) => { drawerId.value = String(id) }

const actionOpen = ref(false)
const actionMode = ref('resolve')
const actionTicket = ref(null)
const openAction = (mode, ticket) => { actionMode.value = mode; actionTicket.value = ticket; actionOpen.value = true }

// Bulk modal — the single corporate console for every bulk-bar action.
const bulkModalOpen = ref(false)
const bulkMode = ref('status')
const openBulkModal = (mode) => {
  if (!selected.value.length) return
  // One ticket → the full escalation console (tier ladder + routing), not the bulk ledger.
  if (mode === 'escalate' && selected.value.length === 1 && selectedTickets.value.length === 1) {
    openEscalate(selectedTickets.value[0]); return
  }
  bulkMode.value = mode; bulkModalOpen.value = true
}
const onBulkDone = async ({ updated = 0, skipped = 0 } = {}) => {
  bulkModalOpen.value = false
  selected.value = []
  if (updated) toast.success(`${updated} ticket${updated === 1 ? '' : 's'} updated${skipped ? ` · ${skipped} skipped` : ''}`)
  else if (skipped) toast.info(`No changes — ${skipped} ticket${skipped === 1 ? '' : 's'} skipped`)
  await reload()
}

// Dedicated corporate escalation console (tier-lift ladder + ITIL reassessment + routing).
const escalateOpen = ref(false)
const escalateTicketObj = ref(null)
const openEscalate = (t) => { if (!t) return; escalateTicketObj.value = t; escalateOpen.value = true }
const onEscalated = async () => { escalateOpen.value = false; toast.success('Ticket escalated'); await reload() }

const onActionDone = async (mode) => {
  actionOpen.value = false
  if (mode.startsWith('bulk')) selected.value = []
  toast.success('Done')
  await reload()
}
const onChanged = () => reload()
const onCreated = () => { createOpen.value = false; reload() }

/* ── bulk entry points (all routed through the bulk modal) ── */
const quickAssign = () => {
  const ids = filtered.value.filter(t => !t.assigned_agent_id && !isTerminal(t)).map(t => t.id)
  if (!ids.length) { toast.info('Nothing unassigned in this view'); return }
  selected.value = ids; openBulkModal('assign')
}

/* ── smart-insight actions ──
   Every action MUST resolve to something visible. `view` (and any action whose target
   ticket isn't in this scoped list) falls through to: open the one ticket, filter to the
   set, or — when the insight carries no tickets (e.g. the "heavy workload" heads-up) —
   surface the open queue and echo the detail so the button is never a dead click. */
const onInsight = (ins) => {
  const ids = (ins.ticket_ids || []).map(String)
  const first = ids[0]
  const t = first && all.value.find(x => String(x.id) === String(first))
  if (ins.action === 'assign' && ids.length) { selected.value = [...ids]; openBulkModal('assign'); return }
  if (ins.action === 'merge' && ids.length) { selected.value = [...ids]; idFilter.value = [...ids]; openBulkModal('merge'); return }
  if (ins.action === 'resolve' && t) { openAction('resolve', t); return }
  if (ins.action === 'escalate' && t) { openEscalate(t); return }
  if (ins.action === 'reply' && first) { openTicket(first); return }
  // view / fallback
  if (ids.length === 1) { openTicket(first); return }
  if (ids.length > 1) { idFilter.value = [...ids]; return }
  // no tickets tied to this insight — jump to the active queue + explain what it flagged
  lens.value = 'open'; idFilter.value = []
  toast.info(ins.detail || ins.title || 'Heads-up — no specific tickets to open for this insight')
}

/* ── CSV export (client-side, matches the current view) ── */
const exportCsv = (selectedOnly = false) => {
  const rows = selectedOnly ? all.value.filter(t => selected.value.includes(t.id)) : filtered.value
  if (!rows.length) { toast.info('Nothing to export'); return }
  const cols = ['ticket_number', 'subject', 'priority', 'status', 'raised_by_name', 'assigned_agent_name', 'category_name', 'created_at', 'updated_at']
  const head = cols.join(',')
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const body = rows.map(t => cols.map(c => esc(t[c])).join(',')).join('\n')
  const blob = new Blob([head + '\n' + body], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `my-tickets-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

/* ── saved views (localStorage) ── */
const DEFAULT_VIEWS = [
  { id: 'd-open', name: 'My open tickets', icon: Activity, lens: 'open' },
  { id: 'd-crit', name: 'My critical tickets', icon: AlertOctagon, lens: 'critical' },
  { id: 'd-pend', name: 'My pending tickets', icon: Hourglass, lens: 'pending' },
  { id: 'd-esc', name: 'My escalations', icon: Flame, lens: 'escalated' },
  { id: 'd-risk', name: 'My SLA risks', icon: Timer, lens: 'risk' },
]
const viewsKey = computed(() => `sd.wb.views.${panel.value}`)
const savedViews = ref([])
const viewsOpen = ref(false)
const viewsRef = ref(null)
const loadViews = () => { try { savedViews.value = JSON.parse(localStorage.getItem(viewsKey.value)) || [] } catch { savedViews.value = [] } }
const persistViews = () => { try { localStorage.setItem(viewsKey.value, JSON.stringify(savedViews.value)) } catch { /* */ } }
const applyView = (v) => { lens.value = v.lens || 'all'; q.value = v.search || ''; adv.value = { ...blankAdv(), ...(v.adv || {}) }; idFilter.value = []; viewsOpen.value = false }
const saveCurrentView = () => {
  const name = window.prompt('Name this view'); if (!name) return
  savedViews.value.push({ id: 'u-' + Date.now(), name, lens: lens.value, search: q.value, adv: JSON.parse(JSON.stringify(adv.value)) })
  persistViews(); viewsOpen.value = false; toast.success('View saved')
}
const deleteView = (id) => { savedViews.value = savedViews.value.filter(v => v.id !== id); persistViews() }
const onViewsOutside = (e) => { if (viewsRef.value && !viewsRef.value.contains(e.target)) viewsOpen.value = false }

/* ── lifecycle ── */
watch(() => route.query.ticket, (v) => { if (v) openTicket(v) })
onMounted(async () => {
  loadViews(); loadPickers()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  window.addEventListener('mousedown', onViewsOutside)
  try { const m = await getMe(); me.value = { id: m?.id || null, name: m?.full_name || m?.name || '', email: m?.email || '' } } catch { /* */ }
  try { await fetchCapabilities() } catch { /* */ }
  if (caps.value.isManager) { try { teamMembers.value = await listMyTeam() } catch { teamMembers.value = [] } }
  await reload()
  if (route.query.ticket) openTicket(route.query.ticket)
})
onBeforeUnmount(() => { if (tick) clearInterval(tick); window.removeEventListener('mousedown', onViewsOutside) })

const pickers = usePickers()
const categoryOpts = computed(() => (pickers.categories || []).map(c => ({ value: c.id, label: c.name })))
const orgOpts = computed(() => (pickers.organizations || []).map(o => ({ value: o.id, label: o.name })))
</script>

<style scoped>
.wb { display: flex; flex-direction: column; gap: 14px; padding-bottom: 80px; }

/* header */
.wb-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.wb-title { font-size: clamp(22px, 2.6vw, 30px); font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0; display: inline-flex; align-items: center; gap: 11px; }
.wb-role { font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #1a1206; background: var(--sd-grad-hero); padding: 3px 10px; border-radius: 999px; }
[data-theme="light"] .wb-role { color: #fff8ec; }
.wb-desc { font-size: 13px; color: var(--sd-text-muted); margin: 5px 0 0; }
.wb-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wb-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 13px; font-weight: 650; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: all 0.2s var(--sd-spring); }
.wb-btn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251, 146, 60, 0.28); }
[data-theme="light"] .wb-btn.primary { color: #fff8ec; }
.wb-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.wb-btn.ghost:hover, .wb-btn.ghost.on { color: var(--sd-text); border-color: var(--sd-amber-border); }
.wb-btn.icon { padding: 9px 11px; }
.wb-btn.spinning svg { animation: sd-spin-slow 1s linear infinite; }
.adv-badge { display: inline-grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; font-size: 10px; font-weight: 800; color: #1a1206; background: var(--sd-amber); }
[data-theme="light"] .adv-badge { color: #fff8ec; }

.wb-views { position: relative; }
.views-pop { position: absolute; right: 0; top: calc(100% + 6px); z-index: 60; display: flex; flex-direction: column; gap: 2px; padding: 7px; border-radius: 13px; min-width: 230px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow); }
.vp-h { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-dim); margin: 6px 8px 3px; }
.vp-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 9px; font-size: 13px; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: none; border: none; text-align: left; width: 100%; }
.vp-item:hover { background: var(--sd-amber-soft); color: var(--sd-text); }
.vp-item.saved { justify-content: space-between; gap: 6px; padding: 0; }
.vp-apply { flex: 1; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 9px; font-size: 13px; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: none; border: none; text-align: left; }
.vp-apply:hover { background: var(--sd-amber-soft); color: var(--sd-text); }
.vp-del { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; color: var(--sd-text-dim); background: none; border: none; }
.vp-del:hover { color: var(--sd-danger); background: var(--sd-danger-soft); }
.vp-save { display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 9px 10px; border-radius: 9px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }

/* toolbar */
.wb-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.wb-util { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wb-search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.wb-search:focus-within { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.wb-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; }
.wb-search input::placeholder { color: var(--sd-text-dim); }
.srch-x { display: grid; place-items: center; background: none; border: none; cursor: pointer; color: var(--sd-text-dim); }
.wb-pills { display: flex; gap: 7px; flex-wrap: wrap; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.pill:hover { border-color: color-mix(in srgb, var(--pc) 45%, transparent); }
.pill.on { color: var(--pc); background: color-mix(in srgb, var(--pc) 12%, transparent); border-color: color-mix(in srgb, var(--pc) 45%, transparent); }
.pill-n { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 800; opacity: 0.8; padding-left: 2px; }

.wb-idfilter { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; font-size: 12px; font-weight: 600; color: var(--sd-amber); padding: 7px 13px; border-radius: 999px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.wb-idfilter button { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; color: var(--sd-text-muted); font-size: 11px; }

/* bulk bar */
/* Centre via auto margins (NOT transform: translateX(-50%)) — this is a <Motion> element and
   motion-v writes its own inline transform for the slide-up, which would override the centering
   transform and pin the bar to the right. left/right:0 + margin auto centres transform-free. */
.bulk-bar { position: fixed; left: 0; right: 0; bottom: 22px; margin-inline: auto; width: max-content; z-index: 1500; display: flex; align-items: center; gap: 14px; padding: 11px 16px; border-radius: 16px; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-shadow-hover); backdrop-filter: blur(20px); max-width: 96vw; overflow-x: auto; }
.bb-count { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--sd-amber); white-space: nowrap; flex-shrink: 0; }
/* single row — buttons never wrap to a second line (overflow scrolls on a tiny viewport) */
.bb-acts { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.bb-a { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; flex-shrink: 0; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border-strong); transition: all 0.16s; }
.bb-a:hover { color: var(--sd-text); border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.bb-clear { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; flex-shrink: 0; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.bb-clear:hover { color: var(--sd-text); }

@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .wb-btn.spinning svg { animation: none; } }
</style>
