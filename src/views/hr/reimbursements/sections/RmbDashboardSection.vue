<template>
  <div class="rdash" ref="dashRef">
    <!-- cinematic backdrop: drifting aurora + ledger grid + scanline (parallax-reactive) -->
    <div class="rdash-atmos" aria-hidden="true">
      <span class="rd-orb o1" /><span class="rd-orb o2" /><span class="rd-orb o3" />
      <span class="rd-grid" />
      <span class="rd-scan" />
    </div>

    <!-- skeleton -->
    <div v-if="!stats" class="rdash-skel">
      <div class="sk" v-for="n in 6" :key="'k' + n" style="height:132px" />
      <div class="sk wide" style="height:236px" /><div class="sk" style="height:236px" />
      <div class="sk" style="height:200px" /><div class="sk" style="height:200px" />
    </div>

    <template v-else>
      <!-- console header -->
      <Motion as="header" class="rdash-head" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
        <div class="dh-left">
          <span class="dh-eyebrow"><ScrollText :size="12" /> Ledger · live readout</span>
          <h2>Reimbursement overview</h2>
          <span class="dh-meta rmb-mono"><span class="dh-live" />{{ clock }} · {{ rows }} claims on the tape</span>
        </div>
        <div class="dh-right">
          <span class="dh-eq" aria-hidden="true"><i v-for="nn in 5" :key="nn" :style="{ animationDelay: `${(nn * 0.12).toFixed(2)}s` }" /></span>
          <button class="dh-refresh" :class="{ spin: refreshing }" @click="onRefresh" aria-label="Refresh"><RefreshCw :size="15" /></button>
        </div>
      </Motion>

      <!-- KPI instrument deck -->
      <div class="kpi-grid">
        <RmbKpiTile v-for="(t, i) in kpiTiles" :key="t.label" v-bind="t" :index="i" @go="$emit('go', $event)" />
      </div>

      <!-- trend + category -->
      <div class="grid-2 wide-left">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">01</span><h3>Reimbursement flow</h3>
            <button class="card-link" @click="$emit('go', 'reports')">Reports <ArrowUpRight :size="13" /></button></header>
          <RmbSpendTrend :points="trendPoints" />
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">02</span><h3>Spend by category</h3>
            <button class="card-link" @click="$emit('go', 'categories')">Categories <ArrowUpRight :size="13" /></button></header>
          <RmbCategoryRing :items="categoryItems" />
        </Motion>
      </div>

      <!-- status + settlement -->
      <div class="grid-2">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">03</span><h3>Pipeline by status</h3>
            <button class="card-link" @click="$emit('go', 'claims')">All claims <ArrowUpRight :size="13" /></button></header>
          <RmbStatusBars :items="statusItems" />
        </Motion>
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }">
          <span class="card-sheen" aria-hidden="true" />
          <header class="card-head"><span class="hnum">04</span><h3>Settlement split</h3>
            <button class="card-link" @click="$emit('go', 'settlement')">Settle <ArrowUpRight :size="13" /></button></header>
          <RmbSettlementSplit :payroll="splitPayroll" :direct="splitDirect" :payroll-count="s.paid_via_payroll || 0" :direct-count="s.paid_via_direct || 0" />
        </Motion>
      </div>

      <!-- quick actions dock -->
      <Motion as="section" class="card actions-card" :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
        <span class="card-sheen" aria-hidden="true" />
        <header class="card-head"><span class="hnum">05</span><h3>Jump to</h3></header>
        <div class="act-dock">
          <Motion v-for="(a, i) in actions" :key="a.go" as="button" class="act"
            :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.4, delay: 0.4 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -3 }" :whileTap="{ scale: 0.96 }"
            @click="$emit('go', a.go)">
            <span class="act-sweep" aria-hidden="true" />
            <span class="act-ic"><component :is="a.icon" :size="16" /></span>
            <b>{{ a.title }}</b>
            <span class="act-sub">{{ a.sub }}</span>
            <ArrowUpRight :size="13" class="act-arr" />
          </Motion>
        </div>
        <div v-if="(s.pending_approval || 0) > 0" class="flag warn" @click="$emit('go', 'approvals')">
          <Clock :size="13" /> {{ s.pending_approval }} claim{{ s.pending_approval > 1 ? 's are' : ' is' }} awaiting approval
        </div>
        <div v-else-if="(s.approved_unsettled || 0) > 0" class="flag go" @click="$emit('go', 'settlement')">
          <Wallet :size="13" /> {{ s.approved_unsettled }} approved claim{{ s.approved_unsettled > 1 ? 's' : '' }} ready to settle
        </div>
        <div v-else class="flag ok"><CheckCircle2 :size="13" /> All claims processed — ledger is clear</div>
      </Motion>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  ScrollText, RefreshCw, Receipt, Clock, Wallet, BadgeCheck, XCircle, Timer,
  ArrowUpRight, CheckCircle2, Inbox, Tags, Settings2, FileBarChart2, History,
} from 'lucide-vue-next'
import RmbKpiTile from '../components/RmbKpiTile.vue'
import RmbSpendTrend from '../components/RmbSpendTrend.vue'
import RmbCategoryRing from '../components/RmbCategoryRing.vue'
import RmbStatusBars from '../components/RmbStatusBars.vue'
import RmbSettlementSplit from '../components/RmbSettlementSplit.vue'
import { statusMeta } from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ stats: { type: Object, default: null } })
const emit = defineEmits(['go', 'refresh'])

const dashRef = ref(null)
usePointerSpotlight(dashRef)

const s = computed(() => props.stats || {})
const rows = computed(() => Number(s.value.total_claims) || 0)

const refreshing = ref(false)
const onRefresh = () => { refreshing.value = true; emit('refresh'); setTimeout(() => { refreshing.value = false }, 850) }

// live console clock
const now = ref(new Date())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const clock = computed(() => {
  const d = now.value
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m}:${sec} ${ap}`
})

const kpiTiles = computed(() => {
  const x = s.value
  return [
    { label: 'Total claims', value: x.total_claims || 0, icon: Receipt, color: 'var(--rmb-amber)' },
    { label: 'Pending approval', value: x.pending_approval || 0, icon: Clock, color: 'var(--rmb-st-pending)', tone: 'warn', go: 'approvals' },
    { label: 'Approved · to settle', value: x.approved_unsettled || 0, icon: Wallet, color: 'var(--rmb-st-approved)', go: 'settlement' },
    { label: 'Settled (FY)', value: x.settled_amount || 0, icon: BadgeCheck, color: 'var(--rmb-st-settled)', money: true, moneyTone: 'positive' },
    { label: 'Rejected', value: x.rejected || 0, icon: XCircle, color: 'var(--rmb-st-rejected)', tone: 'alert' },
    { label: 'Avg cycle', value: x.avg_processing_days || 0, icon: Timer, color: 'var(--rmb-ember)', decimals: 1, suffix: 'd' },
  ]
})

const monthLabel = (ym) => {
  if (!ym) return ''
  const [y, m] = String(ym).split('-').map(Number)
  if (!y || !m) return String(ym).slice(5)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' })
}
const trendPoints = computed(() => (s.value.monthly_trend || []).map(r => ({
  label: monthLabel(r.month), claimed: Number(r.claimed) || 0, settled: Number(r.settled) || 0,
})))

const categoryItems = computed(() => (s.value.by_category || []).map(r => ({
  key: r.category_id, name: r.category_name, color: r.color_hex || '#fbbf24',
  count: Number(r.count) || 0, amount: Number(r.amount) || 0,
})))

const statusItems = computed(() => (s.value.by_status || []).map(r => ({
  key: r.status, label: statusMeta(r.status).label, value: Number(r.count) || 0, color: statusMeta(r.status).hex,
})))

const splitPayroll = computed(() => Number(s.value.settlement_split?.payroll) || 0)
const splitDirect = computed(() => Number(s.value.settlement_split?.direct) || 0)

const actions = [
  { go: 'approvals', icon: Inbox, title: 'Approvals', sub: 'Review queue' },
  { go: 'settlement', icon: Wallet, title: 'Settlement', sub: 'Pay out' },
  { go: 'categories', icon: Tags, title: 'Categories', sub: 'Spend buckets' },
  { go: 'policies', icon: Settings2, title: 'Policies', sub: 'Limits & rules' },
  { go: 'reports', icon: FileBarChart2, title: 'Reports', sub: 'Export ledger' },
  { go: 'audit-logs', icon: History, title: 'Audit log', sub: 'Full trail' },
]
</script>

<style scoped>
.rdash { position: relative; display: flex; flex-direction: column; gap: 16px; }

/* ── cinematic backdrop ── */
.rdash-atmos { position: absolute; inset: -10px; z-index: 0; overflow: hidden; border-radius: 22px; pointer-events: none; }
.rd-orb { position: absolute; border-radius: 50%; filter: blur(62px); }
.rd-orb.o1 { width: 420px; height: 420px; top: -130px; left: -60px; opacity: 0.2;
  background: radial-gradient(circle, rgba(251,191,36,0.9), transparent 68%); animation: rd-drift1 23s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * -32px), calc((var(--my,0.5) - 0.5) * -20px), 0); }
.rd-orb.o2 { width: 380px; height: 380px; top: 32%; right: -80px; opacity: 0.16;
  background: radial-gradient(circle, rgba(45,212,191,0.85), transparent 70%); animation: rd-drift2 28s ease-in-out infinite;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 28px), calc((var(--my,0.5) - 0.5) * 22px), 0); }
.rd-orb.o3 { width: 340px; height: 340px; bottom: -110px; left: 36%; opacity: 0.13;
  background: radial-gradient(circle, rgba(251,146,60,0.8), transparent 70%); animation: rd-drift1 31s ease-in-out infinite reverse;
  transform: translate3d(calc((var(--mx,0.5) - 0.5) * 16px), calc((var(--my,0.5) - 0.5) * -12px), 0); }
.rd-grid { position: absolute; inset: 0; opacity: 0.4;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; -webkit-mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); mask: radial-gradient(140% 110% at 50% 0%, #000, transparent 72%); }
.rd-scan { position: absolute; left: 0; right: 0; top: 0; height: 30%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.04), transparent); }
.rdash > :not(.rdash-atmos) { position: relative; z-index: 1; }

/* ── skeleton ── */
.rdash-skel { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; }
.rdash-skel .sk { border-radius: 16px; background: linear-gradient(100deg, var(--rmb-surface), var(--rmb-surface-elevated), var(--rmb-surface)); background-size: 200% 100%; animation: rd-shimmer 1.4s linear infinite; }
.rdash-skel .wide { grid-column: span 2; }
@keyframes rd-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── header ── */
.rdash-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--rmb-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--rmb-st-returned); }
.rdash-head h2 { margin: 3px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--rmb-text); }
.dh-meta { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; color: var(--rmb-text-muted); }
.dh-live { width: 6px; height: 6px; border-radius: 50%; background: var(--rmb-st-approved); animation: rmb-pulse-dot 2.2s ease-out infinite; }
.dh-right { display: flex; align-items: center; gap: 12px; }
.dh-eq { display: inline-flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.dh-eq i { display: block; width: 2.5px; height: 100%; border-radius: 2px; transform-origin: bottom;
  background: linear-gradient(180deg, var(--rmb-amber-bright), var(--rmb-amber-strong)); animation: dh-eq 1.1s ease-in-out infinite; }
.dh-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: 0.2s; }
.dh-refresh:hover { color: var(--rmb-amber); border-color: var(--rmb-border-strong); transform: rotate(15deg); }
.dh-refresh.spin :deep(svg) { animation: dh-spin 0.85s var(--rmb-ease); }

/* ── grids ── */
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 13px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.grid-2.wide-left { grid-template-columns: 1.45fr 1fr; }
@media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .grid-2, .grid-2.wide-left { grid-template-columns: 1fr; } }

/* ── cards ── */
.card { position: relative; background: var(--rmb-surf-card); border: 1px solid var(--rmb-border-soft); border-radius: 18px; padding: 16px 18px; overflow: hidden;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s; box-shadow: var(--rmb-card-shadow); }
.card:hover { border-color: var(--rmb-border-strong); transform: translateY(-2px); box-shadow: var(--rmb-card-shadow-hover); }
.card-sheen { position: absolute; inset: 0; pointer-events: none; opacity: 0; border-radius: inherit; transition: opacity 0.3s;
  background: linear-gradient(115deg, transparent 44%, color-mix(in srgb, var(--rmb-amber-bright) 12%, transparent) 50%, transparent 56%); background-size: 240% 100%; }
.card:hover .card-sheen { opacity: 1; animation: card-sheen 1.1s var(--rmb-ease) 1; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--rmb-mono); font-size: 11px; color: var(--rmb-amber); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--rmb-text); flex: 1; }
.card-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; cursor: pointer; font-size: 11.5px; color: var(--rmb-amber); font-weight: 600; transition: gap 0.2s; }
.card-link:hover { gap: 7px; }

/* ── quick actions dock ── */
.actions-card { display: flex; flex-direction: column; }
.act-dock { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
@media (max-width: 1240px) { .act-dock { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 640px) { .act-dock { grid-template-columns: repeat(2, 1fr); } }
.act { position: relative; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 13px 12px; border-radius: 13px; cursor: pointer;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); overflow: hidden; text-align: left; }
.act:hover { border-color: var(--rmb-border-strong); }
.act-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--rmb-amber) 18%, transparent), transparent 60%); }
.act:hover .act-sweep { opacity: 1; }
.act-ic { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; margin-bottom: 4px; position: relative; z-index: 1;
  background: rgba(251,191,36,0.12); color: var(--rmb-amber); transition: transform 0.3s var(--rmb-spring); }
.act:hover .act-ic { transform: scale(1.1) rotate(-4deg); }
.act b { font-size: 13px; color: var(--rmb-text); position: relative; z-index: 1; }
.act-sub { font-size: 10.5px; color: var(--rmb-text-muted); position: relative; z-index: 1; }
.act-arr { position: absolute; top: 12px; right: 12px; opacity: 0; color: var(--rmb-amber); transition: opacity 0.25s, transform 0.25s; }
.act:hover .act-arr { opacity: 1; transform: translate(2px, -2px); }

.flag { display: inline-flex; align-items: center; gap: 7px; margin-top: 14px; padding: 10px 13px; border-radius: 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: transform 0.2s; align-self: flex-start; }
.flag:not(.ok):hover { transform: translateX(2px); }
.flag.warn { color: var(--rmb-st-pending); background: var(--rmb-st-pending-soft); }
.flag.go { color: var(--rmb-st-approved); background: var(--rmb-st-approved-soft); }
.flag.ok { color: var(--rmb-st-settled); background: var(--rmb-st-settled-soft); cursor: default; }

/* ── keyframes ── */
@keyframes rd-drift1 { 0%, 100% { translate: 0 0; } 50% { translate: 48px 38px; } }
@keyframes rd-drift2 { 0%, 100% { translate: 0 0; } 50% { translate: -42px -30px; } }
@keyframes dh-eq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
@keyframes dh-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes card-sheen { 0% { background-position: 130% 0; } 100% { background-position: -50% 0; } }

:root[data-theme="light"] .rd-orb.o1 { opacity: 0.14; }
:root[data-theme="light"] .rd-orb.o2 { opacity: 0.11; }
:root[data-theme="light"] .rd-orb.o3 { opacity: 0.1; }
:root[data-theme="light"] .card-sheen { background: linear-gradient(115deg, transparent 44%, rgba(255,255,255,0.55) 50%, transparent 56%); }

@media (prefers-reduced-motion: reduce) {
  .rd-orb, .dh-eq i, .dh-live { animation: none !important; }
  .rd-orb { transform: none !important; }
  .card:hover .card-sheen { animation: none; }
}
</style>
