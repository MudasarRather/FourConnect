<template>
  <div class="dash">
    <!-- loading skeleton -->
    <div v-if="loading && !stats" class="dash-skel">
      <div class="pay-skel" style="height:120px" /><div class="pay-skel" style="height:120px" />
      <div class="pay-skel" style="height:120px" /><div class="pay-skel" style="height:120px" />
      <div class="pay-skel sk-wide" style="height:300px" /><div class="pay-skel" style="height:300px" />
    </div>

    <template v-else>
      <!-- analytics header -->
      <Motion as="header" class="dash-head" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
        <div class="dh-title">
          <span class="dh-eyebrow"><Activity :size="13" /> Payroll analytics</span>
          <h2>{{ stats?.period_label || '—' }}</h2>
        </div>
        <div class="dh-tools">
          <span class="dh-fy">FY {{ stats?.fiscal_year || '—' }}</span>
          <button class="dh-refresh" :class="{ spin: refreshing }" @click="onRefresh" aria-label="Refresh">
            <RefreshCw :size="15" />
          </button>
        </div>
      </Motion>

      <!-- ── KPI strip ── -->
      <div class="kpi-row">
        <Motion v-for="(k, i) in kpis" :key="k.key" as="article" class="kpi" :class="{ accent: k.key==='net' }"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: i*0.07, ease: [0.16,1,0.3,1] }" :whileHover="{ y: -4 }">
          <div class="kpi-top">
            <span class="kpi-ic" :style="{ color: k.color, background: `color-mix(in srgb, ${k.color} 14%, transparent)` }">
              <component :is="k.icon" :size="16" />
            </span>
            <span class="kpi-lbl">{{ k.label }}</span>
            <span v-if="k.delta" class="kpi-delta" :class="k.delta.up ? 'up' : 'down'">
              <component :is="k.delta.up ? TrendingUp : TrendingDown" :size="12" />{{ Math.abs(k.delta.pct).toFixed(1) }}%
            </span>
          </div>
          <PayMoneyValue class="kpi-val" :value="k.value" :tone="k.tone" :duration="950" short />
          <div class="kpi-foot">
            <PaySparkline v-if="k.series && k.series.length > 1" :values="k.series" :color="resolveColor(k.color)" :delay="i*70" />
            <div v-else class="kpi-share">
              <span class="ks-track"><span class="ks-fill" :style="{ width: (k.share||0)+'%', background: k.color }" /></span>
              <small>{{ (k.share||0).toFixed(0) }}% of cost</small>
            </div>
          </div>
        </Motion>
      </div>

      <!-- ── trend + composition ── -->
      <div class="grid-2">
        <Motion as="section" class="card trend-card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.1, ease: [0.16,1,0.3,1] }">
          <header class="card-head">
            <span class="hnum">01</span><h3>Payroll cost trend</h3>
            <div class="legend">
              <span class="lg"><i class="dot gross" />Gross</span>
              <span class="lg"><i class="dot net" />Net</span>
              <span class="lg"><i class="dot ded" />Deductions</span>
            </div>
          </header>
          <PayTrendChart v-if="trend.length > 1" :rows="stats.cost_trend" />
          <p v-else class="empty-note">Not enough runs yet — release a couple of monthly batches to chart the trend.</p>
          <div v-if="trend.length" class="trend-stats">
            <div><span>Runs charted</span><b>{{ trend.length }}</b></div>
            <div><span>Avg gross</span><b>{{ inrShort(avgGross) }}</b></div>
            <div><span>Peak</span><b>{{ inrShort(peak.value) }} <em>· {{ peak.label }}</em></b></div>
          </div>
        </Motion>

        <Motion as="section" class="card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.18, ease: [0.16,1,0.3,1] }">
          <header class="card-head"><span class="hnum">02</span><h3>Net composition</h3></header>
          <PayGauge :segments="compSegs" center-cap="Net" :center-pct="netPct" />
          <div class="comp-bar">
            <span v-for="s in compSegs" :key="s.label" class="cb-seg" :style="{ flexGrow: Number(s.value)||0.0001, background: s.color }"
              :title="`${s.label}: ${inrShort(s.value)}`" />
          </div>
        </Motion>
      </div>

      <!-- ── ledger + pipeline + setup ── -->
      <div class="grid-3">
        <Motion as="section" class="card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.24 }">
          <header class="card-head"><span class="hnum">03</span><h3>Cost ledger</h3><span class="hmeta">{{ stats?.period_label }}</span></header>
          <ul class="ledger">
            <li v-for="(r, i) in ledger" :key="r.key" :class="{ emphatic: r.key==='net' }">
              <div class="lg-row"><span class="lg-name">{{ r.name }}</span>
                <PayMoneyValue class="lg-amt" :value="r.value" :tone="r.tone" /></div>
              <span class="lg-bar"><span class="lg-bfill" :style="{ width: r.pct+'%', background: r.color, transitionDelay: (0.3 + i*0.08)+'s' }" /></span>
            </li>
          </ul>
        </Motion>

        <Motion as="section" class="card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.3 }">
          <header class="card-head"><span class="hnum">04</span><h3>Batch pipeline</h3>
            <span class="hmeta">{{ totalBatches }} total</span></header>
          <div v-if="totalBatches" class="pipe-bar">
            <span v-for="(p, i) in pipeSegs" :key="p.key" v-show="p.count > 0" class="pipe-seg"
              :style="{ flexGrow: p.count, background: p.color, transitionDelay: (0.34 + i*0.06)+'s' }" :title="`${p.label}: ${p.count}`" />
          </div>
          <p v-else class="empty-note sm">No batches created yet.</p>
          <ul class="pipe-legend">
            <li v-for="p in pipeSegs" :key="p.key" :class="{ zero: !p.count }">
              <span class="pl-dot" :style="{ background: p.color }" /><span class="pl-name">{{ p.label }}</span>
              <b>{{ p.count }}</b>
            </li>
          </ul>
        </Motion>

        <Motion as="section" class="card setup-card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.36 }">
          <header class="card-head"><span class="hnum">05</span><h3>Configuration</h3></header>
          <div class="setup-tiles">
            <button class="st-tile" @click="$emit('go','structures')">
              <Layers :size="16" /><b>{{ stats?.structures_count || 0 }}</b><span>Structures</span>
            </button>
            <button class="st-tile" @click="$emit('go','components')">
              <ListTree :size="16" /><b>{{ stats?.components_count || 0 }}</b><span>Components</span>
            </button>
            <button class="st-tile" @click="$emit('go','compensation')">
              <Wallet :size="16" /><b>{{ stats?.active_compensations || 0 }}</b><span>Active comp</span>
            </button>
            <button class="st-tile" @click="$emit('go','payslips')">
              <ReceiptText :size="16" /><b>{{ stats?.employees_on_payroll || 0 }}</b><span>On roll</span>
            </button>
          </div>
          <Motion as="button" class="run-cta" @click="$emit('go','processing')"
            :whileHover="{ y: -2, scale: 1.01 }" :whileTap="{ scale: 0.98 }">
            <Cpu :size="16" /><div><b>Run payroll</b><span>Start a monthly batch</span></div><ArrowUpRight :size="16" class="cta-arr" />
          </Motion>
          <div v-if="(stats?.pending_approvals||0) > 0" class="pending-flag" @click="$emit('go','approval')">
            <ShieldCheck :size="13" /> {{ stats.pending_approvals }} run{{ stats.pending_approvals>1?'s':'' }} awaiting approval
          </div>
        </Motion>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import {
  Activity, RefreshCw, TrendingUp, TrendingDown, Layers, ListTree, Wallet, Cpu,
  Coins, ReceiptText, ShieldCheck, Banknote, ArrowUpRight,
} from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PaySparkline from '../components/PaySparkline.vue'
import PayTrendChart from '../components/PayTrendChart.vue'
import PayGauge from '../components/PayGauge.vue'
import { statusMeta, inrShort, BATCH_PIPELINE } from '@/composables/usePayroll'

const props = defineProps({ stats: { type: Object, default: null }, loading: Boolean })
const emit = defineEmits(['go', 'refresh'])

const refreshing = ref(false)
const onRefresh = () => {
  refreshing.value = true
  emit('refresh')
  setTimeout(() => { refreshing.value = false }, 900)
}

const num = (v) => Number(v) || 0
const trend = computed(() => (props.stats?.cost_trend || []).map(t => ({
  label: t.label, gross: num(t.gross), net: num(t.net), deductions: num(t.deductions),
})))

const deltaOf = (arr) => {
  if (!arr || arr.length < 2) return null
  const last = arr[arr.length - 1], prev = arr[arr.length - 2]
  if (!prev) return null
  return { pct: ((last - prev) / prev) * 100, up: last >= prev }
}
const totalCost = computed(() => num(props.stats?.current_net) + num(props.stats?.current_deductions) + num(props.stats?.current_employer_cost) || 1)
const shareOfCost = (v) => Math.round((num(v) / totalCost.value) * 100)

const kpis = computed(() => {
  const s = props.stats || {}
  return [
    { key: 'net', label: 'Net payable', value: s.current_net || 0, color: 'var(--pay-net)', icon: Banknote, tone: 'net', series: trend.value.map(t => t.net), delta: deltaOf(trend.value.map(t => t.net)) },
    { key: 'gross', label: 'Gross earnings', value: s.current_gross || 0, color: 'var(--pay-treasury)', icon: Coins, series: trend.value.map(t => t.gross), delta: deltaOf(trend.value.map(t => t.gross)) },
    { key: 'ded', label: 'Deductions', value: s.current_deductions || 0, color: 'var(--pay-deduction)', icon: ReceiptText, tone: 'deduction', series: trend.value.map(t => t.deductions), delta: deltaOf(trend.value.map(t => t.deductions)) },
    { key: 'empr', label: 'Employer cost', value: s.current_employer_cost || 0, color: '#d9a441', icon: ShieldCheck, series: null, share: shareOfCost(s.current_employer_cost) },
  ]
})
const resolveColor = (c) => ({
  'var(--pay-net)': '#34d399', 'var(--pay-treasury)': '#d9a441', 'var(--pay-deduction)': '#e06a2c',
}[c] || c)

const compSegs = computed(() => {
  const s = props.stats || {}
  return [
    { label: 'Net pay', value: num(s.current_net), color: 'var(--pay-net)' },
    { label: 'Deductions', value: num(s.current_deductions), color: 'var(--pay-deduction)' },
    { label: 'Employer', value: num(s.current_employer_cost), color: 'var(--pay-treasury)' },
  ]
})
const netPct = computed(() => Math.round((num(props.stats?.current_net) / totalCost.value) * 100))

const avgGross = computed(() => trend.value.length ? trend.value.reduce((a, t) => a + t.gross, 0) / trend.value.length : 0)
const peak = computed(() => trend.value.reduce((m, t) => t.gross > m.value ? { value: t.gross, label: t.label } : m, { value: 0, label: '—' }))

const ledger = computed(() => {
  const s = props.stats || {}
  const base = Math.max(num(s.current_gross), num(s.current_net), num(s.current_deductions), num(s.current_employer_cost), 1)
  const mk = (key, name, value, color, tone) => ({ key, name, value, color, tone, pct: Math.round((num(value) / base) * 100) })
  return [
    mk('gross', 'Gross earnings', s.current_gross, 'var(--pay-treasury)'),
    mk('ded', 'Deductions', s.current_deductions, 'var(--pay-deduction)', 'deduction'),
    mk('net', 'Net payable', s.current_net, 'var(--pay-net)', 'net'),
    mk('empr', 'Employer cost', s.current_employer_cost, '#d9a441'),
  ]
})

const PIPE_COLOR = {
  DRAFT: 'var(--pay-st-draft)', GENERATED: 'var(--pay-st-generated)', VERIFIED: 'var(--pay-st-verified)',
  APPROVED: 'var(--pay-st-approved)', RELEASED: 'var(--pay-st-released)', LOCKED: 'var(--pay-st-locked)',
}
const pipeSegs = computed(() => BATCH_PIPELINE.map(st => ({
  key: st, label: statusMeta(st).label, count: num(props.stats?.batches_by_status?.[st]), color: PIPE_COLOR[st] || 'var(--pay-text-muted)',
})))
const totalBatches = computed(() => pipeSegs.value.reduce((a, p) => a + p.count, 0))
</script>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }
.dash-skel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.dash-skel .sk-wide { grid-column: span 2; }

.card { position: relative; background: var(--pay-surface); border: 1px solid var(--pay-border);
  border-radius: 20px; padding: 18px 20px; overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.hnum { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-treasury); }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--pay-text); flex: 1; }
.hmeta { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }

/* header */
.dash-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.dh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 10.5px;
  text-transform: uppercase; letter-spacing: 0.12em; color: var(--pay-treasury); }
.dh-title h2 { margin: 3px 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--pay-text); }
.dh-tools { display: flex; align-items: center; gap: 10px; }
.dh-fy { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); padding: 5px 11px; border-radius: 999px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.dh-refresh { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); transition: 0.2s; }
.dh-refresh:hover { color: var(--pay-treasury); border-color: var(--pay-border); }
.dh-refresh.spin :deep(svg) { animation: pay-dial-spin 0.9s var(--pay-ease); }

/* KPI strip */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.kpi { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 15px 16px;
  border-radius: 18px; background: var(--pay-surface); border: 1px solid var(--pay-border); overflow: hidden;
  transition: border-color 0.25s; }
.kpi::after { content: ''; position: absolute; inset: 0; background: var(--pay-grad-hero); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.kpi:hover { border-color: var(--pay-border); }
.kpi:hover::after { opacity: 0.5; }
.kpi.accent { border-color: rgba(52,211,153,0.3); background: linear-gradient(180deg, var(--pay-net-soft), var(--pay-surface)); }
.kpi-top { display: flex; align-items: center; gap: 8px; }
.kpi-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
.kpi-lbl { font-size: 11px; color: var(--pay-text-muted); text-transform: uppercase; letter-spacing: 0.04em; flex: 1; }
.kpi-delta { display: inline-flex; align-items: center; gap: 2px; font-family: var(--pay-mono); font-size: 10.5px; font-weight: 700;
  padding: 2px 6px; border-radius: 6px; }
.kpi-delta.up { color: var(--pay-net); background: var(--pay-net-soft); }
.kpi-delta.down { color: var(--pay-deduction); background: var(--pay-deduction-soft); }
.kpi-val { font-size: 25px; color: var(--pay-text); position: relative; z-index: 1; }
.kpi-foot { height: 34px; display: flex; align-items: flex-end; }
.kpi-share { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.ks-track { height: 6px; border-radius: 999px; background: var(--pay-surface-2); overflow: hidden; }
.ks-fill { display: block; height: 100%; border-radius: 999px; transition: width 0.9s var(--pay-ease) 0.3s; }
.kpi-share small { font-size: 9.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); }

/* grids */
.grid-2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; }
.grid-3 { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 16px; }
@media (max-width: 1100px) { .grid-3 { grid-template-columns: 1fr 1fr; } }
@media (max-width: 920px) { .kpi-row { grid-template-columns: 1fr 1fr; } .grid-2, .grid-3 { grid-template-columns: 1fr; } }

.legend { display: flex; gap: 12px; }
.legend .lg { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-2); }
.legend .dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.gross { background: var(--pay-treasury); } .dot.net { background: var(--pay-net); } .dot.ded { background: var(--pay-deduction); }
.trend-stats { display: flex; gap: 24px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--pay-border-soft); }
.trend-stats div { display: flex; flex-direction: column; gap: 3px; }
.trend-stats span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.trend-stats b { font-family: var(--pay-mono); font-size: 15px; color: var(--pay-text); font-weight: 700; }
.trend-stats em { font-style: normal; font-size: 11px; color: var(--pay-text-muted); }
.empty-note { color: var(--pay-text-muted); font-size: 13px; padding: 40px 10px; text-align: center; }
.empty-note.sm { padding: 16px 6px; font-size: 12px; }

.comp-bar { display: flex; gap: 3px; height: 9px; margin-top: 16px; border-radius: 999px; overflow: hidden; }
.cb-seg { border-radius: 3px; transition: flex-grow 0.9s var(--pay-ease); }

/* ledger */
.ledger { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.ledger li { display: flex; flex-direction: column; gap: 6px; }
.ledger li.emphatic { background: var(--pay-net-soft); margin: 0 -10px; padding: 10px; border-radius: 12px; }
.lg-row { display: flex; align-items: center; justify-content: space-between; }
.lg-name { font-size: 12.5px; color: var(--pay-text-2); }
.lg-amt { font-size: 15px; color: var(--pay-text); }
.lg-bar { height: 5px; border-radius: 999px; background: var(--pay-surface-2); overflow: hidden; }
.lg-bfill { display: block; height: 100%; width: 0; border-radius: 999px; transition: width 0.9s var(--pay-ease); }

/* pipeline */
.pipe-bar { display: flex; gap: 3px; height: 26px; border-radius: 9px; overflow: hidden; margin-bottom: 14px; background: var(--pay-surface-2); }
.pipe-seg { flex-grow: 0; min-width: 4px; border-radius: 4px; transition: flex-grow 0.9s var(--pay-ease); }
.pipe-legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 9px 14px; }
.pipe-legend li { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--pay-text-2); }
.pipe-legend li.zero { opacity: 0.4; }
.pl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pl-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pipe-legend b { font-family: var(--pay-mono); color: var(--pay-text); }

/* setup */
.setup-card { display: flex; flex-direction: column; }
.setup-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.st-tile { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 12px; border-radius: 13px; cursor: pointer;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2); transition: 0.2s; }
.st-tile:hover { border-color: var(--pay-border); transform: translateY(-2px); }
.st-tile svg { color: var(--pay-treasury); }
.st-tile b { font-family: var(--pay-mono); font-size: 19px; color: var(--pay-text); margin-top: 4px; }
.st-tile span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pay-text-muted); }
.run-cta { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 13px 16px; border-radius: 14px;
  border: none; cursor: pointer; background: var(--pay-grad-cta); color: #1a1206; box-shadow: 0 10px 26px -12px rgba(245,158,11,0.7); }
.run-cta b { display: block; font-size: 14px; } .run-cta span { font-size: 11px; opacity: 0.85; }
.run-cta div { flex: 1; text-align: left; } .cta-arr { flex-shrink: 0; }
.pending-flag { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 12px; border-radius: 10px; cursor: pointer;
  font-size: 11.5px; font-weight: 600; color: var(--pay-st-verified); background: rgba(217,119,6,0.12); border: 1px solid rgba(217,119,6,0.22); }

@media (prefers-reduced-motion: reduce) {
  .dh-refresh.spin :deep(svg) { animation: none !important; }
  .ks-fill, .lg-bfill, .pipe-seg, .cb-seg { transition: none !important; }
}

/* ════════════════════════════════ LIGHT THEME ════════════════════════════════
   On cream, the surface-2 track fills are nearly white and disappear. Give every
   progress/track element a warm, visible bed. */
[data-theme="light"] .ks-track,
[data-theme="light"] .lg-bar,
[data-theme="light"] .pipe-bar,
[data-theme="light"] .comp-bar { background: rgba(120, 53, 15, 0.12); }
[data-theme="light"] .kpi { background: linear-gradient(180deg, rgba(255,250,240,0.9), rgba(255,246,232,0.7)); }
[data-theme="light"] .kpi.accent { background: linear-gradient(180deg, rgba(52,211,153,0.14), rgba(255,250,240,0.8)); }
[data-theme="light"] .st-tile,
[data-theme="light"] .dh-fy,
[data-theme="light"] .dh-refresh { background: rgba(255, 250, 240, 0.8); }
</style>
