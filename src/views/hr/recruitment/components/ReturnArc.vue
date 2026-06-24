<template>
  <div ref="rootEl" class="ra" :class="{ reduce }">
    <svg class="ra-svg" viewBox="0 0 640 212" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient :id="`raArc-${uid}`" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#9a6a2a" stop-opacity="0.15" />
          <stop offset="0.45" stop-color="#fbbf24" stop-opacity="0.9" />
          <stop offset="1" stop-color="#fb923c" />
        </linearGradient>
        <linearGradient :id="`raArcLight-${uid}`" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#b45309" stop-opacity="0.25" />
          <stop offset="0.45" stop-color="#ea580c" />
          <stop offset="1" stop-color="#c2410c" />
        </linearGradient>
        <radialGradient :id="`raCore-${uid}`" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fde68a" />
          <stop offset="0.4" stop-color="#fbbf24" stop-opacity="0.55" />
          <stop offset="1" stop-color="#f97316" stop-opacity="0" />
        </radialGradient>
        <filter :id="`raGlow-${uid}`" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.4" />
        </filter>
      </defs>

      <!-- faint blueprint grid (fades at edges) -->
      <g class="ra-grid">
        <line v-for="x in 13" :key="'gx'+x" :x1="x*48" y1="0" :x2="x*48" y2="212" />
        <line v-for="y in 5" :key="'gy'+y" x1="0" :y1="y*42" x2="640" :y2="y*42" />
      </g>

      <!-- parallax stage -->
      <g class="ra-stage" :style="parallax">
        <!-- outbound (the leaving) — low, dashed, static hint -->
        <path class="ra-out" :d="OUT" />
        <!-- the return arc (boomerang home) -->
        <path class="ra-arc" :d="ARC" :stroke="arcStroke" />
        <path class="ra-arc-flow" :d="ARC" />

        <!-- departure gate -->
        <g transform="translate(64 150)">
          <circle class="ra-depart-ring" r="13" />
          <circle class="ra-depart-dot" r="3.4" />
        </g>

        <!-- comets riding home -->
        <g v-for="c in comets" :key="c.i" class="ra-comet">
          <line class="ra-trail" x1="0" y1="0" x2="-22" y2="0" />
          <circle class="ra-head-glow" r="6.5" :filter="`url(#raGlow-${uid})`" />
          <circle class="ra-head" r="3.2" />
          <animateMotion v-if="!reduce" :dur="`${c.dur}s`" :begin="`${c.begin}s`"
            repeatCount="indefinite" rotate="auto" :path="ARC"
            keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.5 0 0.2 1" />
          <animateMotion v-else dur="0.01s" :path="ARC" keyPoints="1;1" keyTimes="0;1" fill="freeze" />
        </g>

        <!-- the org core (home) -->
        <g transform="translate(566 116)">
          <circle class="ra-core-aura" r="46" :fill="`url(#raCore-${uid})`" />
          <circle class="ra-core-ring r2" r="34" />
          <circle class="ra-core-ring r1" r="26" />
          <circle class="ra-core-disc" r="18" />
          <path class="ra-home" d="M-9 1 L0 -8 L9 1 M-7 1 V9 H7 V1" />
          <path class="ra-home-door" d="M-2.6 9 V4 H2.6 V9" />
        </g>
      </g>
    </svg>

    <!-- ambient motes (HTML, behind tags) -->
    <span v-for="m in motes" :key="'m'+m.i" class="ra-mote"
      :style="`left:${m.x}%;top:${m.y}%;--ms:${m.s}s;--md:${m.d}s;--mz:${m.z}px`" aria-hidden="true" />

    <!-- corner labels -->
    <span class="ra-tag left"><span class="ra-tag-dot" /> Exited</span>
    <span class="ra-tag right">{{ count }} ready to return <House :size="11" /></span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { House } from 'lucide-vue-next'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({ count: { type: Number, default: 0 } })

const uid = Math.random().toString(36).slice(2, 7)
const reduce = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)

const { isLight } = useTheme()
const arcStroke = computed(() => `url(#${isLight.value ? 'raArcLight' : 'raArc'}-${uid})`)

// the boomerang geometry — out low, home high into the core
const ARC = 'M64 150 C 196 32, 372 22, 560 114'
const OUT = 'M64 150 C 232 184, 432 190, 560 150'

const comets = computed(() => {
  const n = Math.min(Math.max(props.count, 0), 7)
  return Array.from({ length: n }, (_, i) => {
    const dur = 5.4 + (i % 3) * 1.3
    return { i, dur, begin: -(i * (dur / Math.max(n, 1))) - i * 0.4 }
  })
})

const motes = Array.from({ length: 14 }, (_, i) => ({
  i,
  x: 8 + ((i * 53) % 84),
  y: 12 + ((i * 37) % 70),
  s: 5 + ((i * 7) % 6),
  d: -((i * 11) % 60) / 10,
  z: ((i % 3) - 1) * 6,
}))

// pointer parallax on the stage
const parallax = ref('')
let raf = null
const tick = () => {
  const el = rootEl.value
  if (el) {
    const mx = parseFloat(getComputedStyle(el).getPropertyValue('--mx')) || 0.5
    const my = parseFloat(getComputedStyle(el).getPropertyValue('--my')) || 0.5
    parallax.value = `transform:translate(${(mx - 0.5) * 14}px,${(my - 0.5) * 9}px)`
  }
  raf = requestAnimationFrame(tick)
}
onMounted(() => { if (!reduce) raf = requestAnimationFrame(tick) })
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.ra { position: relative; width: 100%; height: 100%; min-height: 168px; overflow: hidden; border-radius: 16px; }
.ra-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ra-stage { transition: transform 0.25s var(--hr-spring); }

.ra-grid { mask: linear-gradient(90deg, transparent, #000 28%, #000 72%, transparent); -webkit-mask: linear-gradient(90deg, transparent, #000 28%, #000 72%, transparent); }
.ra-grid line { stroke: var(--hr-border-strong); stroke-width: 0.6; opacity: 0.45; }

/* arcs */
.ra-out { fill: none; stroke: var(--hr-border-strong); stroke-width: 1.4; stroke-dasharray: 2 7; opacity: 0.55; }
.ra-arc { fill: none; stroke-width: 2.6; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.4)); }
.ra-arc-flow { fill: none; stroke: #fde68a; stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 10 360; opacity: 0.9; animation: ra-flow 3.4s linear infinite; }
@keyframes ra-flow { to { stroke-dashoffset: -370; } }

/* departure gate */
.ra-depart-ring { fill: none; stroke: var(--hr-text-dim); stroke-width: 1.5; stroke-dasharray: 3 4; opacity: 0.7; animation: ra-spin 24s linear infinite; transform-box: fill-box; transform-origin: center; }
.ra-depart-dot { fill: var(--hr-text-muted); }
@keyframes ra-spin { to { transform: rotate(360deg); } }

/* comets */
.ra-trail { stroke: #fbbf24; stroke-width: 2; stroke-linecap: round; opacity: 0.5; filter: blur(1.5px); }
.ra-head { fill: #fff7e6; }
.ra-head-glow { fill: #fbbf24; opacity: 0.7; }

/* core */
.ra-core-aura { animation: ra-breathe 4.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes ra-breathe { 0%, 100% { opacity: 0.75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
.ra-core-ring { fill: none; stroke: var(--hr-accent-gold-border); stroke-width: 1.3; transform-box: fill-box; transform-origin: center; }
.ra-core-ring.r1 { animation: ra-emit 3.6s ease-out infinite; }
.ra-core-ring.r2 { animation: ra-emit 3.6s ease-out infinite 1.2s; opacity: 0.6; }
@keyframes ra-emit { 0% { transform: scale(0.55); opacity: 0.75; } 100% { transform: scale(1.3); opacity: 0; } }
.ra-core-disc { fill: var(--hr-accent-gold); opacity: 0.95; }
.ra-home, .ra-home-door { fill: none; stroke: #1f1408; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }

/* motes */
.ra-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--hr-accent-gold); opacity: 0; box-shadow: 0 0 6px 1px rgba(251, 191, 36, 0.5); animation: ra-drift var(--ms, 6s) ease-in-out infinite var(--md, 0s); }
@keyframes ra-drift {
  0% { opacity: 0; transform: translate(0, 6px); }
  40%, 60% { opacity: 0.75; }
  100% { opacity: 0; transform: translate(var(--mz, 0), -10px); }
}

/* tags */
.ra-tag { position: absolute; bottom: 12px; display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hr-text-muted); }
.ra-tag.left { left: 14px; } .ra-tag.right { right: 14px; color: var(--hr-accent-gold); }
.ra-tag-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--hr-text-dim); }

[data-theme="light"] .ra-arc-flow { stroke: #d97706; }
[data-theme="light"] .ra-grid line { stroke: rgba(40, 25, 10, 0.12); }
[data-theme="light"] .ra-mote { box-shadow: 0 0 6px 1px rgba(217, 119, 6, 0.5); }

.reduce .ra-arc-flow, .reduce .ra-core-aura, .reduce .ra-core-ring, .reduce .ra-depart-ring, .reduce .ra-mote { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .ra-arc-flow, .ra-core-aura, .ra-core-ring, .ra-depart-ring, .ra-mote { animation: none; }
}
</style>
