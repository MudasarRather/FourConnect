<template>
  <div class="sd-intel-dash">
    <!-- ░░ The Grand Concourse — hero + Solari departures board ░░ -->
    <SdIntelHero
      :board-rows="boardRows"
      :presence="intel?.presence || {}"
      :incidents="intel?.major_incidents || []"
      :incidents-active="intel?.major_incidents_active || 0"
      :days="days"
      :loading="loading || intelLoading"
      @go="goTab"
      @new="$emit('new')"
      @update:days="setDays"
    />

    <!-- ░░ Wayfinding lenses (deep-link to ticket views) ░░ -->
    <div class="in-lenses">
      <SdKpiTile v-for="(k, i) in lenses" :key="k.key" :icon="k.icon" :label="k.label" :value="k.value"
        :accent="k.accent" :sub="k.sub" :suffix="k.suffix" :decimals="k.decimals || 0" :index="i" :live="k.live"
        clickable @activate="k.tab && goTab(k.tab)" />
    </div>

    <!-- ░░ The hall ░░ -->
    <div class="in-deck">
      <!-- Arrivals & departures -->
      <section class="sd-card in-panel in-wide">
        <header class="in-ph">
          <h3><TrainFront :size="15" /> Arrivals &amp; departures</h3>
          <span class="in-ph-sub">last {{ days }} days · SLA attainment</span>
        </header>
        <SdIntelTrend :trend="intel?.volume_trend || []"
          :fr-met-pct="summary.first_response_met_pct" :reso-met-pct="summary.resolution_met_pct" />
      </section>

      <!-- Platform status -->
      <section class="sd-card in-panel">
        <header class="in-ph">
          <h3><Building2 :size="15" /> Platform status</h3>
          <button class="in-link" @click="goTab('team')">Team command →</button>
        </header>
        <SdIntelTeamBoard :teams="intel?.team_scoreboard || []" :loading="intelLoading" @go="goTab" />
      </section>

      <!-- Crew rankings -->
      <section class="sd-card in-panel">
        <header class="in-ph">
          <h3><Award :size="15" /> Crew rankings</h3>
          <span class="in-ph-sub">resolutions · {{ days }}d</span>
        </header>
        <SdIntelLeaderboard :agents="intel?.leaderboard || []" :loading="intelLoading" @go="goTab" />
      </section>

      <!-- Final calls -->
      <section class="sd-card in-panel in-wide">
        <header class="in-ph">
          <h3><BellRing :size="15" /> Final calls</h3>
          <button class="in-link" @click="goTab('overdue')">Overdue board →</button>
        </header>
        <SdIntelAtRisk :items="intel?.at_risk || []" :now="now" :loading="intelLoading" @open="$emit('open', $event)" />
      </section>

      <!-- The timetable -->
      <section class="sd-card in-panel in-wide">
        <header class="in-ph">
          <h3><CalendarClock :size="15" /> The timetable</h3>
          <span class="in-ph-sub">arrivals by hour · your local time</span>
        </header>
        <SdIntelHeatmap :matrix="intel?.busy_matrix || []" />
      </section>

      <!-- Entrances -->
      <section class="sd-card in-panel">
        <header class="in-ph"><h3><DoorOpen :size="15" /> Entrances</h3><span class="in-ph-sub">arrivals by channel</span></header>
        <SdIntelChannelMix :mix="intel?.channel_mix || {}" />
      </section>

      <!-- Passenger satisfaction -->
      <section class="sd-card in-panel">
        <header class="in-ph"><h3><Star :size="15" /> Passenger satisfaction</h3><span class="in-ph-sub">CSAT · {{ days }}d</span></header>
        <SdIntelCsat :csat="intel?.csat || { distribution: {}, trend: [] }" />
      </section>

      <!-- Service speed -->
      <section class="sd-card in-panel">
        <header class="in-ph"><h3><GaugeCircle :size="15" /> Service speed</h3><span class="in-ph-sub">means · {{ days }}d</span></header>
        <SdIntelSpeed :mtta="summary.mtta_minutes" :first-response="summary.avg_first_response_minutes" :mttr="summary.mttr_minutes" />
      </section>

      <!-- Dwell time -->
      <section class="sd-card in-panel">
        <header class="in-ph"><h3><Hourglass :size="15" /> Dwell time</h3><span class="in-ph-sub">active desk age</span></header>
        <SdIntelAging :aging="intel?.aging || {}" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Ticket, Inbox, ArrowDownToLine, ArrowUpFromLine, Scale, Repeat2, CheckCheck, Star,
  TrainFront, Building2, Award, BellRing, CalendarClock, DoorOpen, GaugeCircle, Hourglass,
} from 'lucide-vue-next'
import SdIntelHero from '../components/SdIntelHero.vue'
import SdIntelTrend from '../components/SdIntelTrend.vue'
import SdIntelTeamBoard from '../components/SdIntelTeamBoard.vue'
import SdIntelLeaderboard from '../components/SdIntelLeaderboard.vue'
import SdIntelHeatmap from '../components/SdIntelHeatmap.vue'
import SdIntelChannelMix from '../components/SdIntelChannelMix.vue'
import SdIntelCsat from '../components/SdIntelCsat.vue'
import SdIntelAtRisk from '../components/SdIntelAtRisk.vue'
import SdIntelAging from '../components/SdIntelAging.vue'
import SdIntelSpeed from '../components/SdIntelSpeed.vue'
import SdKpiTile from '../components/SdKpiTile.vue'
import { fetchSupportIntel } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },   // legacy /dashboard/ payload (instant paint)
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'new'])

const route = useRoute()
const router = useRouter()
const ticketsBase = computed(() => (route.path.startsWith('/user') ? '/user/support' : '/admin/support-desk') + '/tickets')
const goTab = (tab) => router.push(`${ticketsBase.value}/${tab}`)

/* ── intel payload — the range-parameterised admin analytics ── */
const intel = ref(null)
const intelLoading = ref(true)
const days = ref(30)
const loadIntel = async () => {
  intelLoading.value = true
  try {
    intel.value = await fetchSupportIntel({
      days: days.value,
      tz_offset: -new Date().getTimezoneOffset(),
    })
  } catch { /* keep the last good payload */ }
  finally { intelLoading.value = false }
}
const setDays = (d) => { if (d !== days.value) { days.value = d; loadIntel() } }

/* live tick (final-calls countdown) + visibility-gated 60s refresh */
const now = ref(Date.now())
let tick = null; let poll = null
onMounted(() => {
  loadIntel()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (document.visibilityState === 'visible') loadIntel() }, 60000)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll) })

const d = computed(() => props.dashboard || {})           // legacy — paints before intel lands
const summary = computed(() => intel.value?.summary || {})
const sc = computed(() => d.value.status_counts || {})

/* ── the Solari board rows: legacy values first, flaps flip when intel lands ── */
const boardRows = computed(() => {
  const s = summary.value
  const open = s.open_now ?? d.value.open_tickets ?? 0
  const unassigned = s.unassigned_now ?? d.value.unassigned ?? 0
  const critical = d.value.critical ?? 0
  const escalated = d.value.escalated ?? 0
  const breached = d.value.sla_breached ?? 0
  const pendCust = sc.value.pending_customer ?? 0
  const pendVend = sc.value.pending_vendor ?? 0
  const onHold = s.on_hold_now ?? d.value.on_hold ?? 0
  const resolvedToday = d.value.resolved_today ?? 0
  return [
    { key: 'open', dest: 'Open / In progress', load: open, gate: 'OPS', sla: s.resolution_met_pct ?? null, tab: 'open',
      status: open ? { label: 'BOARDING', tone: 'up' } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'unassigned', dest: 'Unassigned pool', load: unassigned, gate: 'TRI', sla: null, tab: 'unassigned',
      status: unassigned ? { label: 'CALLING', tone: 'amber', blink: unassigned > 5 } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'pc', dest: 'Pending customer', load: pendCust, gate: 'CUS', sla: null, tab: 'pending-customer',
      status: pendCust ? { label: 'HOLDING', tone: 'amber' } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'pv', dest: 'Pending vendor', load: pendVend, gate: 'VEN', sla: null, tab: 'pending-vendor',
      status: pendVend ? { label: 'AWAITING', tone: 'amber' } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'hold', dest: 'On hold', load: onHold, gate: 'HLD', sla: null, tab: 'on-hold',
      status: onHold ? { label: 'PARKED', tone: 'dim' } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'esc', dest: 'Escalated', load: escalated, gate: 'ESC', sla: null, tab: 'escalated', loadTone: escalated ? 'amber' : '',
      status: escalated ? { label: 'EXPEDITED', tone: 'amber', blink: true } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'crit', dest: 'Critical / major incident', load: critical, gate: 'WAR', sla: null, tab: 'critical', loadTone: critical ? 'dn' : '',
      status: critical ? { label: 'FINAL CALL', tone: 'dn', blink: true } : { label: 'CLEAR', tone: 'dim' } },
    { key: 'sla', dest: 'SLA breached', load: breached, gate: 'SLA', sla: s.first_response_met_pct ?? null, tab: 'breached', loadTone: breached ? 'dn' : '',
      status: breached ? { label: 'DELAYED', tone: 'dn', blink: true } : { label: 'ON TIME', tone: 'up' } },
    { key: 'res', dest: 'Resolved today', load: resolvedToday, gate: 'OUT', sla: null, tab: 'resolved', loadTone: resolvedToday ? 'up' : '',
      status: { label: 'DEPARTED', tone: 'up' } },
  ]
})

/* ── wayfinding lenses ── */
const lenses = computed(() => {
  const s = summary.value; const q = intel.value?.quality || {}
  const delta = s.backlog_delta ?? 0
  return [
    { key: 'open', icon: Ticket, label: 'Open now', value: s.open_now ?? d.value.open_tickets ?? 0, accent: 'var(--intel)', tab: 'open', live: true, sub: 'active workload' },
    { key: 'unassigned', icon: Inbox, label: 'Unassigned', value: s.unassigned_now ?? d.value.unassigned ?? 0, accent: 'var(--intel-bright)', tab: 'unassigned', sub: 'awaiting triage' },
    { key: 'in', icon: ArrowDownToLine, label: 'Arrivals', value: s.created_range ?? 0, accent: 'var(--intel-deep)', tab: 'all', sub: `created · ${days.value}d` },
    { key: 'out', icon: ArrowUpFromLine, label: 'Departures', value: s.resolved_range ?? 0, accent: 'var(--intel-up)', tab: 'resolved', sub: `resolved · ${days.value}d` },
    { key: 'delta', icon: Scale, label: 'Backlog Δ', value: delta, accent: delta > 0 ? 'var(--intel-dn)' : 'var(--intel-up)', tab: 'all', sub: delta > 0 ? 'hall is filling' : 'hall is draining' },
    { key: 'fcr', icon: CheckCheck, label: 'First-time fix', value: q.fcr_pct ?? 0, suffix: '%', accent: 'var(--intel-up)', tab: 'resolved', sub: 'never reopened' },
    { key: 'reopen', icon: Repeat2, label: 'Reopen rate', value: q.reopen_rate_range ?? 0, suffix: '%', accent: (q.reopen_rate_range || 0) > 10 ? 'var(--intel-dn)' : 'var(--intel)', tab: 'reopened', sub: `${q.reopens_range ?? 0} returned` },
    { key: 'csat', icon: Star, label: 'CSAT', value: intel.value?.csat?.avg ?? 0, decimals: 2, accent: 'var(--intel-bright)', tab: 'resolved', sub: `${intel.value?.csat?.count ?? 0} rated` },
  ]
})

</script>

<style scoped>
.sd-intel-dash { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }

.in-lenses { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 11px; }

.in-deck { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.in-panel { padding: 18px 20px; }
.in-wide { grid-column: 1 / -1; }
.in-ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 10px; }
.in-ph h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.in-ph h3 :deep(svg) { color: var(--intel); }
.in-ph-sub { font-size: 11px; color: var(--sd-text-dim); font-family: var(--sd-mono); text-align: right; }
.in-link { background: none; border: none; color: var(--intel); font-size: 12.5px; font-weight: 600; cursor: pointer; }

@media (max-width: 900px) { .in-deck { grid-template-columns: 1fr; } }
</style>
