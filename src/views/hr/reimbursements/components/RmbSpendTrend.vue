<template>
  <div class="rst" ref="rootRef">
    <div class="rst-legend">
      <span class="lg"><i class="dot" :style="{ background: claimedColor }" />Claimed</span>
      <span class="lg"><i class="dot" :style="{ background: settledColor }" />Settled</span>
      <span class="rst-spacer" />
      <span v-if="peak" class="rst-peak rmb-mono">
        peak <b>{{ peak.label }}</b> · {{ fmtCompactINR(peak.value) }}
      </span>
    </div>

    <svg class="rst-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none"
      @mousemove="onMove" @mouseleave="hover = -1">
      <defs>
        <linearGradient :id="`${uid}-cf`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="claimedColor" stop-opacity="0.26" />
          <stop offset="100%" :stop-color="claimedColor" stop-opacity="0" />
        </linearGradient>
        <linearGradient :id="`${uid}-sf`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="settledColor" stop-opacity="0.30" />
          <stop offset="100%" :stop-color="settledColor" stop-opacity="0" />
        </linearGradient>
        <filter :id="`${uid}-glow`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g class="rst-grid">
        <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="PAD_T + (g - 1) * (PLOT_H / 3)" :y2="PAD_T + (g - 1) * (PLOT_H / 3)" />
      </g>

      <template v-if="n > 1">
        <path class="rst-area c" :d="claimedArea" :fill="`url(#${uid}-cf)`" />
        <path class="rst-area s" :d="settledArea" :fill="`url(#${uid}-sf)`" />
        <path class="rst-line c" :d="claimedLine" :stroke="claimedColor" pathLength="1" />
        <path class="rst-line s" :d="settledLine" :stroke="settledColor" pathLength="1" />

        <g v-if="!reduced" :filter="`url(#${uid}-glow)`">
          <circle r="3" :fill="settledColor" class="rst-comet">
            <animateMotion :path="settledLine" :dur="cometDur" repeatCount="indefinite" rotate="auto" />
          </circle>
        </g>
      </template>

      <!-- hover markers -->
      <g v-if="hover >= 0 && n">
        <line :x1="px(hover)" :x2="px(hover)" :y1="PAD_T" :y2="H - PAD_B" class="rst-cross" :stroke="claimedColor" />
        <circle :cx="px(hover)" :cy="pyC(hover)" r="4" :fill="claimedColor" class="rst-mk" />
        <circle :cx="px(hover)" :cy="pyS(hover)" r="4" :fill="settledColor" class="rst-mk" />
      </g>

      <!-- persistent pulse on latest settled reading -->
      <g v-if="n" class="rst-head">
        <circle :cx="px(n - 1)" :cy="pyS(n - 1)" r="5.5" fill="none" :stroke="settledColor" class="rst-head-ring" />
        <circle :cx="px(n - 1)" :cy="pyS(n - 1)" r="3" :fill="settledColor" />
      </g>
    </svg>

    <div class="rst-x">
      <span v-for="(p, i) in points" :key="i" :class="{ on: i === hover }">{{ p.label }}</span>
    </div>

    <div v-if="hover >= 0" class="rst-tip" :style="tipStyle">
      <span class="tip-l rmb-mono">{{ points[hover].label }}</span>
      <span class="tip-row"><i class="dot" :style="{ background: claimedColor }" />Claimed <b>{{ fmtINR(points[hover].claimed) }}</b></span>
      <span class="tip-row"><i class="dot" :style="{ background: settledColor }" />Settled <b>{{ fmtINR(points[hover].settled) }}</b></span>
    </div>

    <div v-if="!n" class="rst-empty">No claim history yet</div>
  </div>
</template>

<script>
let _rstUid = 0
</script>

<script setup>
import { ref, computed } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'
import { fmtINR, fmtCompactINR } from '@/composables/useReimbursements'

const props = defineProps({
  // points: [{ label, claimed, settled }]
  points: { type: Array, default: () => [] },
  claimedColor: { type: String, default: 'var(--rmb-amber)' },
  settledColor: { type: String, default: 'var(--rmb-st-settled)' },
})

const uid = `rst-${_rstUid++}`
const W = 620, H = 196, PAD_T = 16, PAD_B = 16, PAD_X = 8
const PLOT_H = H - PAD_T - PAD_B
const reduced = prefersReduced()
const rootRef = ref(null)
const hover = ref(-1)

const n = computed(() => props.points.length)
const claimedVals = computed(() => props.points.map(p => Number(p.claimed) || 0))
const settledVals = computed(() => props.points.map(p => Number(p.settled) || 0))
const maxV = computed(() => Math.max(1, ...claimedVals.value, ...settledVals.value))

const px = (i) => n.value > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (n.value - 1) : W / 2
const yOf = (v) => PAD_T + PLOT_H - ((Number(v) || 0) / maxV.value) * PLOT_H
const pyC = (i) => yOf(claimedVals.value[i])
const pyS = (i) => yOf(settledVals.value[i])

// Catmull-Rom → cubic bezier for smooth curves.
function smooth(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i], p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}
const cPts = computed(() => claimedVals.value.map((v, i) => ({ x: px(i), y: yOf(v) })))
const sPts = computed(() => settledVals.value.map((v, i) => ({ x: px(i), y: yOf(v) })))
const claimedLine = computed(() => smooth(cPts.value))
const settledLine = computed(() => smooth(sPts.value))
const toArea = (line, pts) => pts.length < 2 ? '' :
  `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H - PAD_B} L ${pts[0].x.toFixed(1)} ${H - PAD_B} Z`
const claimedArea = computed(() => toArea(claimedLine.value, cPts.value))
const settledArea = computed(() => toArea(settledLine.value, sPts.value))
const cometDur = computed(() => `${Math.max(2.8, n.value * 0.6).toFixed(1)}s`)

const peak = computed(() => {
  let best = null
  props.points.forEach(p => {
    const v = Number(p.claimed) || 0
    if (!best || v > best.value) best = { label: p.label, value: v }
  })
  return best && best.value > 0 ? best : null
})

const onMove = (e) => {
  const el = rootRef.value?.querySelector('.rst-svg')
  if (!el || !n.value) return
  const r = el.getBoundingClientRect()
  const ratio = (e.clientX - r.left) / r.width
  hover.value = Math.max(0, Math.min(n.value - 1, Math.round(ratio * (n.value - 1))))
}
const tipStyle = computed(() => {
  const ratio = n.value > 1 ? hover.value / (n.value - 1) : 0.5
  return { left: `${(ratio * 100).toFixed(1)}%`, transform: `translateX(${ratio > 0.6 ? '-100%' : ratio < 0.4 ? '0' : '-50%'})` }
})
</script>

<style scoped>
.rst { position: relative; width: 100%; }
.rst-legend { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
.lg { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--rmb-text-secondary); }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.rst-spacer { flex: 1; }
.rst-peak { font-size: 10px; color: var(--rmb-text-muted); }
.rst-peak b { color: var(--rmb-text-secondary); }

.rst-svg { width: 100%; height: 168px; display: block; overflow: visible; cursor: crosshair; }
.rst-grid line { stroke: var(--rmb-grid-line); stroke-width: 1; stroke-dasharray: 3 5; }
.rst-area { animation: rst-fade 1.1s var(--rmb-ease) both; }
.rst-line { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: rst-draw 1.4s var(--rmb-ease) both;
  filter: drop-shadow(0 3px 8px rgba(0,0,0,0.28)); }
.rst-line.s { animation-delay: 0.18s; }
.rst-comet { opacity: 0.92; }
.rst-cross { stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.5; }
.rst-mk { filter: drop-shadow(0 0 5px currentColor); }
.rst-head-ring { stroke-width: 1.4; opacity: 0.7; transform-box: fill-box; transform-origin: center; animation: rst-head 2.6s ease-out infinite; }

.rst-x { display: flex; justify-content: space-between; margin-top: 5px; padding: 0 2px; }
.rst-x span { font-family: var(--rmb-mono); font-size: 9.5px; color: var(--rmb-text-muted); transition: color 0.2s; }
.rst-x span.on { color: var(--rmb-amber); font-weight: 700; }

.rst-tip { position: absolute; top: 26px; z-index: 4; display: flex; flex-direction: column; gap: 3px; padding: 8px 11px;
  border-radius: 11px; pointer-events: none; background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid var(--rmb-border-strong); box-shadow: 0 14px 34px -14px rgba(0,0,0,0.6); min-width: 150px; }
.tip-l { font-size: 9.5px; color: var(--rmb-text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.tip-row { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--rmb-text-secondary); }
.tip-row b { margin-left: auto; font-family: var(--rmb-mono); color: var(--rmb-text); }
.rst-empty { position: absolute; inset: 30px 0 0; display: grid; place-items: center; color: var(--rmb-text-muted); font-size: 13px; }

@keyframes rst-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rst-draw { to { stroke-dashoffset: 0; } }
@keyframes rst-head { 0% { transform: scale(0.5); opacity: 0.9; } 70%, 100% { transform: scale(2.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .rst-line, .rst-area, .rst-head-ring { animation: none; stroke-dashoffset: 0; }
}
</style>
