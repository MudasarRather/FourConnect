<template>
  <div class="stc" ref="rootRef">
    <svg class="stc-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" @mousemove="onMove" @mouseleave="hover = -1">
      <defs>
        <linearGradient :id="`${uid}-fill`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.34" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
        <filter :id="`${uid}-glow`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g class="stc-grid">
        <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="(g-1)*(PLOT_H/3)+PAD_T" :y2="(g-1)*(PLOT_H/3)+PAD_T" />
      </g>

      <path v-if="vals.length > 1" class="stc-area" :d="areaD" :fill="`url(#${uid}-fill)`" />
      <path v-if="vals.length > 1" class="stc-line" :d="lineD" :stroke="color" pathLength="1" />

      <!-- traveling comet that retraces the trend -->
      <g v-if="vals.length > 1 && !reduced" :filter="`url(#${uid}-glow)`">
        <circle r="3.2" :fill="color" class="stc-comet">
          <animateMotion :path="lineD" :dur="cometDur" repeatCount="indefinite" rotate="auto" />
        </circle>
      </g>

      <g v-for="(v, i) in vals" :key="'d'+i">
        <circle :cx="px(i)" :cy="py(v)" :r="hover===i ? 4.4 : 2.6" :fill="color" class="stc-dot" :class="{ on: hover===i }" />
      </g>

      <!-- persistent pulsing head at the latest reading -->
      <g v-if="vals.length" class="stc-head">
        <circle :cx="px(vals.length-1)" :cy="py(vals[vals.length-1])" r="5.5" fill="none" :stroke="color" class="stc-head-ring" />
        <circle :cx="px(vals.length-1)" :cy="py(vals[vals.length-1])" r="3" :fill="color" />
      </g>

      <g v-if="hover >= 0" class="stc-cross">
        <line :x1="px(hover)" :x2="px(hover)" :y1="PAD_T" :y2="H - PAD_B" :stroke="color" />
      </g>
    </svg>
    <div class="stc-xlabels">
      <span v-for="(l, i) in labels" :key="i" :class="{ on: i === hover }">{{ l }}</span>
    </div>
    <div v-if="hover >= 0" class="stc-tip" :style="tipStyle">
      <span class="tip-l">{{ labels[hover] }}</span>
      <b>{{ fmt(vals[hover]) }}</b>
    </div>
  </div>
</template>

<script>
let _stcUid = 0
</script>

<script setup>
import { ref, computed } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  // points: [{ label, value }]
  points: { type: Array, default: () => [] },
  color: { type: String, default: 'var(--shift-amber)' },
  suffix: { type: String, default: '' },
})

const uid = `stc-${_stcUid++}`
const W = 600, H = 180, PAD_T = 14, PAD_B = 14, PAD_X = 6
const PLOT_H = H - PAD_T - PAD_B
const rootRef = ref(null)
const hover = ref(-1)
const reduced = prefersReduced()

const labels = computed(() => props.points.map(p => p.label))
const vals = computed(() => props.points.map(p => Number(p.value) || 0))
const maxV = computed(() => Math.max(1, ...vals.value))
const n = computed(() => vals.value.length)
const px = (i) => n.value > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (n.value - 1) : W / 2
const py = (v) => PAD_T + PLOT_H - ((Number(v) || 0) / maxV.value) * PLOT_H
const lineD = computed(() => vals.value.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' '))
const areaD = computed(() => {
  if (vals.value.length < 2) return ''
  return `${lineD.value} L${px(vals.value.length - 1).toFixed(1)} ${H - PAD_B} L${px(0).toFixed(1)} ${H - PAD_B} Z`
})
const cometDur = computed(() => `${Math.max(2.6, n.value * 0.55).toFixed(1)}s`)
const fmt = (v) => `${Number(v) || 0}${props.suffix}`

const onMove = (e) => {
  const el = rootRef.value?.querySelector('.stc-svg')
  if (!el || n.value === 0) return
  const rect = el.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  hover.value = Math.max(0, Math.min(n.value - 1, Math.round(ratio * (n.value - 1))))
}
const tipStyle = computed(() => {
  const ratio = n.value > 1 ? hover.value / (n.value - 1) : 0.5
  return { left: `${(ratio * 100).toFixed(1)}%`, transform: `translateX(${ratio > 0.6 ? '-100%' : ratio < 0.4 ? '0' : '-50%'})` }
})
</script>

<style scoped>
.stc { position: relative; width: 100%; }
.stc-svg { width: 100%; height: 160px; display: block; overflow: visible; cursor: crosshair; }
.stc-grid line { stroke: var(--shift-grid-line); stroke-width: 1; stroke-dasharray: 3 5; }
.stc-area { animation: stc-area-in 1.1s var(--shift-ease) both; }
.stc-line { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1;
  animation: shift-draw 1.4s var(--shift-ease) both; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.3)); }
.stc-comet { opacity: 0.9; }
.stc-dot { transition: r 0.15s; }
.stc-dot.on { filter: drop-shadow(0 0 5px currentColor); }
.stc-head-ring { stroke-width: 1.4; opacity: 0.7; transform-box: fill-box; transform-origin: center;
  animation: stc-head 2.6s ease-out infinite; }
.stc-cross line { stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.6; }
.stc-xlabels { display: flex; justify-content: space-between; margin-top: 4px; padding: 0 2px; }
.stc-xlabels span { font-family: var(--shift-mono); font-size: 9px; color: var(--shift-text-muted); transition: color 0.2s; }
.stc-xlabels span.on { color: var(--shift-amber); font-weight: 700; }
.stc-tip { position: absolute; top: 4px; z-index: 4; display: flex; flex-direction: column; gap: 2px; padding: 7px 11px;
  border-radius: 10px; pointer-events: none; background: var(--shift-surface-2); border: 1px solid var(--shift-border);
  box-shadow: 0 12px 30px -12px rgba(0,0,0,0.6); }
.stc-tip .tip-l { font-family: var(--shift-mono); font-size: 9.5px; color: var(--shift-text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.stc-tip b { font-family: var(--shift-mono); font-size: 14px; color: var(--shift-text); }
@keyframes stc-area-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes stc-head { 0% { transform: scale(0.5); opacity: 0.9; } 70%, 100% { transform: scale(2.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .stc-line, .stc-area, .stc-head-ring { animation: none; stroke-dashoffset: 0; } }
</style>
