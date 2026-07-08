<template>
  <div class="sd-ribbon" ref="rootRef" :style="{ '--rib-h': height + 'px' }">
    <svg class="rib-svg" :viewBox="`0 0 1000 ${VB_H}`" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="ribStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--calm-deep, #059669)" stop-opacity="0.15" />
          <stop offset="45%" stop-color="var(--calm, #10b981)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--calm-mint, #6ee7b7)" stop-opacity="0.95" />
        </linearGradient>
        <radialGradient id="ribOrb" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="45%" stop-color="var(--calm-mint, #6ee7b7)" />
          <stop offset="100%" stop-color="var(--calm, #10b981)" stop-opacity="0.25" />
        </radialGradient>
        <filter id="ribGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <!-- flowing aurora strands -->
      <path v-for="(s, i) in strands" :key="i" :d="s.d" class="rib-strand" :class="{ flow: !reduced }"
        :style="{ '--op': s.op, '--w': s.w, animationDelay: s.delay + 's' }" />

      <!-- the journey path (orbs ride this) -->
      <path :id="pathId" :d="JOURNEY" class="rib-journey" />

      <!-- station nodes -->
      <g v-for="st in stations" :key="st.key" :transform="`translate(${st.x} ${st.y})`" class="rib-station" :class="{ done: st.key === 'resolved' && active === 0 && total > 0 }">
        <circle r="13" class="rib-st-halo" />
        <circle r="6" class="rib-st-core" />
      </g>

      <!-- travelling ticket orbs -->
      <g v-for="(o, i) in orbs" :key="'o' + i" filter="url(#ribGlow)">
        <circle r="7" fill="url(#ribOrb)" class="rib-orb">
          <animateMotion v-if="!reduced" :dur="o.dur + 's'" :begin="o.begin + 's'" repeatCount="indefinite">
            <mpath :href="'#' + pathId" :xlink:href="'#' + pathId" />
          </animateMotion>
        </circle>
      </g>
    </svg>

    <!-- station labels (HTML overlay, theme-aware) -->
    <div class="rib-labels">
      <div v-for="st in stations" :key="st.key" class="rib-lab" :style="{ left: (st.x / 10) + '%' }">
        <span class="rl-val sd-mono">{{ st.value }}</span>
        <span class="rl-name">{{ st.label }}</span>
      </div>
    </div>
    <div class="sd-ribbon-aura" aria-hidden="true" />
  </div>
</template>

<script setup>
/*
  SdResolutionRibbon — the user "Personal Support Console" signature instrument.
  A calm breathing aurora ribbon; the employee's tickets ride it as luminous orbs
  from Raised → In Progress → Resolved. Settles serene when nothing is in flight.
  Pure SVG + CSS (no WebGL); honours reduce-motion. Distinct from every module motif.
*/
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  counts: { type: Object, default: () => ({}) },   // { open, in_progress, pending, resolved, total }
  height: { type: Number, default: 200 },
})

const VB_H = 230
const pathId = `sd-journey-${Math.floor(Math.random() * 1e6)}`
const JOURNEY = 'M 70 150 C 250 70, 380 70, 520 120 C 660 170, 790 170, 930 100'

const reduced = ref(false)
onMounted(() => {
  reduced.value = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            && document.documentElement.getAttribute('data-cinematic') !== 'on'
})

const c = computed(() => props.counts || {})
const open = computed(() => Number(c.value.open) || 0)
const inProg = computed(() => Number(c.value.in_progress) || 0)
const pending = computed(() => Number(c.value.pending) || 0)
const resolved = computed(() => Number(c.value.resolved) || 0)
const total = computed(() => Number(c.value.total) || 0)
const active = computed(() => open.value + inProg.value + pending.value)

// three flowing aurora strands (decorative, data-independent so it's never empty)
const strands = [
  { d: 'M 0 150 C 250 78, 420 78, 560 128 C 700 178, 820 178, 1000 104', op: 0.85, w: 3, delay: 0 },
  { d: 'M 0 164 C 240 96, 430 96, 560 142 C 700 188, 820 188, 1000 120', op: 0.4, w: 2, delay: -1.4 },
  { d: 'M 0 138 C 260 64, 410 64, 560 116 C 710 168, 830 168, 1000 90', op: 0.25, w: 1.5, delay: -2.6 },
]

const stations = computed(() => [
  { key: 'raised', label: 'Raised', value: open.value, x: 70, y: 150 },
  { key: 'progress', label: 'In progress', value: inProg.value + pending.value, x: 520, y: 120 },
  { key: 'resolved', label: 'Resolved', value: resolved.value, x: 930, y: 100 },
])

const orbs = computed(() => {
  const n = active.value > 0 ? Math.min(active.value, 6) : (total.value > 0 ? 0 : 2)
  return Array.from({ length: n }, (_, i) => ({ dur: 8 + (i % 4), begin: -(i * 1.4) }))
})
</script>

<style scoped>
.sd-ribbon { position: relative; width: 100%; height: var(--rib-h, 200px); overflow: hidden; border-radius: inherit; }
.rib-svg { position: absolute; inset: 0; width: 100%; height: 100%; }

.rib-strand { fill: none; stroke: url(#ribStroke); stroke-width: var(--w, 2); stroke-linecap: round;
  opacity: var(--op, 0.6); stroke-dasharray: 14 20; }
.rib-strand.flow { animation: sd-ribbon-flow 9s linear infinite; }

.rib-journey { fill: none; stroke: none; }

.rib-station .rib-st-halo { fill: var(--calm-soft, rgba(16,185,129,0.12)); stroke: var(--calm-border, rgba(16,185,129,0.26)); stroke-width: 1; }
.rib-station .rib-st-core { fill: var(--calm, #10b981); filter: drop-shadow(0 0 6px var(--calm-glow, rgba(16,185,129,0.5))); }
.rib-station.done .rib-st-core { fill: var(--calm-mint, #6ee7b7); }
.rib-station.done .rib-st-halo { animation: sd-breathe 3.4s ease-in-out infinite; transform-origin: center; }

.rib-orb { opacity: 0.95; }

.rib-labels { position: absolute; inset: 0; pointer-events: none; }
.rib-lab { position: absolute; bottom: 12px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px; }
.rl-val { font-size: 19px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; }
.rl-name { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-muted); }

.sd-ribbon-aura { position: absolute; inset: 0; pointer-events: none; background: var(--calm-aura); opacity: 0.7; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rib-strand, html:not([data-cinematic="on"]) .rib-station.done .rib-st-halo { animation: none; }
}
</style>
