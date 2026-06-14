<template>
  <div class="gauge" :class="[tone, { over: value > 100 }]">
    <!-- ambient rotating sweep + aura, kept inside the ring -->
    <span class="g-sweep" aria-hidden="true" />
    <span class="g-aura" aria-hidden="true" />

    <svg class="g-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient :id="`${uid}-arc`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--g-c2)" />
          <stop offset="100%" stop-color="var(--g-c)" />
        </linearGradient>
      </defs>

      <!-- outer scale ring — crisp SOLID thin stroke (dashes anti-alias into haze) -->
      <circle class="g-scale" cx="50" cy="50" r="46" fill="none" stroke-width="1.4" />
      <!-- lit progress on the outer ring (clean grow via dashoffset) -->
      <circle class="g-scale-lit" cx="50" cy="50" r="46" pathLength="100" fill="none"
        stroke-width="2.4" stroke-linecap="round"
        stroke-dasharray="100" :stroke-dashoffset="mounted ? (100 - litLen) : 100"
        transform="rotate(-90 50 50)" />

      <!-- progress ring -->
      <circle class="g-track" cx="50" cy="50" r="37" fill="none" stroke-width="6" />
      <circle class="g-arc" cx="50" cy="50" r="37" fill="none" stroke-width="6" stroke-linecap="round"
        :stroke="`url(#${uid}-arc)`" :stroke-dasharray="C" :stroke-dashoffset="mounted ? offset : C"
        transform="rotate(-90 50 50)" />

      <!-- glowing pulsing tip -->
      <circle class="g-tip-glow" :cx="tip.x" :cy="tip.y" r="5.5" :style="{ opacity: mounted ? 1 : 0 }" />
      <circle class="g-tip" :cx="tip.x" :cy="tip.y" r="2.8" :style="{ opacity: mounted ? 1 : 0 }" />
    </svg>

    <div class="g-core">
      <b class="g-val"><ShiftCountUp :value="Math.round(value)" suffix="%" :duration="1100" /></b>
      <small class="g-label">Projected coverage</small>
      <span class="g-sub">
        <ShiftCountUp :value="assigned" :duration="900" /><i>/</i><ShiftCountUp :value="required" :duration="900" />
        <em>heads · days</em>
      </span>
    </div>
  </div>
</template>

<script>
let _wfGaugeUid = 0
</script>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ShiftCountUp from './ShiftCountUp.vue'

const props = defineProps({
  value: { type: Number, default: 100 },   // coverage %
  required: { type: Number, default: 0 },
  assigned: { type: Number, default: 0 },
})

const uid = `wfg-${_wfGaugeUid++}`
const R = 37
const C = +(2 * Math.PI * R).toFixed(3)
const mounted = ref(false)

const fillFrac = computed(() => Math.max(0, Math.min(1, props.value / 100)))
const offset = computed(() => +(C * (1 - fillFrac.value)).toFixed(2))
const litLen = computed(() => +(100 * fillFrac.value).toFixed(2))   // dotted ring uses pathLength 100
const tone = computed(() => props.value >= 100 ? 'ok' : props.value >= 60 ? 'warn' : 'alert')

// glowing tip dot follows the arc end (starts at top, sweeps clockwise)
const tip = computed(() => {
  const ang = (-90 + 360 * fillFrac.value) * Math.PI / 180
  return { x: +(50 + R * Math.cos(ang)).toFixed(2), y: +(50 + R * Math.sin(ang)).toFixed(2) }
})

onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { mounted.value = true })))
</script>

<style scoped>
.gauge { position: relative; width: 100%; max-width: 230px; aspect-ratio: 1; margin: 0 auto; display: grid; place-items: center; isolation: isolate; }
.gauge.ok   { --g-c: var(--shift-ok);    --g-c2: #6ee7b7; }
.gauge.warn { --g-c: var(--shift-amber); --g-c2: var(--shift-amber-bright); }
.gauge.alert{ --g-c: var(--shift-alert); --g-c2: #fb7185; }

/* rotating sweep beam — lives INSIDE the ring (behind readout) so it never hazes ticks/arc */
.g-sweep { position: absolute; inset: 26%; border-radius: 50%; pointer-events: none; z-index: 0;
  background: conic-gradient(from 0deg, transparent 0deg, transparent 276deg,
    color-mix(in srgb, var(--g-c) 8%, transparent) 322deg,
    color-mix(in srgb, var(--g-c) 30%, transparent) 352deg,
    color-mix(in srgb, var(--g-c) 55%, transparent) 360deg);
  -webkit-mask: radial-gradient(circle at 50% 50%, transparent 32%, #000 46%, #000 96%, transparent 100%);
  mask: radial-gradient(circle at 50% 50%, transparent 32%, #000 46%, #000 96%, transparent 100%);
  animation: wf-gauge-spin 5.5s linear infinite; will-change: transform; }
.g-aura { position: absolute; inset: 30%; border-radius: 50%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--g-c) 22%, transparent), transparent 70%);
  filter: blur(9px); animation: wf-gauge-breathe 4.4s ease-in-out infinite; }

.g-svg { position: relative; z-index: 1; width: 100%; height: 100%; overflow: visible; shape-rendering: geometricPrecision; }

.g-scale { stroke: color-mix(in srgb, var(--shift-text-muted) 24%, transparent); }
.g-scale-lit { stroke: var(--g-c); transition: stroke-dashoffset 1.3s var(--shift-ease) 0.1s; }

.g-track { stroke: var(--shift-grid-line); opacity: 0.6; }
.g-arc { transition: stroke-dashoffset 1.35s var(--shift-ease); }
.gauge.over .g-arc { animation: wf-gauge-over 2.4s ease-in-out infinite; }

.g-tip { fill: #fff; transition: opacity .5s ease .95s; }
.g-tip-glow { fill: var(--g-c); transition: opacity .5s ease .95s; animation: wf-tip-pulse 2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

.g-core { position: absolute; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; }
.g-val { font-family: var(--shift-mono); font-size: clamp(26px, 9vw, 40px); font-weight: 900; line-height: 0.95; letter-spacing: -0.03em; color: var(--g-c); }
.g-label { font-family: var(--shift-mono); font-size: 8.5px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--shift-text-muted); margin-top: 4px; }
.g-sub { margin-top: 7px; display: inline-flex; align-items: center; gap: 2px; font-family: var(--shift-mono); font-size: 12px; font-weight: 700; color: var(--shift-text-2); }
.g-sub i { color: var(--shift-text-dim); font-style: normal; margin: 0 1px; }
.g-sub em { font-style: normal; font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--shift-text-dim); margin-left: 6px; }

@keyframes wf-gauge-spin { to { transform: rotate(360deg); } }
@keyframes wf-gauge-breathe { 0%,100% { opacity: 0.5; transform: scale(0.96); } 50% { opacity: 0.9; transform: scale(1.04); } }
@keyframes wf-gauge-over { 0%,100% { filter: none; } 50% { filter: drop-shadow(0 0 6px var(--g-c)); } }
@keyframes wf-tip-pulse { 0%,100% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 0.95; transform: scale(1.25); } }

@media (prefers-reduced-motion: reduce) {
  .g-sweep, .g-aura, .gauge.over .g-arc, .g-tip-glow { animation: none; }
  .g-arc, .g-scale-lit { transition: none; }
}
</style>
