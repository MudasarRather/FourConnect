<template>
  <Motion ref="rootRef" as="div" class="dh ex-grain"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="dh-sky" aria-hidden="true" />
    <span class="dh-glow" aria-hidden="true" />
    <span v-if="!reduced" class="dh-scanlines" aria-hidden="true" />
    <span class="dh-spot" aria-hidden="true" />

    <!-- floating glass telemetry -->
    <div class="dh-hud">
      <button class="hud-chip" type="button" tabindex="-1">
        <span class="hud-ic" :style="{ '--c': '#fb923c' }"><Footprints :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="kpis.active_resignations || 0" /></b><i>In motion</i></span>
      </button>
      <button class="hud-chip link" type="button" @click="$emit('go', 'notice')">
        <span class="hud-ic" :style="{ '--c': '#ea580c' }"><CalendarClock :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="kpis.serving_notice || 0" /></b><i>Serving notice</i></span>
        <ArrowUpRight :size="12" class="hud-go" />
      </button>
      <button class="hud-chip" type="button" tabindex="-1">
        <span class="hud-ic" :style="{ '--c': '#34d399' }"><BadgeCheck :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="kpis.relieved_this_month || 0" /></b><i>Relieved · mo</i></span>
      </button>
      <button class="hud-chip" type="button" tabindex="-1">
        <span class="hud-ic" :style="{ '--c': '#fbbf24' }"><Timer :size="13" /></span>
        <span class="hud-meta"><b><ExCountUp :value="kpis.avg_processing_days || 0" :suffix="'d'" /></b><i>Avg passage</i></span>
      </button>
    </div>

    <svg class="dh-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="xMidYMid slice" role="img"
      aria-label="Departure vectors — separations streaming toward relief">
      <defs>
        <radialGradient id="dhSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff7e6" />
          <stop offset="32%" stop-color="#fde68a" />
          <stop offset="68%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0.1" />
        </radialGradient>
        <radialGradient id="dhSunHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(251,191,36,0.5)" />
          <stop offset="52%" stop-color="rgba(251,146,60,0.16)" />
          <stop offset="100%" stop-color="rgba(234,88,12,0)" />
        </radialGradient>
        <linearGradient id="dhScan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(252,211,77,0)" />
          <stop offset="50%" stop-color="rgba(252,211,77,0.85)" />
          <stop offset="100%" stop-color="rgba(252,211,77,0)" />
        </linearGradient>
        <linearGradient id="dhScanLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgba(234,88,12,0)" />
          <stop offset="50%" stop-color="rgba(234,88,12,0.8)" />
          <stop offset="100%" stop-color="rgba(234,88,12,0)" />
        </linearGradient>
      </defs>

      <!-- synthwave perspective grid receding to the portal -->
      <g class="dv-grid">
        <line v-for="(l, i) in grid.v" :key="'v' + i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" class="grid-v" />
        <line v-for="(l, i) in grid.h" :key="'h' + i" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
          class="grid-h" :style="{ opacity: l.o }" />
      </g>

      <!-- forward data sweep -->
      <rect v-if="!reduced" class="dv-scan" x="40" :y="portal.y" width="920" height="2.4" fill="url(#dhScan)" />

      <!-- the portal of light at the vanishing point -->
      <g class="dv-portal">
        <circle :cx="portal.x" :cy="portal.y" :r="64" fill="url(#dhSunHalo)" class="pt-halo" />
        <circle class="pt-ring-emit" :cx="portal.x" :cy="portal.y" r="30" />
        <circle class="pt-ring-emit" :cx="portal.x" :cy="portal.y" r="30" style="animation-delay:-1.7s" />
        <circle class="pt-ring-emit" :cx="portal.x" :cy="portal.y" r="30" style="animation-delay:-3.4s" />
        <circle :cx="portal.x" :cy="portal.y" r="26" fill="url(#dhSun)" class="pt-disc" :style="{ opacity: 0.55 + glow * 0.45 }" />
        <circle :cx="portal.x" :cy="portal.y" r="33" class="pt-reticle" />
      </g>

      <!-- departure comets — each separation streaming toward the portal -->
      <g class="dv-comets">
        <g v-for="m in comets" :key="m.id" class="dv-comet" :transform="`translate(${m.x} ${m.y})`"
          @click="$emit('focus', m.id)" role="button" tabindex="0" @keydown.enter="$emit('focus', m.id)">
          <title>{{ m.name }} · {{ m.label }}</title>
          <g :transform="`rotate(${m.ang})`">
            <g class="cmt-glide" :style="{ '--d': m.delay + 's' }">
              <line class="cmt-trail" x1="0" y1="0" :x2="-m.trail" y2="0" :style="{ '--c': m.color, strokeWidth: m.tw }" />
              <circle class="cmt-aura" cx="0" cy="0" :r="m.r * 2.4" :style="{ '--c': m.color }" />
              <circle class="cmt-head" cx="0" cy="0" :r="m.r" :style="{ '--c': m.color }" />
            </g>
          </g>
        </g>
      </g>

      <!-- right-edge depth gauge: milestone reticles fed by org-wide by_status -->
      <g class="dv-gauge">
        <line :x1="gauge.x" :y1="portal.y + 6" :x2="gauge.x" :y2="baseY" class="gauge-rail" />
        <g v-for="g in gates" :key="g.status" class="dv-gate" :class="{ on: g.status === activeStatus }"
          @click="$emit('pick', g.status)" role="button" tabindex="0" @keydown.enter="$emit('pick', g.status)">
          <circle :cx="gauge.x" :cy="g.y" :r="g.status === activeStatus ? 5 : 3.4" class="gate-lamp" :style="{ '--c': g.hex }" />
          <text :x="gauge.x - 11" :y="g.y - 3" class="gate-count" :style="{ '--c': g.hex }">{{ g.count }}</text>
          <text :x="gauge.x - 11" :y="g.y + 7" class="gate-label">{{ g.label }}</text>
        </g>
      </g>

      <!-- overflow marker -->
      <g v-if="extra > 0" class="dv-extra" :transform="`translate(${portal.x} ${baseY - 10})`">
        <rect x="-15" y="-10" width="30" height="20" rx="6" class="extra-bg" />
        <text class="extra-txt" y="1">+{{ extra }}</text>
      </g>
    </svg>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Footprints, CalendarClock, BadgeCheck, Timer, ArrowUpRight } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { caseStatusMeta } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  cases: { type: Array, default: () => [] },
  byStatus: { type: Object, default: () => ({}) },
  kpis: { type: Object, default: () => ({}) },
  activeStatus: { type: String, default: '' },
})
defineEmits(['pick', 'focus', 'go'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

// scene geometry (viewBox space)
const W = 1000, H = 280, baseY = 246
const portal = { x: 500, y: 88 }
const gauge = { x: 938 }

const glow = computed(() => {
  // brightness of the portal scales with how many cases are deep in the journey
  const s = props.byStatus || {}
  const near = Number(s.SETTLEMENT || 0) + Number(s.COMPLETED || 0) + Number(s.CLEARANCE || 0)
  const all = Object.values(s).reduce((a, b) => a + Number(b || 0), 0) || 1
  return +(0.3 + (near / all) * 0.7).toFixed(3)
})

// where each status sits along its vector (0 = just filed at foreground → 1 = relieved at portal)
const STATUS_FRAC = {
  DRAFT: 0.06, SUBMITTED: 0.16, MANAGER_REVIEW: 0.3, ACCEPTED: 0.44,
  NOTICE_PERIOD: 0.6, CLEARANCE: 0.74, SETTLEMENT: 0.87, COMPLETED: 0.97,
}
const hash = (str) => {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 1000000
  return h
}
const lerp = (a, b, t) => a + (b - a) * t

const plotted = computed(() => (props.cases || []).filter(c => STATUS_FRAC[c.status] != null))
const extra = computed(() => Math.max(0, plotted.value.length - 28))
const comets = computed(() => plotted.value.slice(0, 28).map((c, i) => {
  const t = STATUS_FRAC[c.status] ?? 0.12
  const seed = hash(c.id || c.case_number || i)
  const fgX = 150 + (seed % 700)
  const fgY = 196 + (seed % 44)
  const x = lerp(fgX, portal.x, t)
  const y = lerp(fgY, portal.y, t)
  const scale = 1 - t * 0.6
  const meta = caseStatusMeta(c.status)
  return {
    id: c.id, name: c.employee_name || c.employee_code || '—', label: meta.label, color: meta.hex,
    x: +x.toFixed(1), y: +y.toFixed(1),
    ang: +(Math.atan2(portal.y - y, portal.x - x) * 180 / Math.PI).toFixed(1),
    r: +(4.6 * scale).toFixed(2), tw: +(3.2 * scale).toFixed(2), trail: +(30 * scale).toFixed(1),
    delay: +((i % 7) * 0.4).toFixed(2),
  }
}))

const GATES = [
  { status: 'SUBMITTED', t: 0.16, label: 'Submitted' },
  { status: 'MANAGER_REVIEW', t: 0.3, label: 'Review' },
  { status: 'ACCEPTED', t: 0.44, label: 'Accepted' },
  { status: 'NOTICE_PERIOD', t: 0.6, label: 'Notice' },
  { status: 'CLEARANCE', t: 0.74, label: 'Clearance' },
  { status: 'COMPLETED', t: 0.97, label: 'Relieved' },
]
const gates = computed(() => GATES.map(g => {
  const meta = caseStatusMeta(g.status)
  return { ...g, y: +lerp(baseY, portal.y + 8, g.t).toFixed(1), count: Number(props.byStatus?.[g.status] || 0), hex: meta.hex }
}))

// synthwave perspective grid
const grid = (() => {
  const v = []
  for (let k = -6; k <= 6; k++) {
    v.push({ x1: portal.x + k * 78, y1: baseY + 24, x2: portal.x, y2: portal.y })
  }
  const h = []
  for (let r = 1; r <= 8; r++) {
    const frac = Math.pow(r / 8, 1.85)
    const y = portal.y + (baseY + 24 - portal.y) * frac
    const hw = 6 * 78 * frac
    h.push({ x1: portal.x - hw, y1: y, x2: portal.x + hw, y2: y, o: +(0.08 + frac * 0.28).toFixed(2) })
  }
  return { v, h }
})()
</script>

<style scoped>
.dh {
  position: relative; overflow: hidden; border-radius: 20px;
  background: var(--ex-panel); border: 1px solid var(--ex-border);
  box-shadow: var(--ex-card-shadow); isolation: isolate;
}
.dh-sky {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
  background:
    radial-gradient(90% 120% at 50% -8%, rgba(252, 211, 77, 0.26), transparent 52%),
    radial-gradient(120% 90% at 50% 128%, rgba(234, 88, 12, 0.2), transparent 60%),
    linear-gradient(180deg, rgba(124, 64, 18, 0.18) 0%, transparent 50%, rgba(180, 83, 9, 0.16) 100%);
  animation: dh-breathe 14s ease-in-out infinite;
}
[data-theme="light"] .dh-sky { opacity: 0.5; }
.dh-glow {
  position: absolute; inset: -34% 28% 36% 28%; pointer-events: none;
  background: radial-gradient(60% 80% at 50% 18%, rgba(251, 146, 60, 0.24), transparent 70%);
  animation: ex-aura-drift 12s ease-in-out infinite;
}
.dh-scanlines {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.45; z-index: 1; mix-blend-mode: overlay;
  background: repeating-linear-gradient(0deg, rgba(255, 240, 214, 0.05) 0 1px, transparent 1px 4px);
  animation: dh-scan-drift 8s linear infinite;
}
[data-theme="light"] .dh-scanlines { mix-blend-mode: multiply; opacity: 0.18; }
/* pale-yellow / near-white strokes vanish on cream → deepen them in light */
[data-theme="light"] .dv-scan { fill: url(#dhScanLight); }
[data-theme="light"] .grid-v { opacity: 0.32; }
[data-theme="light"] .grid-h { stroke: var(--ex-ember); }
[data-theme="light"] .pt-reticle { stroke: color-mix(in srgb, var(--ex-ember) 45%, transparent); }
.dh-spot {
  position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.4s; z-index: 4;
  background: radial-gradient(440px 260px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251, 146, 60, 0.13), transparent 62%);
}

.dh-svg { display: block; width: 100%; height: clamp(232px, 25vw, 300px); position: relative; z-index: 2; }

/* grid */
.dv-grid { transform: translate(calc((var(--mx, 0.5) - 0.5) * -10px), calc((var(--my, 0.5) - 0.5) * -6px)); transition: transform 0.4s var(--ex-ease); }
.grid-v { stroke: var(--ex-violet); stroke-width: 1; opacity: 0.16; }
.grid-h { stroke: var(--ex-amber); stroke-width: 1; }

/* forward sweep */
.dv-scan { transform-box: fill-box; transform-origin: center; animation: dv-scan 3.6s cubic-bezier(0.3, 0, 0.5, 1) infinite; }
@keyframes dv-scan {
  0% { transform: translateY(0) scaleX(0.04); opacity: 0; }
  12% { opacity: 0.85; }
  78% { opacity: 0.45; }
  100% { transform: translateY(158px) scaleX(1); opacity: 0; }
}

/* portal */
.dv-portal { transform: translate(calc((var(--mx, 0.5) - 0.5) * -5px), calc((var(--my, 0.5) - 0.5) * -3px)); transition: transform 0.4s var(--ex-ease); }
.pt-halo { animation: dh-halo 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.pt-disc { transform-box: fill-box; transform-origin: center; animation: ex-sun-pulse 6s ease-in-out infinite;
  filter: drop-shadow(0 0 22px rgba(251, 146, 60, 0.6)); transition: opacity 1s var(--ex-spring); }
.pt-ring-emit { fill: none; stroke: var(--ex-amber-bright); stroke-width: 1.4; opacity: 0;
  transform-box: fill-box; transform-origin: center; animation: dv-emit 4.5s ease-out infinite; }
@keyframes dv-emit { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(2.6); opacity: 0; } }
.pt-reticle { fill: none; stroke: rgba(255, 247, 230, 0.5); stroke-width: 1; stroke-dasharray: 3 6;
  transform-box: fill-box; transform-origin: center; animation: dv-spin 18s linear infinite; }
@keyframes dv-spin { to { transform: rotate(360deg); } }

/* comets */
.dv-comets { transform: translate(calc((var(--mx, 0.5) - 0.5) * -16px), calc((var(--my, 0.5) - 0.5) * -10px)); transition: transform 0.4s var(--ex-ease); }
.dv-comet { cursor: pointer; }
.cmt-glide { animation: dv-glide 3.4s ease-in-out infinite; animation-delay: var(--d); }
@keyframes dv-glide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }
.cmt-trail { stroke: var(--c); stroke-linecap: round; opacity: 0.5; stroke-dasharray: 6 5;
  animation: dv-trail 0.9s linear infinite; filter: drop-shadow(0 0 3px var(--c)); }
@keyframes dv-trail { to { stroke-dashoffset: -11; } }
.cmt-aura { fill: var(--c); opacity: 0.14; filter: blur(2px); transition: opacity 0.3s, r 0.3s; transform-box: fill-box; transform-origin: center; }
.cmt-head { fill: var(--c); filter: drop-shadow(0 0 6px var(--c)); transition: r 0.3s; }
.dv-comet:hover .cmt-aura, .dv-comet:focus-visible .cmt-aura { opacity: 0.32; }
.dv-comet:hover .cmt-head, .dv-comet:focus-visible .cmt-head { filter: drop-shadow(0 0 10px var(--c)); }
.dv-comet:focus-visible { outline: none; }

/* depth gauge */
.dv-gauge { transform: translate(calc((var(--mx, 0.5) - 0.5) * -3px), 0); transition: transform 0.4s var(--ex-ease); }
.gauge-rail { stroke: var(--ex-border-strong); stroke-width: 1.2; stroke-dasharray: 2 5; }
.dv-gate { cursor: pointer; }
.gate-lamp { fill: var(--c); filter: drop-shadow(0 0 5px var(--c)); transition: r 0.3s; }
.dv-gate.on .gate-lamp { animation: ex-gate-light 2s ease-in-out infinite; }
.gate-count { fill: var(--c); font-size: 12px; font-weight: 850; text-anchor: end; font-family: var(--ex-mono); }
.gate-label { fill: var(--ex-text-muted); font-size: 8px; font-weight: 700; text-anchor: end; letter-spacing: 0.05em; text-transform: uppercase; }
.dv-gate:hover .gate-label, .dv-gate.on .gate-label { fill: var(--ex-text); }

/* overflow */
.extra-bg { fill: var(--ex-surface-elevated); stroke: var(--ex-violet-border); stroke-width: 1; }
.extra-txt { fill: var(--ex-violet); font-size: 10px; font-weight: 800; text-anchor: middle; dominant-baseline: central; font-family: var(--ex-mono); }

/* floating HUD */
.dh-hud { position: absolute; top: 13px; left: 14px; z-index: 3; display: flex; flex-wrap: wrap; gap: 7px; max-width: 56%; }
.hud-chip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px 7px 8px; border-radius: 13px;
  background: var(--ex-surface-glass); border: 1px solid var(--ex-border-strong); cursor: default;
  backdrop-filter: blur(16px) saturate(150%); -webkit-backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 8px 22px -10px rgba(0, 0, 0, 0.5); transition: transform 0.3s var(--ex-spring), border-color 0.3s; }
.hud-chip.link { cursor: pointer; }
.hud-chip.link:hover { transform: translateY(-2px); border-color: var(--ex-violet-border); }
.hud-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.hud-meta { display: flex; flex-direction: column; line-height: 1.1; }
.hud-meta b { font-size: 15px; font-weight: 850; color: var(--ex-text); font-family: var(--ex-mono); }
.hud-meta i { font-size: 9.5px; font-style: normal; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.hud-go { color: var(--ex-violet); margin-left: 2px; }

@keyframes dh-spin { to { transform: rotate(360deg); } }
@keyframes dh-halo { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
@keyframes dh-breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.74; } }
@keyframes dh-scan-drift { to { background-position: 0 12px; } }

@media (max-width: 760px) {
  .dh-hud { position: static; max-width: 100%; padding: 12px 12px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .dh-sky, .dh-glow, .dh-scanlines, .pt-halo, .pt-disc, .pt-ring-emit, .pt-reticle,
  .dv-scan, .cmt-glide, .cmt-trail, .dv-gate.on .gate-lamp { animation: none !important; }
  .dv-grid, .dv-portal, .dv-comets, .dv-gauge { transform: none; transition: none; }
  .pt-ring-emit { opacity: 0.2; }
}
</style>
