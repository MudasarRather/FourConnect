<template>
  <div class="donut">
    <svg :viewBox="`0 0 ${SZ} ${SZ}`" class="donut-svg">
      <circle class="track" :cx="C" :cy="C" :r="R" :stroke-width="TH" />
      <circle
        v-for="(s, i) in segs" :key="s.key"
        class="seg" :cx="C" :cy="C" :r="R" :stroke-width="TH"
        :stroke="s.color"
        :stroke-dasharray="`${mounted ? s.len : 0} ${CIRC}`"
        :stroke-dashoffset="-s.offset"
        :style="{ transition: `stroke-dasharray 0.9s cubic-bezier(0.22,1,0.36,1) ${0.15 + i * 0.12}s`, filter: `drop-shadow(0 0 5px ${s.color}88)` }"
      />
    </svg>
    <div class="donut-center">
      <b><EdocCountUp :value="total" /></b>
      <span>{{ centerLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EdocCountUp from './EdocCountUp.vue'

const props = defineProps({
  points: { type: Array, default: () => [] },
  palette: { type: Array, default: () => ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#f97316', '#d97706', '#34d399', '#f87171', '#9ca3af'] },
  centerLabel: { type: String, default: 'total' },
})

const SZ = 132, TH = 14
const C = SZ / 2, R = C - TH / 2 - 2
const CIRC = 2 * Math.PI * R

const total = computed(() => props.points.reduce((a, p) => a + (p.value || 0), 0))
const segs = computed(() => {
  const t = total.value || 1
  let off = 0
  const gap = props.points.filter(p => p.value > 0).length > 1 ? 3 : 0
  return props.points.filter(p => p.value > 0).map((p, i) => {
    const len = Math.max(0, (p.value / t) * CIRC - gap)
    const seg = { key: p.key || p.label || i, color: props.palette[i % props.palette.length], len, offset: off }
    off += (p.value / t) * CIRC
    return seg
  })
})

const mounted = ref(false)
onMounted(() => requestAnimationFrame(() => { mounted.value = true }))
</script>

<style scoped>
.donut { position: relative; width: 100%; height: 100%; min-height: 132px; display: grid; place-items: center; }
.donut-svg { width: 132px; height: 132px; transform: rotate(-90deg); }
.track { fill: none; stroke: rgba(255,255,255,0.06); }
.seg { fill: none; stroke-linecap: round; }
.donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.donut-center b { font-size: 28px; font-weight: 800; color: var(--hr-text); line-height: 1; }
.donut-center span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--hr-text-muted); margin-top: 3px; }
[data-theme="light"] .track { stroke: rgba(40,25,10,0.08); }
[data-theme="light"] .donut-center b { color: #1a1410; }
</style>
