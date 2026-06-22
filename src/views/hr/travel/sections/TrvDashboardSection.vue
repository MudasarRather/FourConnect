<template>
  <div class="dash">
    <!-- ════════ GREETING COMMAND HERO ════════ -->
    <Motion as="section" class="hero trv-grain"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="hero-aura" aria-hidden="true" />
      <span class="hero-runway" aria-hidden="true" />
      <span class="hero-grid-bg" aria-hidden="true" />

      <div class="hero-row">
        <div class="hero-lead">
          <span class="hero-eyebrow"><Radio :size="12" /> Travel · Mission Control
            <span class="hero-clock trv-mono"><span class="clock-dot" /> {{ clock }}</span>
          </span>
          <h1 class="hero-title">{{ greeting }}, <span class="grad">Commander</span></h1>
          <p class="hero-sub">Every tour, advance and settlement on one board — from request to runway to payroll.</p>
          <div class="hero-cta">
            <Motion as="button" type="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'requests')">
              <Plane :size="15" /> New request <ArrowRight :size="14" />
            </Motion>
            <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'approvals')">
              <ShieldCheck :size="14" /> Approvals
            </Motion>
            <Motion as="button" type="button" class="btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="onRefresh">
              <RefreshCw :size="14" :class="{ spin: loading }" /> Refresh
            </Motion>
          </div>
        </div>

        <div class="hero-stats">
          <button v-for="(h, i) in heroStats" :key="h.key" class="hstat" :style="{ '--i': i }" @click="$emit('go', h.go)">
            <component :is="h.icon" :size="15" class="hstat-ic" />
            <span class="hstat-val trv-mono"><TrvCountUp :value="h.value" :format="h.format || undefined" /><i v-if="h.suffix">{{ h.suffix }}</i></span>
            <span class="hstat-lab">{{ h.label }}</span>
          </button>
        </div>
      </div>
    </Motion>

    <!-- ════════ LIFECYCLE PIPELINE ════════ -->
    <DashPipeline :by-status="byStatus" @go="$emit('go', $event)" />

    <!-- ════════ SPARK KPI CARDS ════════ -->
    <div class="spark-row">
      <DashSparkCard v-for="(c, i) in sparkCards" :key="c.key" v-bind="c" :index="i" @go="$emit('go', $event)" />
    </div>

    <!-- ════════ TREND + BUDGET ════════ -->
    <div class="mid-grid">
      <div class="mid-left">
        <DashTrendChart :data="monthly" @go="$emit('go', $event)" />
        <DashDepartures :items="upcoming" :loading="loadingUpcoming" @go="$emit('go', $event)" />
      </div>

      <div class="mid-right">
        <!-- budget gauge -->
        <Motion as="article" class="panel budget"
          :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.06 }">
          <header class="panel-head"><Wallet :size="14" /><h3>Budget utilisation</h3></header>
          <div class="bg-wrap">
            <div class="bg-ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle class="bg-track" cx="60" cy="60" r="50" />
                <circle class="bg-val" :class="{ over: overBudget }" cx="60" cy="60" r="50"
                  :stroke-dasharray="drawn ? `${utilDash} ${RING_C}` : `0 ${RING_C}`" />
              </svg>
              <div class="bg-center">
                <span class="bg-pct trv-mono" :class="{ over: overBudget }"><TrvCountUp :value="util" suffix="%" /></span>
                <span class="bg-cap">of estimate</span>
              </div>
            </div>
            <div class="bg-meta">
              <div class="bgm"><span class="bgm-lab"><i class="d est" /> Estimated</span><b class="trv-mono">{{ fmtCompactINR(est) }}</b></div>
              <div class="bgm"><span class="bgm-lab"><i class="d act" /> Actual</span><b class="trv-mono">{{ fmtCompactINR(act) }}</b></div>
              <div class="bgm"><span class="bgm-lab"><Ticket :size="11" /> Booked</span><b class="trv-mono">{{ fmtCompactINR(booked) }}</b></div>
              <span class="bg-chip" :class="overBudget ? 'over' : 'under'">
                <component :is="overBudget ? TrendingUp : TrendingDown" :size="12" />
                {{ act === 0 ? 'No actuals yet' : (overBudget ? 'Over by ' : 'Under by ') + fmtCompactINR(Math.abs(variance)) }}
              </span>
            </div>
          </div>
        </Motion>

        <!-- treasury / settlement split -->
        <Motion as="article" class="panel treasury"
          :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.12 }">
          <header class="panel-head"><Scale :size="14" /><h3>Treasury &amp; settlement</h3></header>
          <div class="tre-flow">
            <span class="tre-track">
              <i class="tre-fill pay" :class="{ drawn }" :style="{ width: (drawn ? payPct : 0) + '%' }" />
              <i class="tre-fill rec" :class="{ drawn }" :style="{ width: (drawn ? recPct : 0) + '%' }" />
            </span>
          </div>
          <div class="tre-split">
            <button class="tre-side pay" @click="$emit('go', 'settlement')">
              <span class="tre-lab"><ArrowUpRight :size="11" /> Payable out</span>
              <b class="trv-mono">{{ fmtCompactINR(payable) }}</b>
            </button>
            <button class="tre-side rec" @click="$emit('go', 'settlement')">
              <span class="tre-lab"><ArrowDownLeft :size="11" /> Recoverable</span>
              <b class="trv-mono">{{ fmtCompactINR(recoverable) }}</b>
            </button>
          </div>
          <div class="tre-mini">
            <button class="trem" @click="$emit('go', 'advances')"><Coins :size="13" /><span><b class="trv-mono">{{ fmtCompactINR(advOut) }}</b> advances out</span></button>
            <button class="trem" @click="$emit('go', 'da')"><Calculator :size="13" /><span><b class="trv-mono">{{ fmtCompactINR(daPay) }}</b> DA payable</span></button>
            <button class="trem" @click="$emit('go', 'settlement')"><Hourglass :size="13" /><span><b>{{ settlePending }}</b> to settle</span></button>
          </div>
        </Motion>
      </div>
    </div>

    <!-- ════════ DISTRIBUTIONS ════════ -->
    <div class="tri-grid">
      <!-- status mix -->
      <Motion as="article" class="panel"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
        <header class="panel-head"><Activity :size="14" /><h3>Status mix</h3></header>
        <div class="statmix">
          <button v-for="st in byStatusNonZero" :key="st.status" class="statmix-seg"
            :style="{ flexGrow: Math.max(1, st.count), '--c': statusMeta(st.status).hex }"
            :title="`${statusMeta(st.status).label}: ${st.count}`"
            @click="$emit('go', { tab: 'requests', filter: { status: st.status } })" />
          <span v-if="!byStatusNonZero.length" class="statmix-empty" />
        </div>
        <div class="statmix-legend">
          <button v-for="st in byStatusNonZero" :key="st.status + 'l'" class="legend-item"
            @click="$emit('go', { tab: 'requests', filter: { status: st.status } })">
            <span class="dot" :style="{ background: statusMeta(st.status).hex }" />
            {{ statusMeta(st.status).label }} <b>{{ st.count }}</b>
          </button>
          <span v-if="!byStatusNonZero.length" class="muted">No requests yet.</span>
        </div>
      </Motion>

      <!-- type distribution -->
      <Motion as="article" class="panel"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.05 }">
        <header class="panel-head"><PieChart :size="14" /><h3>Type distribution</h3></header>
        <div v-if="byType.length" class="bars">
          <button v-for="(t, i) in byType" :key="t.travel_type" class="bar-row" @click="$emit('go', { tab: 'requests', filter: { travel_type: t.travel_type } })">
            <span class="bar-label">{{ t.travel_type }}</span>
            <span class="bar-track"><i class="bar-fill" :class="{ drawn }" :style="{ width: (drawn ? pct(t.count, maxType) : 0) + '%', transitionDelay: (0.1 + i * 0.06) + 's' }" /></span>
            <span class="bar-val trv-mono">{{ t.count }}</span>
          </button>
        </div>
        <p v-else class="muted">No travel recorded yet.</p>
      </Motion>

      <!-- top routes -->
      <Motion as="article" class="panel"
        :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.1 }">
        <header class="panel-head"><Navigation :size="14" /><h3>Top routes</h3></header>
        <div v-if="routes.length" class="routes">
          <button v-for="(r, i) in routes" :key="r.route" class="route" :style="{ '--rd': (0.08 * i) + 's' }"
            @click="$emit('go', { tab: 'requests', filter: { q: r.dest } })">
            <span class="route-pins"><span class="rp o" /><span class="rp-line"><Plane :size="10" /></span><span class="rp d" /></span>
            <span class="route-txt">{{ r.route }}</span>
            <span class="route-count trv-mono">{{ r.count }}</span>
          </button>
        </div>
        <p v-else class="muted">No routes flown yet.</p>
      </Motion>
    </div>

    <!-- ════════ DEPARTMENT SPEND ════════ -->
    <Motion v-if="byDept.length" as="article" class="panel"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <header class="panel-head"><Building2 :size="14" /><h3>Department-wise spend</h3></header>
      <div class="bars wide">
        <button v-for="(d, i) in byDept" :key="d.department_id || d.department_name" class="bar-row"
          @click="$emit('go', { tab: 'requests', filter: { department_id: d.department_id } })">
          <span class="bar-label lg">{{ d.department_name || '—' }}</span>
          <span class="bar-track"><i class="bar-fill ember" :class="{ drawn }" :style="{ width: (drawn ? pct(d.amount, maxDept) : 0) + '%', transitionDelay: (0.1 + i * 0.06) + 's' }" /></span>
          <span class="bar-val trv-mono">{{ fmtCompactINR(d.amount) }}</span>
        </button>
      </div>
    </Motion>

    <!-- ════════ MODULE LAUNCHPAD ════════ -->
    <section class="launch">
      <header class="launch-head"><Rocket :size="14" /> <span>Flight operations</span></header>
      <div class="launch-grid">
        <Motion v-for="(m, i) in modules" :key="m.key" as="button" type="button" class="launch-tile"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.02 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', m.key)">
          <span class="lt-ic"><component :is="m.icon" :size="17" /></span>
          <span>{{ m.label }}</span>
        </Motion>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Radio, Plane, ArrowRight, ArrowUpRight, ArrowDownLeft, RefreshCw, ShieldCheck, PieChart, Activity,
  Building2, Rocket, PlaneTakeoff, Ticket, Calculator, Scale, Coins, FileBadge, Tags, CalendarDays,
  FileBarChart2, History, Wallet, Hourglass, BadgeCheck, Banknote, Navigation, TrendingUp, TrendingDown,
} from 'lucide-vue-next'
import DashPipeline from '../components/DashPipeline.vue'
import DashSparkCard from '../components/DashSparkCard.vue'
import DashTrendChart from '../components/DashTrendChart.vue'
import DashDepartures from '../components/DashDepartures.vue'
import TrvCountUp from '../components/TrvCountUp.vue'
import { fmtCompactINR, statusMeta, fetchRequests } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: null }, loading: Boolean })
const emit = defineEmits(['go', 'refresh'])

const s = computed(() => props.stats || {})
const onRefresh = () => { emit('refresh'); loadUpcoming() }

/* ── live clock + greeting ── */
const now = ref(new Date())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
const clock = computed(() => now.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
const greeting = computed(() => {
  const h = now.value.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'
})

/* ── draw-on choreography ── */
const drawn = ref(false)
onMounted(() => {
  if (prefersReduced()) { drawn.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
})

/* ── upcoming departures board (live tour records) ── */
const upcoming = ref([])
const loadingUpcoming = ref(false)
const DEP_RANK = { IN_PROGRESS: 0, APPROVED: 1, PENDING_APPROVAL: 2 }
const depDaysTo = (d) => {
  if (!d) return 9e9
  return Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
}
const loadUpcoming = async () => {
  loadingUpcoming.value = true
  try {
    const d = await fetchRequests({ limit: 40 })
    const items = d.items || []
    upcoming.value = items
      .filter(r => DEP_RANK[r.status] != null && !(r.status === 'APPROVED' && depDaysTo(r.departure_date) < -1))
      .sort((a, b) => (DEP_RANK[a.status] - DEP_RANK[b.status]) || (depDaysTo(a.departure_date) - depDaysTo(b.departure_date)))
      .slice(0, 6)
  } catch { upcoming.value = [] }
  finally { loadingUpcoming.value = false }
}
onMounted(loadUpcoming)

/* ── monthly trend series (previously unused) ── */
const monthly = computed(() => s.value.monthly_trend || [])
const countSeries = computed(() => monthly.value.map(m => Number(m.count) || 0))
const estSeries = computed(() => monthly.value.map(m => Number(m.estimated) || 0))
const settledSeries = computed(() => monthly.value.map(m => Number(m.settled) || 0))
const trendOf = (arr) => {
  if (arr.length < 2) return null
  const last = arr[arr.length - 1], prev = arr[arr.length - 2]
  if (prev > 0) return Math.round(((last - prev) / prev) * 100)
  return last > 0 ? 100 : null
}

/* ── hero stats ── */
const heroStats = computed(() => [
  { key: 'total', label: 'Total requests', value: Number(s.value.total_requests) || 0, icon: Plane, go: 'requests' },
  { key: 'done', label: 'Completed tours', value: Number(s.value.completed_tours) || 0, icon: BadgeCheck, go: { tab: 'requests', filter: { status: 'COMPLETED' } } },
  { key: 'avg', label: 'Avg approval', value: Number(s.value.avg_approval_days) || 0, suffix: 'd', icon: Hourglass, go: 'approvals' },
])

/* ── spark cards ── */
const sparkCards = computed(() => [
  { key: 'active', label: 'Active tours', sub: 'in flight', value: Number(s.value.active_tours) || 0, icon: PlaneTakeoff, accent: 'var(--trv-st-progress)', accentHex: '#fb923c', series: countSeries.value, trend: trendOf(countSeries.value), go: { tab: 'requests', filter: { status: 'IN_PROGRESS' } } },
  { key: 'pending', label: 'Pending approvals', sub: 'awaiting', value: Number(s.value.pending_approvals) || 0, icon: Hourglass, accent: 'var(--trv-st-pending)', accentHex: '#fbbf24', series: countSeries.value, trend: null, go: 'approvals' },
  { key: 'est', label: 'Estimated cost', sub: 'approved budget', value: Number(s.value.total_travel_cost) || 0, format: fmtCompactINR, icon: Wallet, accent: 'var(--trv-amber-strong)', accentHex: '#f59e0b', series: estSeries.value, trend: trendOf(estSeries.value), go: 'reports' },
  { key: 'actual', label: 'Actual spend', sub: 'booked + DA + reimbursed', value: Number(s.value.total_actual_cost) || 0, format: fmtCompactINR, icon: Banknote, accent: 'var(--trv-st-approved)', accentHex: '#34d399', series: settledSeries.value, trend: trendOf(settledSeries.value), go: 'reports' },
])

/* ── pipeline ── */
const byStatus = computed(() => s.value.by_status || [])
const byStatusNonZero = computed(() => byStatus.value.filter(x => Number(x.count) > 0))

/* ── budget ── */
const est = computed(() => Number(s.value.total_travel_cost) || 0)
const act = computed(() => Number(s.value.total_actual_cost) || 0)
const booked = computed(() => Number(s.value.total_booked_cost) || 0)
const variance = computed(() => act.value - est.value)
const overBudget = computed(() => variance.value > 0)
const util = computed(() => est.value > 0 ? Math.round((act.value / est.value) * 100) : 0)
const RING_C = 2 * Math.PI * 50
const utilDash = computed(() => Math.min(100, util.value) / 100 * RING_C)

/* ── treasury ── */
const split = computed(() => s.value.settlement_split || {})
const payable = computed(() => Number(split.value.payable) || 0)
const recoverable = computed(() => Number(split.value.recoverable) || 0)
const treMax = computed(() => Math.max(payable.value, recoverable.value, 1))
const payPct = computed(() => Math.round(payable.value / treMax.value * 100))
const recPct = computed(() => Math.round(recoverable.value / treMax.value * 100))
const advOut = computed(() => Number(s.value.advances_outstanding) || 0)
const daPay = computed(() => Number(s.value.da_payable) || 0)
const settlePending = computed(() => Number(s.value.settlements_pending) || 0)

/* ── distributions ── */
const byType = computed(() => (s.value.by_type || []).filter(t => t.count > 0).slice(0, 7))
const maxType = computed(() => Math.max(1, ...byType.value.map(t => t.count)))
const byDept = computed(() => (s.value.by_department || []).slice(0, 6))
const maxDept = computed(() => Math.max(1, ...byDept.value.map(d => Number(d.amount) || 0)))
const routes = computed(() => (s.value.top_routes || []).slice(0, 6).map(r => ({
  ...r, dest: String(r.route || '').split('→').pop()?.trim() || r.route,
})))
const pct = (v, max) => Math.round((Number(v) || 0) / max * 100)

const modules = [
  { key: 'requests', label: 'Requests', icon: Plane }, { key: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { key: 'booking', label: 'Booking', icon: Ticket }, { key: 'da', label: 'DA', icon: Calculator },
  { key: 'settlement', label: 'Settlement', icon: Scale }, { key: 'advances', label: 'Advances', icon: Coins },
  { key: 'policies', label: 'Policies', icon: FileBadge }, { key: 'categories', label: 'Categories', icon: Tags },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays }, { key: 'reports', label: 'Reports', icon: FileBarChart2 },
  { key: 'audit-logs', label: 'Audit logs', icon: History },
]
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 16px; }

/* ── hero ── */
.hero { position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; padding: 26px 30px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--trv-amber) 7%, var(--trv-surface-elevated)), var(--trv-panel));
  border: 1px solid var(--trv-border-strong); box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), var(--trv-shadow); }
.hero-aura { position: absolute; inset: -40% 28% 30% -12%; pointer-events: none; z-index: 0;
  background: radial-gradient(58% 78% at 22% 4%, rgba(251,191,36,0.18), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.hero-grid-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px);
  background-size: 44px 44px; -webkit-mask-image: radial-gradient(90% 90% at 80% 10%, #000, transparent 72%); mask-image: radial-gradient(90% 90% at 80% 10%, #000, transparent 72%); }
.hero-runway { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--trv-grad-runway); background-size: 200% 100%; animation: trv-runway-flow 4s linear infinite; }

.hero-row { position: relative; z-index: 1; display: grid; grid-template-columns: 1.4fr auto; gap: 28px; align-items: center; }
.hero-lead { min-width: 0; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trv-amber);
  padding: 5px 11px; border-radius: 999px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.hero-clock { display: inline-flex; align-items: center; gap: 5px; letter-spacing: 0.06em; color: var(--trv-text-secondary); padding-left: 8px; border-left: 1px solid var(--trv-amber-border); }
.clock-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--trv-st-approved); box-shadow: 0 0 7px var(--trv-st-approved); animation: trv-beacon 1.8s ease-in-out infinite; }
.hero-title { font-size: clamp(26px, 3.8vw, 40px); font-weight: 850; margin: 13px 0 6px; line-height: 1.04; color: var(--trv-text); }
.hero-title .grad { background: var(--trv-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero-sub { font-size: 14px; color: var(--trv-text-secondary); margin: 0 0 18px; max-width: 470px; }
.hero-cta { display: flex; gap: 10px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.spin { animation: dash-spin 0.9s linear infinite; }
@keyframes dash-spin { to { transform: rotate(360deg); } }

.hero-stats { display: flex; gap: 10px; }
.hstat { display: flex; flex-direction: column; gap: 3px; padding: 14px 16px; border-radius: 15px; cursor: pointer; text-align: left; min-width: 96px;
  background: var(--trv-panel); border: 1px solid var(--trv-border); transition: transform 0.25s var(--trv-spring), border-color 0.25s;
  animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: calc(0.3s + var(--i) * 0.08s); }
.hstat:hover { transform: translateY(-3px); border-color: var(--trv-amber-border); }
.hstat-ic { color: var(--trv-amber); }
.hstat-val { font-size: 24px; font-weight: 850; color: var(--trv-text); line-height: 1; margin-top: 6px; }
.hstat-val i { font-size: 14px; font-style: normal; color: var(--trv-text-muted); margin-left: 1px; }
.hstat-lab { font-size: 10.5px; color: var(--trv-text-muted); }

/* ── spark row ── */
.spark-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

/* ── mid grid ── */
.mid-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 14px; align-items: stretch; }
.mid-left { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.mid-right { display: flex; flex-direction: column; gap: 14px; }

.panel { padding: 18px; border-radius: 18px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.panel-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--trv-amber); }
.panel-head h3 { font-size: 13.5px; font-weight: 800; color: var(--trv-text); margin: 0; }
.muted { font-size: 12.5px; color: var(--trv-text-dim); }

/* budget gauge */
.bg-wrap { display: flex; align-items: center; gap: 18px; }
.bg-ring { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.bg-ring svg { width: 120px; height: 120px; transform: rotate(-90deg); }
.bg-track { fill: none; stroke: color-mix(in srgb, var(--trv-text) 8%, transparent); stroke-width: 10; }
.bg-val { fill: none; stroke: var(--trv-amber); stroke-width: 10; stroke-linecap: round; transition: stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--trv-amber) 50%, transparent)); }
.bg-val.over { stroke: var(--trv-st-rejected); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--trv-st-rejected) 50%, transparent)); }
.bg-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.bg-pct { font-size: 26px; font-weight: 850; color: var(--trv-text); }
.bg-pct.over { color: var(--trv-st-rejected); }
.bg-cap { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.bg-meta { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.bgm { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11.5px; color: var(--trv-text-muted); }
.bgm-lab { display: inline-flex; align-items: center; gap: 6px; }
.bgm b { color: var(--trv-text); font-size: 12.5px; }
.bgm-lab .d { width: 8px; height: 8px; border-radius: 2px; }
.bgm-lab .d.est { background: var(--trv-steel); }
.bgm-lab .d.act { background: var(--trv-amber); }
.bg-chip { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; margin-top: 2px; font-size: 11px; font-weight: 750; padding: 4px 10px; border-radius: 999px; }
.bg-chip.under { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.bg-chip.over { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }

/* treasury */
.tre-flow { margin-bottom: 12px; }
.tre-track { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.tre-fill { display: block; height: 100%; transition: width 1s var(--trv-spring); }
.tre-fill.pay { background: linear-gradient(90deg, #34d399, #60d394); }
.tre-fill.rec { background: linear-gradient(90deg, #fb923c, #ea580c); }
.tre-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.tre-side { display: flex; flex-direction: column; gap: 3px; padding: 11px 13px; border-radius: 12px; cursor: pointer; text-align: left; border: 1px solid var(--trv-border); background: var(--trv-panel); transition: border-color 0.2s; }
.tre-side.pay:hover { border-color: color-mix(in srgb, var(--trv-st-approved) 45%, transparent); }
.tre-side.rec:hover { border-color: color-mix(in srgb, var(--trv-ember) 45%, transparent); }
.tre-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trv-text-muted); }
.tre-side.pay .tre-lab { color: var(--trv-st-approved); }
.tre-side.rec .tre-lab { color: var(--trv-ember); }
.tre-side b { font-size: 16px; font-weight: 850; color: var(--trv-text); }
.tre-mini { display: flex; flex-direction: column; gap: 2px; }
.trem { display: flex; align-items: center; gap: 9px; padding: 7px 6px; border-radius: 9px; border: none; background: none; cursor: pointer; color: var(--trv-text-muted); font-size: 12px; text-align: left; }
.trem:hover { background: var(--trv-amber-soft); color: var(--trv-text); }
.trem svg { color: var(--trv-amber); flex-shrink: 0; }
.trem b { color: var(--trv-text); font-weight: 800; }

/* tri grid */
.tri-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.statmix { display: flex; gap: 3px; height: 16px; border-radius: 999px; overflow: hidden; margin-bottom: 13px; }
.statmix-seg { border: none; cursor: pointer; background: var(--c); transition: filter 0.2s; }
.statmix-seg:hover { filter: brightness(1.2); }
.statmix-empty { flex: 1; background: repeating-linear-gradient(45deg, var(--trv-border) 0 6px, transparent 6px 12px); }
.statmix-legend { display: flex; flex-wrap: wrap; gap: 7px 13px; }
.legend-item { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; font-size: 11.5px; color: var(--trv-text-muted); }
.legend-item b { color: var(--trv-text); }
.dot { width: 8px; height: 8px; border-radius: 50%; }

.bars { display: flex; flex-direction: column; gap: 9px; }
.bars.wide { gap: 11px; }
.bar-row { display: grid; grid-template-columns: 92px 1fr 56px; align-items: center; gap: 10px; background: none; border: none; padding: 0; cursor: pointer; text-align: left; }
.bar-label { font-size: 12px; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-label.lg { font-size: 12.5px; }
.bar-track { height: 8px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; }
.bar-fill { display: block; height: 100%; width: 0; border-radius: 999px; background: var(--trv-grad-hero); transition: width 0.85s var(--trv-spring); }
.bar-fill.ember { background: linear-gradient(90deg, #fb923c, #ea580c); }
.bar-val { font-size: 12px; font-weight: 750; color: var(--trv-text); text-align: right; }

/* routes */
.routes { display: flex; flex-direction: column; gap: 4px; }
.route { display: flex; align-items: center; gap: 10px; padding: 8px 7px; border-radius: 10px; border: none; background: none; cursor: pointer; text-align: left;
  animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: var(--rd); }
.route:hover { background: var(--trv-amber-soft); }
.route-pins { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; }
.rp { width: 6px; height: 6px; border-radius: 50%; }
.rp.o { background: var(--trv-amber-bright); } .rp.d { background: var(--trv-ember); }
.rp-line { display: inline-flex; color: var(--trv-amber); }
.route-txt { flex: 1; font-size: 12px; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.route-count { font-size: 12px; font-weight: 800; color: var(--trv-text); padding: 1px 8px; border-radius: 999px; background: var(--trv-panel); border: 1px solid var(--trv-border); }

/* launchpad */
.launch { padding: 18px; border-radius: 18px; background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.launch-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 14px; }
.launch-head svg { color: var(--trv-amber); }
.launch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 10px; }
.launch-tile { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 16px 10px; border-radius: 14px; cursor: pointer;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-secondary); font-size: 12px; font-weight: 700; font-family: inherit; }
.launch-tile:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.lt-ic { display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }

@media (max-width: 1000px) {
  .spark-row { grid-template-columns: repeat(2, 1fr); }
  .mid-grid { grid-template-columns: 1fr; }
  .tri-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .hero-row { grid-template-columns: 1fr; }
  .hero-stats { flex-wrap: wrap; }
}
@media (max-width: 560px) { .spark-row { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .hero-aura, .hero-runway, .clock-dot, .hstat, .route, .spin { animation: none; }
  .bar-fill, .tre-fill, .bg-val { transition: none; }
}
</style>
