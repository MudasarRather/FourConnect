<template>
  <div class="chart">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="svg">
      <g v-for="(m, i) in bars" :key="i">
        <rect :x="m.x" :y="m.grossY" :width="bw" :height="m.grossH" rx="3" class="b-gross" />
        <rect :x="m.x" :y="m.netY" :width="bw" :height="m.netH" rx="3" class="b-net" />
      </g>
    </svg>
    <div class="labels">
      <span v-for="(m, i) in months" :key="i">{{ (m.label || '')[0] }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ months: { type: Array, default: () => [] } })
const W = 320, H = 130
const bw = computed(() => Math.max(6, W / Math.max(props.months.length, 1) - 8))
const maxV = computed(() => Math.max(1, ...props.months.map(m => Number(m.gross || 0))))
const bars = computed(() => props.months.map((m, i) => {
  const step = W / Math.max(props.months.length, 1)
  const x = i * step + (step - bw.value) / 2
  const g = Number(m.gross || 0), n = Number(m.net || 0)
  const grossH = (g / maxV.value) * (H - 16)
  const netH = (n / maxV.value) * (H - 16)
  return { x, grossH, grossY: H - grossH, netH, netY: H - netH }
}))
</script>

<style scoped>
.chart { display: flex; flex-direction: column; gap: 6px; }
.svg { width: 100%; height: 130px; }
.b-gross { fill: rgba(184,134,11,0.30); transition: height 0.6s var(--pay-ease); }
.b-net { fill: var(--pay-net); transition: height 0.6s var(--pay-ease); }
.labels { display: flex; justify-content: space-around; }
.labels span { font-family: var(--pay-mono); font-size: 9.5px; color: var(--pay-text-muted); }
</style>
