<template>
  <div class="ptc" ref="rootRef">
    <svg class="ptc-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" @mousemove="onMove" @mouseleave="hover = -1">
      <defs>
        <linearGradient :id="`${uid}-gross`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--pay-treasury)" stop-opacity="0.34" />
          <stop offset="100%" stop-color="var(--pay-treasury)" stop-opacity="0" />
        </linearGradient>
        <linearGradient :id="`${uid}-net`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--pay-net)" stop-opacity="0.30" />
          <stop offset="100%" stop-color="var(--pay-net)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- gridlines -->
      <g class="ptc-grid">
        <line v-for="g in 4" :key="g" :x1="0" :x2="W" :y1="(g-1) * (PLOT_H/3) + PAD_T" :y2="(g-1) * (PLOT_H/3) + PAD_T" />
      </g>

      <!-- gross area + line -->
      <path class="ptc-area" :d="areaD(series.gross)" :fill="`url(#${uid}-gross)`" />
      <path class="ptc-line gross" :d="lineD(series.gross)" pathLength="1" />
      <!-- net area + line -->
      <path class="ptc-area" :d="areaD(series.net)" :fill="`url(#${uid}-net)`" />
      <path class="ptc-line net" :d="lineD(series.net)" pathLength="1" style="animation-delay:.15s" />
      <!-- deductions line (no area) -->
      <path class="ptc-line ded" :d="lineD(series.deductions)" pathLength="1" style="animation-delay:.3s" />

      <!-- crosshair -->
      <g v-if="hover >= 0" class="ptc-cross">
        <line :x1="px(hover)" :x2="px(hover)" :y1="PAD_T" :y2="H - PAD_B" />
        <circle :cx="px(hover)" :cy="py(series.gross[hover])" r="3.5" class="d gross" />
        <circle :cx="px(hover)" :cy="py(series.net[hover])" r="3.5" class="d net" />
        <circle :cx="px(hover)" :cy="py(series.deductions[hover])" r="3.5" class="d ded" />
      </g>
    </svg>

    <!-- x labels -->
    <div class="ptc-xlabels">
      <span v-for="(l, i) in labels" :key="i" :class="{ on: i === hover }">{{ l }}</span>
    </div>

    <!-- floating tooltip -->
    <div v-if="hover >= 0" class="ptc-tip" :style="tipStyle">
      <span class="tip-mo">{{ labels[hover] }}</span>
      <span class="tip-row"><i class="dot gross" />Gross<b>{{ inrShort(series.gross[hover]) }}</b></span>
      <span class="tip-row"><i class="dot net" />Net<b>{{ inrShort(series.net[hover]) }}</b></span>
      <span class="tip-row"><i class="dot ded" />Deductions<b>{{ inrShort(series.deductions[hover]) }}</b></span>
    </div>
  </div>
</template>

<script>
let _ptcUid = 0
</script>

<script setup>
import { ref, computed } from 'vue'
import { inrShort } from '@/composables/usePayroll'

const props = defineProps({ rows: { type: Array, default: () => [] } })

const uid = `ptc-${_ptcUid++}`
const W = 600, H = 240, PAD_T = 16, PAD_B = 16, PAD_X = 4
const PLOT_H = H - PAD_T - PAD_B

const rootRef = ref(null)
const hover = ref(-1)

const labels = computed(() => props.rows.map(r => r.label))
const series = computed(() => ({
  gross: props.rows.map(r => Number(r.gross) || 0),
  net: props.rows.map(r => Number(r.net) || 0),
  deductions: props.rows.map(r => Number(r.deductions) || 0),
}))
const maxV = computed(() => Math.max(1, ...series.value.gross, ...series.value.net, ...series.value.deductions))
const n = computed(() => props.rows.length)

const px = (i) => n.value > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (n.value - 1) : W / 2
const py = (v) => PAD_T + PLOT_H - ((Number(v) || 0) / maxV.value) * PLOT_H
const lineD = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ')
const areaD = (arr) => {
  if (arr.length < 2) return ''
  return `${lineD(arr)} L${px(arr.length - 1).toFixed(1)} ${H - PAD_B} L${px(0).toFixed(1)} ${H - PAD_B} Z`
}

const onMove = (e) => {
  const el = rootRef.value?.querySelector('.ptc-svg')
  if (!el || n.value === 0) return
  const rect = el.getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  hover.value = Math.max(0, Math.min(n.value - 1, Math.round(ratio * (n.value - 1))))
}
const tipStyle = computed(() => {
  const ratio = n.value > 1 ? hover.value / (n.value - 1) : 0.5
  return { left: `calc(${(ratio * 100).toFixed(1)}% )`, transform: `translateX(${ratio > 0.6 ? '-100%' : ratio < 0.4 ? '0' : '-50%'})` }
})
</script>

<style scoped>
.ptc { position: relative; width: 100%; }
.ptc-svg { width: 100%; height: 200px; display: block; overflow: visible; cursor: crosshair; }
.ptc-grid line { stroke: var(--pay-border-soft); stroke-width: 1; stroke-dasharray: 3 5; }
.ptc-area { animation: pay-area-grow 1.2s var(--pay-ease) both; }
.ptc-line { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; animation: pay-draw 1.4s var(--pay-ease) both; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); }
.ptc-line.gross { stroke: var(--pay-treasury); }
.ptc-line.net { stroke: var(--pay-net); }
.ptc-line.ded { stroke: var(--pay-deduction); stroke-width: 2; stroke-dasharray: 1; }
.ptc-cross line { stroke: var(--pay-mint-bright); stroke-width: 1; stroke-dasharray: 4 3; opacity: 0.7; }
.ptc-cross .d { stroke: var(--pay-canvas); stroke-width: 2; }
.ptc-cross .d.gross { fill: var(--pay-treasury); }
.ptc-cross .d.net { fill: var(--pay-net); }
.ptc-cross .d.ded { fill: var(--pay-deduction); }

.ptc-xlabels { display: flex; justify-content: space-between; margin-top: 4px; padding: 0 2px; }
.ptc-xlabels span { font-family: var(--pay-mono); font-size: 9px; color: var(--pay-text-muted); transition: color 0.2s; }
.ptc-xlabels span.on { color: var(--pay-treasury); font-weight: 700; }

.ptc-tip { position: absolute; top: 6px; z-index: 4; display: flex; flex-direction: column; gap: 3px;
  padding: 9px 12px; border-radius: 12px; pointer-events: none; min-width: 132px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border);
  box-shadow: 0 14px 36px -14px rgba(0,0,0,0.6); animation: pay-ticker-up 0.2s ease both; }
.tip-mo { font-family: var(--pay-mono); font-size: 10px; color: var(--pay-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
.tip-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--pay-text-2); }
.tip-row b { margin-left: auto; font-family: var(--pay-mono); color: var(--pay-text); padding-left: 10px; }
.tip-row .dot { width: 7px; height: 7px; border-radius: 50%; }
.dot.gross { background: var(--pay-treasury); } .dot.net { background: var(--pay-net); } .dot.ded { background: var(--pay-deduction); }

@media (prefers-reduced-motion: reduce) {
  .ptc-area, .ptc-line { animation: none !important; stroke-dashoffset: 0 !important; }
}
</style>
