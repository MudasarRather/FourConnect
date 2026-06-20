<template>
  <svg class="mg" :class="{ rev: reverse, spin: spin && !reduced }" :width="size" :height="size"
    :viewBox="`0 0 ${VB} ${VB}`" :style="{ '--dur': `${duration}s`, color: color }" aria-hidden="true">
    <defs>
      <radialGradient :id="`mg-body-${uid}`" cx="34%" cy="28%" r="80%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.55" />
        <stop offset="38%" stop-color="currentColor" stop-opacity="0.95" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0.62" />
      </radialGradient>
    </defs>
    <g class="mg-rot">
      <path :d="gearPath" :fill="`url(#mg-body-${uid})`" :stroke="color" stroke-width="0.6" stroke-opacity="0.5" />
      <!-- inner annulus / hub -->
      <circle :cx="C" :cy="C" :r="VB * 0.30" fill="none" :stroke="color" stroke-width="1.1" stroke-opacity="0.45" />
      <circle :cx="C" :cy="C" :r="VB * 0.155" class="mg-hole" />
      <!-- bolt detailing -->
      <circle v-for="b in bolts" :key="b.k" :cx="b.x" :cy="b.y" :r="VB * 0.026" class="mg-bolt" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  size: { type: Number, default: 44 },
  teeth: { type: Number, default: 12 },
  color: { type: String, default: 'var(--as-steel)' },
  duration: { type: Number, default: 7 },     // seconds per full rotation
  reverse: { type: Boolean, default: false },
  spin: { type: Boolean, default: true },
})

const reduced = prefersReduced()
const VB = 100
const C = VB / 2
// stable-ish id without Math.random collisions across instances
let _seq = 0
const uid = (() => { _seq += 1; return `${Date.now().toString(36).slice(-3)}${_seq}` })()

// Trapezoidal involute-ish gear path: per tooth → valley · rise · tip · fall.
const gearPath = computed(() => {
  const n = Math.max(6, props.teeth)
  const R = VB * 0.46          // tooth tip radius
  const root = R * 0.80        // valley radius
  const step = (Math.PI * 2) / n
  const pol = (a, r) => [(C + Math.cos(a) * r).toFixed(2), (C + Math.sin(a) * r).toFixed(2)]
  const profile = [[0.00, root], [0.16, R], [0.34, R], [0.50, root], [0.75, root]]
  let d = ''
  for (let i = 0; i < n; i++) {
    const base = i * step - Math.PI / 2
    profile.forEach(([f, r], j) => {
      const [x, y] = pol(base + f * step, r)
      d += (i === 0 && j === 0) ? `M${x} ${y}` : `L${x} ${y}`
    })
  }
  return d + 'Z'
})

const bolts = computed(() => {
  const out = []
  const rr = VB * 0.225
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    out.push({ k: i, x: C + Math.cos(a) * rr, y: C + Math.sin(a) * rr })
  }
  return out
})
</script>

<style scoped>
.mg { display: block; overflow: visible; }
.mg-rot { transform-box: fill-box; transform-origin: center; }
.mg.spin .mg-rot { animation: mg-spin var(--dur, 7s) linear infinite; }
.mg.spin.rev .mg-rot { animation-direction: reverse; }
.mg-hole { fill: var(--as-canvas); }
.mg-bolt { fill: var(--as-canvas); opacity: 0.7; }
@keyframes mg-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .mg.spin .mg-rot { animation: none; } }
</style>
