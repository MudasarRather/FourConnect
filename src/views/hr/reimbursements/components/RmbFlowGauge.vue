<template>
  <div class="rmb-gauge" ref="rootRef" :style="{ width: size + 'px', height: size + 'px' }">
    <svg class="gauge-svg" :viewBox="`0 0 ${S} ${S}`">
      <defs>
        <radialGradient :id="`${uid}-core`" cx="42%" cy="34%">
          <stop offset="0%" stop-color="var(--rmb-amber-bright)" />
          <stop offset="55%" stop-color="var(--rmb-amber)" />
          <stop offset="100%" stop-color="var(--rmb-amber-strong)" />
        </radialGradient>
        <filter :id="`${uid}-soft`" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      <!-- outer track -->
      <circle :cx="C" :cy="C" :r="R" fill="none" stroke="var(--rmb-grid-line)" :stroke-width="track + 2" />

      <!-- minor instrument ticks -->
      <g class="gauge-ticks">
        <line v-for="t in 60" :key="'t' + t"
          :x1="tick(t - 1, R + track / 2 + 2).x" :y1="tick(t - 1, R + track / 2 + 2).y"
          :x2="tick(t - 1, R + track / 2 + ((t - 1) % 5 === 0 ? 6 : 3)).x"
          :y2="tick(t - 1, R + track / 2 + ((t - 1) % 5 === 0 ? 6 : 3)).y"
          :stroke="(t - 1) % 5 === 0 ? 'var(--rmb-amber)' : 'var(--rmb-text-muted)'"
          :stroke-width="(t - 1) % 5 === 0 ? 1.4 : 0.8"
          :opacity="(t - 1) % 5 === 0 ? 0.55 : 0.28" stroke-linecap="round" />
      </g>

      <!-- value segments (drawn proportional, animated wipe) -->
      <g :transform="`rotate(-90 ${C} ${C})`">
        <circle v-for="seg in renderSegs" :key="seg.key" :cx="C" :cy="C" :r="R" fill="none"
          :stroke="seg.color" :stroke-width="track" stroke-linecap="butt"
          :stroke-dasharray="`${seg.len.toFixed(2)} ${(CIRC - seg.len).toFixed(2)}`"
          :stroke-dashoffset="(-seg.offset).toFixed(2)"
          class="gauge-seg" />
      </g>

      <!-- rotating conic sheen on the ring -->
      <circle v-if="!reduced" :cx="C" :cy="C" :r="R" fill="none" stroke="rgba(255,255,255,0.55)"
        :stroke-width="track" stroke-linecap="round" class="gauge-sheen"
        :stroke-dasharray="`${(CIRC * 0.06).toFixed(1)} ${(CIRC * 0.94).toFixed(1)}`"
        :filter="`url(#${uid}-soft)`" />

      <!-- core disc -->
      <circle :cx="C" :cy="C" :r="coreR" :fill="`url(#${uid}-core)`" class="gauge-core"
        stroke="rgba(255,255,255,0.35)" stroke-width="1" />
      <circle :cx="C" :cy="C" :r="coreR" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1" />
    </svg>

    <!-- center read-out (HTML for crisp count-up) -->
    <div class="gauge-center">
      <span v-if="centerLabel" class="gc-eyebrow">{{ centerLabel }}</span>
      <span class="gc-val">
        <RmbCountUp :value="Number(centerNumber) || 0" :decimals="centerDecimals" />{{ centerSuffix }}
      </span>
      <span v-if="centerSub" class="gc-sub">{{ centerSub }}</span>
    </div>
  </div>
</template>

<script>
let _gaugeUid = 0
</script>

<script setup>
import { ref, computed } from 'vue'
import RmbCountUp from './RmbCountUp.vue'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  size: { type: Number, default: 200 },
  // segments: [{ key, label, value, color }]
  segments: { type: Array, default: () => [] },
  centerNumber: { type: [Number, String], default: 0 },
  centerSuffix: { type: String, default: '' },
  centerDecimals: { type: Number, default: 0 },
  centerLabel: { type: String, default: '' },
  centerSub: { type: String, default: '' },
})

const uid = `gg-${_gaugeUid++}`
const S = 240
const C = S / 2
const track = 16
const R = C - 30
const coreR = 58
const CIRC = 2 * Math.PI * R
const GAP = CIRC * 0.012        // small visual gap between segments
const reduced = prefersReduced()

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.3 })
const progress = computed(() => (visible.value ? 1 : 0))   // CSS transition animates the wipe

const polar = (frac, rad) => {
  const ang = frac * Math.PI * 2 - Math.PI / 2
  return { x: C + rad * Math.cos(ang), y: C + rad * Math.sin(ang) }
}
const tick = (i, rad) => polar(i / 60, rad)

const total = computed(() =>
  props.segments.reduce((a, s) => a + (Number(s.value) || 0), 0))

// Cumulative arc lengths with a tiny inter-segment gap.
// `len` is scaled by `progress` (0→1) so each segment wipes open from its start
// the moment the gauge scrolls into view (CSS transition does the easing).
const renderSegs = computed(() => {
  const t = total.value
  if (t <= 0) return []
  let offset = 0
  const active = props.segments.filter(s => (Number(s.value) || 0) > 0)
  return active.map((s, i) => {
    const raw = ((Number(s.value) || 0) / t) * CIRC
    const len = Math.max(0, raw - (active.length > 1 ? GAP : 0)) * progress.value
    const seg = { key: s.key ?? i, color: s.color, offset, len }
    offset += raw
    return seg
  })
})
</script>

<style scoped>
.rmb-gauge { position: relative; display: grid; place-items: center; }
.gauge-svg { width: 100%; height: 100%; display: block; overflow: visible; }

.gauge-seg {
  transition: stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1),
              stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 0%, transparent));
}
.gauge-sheen { opacity: 0.5; transform-box: view-box; transform-origin: 50% 50%; animation: gg-sheen 5.5s linear infinite; }
.gauge-core { filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4)); }

.gauge-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1px; pointer-events: none;
  color: #2a1a05;
}
.gc-eyebrow { font-family: var(--rmb-mono); font-size: 8px; letter-spacing: 0.16em;
  text-transform: uppercase; color: rgba(42, 26, 5, 0.72); }
.gc-val { font-family: var(--rmb-mono); font-size: 26px; font-weight: 800; line-height: 1;
  letter-spacing: -0.02em; color: #1a1206; }
.gc-sub { font-family: var(--rmb-mono); font-size: 8.5px; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(42, 26, 5, 0.66); margin-top: 1px; }

@keyframes gg-sheen { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .gauge-seg { transition: none; }
  .gauge-sheen { animation: none; display: none; }
}
</style>
