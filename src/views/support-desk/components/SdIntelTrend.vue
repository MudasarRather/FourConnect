<template>
  <!-- Arrivals & Departures — created vs resolved flow with newly-breached ticks,
       plus the range's SLA attainment meters. Hand-built SVG, CSS-var themed. -->
  <div class="sd-itr" @pointerleave="hover = -1">
    <div class="itr-head">
      <div class="itr-legend sd-mono">
        <span class="lg"><i class="sw created" /> ARRIVALS {{ totals.created }}</span>
        <span class="lg"><i class="sw resolved" /> DEPARTURES {{ totals.resolved }}</span>
        <span class="lg"><i class="sw breached" /> DELAYS {{ totals.breached }}</span>
      </div>
      <div v-if="hover >= 0 && pts[hover]" class="itr-read sd-mono">
        {{ fmtDay(pts[hover].day) }} · <b class="c">{{ pts[hover].created }} in</b> · <b class="r">{{ pts[hover].resolved }} out</b>
        <template v-if="pts[hover].breached"> · <b class="b">{{ pts[hover].breached }} delayed</b></template>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="itr-svg" preserveAspectRatio="none" @pointermove="onMove">
      <g class="grid">
        <line v-for="g in 4" :key="g" :x1="PAD" :x2="W - PAD" :y1="gy(g)" :y2="gy(g)" />
      </g>
      <path class="area" :d="areaPath" pathLength="1" />
      <path class="line created" :d="linePath('created')" pathLength="1" />
      <path class="line resolved" :d="linePath('resolved')" pathLength="1" />
      <g class="breach">
        <rect v-for="(p, i) in pts" :key="i" v-show="p.breached"
          :x="x(i) - 2.5" :y="BASE - Math.min(p.breached * 7, 34)" width="5" :height="Math.min(p.breached * 7, 34)" rx="2" />
      </g>
      <line v-if="hover >= 0" class="cursor" :x1="x(hover)" :x2="x(hover)" :y1="14" :y2="BASE" />
      <circle v-if="last" class="dot created" :cx="x(pts.length - 1)" :cy="y(last.created)" r="4" />
      <circle v-if="last" class="dot resolved" :cx="x(pts.length - 1)" :cy="y(last.resolved)" r="4" />
    </svg>

    <div class="itr-axis sd-mono">
      <span v-for="i in axisIdx" :key="i">{{ fmtDay(pts[i]?.day) }}</span>
    </div>

    <div class="itr-sla">
      <div v-for="m in meters" :key="m.key" class="sla-m">
        <span class="sla-k sd-mono">{{ m.label }}</span>
        <span class="sla-track"><i :style="{ width: (m.v ?? 0) + '%', background: tone(m.v) }" /></span>
        <span class="sla-v sd-mono" :style="{ color: tone(m.v) }">{{ m.v == null ? '—' : m.v + '%' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  trend: { type: Array, default: () => [] },       // IntelTrendPoint[]
  frMetPct: { type: Number, default: null },
  resoMetPct: { type: Number, default: null },
})

const W = 720; const H = 200; const PAD = 10; const TOP = 18; const BASE = H - 26
const pts = computed(() => props.trend || [])
const last = computed(() => pts.value[pts.value.length - 1] || null)
const totals = computed(() => ({
  created: pts.value.reduce((a, p) => a + (p.created || 0), 0),
  resolved: pts.value.reduce((a, p) => a + (p.resolved || 0), 0),
  breached: pts.value.reduce((a, p) => a + (p.breached || 0), 0),
}))
const yMax = computed(() => Math.max(4, ...pts.value.map(p => Math.max(p.created || 0, p.resolved || 0))))
const x = (i) => PAD + (pts.value.length > 1 ? (i / (pts.value.length - 1)) * (W - PAD * 2) : (W - PAD * 2) / 2)
const y = (v) => BASE - ((v || 0) / yMax.value) * (BASE - TOP)
const gy = (g) => TOP + ((BASE - TOP) / 4) * g

const linePath = (key) => pts.value.length
  ? pts.value.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ')
  : ''
const areaPath = computed(() => pts.value.length
  ? `${linePath('created')} L${x(pts.value.length - 1).toFixed(1)} ${BASE} L${x(0).toFixed(1)} ${BASE} Z`
  : '')

const axisIdx = computed(() => {
  const n = pts.value.length
  if (!n) return []
  const step = Math.max(1, Math.round(n / 6))
  const out = []
  for (let i = 0; i < n; i += step) out.push(i)
  if (out[out.length - 1] !== n - 1) out.push(n - 1)
  return out
})

const hover = ref(-1)
const onMove = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  const fx = ((e.clientX - r.left) / r.width) * W
  const n = pts.value.length
  if (!n) return
  hover.value = Math.max(0, Math.min(n - 1, Math.round(((fx - PAD) / (W - PAD * 2)) * (n - 1))))
}

const meters = computed(() => ([
  { key: 'fr', label: 'FIRST-RESPONSE SLA', v: props.frMetPct },
  { key: 'rs', label: 'RESOLUTION SLA', v: props.resoMetPct },
]))
const tone = (v) => (v == null ? 'var(--sd-text-dim)' : v >= 90 ? 'var(--intel-up)' : v >= 70 ? 'var(--intel)' : 'var(--intel-dn)')
const fmtDay = (d) => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}` }
</script>

<style scoped>
.sd-itr { display: flex; flex-direction: column; gap: 8px; }
.itr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; min-height: 20px; }
.itr-legend { display: flex; gap: 14px; flex-wrap: wrap; }
.lg { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.sw { width: 16px; height: 5px; border-radius: 99px; display: inline-block; }
.sw.created { background: var(--intel); } .sw.resolved { background: var(--intel-up); } .sw.breached { background: var(--intel-dn); }
.itr-read { font-size: 10.5px; letter-spacing: 0.06em; color: var(--sd-text-secondary); }
.itr-read .c { color: var(--intel); } .itr-read .r { color: var(--intel-up); } .itr-read .b { color: var(--intel-dn); }

.itr-svg { width: 100%; height: 190px; display: block; touch-action: none; }
.grid line { stroke: var(--sd-border); stroke-width: 1; opacity: 0.55; }
.area { fill: color-mix(in srgb, var(--intel) 11%, transparent); opacity: 0; animation: sd-itr-fade 0.9s 0.5s ease forwards; }
.line { fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: sd-itr-draw 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.line.created { stroke: var(--intel); }
.line.resolved { stroke: var(--intel-up); animation-delay: 0.15s; }
.breach rect { fill: var(--intel-dn); opacity: 0.85; }
.cursor { stroke: var(--sd-text-dim); stroke-width: 1; stroke-dasharray: 3 4; }
.dot { stroke-width: 2; }
.dot.created { fill: var(--intel); stroke: color-mix(in srgb, var(--intel) 30%, transparent); }
.dot.resolved { fill: var(--intel-up); stroke: color-mix(in srgb, var(--intel-up) 30%, transparent); }
@keyframes sd-itr-draw { to { stroke-dashoffset: 0; } }
@keyframes sd-itr-fade { to { opacity: 1; } }

.itr-axis { display: flex; justify-content: space-between; font-size: 9.5px; color: var(--sd-text-dim); letter-spacing: 0.08em; padding: 0 4px; }

.itr-sla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
.sla-m { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
.sla-k { font-size: 9.5px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.sla-track { height: 7px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.sla-track i { display: block; height: 100%; border-radius: 999px; transform-origin: left;
  animation: sd-bar-grow 0.9s var(--sd-spring) backwards; transition: width 0.6s var(--sd-spring); }
.sla-v { font-size: 11px; font-weight: 700; }

@media (max-width: 640px) { .itr-sla { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .line, html:not([data-cinematic="on"]) .area { animation: none; stroke-dashoffset: 0; opacity: 1; }
  html:not([data-cinematic="on"]) .sla-track i { animation: none; }
}
</style>
