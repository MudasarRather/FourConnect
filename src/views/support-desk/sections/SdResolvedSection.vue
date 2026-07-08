<template>
  <div class="res sd-tw">
    <!-- ══════════════════ CLOSEOUT HERO + SIGNATURE INSTRUMENT ══════════════════ -->
    <SdResolvedHero
      :lenses="lenses" :active-lens="refine" :stats="stats" :guided="runOn"
      :adv-count="activeFilterCount" :loading="wsLoading" :reduced="reduced"
      @pick="onLens" @run="toggleRun" @pendingclose="scrollToRail" @lowcsat="refine = 'lowcsat'"
      @refresh="refreshAll" @filters="showFilters = !showFilters"
    >
      <template #instrument>
        <!-- height=0 → the instrument fills the hero as its full-bleed backdrop.
             (Ambient stand-in until the 8-concept gallery winner is picked.) -->
        <SdResolutionInstrument :tickets="lensFiltered" :stats="stats" :now="now"
          :reduced="reduced" :height="0" @open="(t) => openTicket(t.id)" />
      </template>
    </SdResolvedHero>

    <!-- ══════════════════ AUTO-CLOSE RAIL (the seal is ticking) ══════════════════ -->
    <div ref="railEl">
      <SdAutoCloseRail :tickets="pendingCloseTickets" :now="now" :reduced="reduced"
        @open="openTicket" @close-now="(t) => (closeTarget = t)" @reopen="startReopen" />
    </div>

    <!-- ══════════════════ QUALITY GATE (CSAT · FCR · survival · speed · trend) ══════════════════ -->
    <SdQualityBoard v-if="stats.resolved_30d != null" :stats="stats" :reduced="reduced" />

    <!-- ══════════════════ RESOLVER LEADERBOARD (who carries the record) ══════════════════ -->
    <SdResolverLeaderboard v-if="agent && (stats.leaderboard || []).length"
      :leaderboard="stats.leaderboard" :active="f.resolved_by" :reduced="reduced" @pick="onResolverPick" />

    <!-- ══════════════════ CONTROL DECK ══════════════════ -->
    <section class="res-deck sd-card">
      <div class="res-bar">
        <div class="res-views">
          <button v-for="v in views" :key="v.key" class="res-view" :class="{ on: view === v.key }" @click="view = v.key">
            <component :is="v.icon" :size="14" /> <span>{{ v.label }}</span>
          </button>
        </div>
        <div class="res-tools">
          <button class="res-btn sm" :class="{ on: includeClosed }"
            title="Sealed tickets left the shelf — include them to see the full archive" @click="includeClosed = !includeClosed; reload()">
            <Archive :size="14" /> Include closed
          </button>
          <button class="res-btn sm" :class="{ on: showFilters }" @click="showFilters = !showFilters">
            <SlidersHorizontal :size="14" /> Filters <span v-if="activeFilterCount" class="res-fbadge">{{ activeFilterCount }}</span>
          </button>
          <button class="res-btn sm icon" :title="density === 'compact' ? 'Comfortable' : 'Compact'" @click="density = density === 'compact' ? 'comfortable' : 'compact'"><Rows3 :size="14" /></button>
          <button v-if="agent" class="res-btn sm icon" title="Export CSV" @click="doExport"><Download :size="14" /></button>
          <span class="res-count sd-mono">{{ filtered.length }} of {{ total }}<template v-if="wsCapped"> · first 100</template></span>
        </div>
      </div>

      <div v-if="refineTokens.length" class="res-tokens">
        <span class="tok-lbl sd-mono">REFINED</span>
        <button v-for="tk in refineTokens" :key="tk.key" class="tok" @click="tk.clear()">{{ tk.label }} <X :size="11" /></button>
        <button class="tok clear" @click="clearRefine">Clear all</button>
      </div>
    </section>

    <!-- smart insight strip -->
    <SdInsightTicker v-if="insights.length" class="res-insights" :insights="insights" :reduced="reduced" @act="onInsight" />

    <!-- filters -->
    <Transition name="res-flt">
      <section v-if="showFilters" class="res-filters sd-card">
        <div class="flt-q">
          <Search :size="14" />
          <input v-model="f.q" type="text" placeholder="Search subject or ticket #…" @keyup.enter="reload" />
          <button v-if="f.q" class="flt-x" @click="f.q = ''; reload()"><X :size="12" /></button>
        </div>
        <div class="flt-field"><label>Priority</label><SdSelect v-model="f.priority" :options="priorityOptions" /></div>
        <div class="flt-field"><label>Fix code</label><SdSelect v-model="codeSelect" :options="codeOptions" /></div>
        <div class="flt-field"><label>Root cause</label><SdSelect v-model="f.resolution_category" :options="causeOptions" /></div>
        <div class="flt-field"><label>Rating</label><SdSelect v-model="f.csat" :options="csatOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Resolved by</label><SdSelect v-model="f.resolved_by" :options="resolverOptions" /></div>
        <div v-if="agent" class="flt-field"><label>Organization</label><SdSelect v-model="f.organization_id" :options="orgOptions" /></div>
        <div class="flt-field flt-date"><label>Resolved</label>
          <SdDatePicker v-model="f.resolved_from" placeholder="From" @change="reload" />
          <span>→</span>
          <SdDatePicker v-model="f.resolved_to" placeholder="To" @change="reload" />
        </div>
        <div class="flt-actions">
          <button class="res-btn sm" @click="reload"><Check :size="13" /> Apply</button>
          <button v-if="activeFilterCount" class="res-btn sm ghost" @click="clearFilters"><X :size="13" /> Clear</button>
        </div>
      </section>
    </Transition>

    <!-- bulk bar (agents) -->
    <Presence>
      <Motion v-if="agent && selected.length" class="res-bulk sd-card"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }">
        <span class="bulk-n">{{ selected.length }} selected</span>
        <div class="bulk-actions">
          <button class="res-btn sm accent" @click="openBulk('close')"><Archive :size="13" /> Close now</button>
          <button class="res-btn sm" :disabled="ratingBusy" @click="bulkRequestRating"><Star :size="13" /> Request rating</button>
          <button class="res-btn sm" @click="openBulk('tag')"><Tag :size="13" /> Add tag</button>
        </div>
        <button class="res-btn sm ghost" @click="selected = []">Clear</button>
      </Motion>
    </Presence>

    <!-- ══════════════════ VIEWS ══════════════════ -->
    <div class="res-stage" :key="view">
      <SdTicketTable v-if="view === 'table'"
        :rows="pagedRows" :columns="columns" :loading="wsLoading" :selectable="agent"
        :selected="selected" :sort-by="sortBy" :sort-dir="sortDir" :now="now"
        :density="density" :accent="ACCENT" :empty="emptyText" :empty-icon="CircleCheck"
        @open="openTicket" @toggle="toggleSel" @toggle-all="toggleAll" @sort="onSort" />

      <!-- LEDGER — the resolution story of every fix (unique to this desk) -->
      <SdResolutionLedger v-else-if="view === 'ledger'" :tickets="pagedRows" :now="now" :loading="wsLoading" :reduced="reduced" @open="openTicket" />

      <SdSlaPulse v-else-if="view === 'sla'" :tickets="filtered" :now="now" :loading="wsLoading" @open="openTicket" />
      <SdWorkloadMonitor v-else-if="view === 'load'" :tickets="filtered" :now="now" :loading="wsLoading" />
    </div>

    <!-- pager -->
    <div v-if="view !== 'sla' && view !== 'load' && pages > 1" class="res-pager">
      <button class="res-btn sm icon" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button>
      <span class="pg-info sd-mono">PAGE {{ page }} / {{ pages }}</span>
      <button class="res-btn sm icon" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button>
    </div>

    <!-- ══════════════════ CLOSEOUT RUN (guided, ranked by closeout score) ══════════════════ -->
    <Teleport to="body">
      <Presence>
        <Motion v-if="runOn && runCurrent && !drawerId" class="clr-veil"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.25 }"
          @mousedown.stop @click.stop>
          <Motion class="clr-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }" :key="runCurrent.id">
            <div class="clr-head sd-mono">
              <span class="clr-eyebrow"><BadgeCheck :size="13" /> CLOSEOUT RUN</span>
              <span class="clr-count">{{ runIdx + 1 }} / {{ runQueue.length }}</span>
            </div>
            <div class="clr-no sd-mono">{{ runCurrent.ticket_number }} · <em>{{ (runCurrent.priority || '').toUpperCase() }}</em>
              <span class="clr-close" :class="{ over: closeMsOf(runCurrent) <= 0 }">SEALS {{ closesInLabel(runCurrent) }}</span>
            </div>
            <h3 class="clr-subj">{{ runCurrent.subject }}</h3>
            <div class="clr-fix sd-mono">
              <b>{{ (runCurrent.resolution_code || 'uncoded').replace(/_/g, ' ').toUpperCase() }}</b>
              <span>{{ runCurrent.resolution_summary || 'No summary recorded on this fix.' }}</span>
            </div>
            <div class="clr-meta sd-mono">
              <span class="clr-csat" :class="{ none: !runCurrent.csat_score, low: runCurrent.csat_score && runCurrent.csat_score <= 2 }">
                <Star :size="11" /> {{ runCurrent.csat_score ? runCurrent.csat_score + '/5' : 'UNRATED' }}
              </span>
              <span v-if="(runCurrent.reopened_count || 0) > 0" class="clr-bounce">BOUNCED ×{{ runCurrent.reopened_count }}</span>
              <span class="clr-owner">{{ runCurrent.resolved_by_name || runCurrent.assigned_agent_name || 'SYSTEM' }}</span>
            </div>

            <!-- inline reopen verdict (routes into the single-writer apply_reopen server-side) -->
            <div v-if="reopenFor" class="clr-reopen">
              <span class="ro-lbl sd-mono">WHY IS IT COMING BACK?</span>
              <div class="ro-chips">
                <button v-for="rc in REOPEN_REASON_CODES" :key="rc.value" class="ro-chip"
                  :class="{ on: reopenCode === rc.value }" @click="reopenCode = rc.value">{{ rc.short }}</button>
              </div>
              <input v-model="reopenNote" class="ro-note" type="text" placeholder="One line for the record (optional)…" />
              <div class="ro-actions">
                <button class="clr-btn danger" :disabled="!reopenCode || reopenBusy" @click="confirmReopen">
                  <RotateCcw :size="13" /> Send it back
                </button>
                <button class="clr-btn ghost" @click="cancelReopen">Keep it resolved</button>
              </div>
            </div>

            <div v-else class="clr-actions">
              <button class="clr-btn primary" @click="closeTarget = runCurrent"><Archive :size="14" /> Verify &amp; close now</button>
              <button v-if="agent && !runCurrent.csat_score" class="clr-btn" :disabled="ratingBusy" @click="requestRating(runCurrent)">
                <Star :size="14" /> Request rating
              </button>
              <button class="clr-btn" @click="startReopen(runCurrent)"><RotateCcw :size="14" /> Reopen</button>
              <button class="clr-btn" @click="openTicket(runCurrent.id)"><PanelRight :size="14" /> Open console</button>
              <button class="clr-btn ghost" @click="runNext"><ChevronRight :size="14" /> Skip</button>
            </div>
            <div class="clr-dots" aria-hidden="true">
              <i v-for="(id, i) in runQueue" :key="id" :class="{ done: i < runIdx, on: i === runIdx }" />
            </div>
            <button class="clr-x" title="End the run" @click="endRun"><X :size="15" /></button>
          </Motion>
        </Motion>
      </Presence>
    </Teleport>

    <!-- drawer + modals + ⌘K -->
    <SdTicketDrawer :ticket-id="drawerId" :caps="{ agent }" @close="onDrawerClose" @changed="refreshAll" />
    <SdCloseModal :open="!!closeTarget" :ticket="closeTarget" :agent="agent" @close="closeTarget = null" @done="onClosed" />
    <SdResolveModal :open="!!resolveTarget" :ticket="resolveTarget" :agent="agent" @close="resolveTarget = null" @done="onResolved" />
    <SdBulkActionModal :open="bulkOpen" :mode="bulkMode" :tickets="bulkTicketObjs" :me="me" :assignees="assignees" :now="now"
      @close="bulkOpen = false" @done="onBulkDone" />
    <SdCommandPalette :open="cmdOpen" :commands="commands" :tickets="filtered" @close="cmdOpen = false" @run="(c) => c.run && c.run()" @open="openTicket" />
  </div>
</template>

<script setup>
/*
  SdResolvedSection — "THE CLOSEOUT DESK" (quality gate).
  Composition: SdResolvedHero (full-bleed signature instrument — visuals from the
  8-concept gallery pick) → SdAutoCloseRail (the 3-day seal countdown) → SdQualityBoard
  (CSAT / FCR / survival / MTTR / trend) → SdResolverLeaderboard → control deck →
  ledger / table / SLA / load views → CLOSEOUT RUN (ranked guided sweep) → adaptive
  drawer + bulk + ⌘K.
  Data = the proven one-window pattern: 100 rows via listScoped({scope:'resolved'})
  (backend team-sealed; explicit status=resolved unless "Include closed") + the sealed
  /me/tickets/resolved/stats rollup (shelf / throughput / MTTR percentiles / FCR /
  CSAT / code mix / leaderboard). Opening either runs the auto-close sweep server-side,
  so the shelf is always honest.
  Positioning vs siblings: Reopened is about RECURRENCE (the failed fix), this desk is
  about PROOF — the fix landed, the customer can still veto it for 3 days, and the
  desk's job is to verify, collect the rating, and seal the record.
*/
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  SlidersHorizontal, Rows3, Download, Search, X, Check, CircleCheck, Archive, Star, Tag,
  ChevronLeft, ChevronRight, RotateCcw, PanelRight, Table, Gauge, Users, BadgeCheck,
  BookOpenCheck, CalendarCheck, Timer, ThumbsDown, Zap, Sparkles,
} from 'lucide-vue-next'
import SdResolvedHero from '../components/SdResolvedHero.vue'
import SdResolutionInstrument from '../components/SdResolutionInstrument.vue'
import SdAutoCloseRail from '../components/SdAutoCloseRail.vue'
import SdQualityBoard from '../components/SdQualityBoard.vue'
import SdResolverLeaderboard from '../components/SdResolverLeaderboard.vue'
import SdResolutionLedger from '../components/SdResolutionLedger.vue'
import SdInsightTicker from '../components/SdInsightTicker.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import SdSelect from '../components/SdSelect.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import SdTicketTable from '../components/SdTicketTable.vue'
import SdSlaPulse from '../components/SdSlaPulse.vue'
import SdWorkloadMonitor from '../components/SdWorkloadMonitor.vue'
import SdTicketDrawer from '../drawers/SdTicketDrawer.vue'
import SdResolveModal from '../modals/SdResolveModal.vue'
import SdCloseModal from '../modals/SdCloseModal.vue'
import SdBulkActionModal from '../modals/SdBulkActionModal.vue'
import { getTicketScope } from '../tickets/ticketScopes'
import {
  listScoped, fetchResolvedStats, fetchCommandCenterStats, fetchMyWorkbench,
  reopenTicket, reopenMyTicket, addTicketComment, getMe, listMyTeam, loadPickers, usePickers,
  priorityLabel, statusLabel, resolutionLabel,
  RESOLUTION_CODES, ROOT_CAUSES, REOPEN_REASON_CODES, SUPPORT_AUTOCLOSE_DAYS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  scope: { type: String, default: 'resolved' },
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
  dashboard: { type: Object, default: null },
})
defineEmits(['new', 'go'])

const route = useRoute()
const toast = useToast()
const ACCENT = 'var(--sd-res-core)'
const agent = computed(() => props.panel === 'admin' || props.agentReveal)
/* User portal = the agent's PERSONAL desk: every status board narrows to MY assignments
   (server-side mine=1 lens). Team-wide slices live on Team / All Tickets / Unassigned. */
const mineDesk = computed(() => agent.value && props.panel === 'employee')
const mineParams = () => (mineDesk.value ? { mine: 1 } : {})
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

/* ── views ── */
const views = computed(() => {
  const v = [
    { key: 'table', label: 'Closeout board', icon: Table },
    { key: 'ledger', label: 'Ledger', icon: BookOpenCheck },
    { key: 'sla', label: 'SLA', icon: Gauge },
  ]
  if (agent.value) v.push({ key: 'load', label: 'Workload', icon: Users })
  return v
})
const view = ref('table')
const density = ref('comfortable')
const showFilters = ref(false)
const includeClosed = ref(false)   // false = the pre-close shelf + fresh record (desk default)

/* ── server filters ── */
const f = reactive({ q: '', priority: '', resolution_code: '', resolution_category: '', csat: '', resolved_by: '', organization_id: '', resolved_from: '', resolved_to: '' })
const activeFilterCount = computed(() => ['priority', 'resolution_code', 'resolution_category', 'csat', 'resolved_by', 'organization_id', 'resolved_from', 'resolved_to'].filter(k => f[k]).length + (f.q ? 1 : 0))
const clearFilters = () => { Object.keys(f).forEach(k => (f[k] = '')); reload() }

/* ── client refinements ── */
const refine = ref('all')      // hero lens: all|today|week|pending|rated|lowcsat|bounced|fcr
const sortBy = ref('resolvedAt')
const sortDir = ref('desc')
const page = ref(1)
const PAGE = 25

/* ── data ── */
const workingSet = ref([])
const wsLoading = ref(false)
const wsCapped = ref(false)
const total = ref(0)
const stats = ref({})          // /me/tickets/resolved/stats (team-sealed)
const cmdStats = ref({})       // command-center/workbench (insight ticker tail)
const now = ref(Date.now())
const me = ref({})
const assignees = ref([])
let tick = null

const params = () => ({
  scope: 'resolved',
  // Explicit status pins the shelf on BOTH panels (the self resolved scope is wider);
  // "Include closed" widens to the full terminal archive instead.
  status: includeClosed.value ? undefined : 'resolved',
  include_closed: includeClosed.value ? 1 : undefined,
  q: f.q || undefined,
  priority: f.priority || undefined,
  resolution_code: f.resolution_code || undefined,
  resolution_category: f.resolution_category || undefined,
  csat: f.csat || undefined,
  resolved_by: f.resolved_by || undefined,
  organization_id: f.organization_id || undefined,
  resolved_from: f.resolved_from || undefined,
  resolved_to: f.resolved_to || undefined,
  sort_by: 'resolved_at', sort_dir: 'desc',   // newest fix first in the window
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
  try { stats.value = await fetchResolvedStats(mineParams()) } catch { stats.value = {} }
  try { cmdStats.value = agent.value ? await fetchCommandCenterStats(mineParams()) : await fetchMyWorkbench() } catch { cmdStats.value = {} }
}
const reload = () => { page.value = 1; loadWorkingSet() }
const refreshAll = () => { reload(); loadStats() }

/* ── closeout telemetry ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const WINDOW_MS = SUPPORT_AUTOCLOSE_DAYS * 86400000
const closeMsOf = (t) => {
  const at = t.auto_close_at ? ep(t.auto_close_at) : (t.resolved_at ? ep(t.resolved_at) + WINDOW_MS : 0)
  return at ? at - now.value : Number.MAX_SAFE_INTEGER
}
const closesInLabel = (t) => {
  const ms = closeMsOf(t)
  if (ms === Number.MAX_SAFE_INTEGER) return '—'
  if (ms <= 0) return 'NOW'
  const m = Math.floor(ms / 60000)
  if (m < 60) return `IN ${m}M`
  if (m < 1440) return `IN ${Math.floor(m / 60)}H`
  return `IN ${Math.floor(m / 1440)}D ${Math.floor((m % 1440) / 60)}H`
}
const startOfDay = computed(() => { const d = new Date(now.value); d.setHours(0, 0, 0, 0); return d.getTime() })

const PRED = {
  all: () => true,
  today: t => ep(t.resolved_at) >= startOfDay.value,
  week: t => ep(t.resolved_at) >= now.value - 7 * 86400000,
  pending: t => t.status === 'resolved',
  rated: t => t.csat_score != null,
  lowcsat: t => t.csat_score != null && t.csat_score <= 2,
  bounced: t => (t.reopened_count || 0) > 0,
  fcr: t => (t.reopened_count || 0) === 0 && (t.agent_public_comment_count ?? 99) <= 1,
}

/* ── derived sets ── */
const lensFiltered = computed(() => workingSet.value.filter(PRED[refine.value] || PRED.all))
const pendingCloseTickets = computed(() => workingSet.value
  .filter(t => t.status === 'resolved')
  .sort((a, b) => closeMsOf(a) - closeMsOf(b))
  .slice(0, 12))

/* Closeout score: worst rating + oldest shelf + bounce history first — feeds the run. */
const closeoutScore = (t) => {
  const csat = t.csat_score ? (6 - t.csat_score) * 3 : 1.5
  const hrs = closeMsOf(t) / 3600000
  const urgency = hrs <= 0 ? 6 : Math.max(0, 4 - hrs / 18)
  return csat + urgency + (t.reopened_count || 0) * 2
}
const rankOrdered = computed(() => workingSet.value.filter(t => t.status === 'resolved').slice()
  .sort((a, b) => closeoutScore(b) - closeoutScore(a)))

const sortVal = (t, key) => {
  if (key === 'resolvedAt' || key === 'resolved_at') return ep(t.resolved_at)
  if (key === 'autoClose') return closeMsOf(t)
  if (key === 'resolutionCode') return t.resolution_code || ''
  if (key === 'csat' || key === 'csat_score') return t.csat_score ?? -1
  if (key === 'reopened' || key === 'reopened_count') return t.reopened_count || 0
  if (key === 'priority') return ({ critical: 5, urgent: 4, high: 3, medium: 2, low: 1 })[t.priority] || 0
  if (['created_at', 'updated_at'].includes(key)) return ep(t[key])
  if (key === 'number' || key === 'ticket_number') return t.ticket_number || ''
  if (key === 'subject') return (t.subject || '').toLowerCase()
  if (key === 'status') return t.status || ''
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

/* ── lenses (stats-first with client fallback) ── */
const cnt = (fn) => workingSet.value.filter(fn).length
const lenses = computed(() => [
  { key: 'all', label: includeClosed.value ? 'Archive' : 'On the shelf', icon: CircleCheck, color: 'var(--sd-res-core)',
    value: (includeClosed.value ? (stats.value.resolved_now ?? 0) + (stats.value.closed_total ?? 0) : stats.value.resolved_now) ?? cnt(PRED.all) },
  { key: 'today', label: 'Today', icon: Zap, color: 'var(--sd-res-hi)', value: stats.value.resolved_today ?? cnt(PRED.today) },
  { key: 'week', label: 'This week', icon: CalendarCheck, color: 'var(--sd-res-deep)', value: stats.value.resolved_7d ?? cnt(PRED.week) },
  { key: 'pending', label: 'Pending close', icon: Timer, color: 'var(--sd-res-close)', value: stats.value.pending_close ?? cnt(PRED.pending) },
  { key: 'rated', label: 'Rated', icon: Star, color: 'var(--sd-res-brass)', value: stats.value.csat_count ?? cnt(PRED.rated) },
  { key: 'lowcsat', label: 'Low CSAT', icon: ThumbsDown, color: 'var(--sd-res-risk)', value: stats.value.csat_low ?? cnt(PRED.lowcsat) },
  { key: 'bounced', label: 'Bounced', icon: RotateCcw, color: 'var(--sd-warning)', value: stats.value.reopens_30d ?? cnt(PRED.bounced) },
  { key: 'fcr', label: 'One-touch', icon: Sparkles, color: 'var(--sd-res-hi)', value: stats.value.fcr_30d ?? cnt(PRED.fcr) },
])
const onLens = (l) => {
  if (l.stat) return
  refine.value = refine.value === l.key ? 'all' : l.key
  page.value = 1
}

/* refinement tokens */
const REFINE_LABEL = { today: 'Resolved today', week: 'This week', pending: 'Pending close', rated: 'Rated', lowcsat: 'Low CSAT ≤2★', bounced: 'Bounced fixes', fcr: 'One-touch' }
const refineTokens = computed(() => {
  const out = []
  if (refine.value !== 'all') out.push({ key: 'refine', label: REFINE_LABEL[refine.value] || refine.value, clear: () => { refine.value = 'all' } })
  if (includeClosed.value) out.push({ key: 'closed', label: 'Including closed', clear: () => { includeClosed.value = false; reload() } })
  return out
})
const clearRefine = () => { refine.value = 'all'; if (includeClosed.value) { includeClosed.value = false; reload() } }

/* ── filter option lists ── */
const pickers = usePickers()
const orgOptions = computed(() => [{ value: '', label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])
const priorityOptions = computed(() => [{ value: '', label: 'All priorities' },
  ...['critical', 'urgent', 'high', 'medium', 'low'].map(p => ({ value: p, label: priorityLabel(p) }))])
const codeOptions = computed(() => [{ value: '', label: 'Any fix code' }, ...RESOLUTION_CODES.map(c => ({ value: c.value, label: c.label }))])
const causeOptions = computed(() => [{ value: '', label: 'Any root cause' }, ...ROOT_CAUSES.map(c => ({ value: c.value, label: c.label }))])
const csatOptions = [
  { value: '', label: 'Any rating' },
  { value: 'rated', label: 'Rated' },
  { value: 'unrated', label: 'Unrated' },
  { value: 'low', label: 'Low (≤2★)' },
]
const codeSelect = computed({
  get: () => f.resolution_code,
  set: (v) => { f.resolution_code = v || ''; page.value = 1; reload() },
})
const resolverOptions = computed(() => {
  const opts = new Map()
  for (const r of (stats.value.leaderboard || [])) opts.set(String(r.agent_id), r.name || 'Agent')
  for (const t of workingSet.value) {
    const id = t.resolved_by_id || t.assigned_agent_id
    const nm = t.resolved_by_name || t.assigned_agent_name
    if (id && nm) opts.set(String(id), nm)
  }
  return [{ value: '', label: 'Anyone' }, ...[...opts].map(([value, label]) => ({ value, label }))]
})
const onResolverPick = (agentId) => { f.resolved_by = f.resolved_by === agentId ? '' : agentId; reload() }

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
  else { sortBy.value = key; sortDir.value = ['resolvedAt', 'csat', 'reopened'].includes(key) ? 'desc' : 'asc' }
  page.value = 1
}

/* ── CLOSEOUT RUN — ranked guided sweep with its own overlay ── */
const runOn = ref(false)
const runQueue = ref([])
const runIdx = ref(0)
const runCurrent = computed(() => {
  const id = runQueue.value[runIdx.value]
  return workingSet.value.find(t => String(t.id) === id) || null
})
const toggleRun = () => (runOn.value ? endRun() : startRun())
const startRun = () => {
  const q = rankOrdered.value.map(t => String(t.id))
  if (!q.length) { toast.info('The shelf is clear — nothing left to seal.'); return }
  runQueue.value = q; runIdx.value = 0; runOn.value = true
}
const endRun = () => { runOn.value = false; runQueue.value = []; runIdx.value = 0; cancelReopen() }
const runNext = () => {
  cancelReopen()
  if (runIdx.value + 1 >= runQueue.value.length) {
    endRun()
    toast.success('Closeout run complete — every fix on the shelf has been reviewed.')
    return
  }
  runIdx.value += 1
}

/* request a rating: a public staff reply the requester sees (agent path only) */
const ratingBusy = ref(false)
const RATING_ASK = 'Your ticket was resolved — could you take a second to rate the fix from your portal? It keeps our quality honest.'
const requestRating = async (t) => {
  if (!agent.value || !t) return
  ratingBusy.value = true
  try {
    await addTicketComment(t.id, { body: RATING_ASK, is_internal: false })
    toast.success(`${t.ticket_number}: rating requested.`)
    if (runOn.value) runNext()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not post the rating request.') }
  finally { ratingBusy.value = false }
}
const bulkRequestRating = async () => {
  const objs = workingSet.value.filter(t => selected.value.includes(String(t.id)) && !t.csat_score)
  if (!objs.length) { toast.info('Every selected ticket is already rated.'); return }
  ratingBusy.value = true
  let ok = 0
  for (const t of objs) {
    try { await addTicketComment(t.id, { body: RATING_ASK, is_internal: false }); ok += 1 } catch { /* per-ticket */ }
  }
  ratingBusy.value = false
  selected.value = []
  toast.success(`Rating requested on ${ok} of ${objs.length} ticket${objs.length === 1 ? '' : 's'}.`)
}

/* inline reopen (verdict chips → single-writer apply_reopen server-side) */
const reopenFor = ref(null)
const reopenCode = ref('')
const reopenNote = ref('')
const reopenBusy = ref(false)
const startReopen = (t) => {
  reopenFor.value = t
  reopenCode.value = ''
  reopenNote.value = ''
  if (!runOn.value) {
    // outside the run the chips live on the run card — spin up a one-ticket run for context
    runQueue.value = [String(t.id)]; runIdx.value = 0; runOn.value = true
  }
}
const cancelReopen = () => { reopenFor.value = null; reopenCode.value = ''; reopenNote.value = '' }
const confirmReopen = async () => {
  const t = reopenFor.value
  if (!t || !reopenCode.value) return
  reopenBusy.value = true
  try {
    const payload = { reason: reopenNote.value || 'Reopened from the closeout desk', reason_code: reopenCode.value }
    await (agent.value ? reopenTicket(t.id, payload) : reopenMyTicket(t.id, payload))
    toast.success(`${t.ticket_number} sent back — fresh resolution clock armed.`)
    cancelReopen()
    refreshAll()
    if (runOn.value) runNext()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not reopen the ticket.') }
  finally { reopenBusy.value = false }
}

/* ── close + resolve + bulk ── */
const closeTarget = ref(null)
const onClosed = () => { closeTarget.value = null; refreshAll(); if (runOn.value) runNext() }
const resolveTarget = ref(null)
const onResolved = () => { resolveTarget.value = null; refreshAll() }

const bulkOpen = ref(false)
const bulkMode = ref('close')
const bulkTicketObjs = computed(() => workingSet.value.filter(t => selected.value.includes(String(t.id))))
const openBulk = (mode) => {
  if (!bulkTicketObjs.value.length) { toast.info('Select tickets first.'); return }
  bulkMode.value = mode
  bulkOpen.value = true
}
const onBulkDone = () => { bulkOpen.value = false; selected.value = []; refreshAll() }

/* ── drawer + rail + insights ── */
const drawerId = ref(null)
const openTicket = (id) => { drawerId.value = String(id) }
const onDrawerClose = () => { drawerId.value = null }
const railEl = ref(null)
const scrollToRail = () => railEl.value?.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'center' })
const onInsight = (ins) => {
  const ids = (ins?.ticket_ids || []).map(String)
  if (ids.length) { openTicket(ids[0]); return }
  if (ins?.id === 'res-shelf') { scrollToRail(); return }
  toast.info(ins?.detail || ins?.title || 'Heads-up — no specific ticket to open for this insight')
}
/* Closeout-specific heuristics layered over the workbench feed */
const insights = computed(() => {
  const out = []
  if ((stats.value.overdue_close || 0) > 0) out.push({ id: 'res-over', kind: 'stale', severity: 'warn',
    title: `${stats.value.overdue_close} resolved ticket${stats.value.overdue_close === 1 ? '' : 's'} past the close window`,
    detail: 'The auto-close sweep will seal these on its next pass — verify them now if anything needs a second look.', action: 'view', ticket_ids: [] })
  const low = workingSet.value.filter(PRED.lowcsat)
  if (low.length) out.push({ id: 'res-low', kind: 'breach_risk', severity: 'crit',
    title: `${low.length} fix${low.length === 1 ? '' : 'es'} rated 2★ or below`,
    detail: 'A low rating is a bounce waiting to happen — review the resolution before the customer sends it back.', action: 'view', ticket_ids: low.map(t => t.id) })
  if ((stats.value.unrated_shelf || 0) >= 3) out.push({ id: 'res-unrated', kind: 'stale', severity: 'info',
    title: `${stats.value.unrated_shelf} shelf ticket${stats.value.unrated_shelf === 1 ? '' : 's'} still unrated`,
    detail: 'The rating window closes with the ticket — request feedback before the seal.', action: 'view', ticket_ids: [] })
  const byCode = stats.value.by_resolution_code || {}
  const noResp = byCode.no_response || 0
  const total30 = stats.value.resolved_30d || 0
  if (total30 >= 5 && noResp / total30 >= 0.3) out.push({ id: 'res-noresp', kind: 'customer_flood', severity: 'warn',
    title: '"No response" is a growing share of resolutions',
    detail: `${noResp} of ${total30} resolutions closed on customer silence — check whether requesters are getting the answers they need.`, action: 'view', ticket_ids: [] })
  if ((stats.value.pending_close || 0) > 0) out.push({ id: 'res-shelf', kind: 'stale', severity: 'info',
    title: `${stats.value.pending_close} fix${stats.value.pending_close === 1 ? '' : 'es'} on the pre-close shelf`,
    detail: 'The auto-close rail has them ranked soonest-seal first.', action: 'view', ticket_ids: [] })
  return [...out, ...((cmdStats.value.insights || []).slice(0, 3))]
})

/* ── ⌘K commands ── */
const cmdOpen = ref(false)
const commands = computed(() => [
  { key: 'run', label: runOn.value ? 'End the closeout run' : 'Start closeout run — worst rating first', icon: BadgeCheck, run: toggleRun },
  { key: 'lens-pending', label: 'Lens · Pending close', icon: Timer, run: () => (refine.value = 'pending') },
  { key: 'lens-lowcsat', label: 'Lens · Low CSAT', icon: ThumbsDown, run: () => (refine.value = 'lowcsat') },
  { key: 'lens-fcr', label: 'Lens · One-touch fixes', icon: Sparkles, run: () => (refine.value = 'fcr') },
  { key: 'rail', label: 'Jump to the auto-close rail', icon: Timer, run: scrollToRail },
  { key: 'view-ledger', label: 'View · Ledger (the resolution stories)', icon: BookOpenCheck, run: () => (view.value = 'ledger') },
  { key: 'include-closed', label: includeClosed.value ? 'Hide closed tickets' : 'Include closed tickets', icon: Archive, run: () => { includeClosed.value = !includeClosed.value; reload() } },
  { key: 'refresh', label: 'Refresh', icon: Check, run: refreshAll },
])
const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdOpen.value = !cmdOpen.value }
  else if (e.key === 'Escape' && runOn.value && !drawerId.value && !closeTarget.value && !resolveTarget.value && !bulkOpen.value) endRun()
}

/* ── table columns / empty ── */
const columns = computed(() => getTicketScope('resolved').columns || [])
const emptyText = computed(() => refine.value === 'all'
  ? (getTicketScope('resolved').empty || { title: 'Nothing resolved yet', blurb: 'Resolved tickets will collect here.' })
  : { title: 'Nothing under this lens', blurb: 'Clear the refinement to see the whole shelf.' })

/* ── CSV export (client-side, matches what's shown) ── */
const doExport = () => {
  const rowsCsv = filtered.value
  if (!rowsCsv.length) { toast.info('Nothing to export.'); return }
  const head = ['Ticket', 'Subject', 'Priority', 'Status', 'Fix code', 'Root cause', 'Summary', 'Resolved by', 'Resolved at', 'Closes at', 'CSAT', 'Bounces', 'Time spent (min)', 'Created']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')]
  for (const t of rowsCsv) lines.push([
    t.ticket_number, t.subject, priorityLabel(t.priority), statusLabel(t.status),
    resolutionLabel(t.resolution_code || ''), t.resolution_category || '', t.resolution_summary || '',
    t.resolved_by_name || t.assigned_agent_name || '', t.resolved_at || '', t.auto_close_at || '',
    t.csat_score ?? '', t.reopened_count || 0, t.time_spent_minutes || 0, t.created_at,
  ].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'resolved-desk.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
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
.res { display: flex; flex-direction: column; gap: 14px; color: var(--sd-text); }
.res-insights { align-self: stretch; }

.res-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); transition: border-color 0.2s, background 0.2s, transform 0.12s; }
.res-btn:hover { border-color: var(--sd-res-core); }
.res-btn:active { transform: translateY(1px); }
.res-btn.on { border-color: var(--sd-res-core); color: var(--sd-res-core); background: var(--sd-res-soft); }
.res-btn.accent { border-color: color-mix(in srgb, var(--sd-res-core) 55%, transparent); color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-res-core)); }
[data-theme="light"] .res-btn.accent { color: #064e3b; }
.res-btn.sm { padding: 7px 12px; font-size: 12px; }
.res-btn.icon { padding: 7px 9px; }
.res-btn.ghost { background: transparent; }
.res-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.res-fbadge { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--sd-res-core); color: #04120c; font-size: 10px; font-weight: 800; }

.res-deck { display: flex; flex-direction: column; gap: 12px; padding: 13px 15px; }
.res-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.res-views { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.res-view { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: var(--sd-text-muted); font-family: inherit; transition: color 0.18s, background 0.18s; }
.res-view:hover { color: var(--sd-text); }
.res-view.on { color: var(--sd-res-core); background: var(--sd-res-soft); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-res-core) 40%, transparent); }
.res-tools { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.res-count { font-size: 12px; color: var(--sd-text-dim); }

.res-tokens { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding-top: 11px; border-top: 1px solid var(--sd-border); }
.tok-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; border: 1px solid color-mix(in srgb, var(--sd-res-core) 44%, transparent); background: var(--sd-res-soft); color: var(--sd-res-core); font-family: inherit; }
.tok.clear { border-style: dashed; border-color: var(--sd-border-strong); background: transparent; color: var(--sd-text-muted); }
.tok.clear:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.res-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 16px 18px; }
.flt-q { flex: 1; min-width: 220px; display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); }
.flt-q input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13px; font-family: inherit; }
.flt-x { display: grid; place-items: center; background: none; border: none; color: var(--sd-text-dim); cursor: pointer; }
.flt-field { display: flex; flex-direction: column; gap: 5px; min-width: 150px; }
.flt-field label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.flt-date { flex-direction: row; align-items: center; gap: 6px; min-width: 0; }
.flt-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

.res-bulk { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; border-color: var(--sd-res-brd); }
.bulk-n { font-size: 13px; font-weight: 700; color: var(--sd-res-core); }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.res-stage { min-height: 40px; }
.res-pager { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 6px 0 4px; }
.pg-info { font-size: 12.5px; color: var(--sd-text-muted); }

/* ── CLOSEOUT RUN overlay ── */
.clr-veil { position: fixed; inset: 0; z-index: 1400; display: grid; place-items: center;
  padding: 18px; background: color-mix(in srgb, var(--sd-res-deep-bg) 55%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.clr-card { position: relative; width: min(640px, 100%); border-radius: 20px; padding: 18px 20px 14px;
  border: 1px solid var(--sd-res-brd); background: color-mix(in srgb, var(--sd-res-deep-bg) 88%, #000);
  color: #edf7f1; box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.7), var(--sd-res-glow); }
.clr-head { display: flex; justify-content: space-between; align-items: center; padding-right: 36px; /* clear the absolute .clr-x */ }
.clr-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-res-hi); }
.clr-count { font-size: 11px; font-weight: 800; color: rgba(237, 247, 241, 0.5); }
.clr-no { margin-top: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-res-hi); }
.clr-no em { font-style: normal; color: rgba(237, 247, 241, 0.6); }
.clr-close { color: var(--sd-res-close); }
.clr-close.over { color: var(--sd-danger); }
.clr-subj { margin: 5px 0 8px; font-size: 18px; font-weight: 750; line-height: 1.3; color: #f0f8f3; }
.clr-fix { display: flex; flex-direction: column; gap: 3px; margin: 0 0 9px; padding: 9px 11px; border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--sd-res-core) 35%, transparent); background: rgba(16, 185, 129, 0.07); }
.clr-fix b { font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-res-core); }
.clr-fix span { font-size: 11.5px; font-weight: 600; line-height: 1.45; color: rgba(237, 247, 241, 0.75);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.clr-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; font-weight: 700; }
.clr-csat { display: inline-flex; align-items: center; gap: 4px; color: var(--sd-res-brass); }
.clr-csat.none { color: rgba(237, 247, 241, 0.45); }
.clr-csat.low { color: var(--sd-res-risk); }
.clr-bounce { color: var(--sd-res-risk); }
.clr-owner { color: rgba(237, 247, 241, 0.65); }
.clr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.clr-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid rgba(237, 247, 241, 0.2); background: rgba(237, 247, 241, 0.06); color: #edf7f1;
  transition: transform 0.14s, border-color 0.2s; }
.clr-btn:hover { transform: translateY(-1px); border-color: var(--sd-res-hi); }
.clr-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-res-core)); }
.clr-btn.danger { border-color: color-mix(in srgb, var(--sd-res-risk) 60%, transparent); color: var(--sd-res-risk); }
.clr-btn.ghost { background: transparent; }
.clr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.clr-dots { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 14px; }
.clr-dots i { width: 8px; height: 4px; border-radius: 3px; background: rgba(237, 247, 241, 0.16); }
.clr-dots i.done { background: var(--sd-res-core); }
.clr-dots i.on { background: var(--sd-res-hi); width: 16px; }
.clr-x { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: 9px; border: 1px solid rgba(237, 247, 241, 0.16); background: transparent; color: rgba(237, 247, 241, 0.6); cursor: pointer; }
.clr-x:hover { color: #fff; border-color: var(--sd-res-hi); }

/* inline reopen verdict */
.clr-reopen { margin-top: 14px; display: flex; flex-direction: column; gap: 9px; padding: 11px 12px; border-radius: 13px;
  border: 1px dashed color-mix(in srgb, var(--sd-res-risk) 45%, transparent); background: rgba(251, 113, 133, 0.06); }
.ro-lbl { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-res-risk); }
.ro-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ro-chip { padding: 5px 10px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em;
  cursor: pointer; font-family: inherit; color: rgba(237, 247, 241, 0.7);
  border: 1px solid rgba(237, 247, 241, 0.2); background: transparent; transition: border-color 0.16s, color 0.16s; }
.ro-chip:hover { border-color: var(--sd-res-risk); }
.ro-chip.on { border-color: var(--sd-res-risk); color: var(--sd-res-risk); background: rgba(251, 113, 133, 0.12); }
.ro-note { padding: 8px 11px; border-radius: 10px; border: 1px solid rgba(237, 247, 241, 0.18);
  background: rgba(237, 247, 241, 0.05); color: #edf7f1; font-size: 12px; font-family: inherit; outline: none; }
.ro-note:focus { border-color: var(--sd-res-risk); }
.ro-actions { display: flex; gap: 8px; }

.res-flt-enter-active, .res-flt-leave-active { transition: opacity 0.22s var(--sd-spring), transform 0.22s var(--sd-spring); }
.res-flt-enter-from, .res-flt-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 720px) { .res-tools { margin-left: 0; } }
</style>
