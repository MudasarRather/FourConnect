<template>
  <div class="gauge">
    <svg class="gauge-svg" viewBox="0 0 140 140" aria-hidden="true">
      <circle class="gauge-track" cx="70" cy="70" :r="R" fill="none" stroke-width="13" />
      <circle v-for="(s, i) in segs" :key="s.label" class="gauge-seg" cx="70" cy="70" :r="R" fill="none"
        stroke-width="13" stroke-linecap="round" :stroke="s.color"
        :stroke-dasharray="`${s.len.toFixed(2)} ${(circ - s.len).toFixed(2)}`"
        :stroke-dashoffset="(-s.offset).toFixed(2)" transform="rotate(-90 70 70)"
        :style="{ transition: `stroke-dasharray .9s var(--pay-ease) ${0.1 + i*0.12}s, stroke-dashoffset .9s var(--pay-ease) ${0.1 + i*0.12}s` }" />
      <text x="70" y="64" text-anchor="middle" class="gauge-cap">{{ centerCap }}</text>
      <text x="70" y="86" text-anchor="middle" class="gauge-val">{{ shown }}{{ suffix }}</text>
    </svg>
    <ul class="gauge-legend">
      <li v-for="s in segs" :key="s.label">
        <span class="lg-dot" :style="{ background: s.color }" />
        <span class="lg-name">{{ s.label }}</span>
        <b class="lg-val">{{ inrShort(s.value) }}</b>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { inrShort } from '@/composables/usePayroll'

const props = defineProps({
  segments: { type: Array, default: () => [] }, // [{label, value, color}]
  centerCap: { type: String, default: 'Net' },
  centerPct: { type: Number, default: 0 },
  suffix: { type: String, default: '%' },
})

const R = 58
const circ = 2 * Math.PI * R
const total = computed(() => props.segments.reduce((a, s) => a + (Number(s.value) || 0), 0) || 1)
const segs = computed(() => {
  let offset = 0
  return props.segments.map(s => {
    const len = ((Number(s.value) || 0) / total.value) * circ
    const seg = { ...s, len, offset }
    offset += len
    return seg
  })
})

const shown = ref(0)
let raf = null
const run = (to) => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) { shown.value = to; return }
  cancelAnimationFrame(raf)
  const from = shown.value, start = performance.now(), dur = 900
  const tick = (t) => {
    const p = Math.min(1, (t - start) / dur)
    shown.value = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)))
    if (p < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
onMounted(() => run(props.centerPct))
watch(() => props.centerPct, (v) => run(v))
</script>

<style scoped>
.gauge { display: flex; align-items: center; gap: 18px; }
.gauge-svg { width: 150px; height: 150px; flex-shrink: 0; }
.gauge-track { stroke: var(--pay-border-soft); }
.gauge-seg { filter: drop-shadow(0 0 5px rgba(0,0,0,0.2)); }
.gauge-cap { fill: var(--pay-text-muted); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
.gauge-val { fill: var(--pay-net); font-size: 26px; font-weight: 800; font-family: var(--pay-mono); }
.gauge-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; flex: 1; min-width: 0; }
.gauge-legend li { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--pay-text-2); }
.lg-dot { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.lg-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lg-val { margin-left: auto; font-family: var(--pay-mono); color: var(--pay-text); padding-left: 10px; }
</style>
