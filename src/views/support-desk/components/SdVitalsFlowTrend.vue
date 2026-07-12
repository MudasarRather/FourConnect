<template>
  <section class="qft sd-card">
    <header class="qft-head">
      <span class="qft-title sd-mono"><Activity :size="12" /> INFLOW vs RESOLVED · <b>{{ interval === 'hour' ? 'HOURLY' : 'DAILY' }}</b></span>
      <span class="qft-legend sd-mono">
        <i class="in" /> IN {{ totalIn }} · <i class="out" /> OUT {{ totalOut }} ·
        <span :class="net >= 0 ? 'up' : 'dn'">NET {{ net >= 0 ? '−' : '+' }}{{ Math.abs(net) }}</span>
      </span>
    </header>

    <div v-if="series.length > 1" class="qft-plot">
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-label="Fleet inflow vs outflow trend">
        <defs>
          <linearGradient id="qftArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--sd-qv-trace)" stop-opacity="0.28" />
            <stop offset="1" stop-color="var(--sd-qv-trace)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <line v-for="g in 3" :key="g" x1="0" :y1="(H / 4) * g" :x2="W" :y2="(H / 4) * g" class="qft-grid" />
        <path :d="areaPath" fill="url(#qftArea)" />
        <path :d="inPath" class="qft-line in" :class="{ still: reduced }" />
        <path :d="outPath" class="qft-line out" :class="{ still: reduced }" />
        <circle :cx="lastPt.x" :cy="lastPt.y" r="3.5" class="qft-now" :class="{ still: reduced }" />
      </svg>
      <div class="qft-axis sd-mono"><span>{{ axisStart }}</span><span>NOW</span></div>
    </div>
    <div v-else class="qft-empty sd-mono">NOT ENOUGH FLOW DATA IN THIS RANGE</div>
  </section>
</template>

<script setup>
/* SdVitalsFlowTrend — the fleet's inflow/outflow trend (per-queue flow bands summed
   per bucket) as a draw-in strip chart with a breathing NOW dot. Honours the section's
   day/hour interval (flow_interval=hour when the 24H range is active). */
import { computed } from 'vue'
import { Activity } from 'lucide-vue-next'

const props = defineProps({
  queues: { type: Array, default: () => [] },   // QueueOverviewCard[] (flow summed here)
  interval: { type: String, default: 'day' },
  reduced: { type: Boolean, default: false },
})

const W = 720, H = 140
const series = computed(() => {
  const sums = new Map()
  for (const q of props.queues) {
    for (const f of (q.flow || [])) {
      const k = f.day
      const cur = sums.get(k) || { in: 0, out: 0 }
      cur.in += f.inflow || 0
      cur.out += f.outflow || 0
      sums.set(k, cur)
    }
  }
  return [...sums.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, v]) => ({ k, ...v }))
})
const totalIn = computed(() => series.value.reduce((a, s) => a + s.in, 0))
const totalOut = computed(() => series.value.reduce((a, s) => a + s.out, 0))
const net = computed(() => totalOut.value - totalIn.value)

const maxV = computed(() => Math.max(1, ...series.value.map(s => Math.max(s.in, s.out))))
const pt = (i, v) => {
  const n = series.value.length
  const x = n > 1 ? (i / (n - 1)) * W : 0
  const y = H - 10 - (v / maxV.value) * (H - 26)
  return { x: +x.toFixed(1), y: +y.toFixed(1) }
}
const pathOf = (key) => series.value.map((s, i) => {
  const p = pt(i, s[key]); return `${i ? 'L' : 'M'}${p.x},${p.y}`
}).join(' ')
const inPath = computed(() => pathOf('in'))
const outPath = computed(() => pathOf('out'))
const areaPath = computed(() => (inPath.value ? `${inPath.value} L${W},${H} L0,${H} Z` : ''))
const lastPt = computed(() => (series.value.length ? pt(series.value.length - 1, series.value[series.value.length - 1].in) : { x: 0, y: 0 }))
const axisStart = computed(() => {
  const first = series.value[0]
  if (!first) return ''
  const d = new Date(first.k)
  if (Number.isNaN(d.getTime())) return ''
  return props.interval === 'hour'
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' })
})
</script>

<style scoped>
.qft { border-radius: 16px; overflow: hidden; }
.qft-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 13px 16px; border-bottom: 1px solid var(--sd-border); }
.qft-title { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; letter-spacing: 0.18em;
  font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; }
.qft-title b { color: var(--sd-qv-core); }
.qft-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: 0.1em;
  color: var(--sd-text-dim); }
.qft-legend i { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
.qft-legend i.in { background: var(--sd-qv-trace); }
.qft-legend i.out { background: var(--sd-qv-trace2); }
.qft-legend .up { color: var(--sd-qv-go); font-weight: 800; }
.qft-legend .dn { color: var(--sd-qv-halt); font-weight: 800; }
.qft-plot { padding: 10px 14px 6px; }
.qft-plot svg { display: block; width: 100%; height: 140px; }
.qft-grid { stroke: var(--sd-border); stroke-width: 1; }
.qft-line { fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1600; stroke-dashoffset: 1600;
  animation: qft-draw 1.9s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards; }
.qft-line.in { stroke: var(--sd-qv-trace); }
.qft-line.out { stroke: var(--sd-qv-trace2); stroke-width: 1.7; opacity: 0.85; animation-delay: 0.5s; }
.qft-line.still { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
.qft-now { fill: var(--sd-qv-trace); animation: qft-pulse 1.8s ease-in-out infinite; }
.qft-now.still { animation: none; }
.qft-axis { display: flex; justify-content: space-between; padding: 0 2px 10px; font-size: 8.5px;
  letter-spacing: 0.12em; color: var(--sd-text-dim); }
.qft-empty { padding: 30px 16px; text-align: center; font-size: 9.5px; letter-spacing: 0.14em;
  color: var(--sd-text-dim); }

@keyframes qft-draw { to { stroke-dashoffset: 0; } }
@keyframes qft-pulse { 0%, 100% { r: 3.5; opacity: 1; } 50% { r: 5.5; opacity: 0.7; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qft-line,
  html:not([data-cinematic="on"]) .qft-now { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
}
</style>
