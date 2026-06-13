<template>
  <svg class="shift-dial" :viewBox="`0 0 ${S} ${S}`" :style="{ width: size + 'px', height: size + 'px' }">
    <defs>
      <radialGradient :id="`${uid}-core`" cx="42%" cy="36%">
        <stop offset="0%" stop-color="#fff4d6" />
        <stop offset="55%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#b45309" />
      </radialGradient>
    </defs>

    <!-- outer track -->
    <circle :cx="C" :cy="C" :r="R" fill="none" stroke="var(--shift-grid-line)" :stroke-width="track" />

    <!-- hour ticks -->
    <g class="dial-ticks">
      <line v-for="h in 24" :key="'t'+h"
        :x1="tick(h-1, R + track/2 + 1).x" :y1="tick(h-1, R + track/2 + 1).y"
        :x2="tick(h-1, R + track/2 + ((h-1)%6===0 ? 7 : 4)).x" :y2="tick(h-1, R + track/2 + ((h-1)%6===0 ? 7 : 4)).y"
        :stroke="(h-1)%6===0 ? 'var(--shift-amber)' : 'var(--shift-text-dim)'" :stroke-width="(h-1)%6===0 ? 1.6 : 1" stroke-linecap="round" />
    </g>
    <!-- quadrant labels 00 / 06 / 12 / 18 -->
    <g class="dial-nums" font-family="var(--shift-mono)" font-size="7" fill="var(--shift-text-muted)" text-anchor="middle">
      <text :x="C" :y="14">00</text>
      <text :x="S-8" :y="C+3">06</text>
      <text :x="C" :y="S-7">12</text>
      <text :x="9" :y="C+3">18</text>
    </g>

    <!-- shift arcs -->
    <path v-for="(a, i) in arcSegs" :key="'a'+i" :d="a.d" fill="none"
      :stroke="a.color" :stroke-width="arcW" stroke-linecap="round" class="dial-arc"
      :style="{ animationDelay: (i * 90) + 'ms' }">
      <title>{{ a.label }}</title>
    </path>

    <!-- now sweep -->
    <g v-if="showNow" class="dial-now">
      <line :x1="C" :y1="C" :x2="nowPt.x" :y2="nowPt.y" stroke="var(--shift-amber-bright)" stroke-width="1.6" stroke-linecap="round" />
      <circle :cx="nowPt.x" :cy="nowPt.y" r="2.6" fill="var(--shift-amber-bright)" />
    </g>

    <!-- core -->
    <circle :cx="C" :cy="C" :r="coreR" :fill="`url(#${uid}-core)`" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
    <text :x="C" :y="C + 1" text-anchor="middle" dominant-baseline="middle" class="dial-core-time">{{ centerLabel }}</text>
    <text v-if="centerSub" :x="C" :y="C + coreR * 0.5" text-anchor="middle" class="dial-core-sub">{{ centerSub }}</text>
  </svg>
</template>

<script>
let _dialUid = 0
</script>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  size: { type: Number, default: 220 },
  // arcs: [{ start_time:'09:00', end_time:'18:00', color, label }]
  arcs: { type: Array, default: () => [] },
  showNow: { type: Boolean, default: true },
  centerSub: { type: String, default: '' },
})

const uid = `dial-${_dialUid++}`
const S = 240
const C = S / 2
const track = 10
const R = C - 26          // radius of the hour track centre
const arcW = 9
const coreR = 40

const now = ref(new Date())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))

const centerLabel = computed(() => {
  const d = now.value
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
})

const toMin = (t) => {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// minutes → point on a circle of radius `rad` (0 min = top, clockwise)
const polar = (min, rad) => {
  const ang = (min / 1440) * Math.PI * 2 - Math.PI / 2
  return { x: C + rad * Math.cos(ang), y: C + rad * Math.sin(ang) }
}
const tick = (h, rad) => polar(h * 60, rad)

const arcSegs = computed(() => props.arcs.map(a => {
  let s = toMin(a.start_time), e = toMin(a.end_time)
  if (e <= s) e += 1440
  const large = (e - s) > 720 ? 1 : 0
  const p1 = polar(s % 1440, R)
  const p2 = polar(e % 1440, R)
  return {
    d: `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    color: a.color || 'var(--shift-amber)',
    label: a.label || '',
  }
}))

const nowPt = computed(() => {
  const d = now.value
  const min = d.getHours() * 60 + d.getMinutes()
  return polar(min, R - 6)
})
</script>

<style scoped>
.shift-dial { display: block; overflow: visible; }
.dial-arc { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: shift-draw 1.3s var(--shift-ease) forwards; opacity: 0.92; }
.dial-now { animation: none; }
.dial-core-time { font-family: var(--shift-mono); font-size: 13px; font-weight: 800; fill: #2a1a05; letter-spacing: -0.02em; }
.dial-core-sub { font-family: var(--shift-mono); font-size: 6.5px; fill: rgba(42,26,5,0.7); text-transform: uppercase; letter-spacing: 0.1em; }
@media (prefers-reduced-motion: reduce) { .dial-arc { animation: none; stroke-dashoffset: 0; } }
</style>
