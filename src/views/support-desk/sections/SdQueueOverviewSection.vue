<template>
  <div class="sd-qov">
    <!-- plain employees: the ward is an agent surface — say so instead of 403-spamming -->
    <div v-if="accessBlocked" class="qov-gate sd-card">
      <HeartPulse :size="30" />
      <h3>The Vitals Bay is an agent surface</h3>
      <p>Queue telemetry is sealed to support-team members. Raise or track your own requests from
        <a href="#" @click.prevent="$emit('go', 'tickets')">My Tickets</a>.</p>
    </div>

    <template v-else>
      <!-- ═══ HERO — the fleet monitor ═══ -->
      <SdVitalsHero :overview="overview" :lenses="lenses" :active-lens="lens" :me="myStatus"
        :is-admin="isAdmin" :loading="loading" :reduced="reduced" :days="days"
        @pick="onLens" @tier="goTier" @config="goConfig" @refresh="load" @status="onStatus" />

      <!-- ═══ CONTROL DECK ═══ -->
      <div class="qov-deck">
        <div class="qov-views" role="tablist" aria-label="Overview layout">
          <button class="qov-vw" :class="{ on: view === 'cards' }" role="tab" :aria-selected="view === 'cards'" title="Monitor wall" @click="view = 'cards'">
            <MonitorDot :size="14" /> Monitors
          </button>
          <button class="qov-vw" :class="{ on: view === 'table' }" role="tab" :aria-selected="view === 'table'" title="Comparison ledger" @click="view = 'table'">
            <Table2 :size="14" /> Ledger
          </button>
        </div>
        <div class="qov-range sd-mono" role="tablist" aria-label="Analytics range">
          <button v-for="r in RANGES" :key="r.key" class="qov-rg" :class="{ on: days === r.days }" role="tab"
            :aria-selected="days === r.days" :title="r.title" @click="setRange(r)">{{ r.label }}</button>
        </div>
        <label v-if="isAdmin" class="qov-inactive">
          <input v-model="includeInactive" type="checkbox" @change="load()" /> retired lanes
        </label>
        <span class="qov-live sd-mono" :class="{ paused: !polling || fetchErr }"
          :title="fetchErr ? 'Last refresh failed — telemetry may be stale' : polling ? 'Telemetry refreshes every 60s' : 'Live refresh paused (tab hidden)'">
          <i /> {{ fetchErr ? 'OFFLINE' : 'LIVE' }}
        </span>
        <span class="qov-count sd-mono">{{ shownQueues.length }} / {{ (overview.queues || []).length }} LANES</span>
      </div>

      <!-- ═══ MONITOR WALL ═══ -->
      <div v-if="view === 'cards'">
        <div v-if="loading && !overview.queues" class="qov-skel">
          <span v-for="i in 6" :key="i" class="qov-skel-card" :style="{ '--i': i }" />
        </div>
        <div v-else-if="shownQueues.length" class="qov-grid">
          <SdVitalsMonitor v-for="(q, i) in shownQueues" :key="q.id" :q="q" :index="i" :reduced="reduced"
            @inspect="inspect" @work="workLane" />
        </div>
        <div v-else class="qov-empty sd-card">
          <HeartPulse :size="26" />
          <p v-if="lens !== 'all'">No lanes match this lens.</p>
          <p v-else>No queues yet — nothing on telemetry.</p>
          <Motion v-if="isAdmin && lens === 'all'" as="button" class="qov-btn primary" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="goConfig">
            <SlidersHorizontal :size="14" /> Create the first queue
          </Motion>
        </div>
      </div>

      <!-- ═══ WARD CHART (comparison ledger) ═══ -->
      <div v-else class="qov-ledger sd-card">
        <table class="qov-tbl">
          <thead>
            <tr>
              <th v-for="c in LEDGER_COLS" :key="c.key" :class="{ num: c.num, sortable: true, on: sortBy === c.key }"
                @click="setSort(c.key)">
                {{ c.label }} <ChevronDown v-if="sortBy === c.key" :size="11" :class="{ flip: sortDir === 'asc' }" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in sortedQueues" :key="q.id" class="qov-row" :class="`h-${q.health}`" @click="inspect(q)">
              <td>
                <span class="qov-cell-name">
                  <i class="qov-lamp" :class="`h-${q.health}`" />{{ q.name }}
                  <em v-if="q.is_default" title="Default fallback queue">◈</em>
                </span>
              </td>
              <td class="sd-mono">{{ q.tier ? `L${q.tier}` : '—' }}</td>
              <td class="num"><b>{{ q.open }}</b></td>
              <td class="num" :class="{ hot: q.unassigned }">{{ q.unassigned }}</td>
              <td class="num" :class="{ bad: q.breached }">{{ q.breached }}</td>
              <td class="num sd-mono">{{ fmtWait(q.avg_wait_mins) }}</td>
              <td class="num sd-mono">{{ q.agents_online }}/{{ q.agents_total }}</td>
              <td class="num sd-mono" :class="{ bad: (q.load_pct || 0) >= 100, hot: (q.load_pct || 0) >= 75 && (q.load_pct || 0) < 100 }">
                {{ q.load_pct != null ? Math.round(q.load_pct) + '%' : '—' }}</td>
              <td class="num sd-mono" :class="slaClass(q.sla_attainment_7d)">{{ q.sla_attainment_7d != null ? q.sla_attainment_7d + '%' : '—' }}</td>
              <td class="num">{{ q.resolved_7d }}</td>
              <td class="num sd-mono">{{ fmtEta(q.drain_eta_mins) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ═══ WARD DECK — code board · blood gases · rounding list ═══ -->
      <div class="qov-ward">
        <SdVitalsCodeBoard :items="overview.breach_horizon || []" :breached-now="totals.breached || 0"
          :reduced="reduced" @open="goCode" @lens="lens = $event" />
        <SdVitalsSlaGases :sla-split="overview.sla_split || {}" :deltas="overview.deltas || {}" :days="days" />
        <SdVitalsCrewRounds :utilization="overview.utilization || {}" />
      </div>

      <!-- ═══ TRENDS — admissions/discharges · time on ward ═══ -->
      <div class="qov-trends">
        <SdVitalsFlowTrend :queues="overview.queues || []" :interval="overview.flow_interval || 'day'" :reduced="reduced" />
        <SdVitalsAging :aging="overview.aging || {}" />
      </div>

      <!-- ═══ THE LADDER — escalation flow Sankey ═══ -->
      <SdTierFlow :flow="overview.tier_flow || []" :rollup="overview.tier_rollup || {}" :days="days" />

      <!-- lane drill drawer -->
      <SdQueueDrawer :queue-id="drawerQueueId" :is-admin="isAdmin"
        @close="drawerQueueId = null" @work="workLane" @config="goConfigQueue" />
    </template>
  </div>
</template>

<script setup>
/* SdQueueOverviewSection — "THE VITALS BAY" supervisor board (queues module ·
   overview tab, BOTH panels). The desk as an ICU telemetry wing: one sealed
   /queues/overview call feeds the fleet monitor hero (EKG + vitals + deltas), the
   lens dock, the per-queue patient monitors / ward chart, the code board (breach
   horizon), blood gases (SLA split), the rounding list (crew utilization), the
   admissions/discharges trend, the aging histogram, the tier ladder Sankey and the
   lane drawer. Auto-polls every 60s while the tab is visible. Agents see their
   teams' beds; superusers the whole ward; plain employees get the access gate. */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  HeartPulse, MonitorDot, Table2, ChevronDown, SlidersHorizontal,
  AlarmClockOff, Flame, HandHelping, Activity, Route, RotateCcw,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdVitalsHero from '../components/SdVitalsHero.vue'
import SdVitalsMonitor from '../components/SdVitalsMonitor.vue'
import SdVitalsCodeBoard from '../components/SdVitalsCodeBoard.vue'
import SdVitalsSlaGases from '../components/SdVitalsSlaGases.vue'
import SdVitalsCrewRounds from '../components/SdVitalsCrewRounds.vue'
import SdVitalsFlowTrend from '../components/SdVitalsFlowTrend.vue'
import SdVitalsAging from '../components/SdVitalsAging.vue'
import SdTierFlow from '../components/SdTierFlow.vue'
import SdQueueDrawer from '../components/SdQueueDrawer.vue'
import { queuesOverview, agentStatusRoster, setMyStatus, AGENT_STATUS_META } from '@/composables/useSupportDesk'
import { useCinematic } from '@/composables/useCinematic'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  agentReveal: { type: Boolean, default: false },
})
defineEmits(['go'])

const router = useRouter()
const toast = useToast()
const { cinematic } = useCinematic()
const reduced = computed(() => {
  if (cinematic.value) return false
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
})

const isAdmin = computed(() => props.panel === 'admin')
const accessBlocked = computed(() => props.panel !== 'admin' && !props.agentReveal)
const base = computed(() => (isAdmin.value ? '/admin/support-desk' : '/user/support'))

/* ── data ── */
const overview = ref({})
const loading = ref(false)
const days = ref(7)
const flowInterval = ref('day')
const includeInactive = ref(false)
const fetchErr = ref(false)
const load = async () => {
  loading.value = true
  try {
    overview.value = await queuesOverview({
      days: days.value, include_inactive: includeInactive.value, flow_interval: flowInterval.value,
    })
    fetchErr.value = false
  } catch {
    // Keep the last good telemetry, but say so — a failed refresh must not
    // keep wearing the LIVE badge while the wall quietly goes stale.
    fetchErr.value = true
  } finally { loading.value = false }
}
const RANGES = [
  { key: '24h', label: '24H', days: 1, interval: 'hour', title: 'Last 24 hours, hourly flow' },
  { key: '7d', label: '7D', days: 7, interval: 'day', title: 'Last 7 days' },
  { key: '14d', label: '14D', days: 14, interval: 'day', title: 'Last 14 days' },
  { key: '30d', label: '30D', days: 30, interval: 'day', title: 'Last 30 days' },
]
const setRange = (r) => { days.value = r.days; flowInterval.value = r.interval; load() }

/* live telemetry: poll every 60s, pause while the tab is hidden */
const polling = ref(true)
let pollTimer = null
const onVisibility = () => {
  polling.value = !document.hidden
  if (polling.value) load()
}
/* boot() is watch-driven, not mount-only: on the employee panel the agent probe can
   resolve AFTER mount (revealPending window) — a mount-only gate left the board on a
   false "No queues yet" empty state until manual refresh. */
let booted = false
const boot = () => {
  if (booted || accessBlocked.value) return
  booted = true
  load(); loadStatus()
  pollTimer = setInterval(() => { if (!document.hidden && !loading.value) load() }, 60_000)
  document.addEventListener('visibilitychange', onVisibility)
}
onMounted(boot)
watch(accessBlocked, (blocked) => { if (!blocked) boot() })
onBeforeUnmount(() => {
  clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisibility)
})

const myStatus = ref(null)
const loadStatus = async () => {
  try { myStatus.value = (await agentStatusRoster()).me || null } catch { myStatus.value = null }
}
const onStatus = async (status) => {
  try {
    await setMyStatus({ status })
    myStatus.value = { ...(myStatus.value || {}), status }
    toast.success(`Signal set: ${AGENT_STATUS_META[status]?.label || status}`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not update your status')
  }
}

/* ── lenses ── */
const lens = ref('all')
const totals = computed(() => overview.value.totals || {})
const lenses = computed(() => ([
  { key: 'all', label: 'All lanes', icon: Activity, color: 'var(--sd-qv-core)', value: (overview.value.queues || []).length },
  { key: 'attention', label: 'Needs attention', icon: Flame, color: 'var(--sd-qv-halt)', value: (totals.value.red || 0) + (totals.value.amber || 0) },
  { key: 'unowned', label: 'Unowned work', icon: HandHelping, color: 'var(--sd-qv-warn)', value: totals.value.unassigned ?? 0 },
  { key: 'breached', label: 'Breached', icon: AlarmClockOff, color: 'var(--sd-qv-halt)', value: totals.value.breached ?? 0 },
  { key: 'routed', label: 'Auto-routed today', icon: Route, color: 'var(--sd-qv-go)', value: overview.value.auto_routed_today ?? 0, stat: true },
  { key: 'reopens', label: `Reopens ${days.value === 1 ? '24h' : days.value + 'd'}`, icon: RotateCcw, color: 'var(--sd-qs-rail)', value: overview.value.reopens_range ?? 0, stat: true },
]))
const onLens = (l) => { if (!l.stat) lens.value = l.key }

const shownQueues = computed(() => {
  const qs = overview.value.queues || []
  switch (lens.value) {
    case 'attention': return qs.filter(q => q.health !== 'green')
    case 'unowned': return qs.filter(q => (q.unassigned || 0) > 0)
    case 'breached': return qs.filter(q => (q.breached || 0) > 0)
    default: return qs
  }
})

/* ── ward chart sort ── */
const LEDGER_COLS = [
  { key: 'name', label: 'Lane' },
  { key: 'tier', label: 'Tier' },
  { key: 'open', label: 'Open', num: true },
  { key: 'unassigned', label: 'Unowned', num: true },
  { key: 'breached', label: 'Breached', num: true },
  { key: 'avg_wait_mins', label: 'Avg wait', num: true },
  { key: 'agents_online', label: 'Crew', num: true },
  { key: 'load_pct', label: 'Load', num: true },
  { key: 'sla_attainment_7d', label: 'SLA %', num: true },
  { key: 'resolved_7d', label: 'Resolved', num: true },
  { key: 'drain_eta_mins', label: 'Drain', num: true },
]
const view = ref('cards')
const sortBy = ref('open')
const sortDir = ref('desc')
const setSort = (k) => {
  if (sortBy.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = k; sortDir.value = 'desc' }
}
const sortedQueues = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...shownQueues.value].sort((a, b) => {
    const av = a[sortBy.value], bv = b[sortBy.value]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir
  })
})

/* ── navigation + drawer ── */
const drawerQueueId = ref(null)
const inspect = (q) => { drawerQueueId.value = String(q.id) }
const goTier = (t) => router.push(`${base.value}/queues/l${t}`)
const workLane = (q) => {
  drawerQueueId.value = null
  if (q.tier) router.push({ path: `${base.value}/queues/l${q.tier}`, query: { queue: q.id } })
}
const goConfig = () => router.push(`${base.value}/queues/config`)
const goConfigQueue = (q) => router.push({ path: `${base.value}/queues/config`, query: { queue: q.id } })
/* code-board click → the owning lane's tier desk (filtered), falling back to the drawer */
const goCode = (item) => {
  const q = (overview.value.queues || []).find(x => String(x.id) === String(item.queue_id))
  if (q?.tier) workLane(q)
  else if (q) inspect(q)
}

/* ── fmt ── */
const fmtWait = (m) => (m == null ? '—' : m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`)
const fmtEta = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`
}
const slaClass = (v) => (v == null ? '' : v >= 90 ? 'ok' : v >= 70 ? 'warn' : 'bad')
</script>

<style scoped>
.sd-qov { display: flex; flex-direction: column; gap: 16px; }

/* access gate */
.qov-gate { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 24px; text-align: center;
  color: var(--sd-text-muted); border-radius: 18px; }
.qov-gate h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--sd-text); }
.qov-gate p { margin: 0; font-size: 12.5px; max-width: 46ch; }
.qov-gate a { color: var(--sd-qv-core); font-weight: 700; }

/* control deck */
.qov-deck { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.qov-views, .qov-range { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.qov-vw, .qov-rg { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: none; background: transparent;
  color: var(--sd-text-muted); transition: color 0.2s, background 0.2s; }
.qov-vw.on, .qov-rg.on { color: var(--sd-text); background: color-mix(in srgb, var(--sd-qv-core) 16%, transparent); }
.qov-rg { padding: 6px 10px; font-size: 10px; letter-spacing: 0.08em; }
.qov-inactive { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-muted); cursor: pointer; }
.qov-live { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: 0.16em;
  font-weight: 800; color: var(--sd-qv-go); }
.qov-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-qv-go); animation: qov-ping 2.2s infinite; }
.qov-live.paused { color: var(--sd-text-dim); }
.qov-live.paused i { background: var(--sd-text-dim); animation: none; }
.qov-count { margin-left: auto; font-size: 10px; letter-spacing: 0.14em; color: var(--sd-text-dim); }

/* monitor wall */
.qov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.qov-skel { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.qov-skel-card { height: 226px; border-radius: 16px; background: color-mix(in srgb, var(--sd-qs-rail) 10%, transparent);
  animation: qov-shimmer 1.2s ease-in-out infinite; animation-delay: calc(var(--i) * 0.07s); }
.qov-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 44px 20px;
  color: var(--sd-text-dim); border-radius: 16px; }
.qov-empty p { margin: 0; font-size: 12.5px; }
.qov-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.qov-btn.primary { color: #241703; background: linear-gradient(135deg, var(--sd-qv-hi), var(--sd-qv-core)); }

/* ward deck + trends */
.qov-ward { display: grid; grid-template-columns: 1.15fr 0.95fr 0.9fr; gap: 12px; align-items: stretch; }
.qov-trends { display: grid; grid-template-columns: 1.45fr 0.55fr; gap: 12px; align-items: stretch; }
@media (max-width: 1080px) { .qov-ward { grid-template-columns: 1fr 1fr; } .qov-ward > :first-child { grid-column: 1 / -1; } }
@media (max-width: 900px) { .qov-ward, .qov-trends { grid-template-columns: 1fr; } }

/* ward chart */
.qov-ledger { padding: 6px 4px; border-radius: 16px; overflow-x: auto; }
.qov-tbl { width: 100%; border-collapse: collapse; }
.qov-tbl th { padding: 10px 12px; text-align: left; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--sd-text-dim); border-bottom: 1px solid var(--sd-border);
  cursor: pointer; user-select: none; white-space: nowrap; }
.qov-tbl th.on { color: var(--sd-qv-core); }
.qov-tbl th .flip { transform: rotate(180deg); }
.qov-tbl th.num, .qov-tbl td.num { text-align: right; }
.qov-row { cursor: pointer; transition: background 0.15s; }
.qov-row:hover { background: color-mix(in srgb, var(--sd-qv-core) 6%, transparent); }
.qov-tbl td { padding: 10px 12px; font-size: 12px; color: var(--sd-text-secondary); border-bottom: 1px solid var(--sd-border); }
.qov-row:last-child td { border-bottom: none; }
.qov-cell-name { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--sd-text); }
.qov-cell-name em { color: var(--sd-qv-core); font-style: normal; }
.qov-lamp { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-qv-go); }
.qov-lamp.h-amber { background: var(--sd-qv-warn); }
.qov-lamp.h-red { background: var(--sd-qv-halt); animation: qov-blink 1.2s steps(2, end) infinite; }
.qov-tbl td b { color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qov-tbl td.hot { color: var(--sd-qv-warn); font-weight: 700; }
.qov-tbl td.bad { color: var(--sd-qv-halt); font-weight: 700; }
.qov-tbl td.ok { color: var(--sd-qv-go); }
.qov-tbl td.warn { color: var(--sd-qv-warn); }

@keyframes qov-shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes qov-ping { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sd-qv-go) 45%, transparent); }
  55% { box-shadow: 0 0 0 6px transparent; } }
@keyframes qov-blink { 50% { opacity: 0.3; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qov-skel-card,
  html:not([data-cinematic="on"]) .qov-live i,
  html:not([data-cinematic="on"]) .qov-lamp.h-red { animation: none; }
}
</style>
