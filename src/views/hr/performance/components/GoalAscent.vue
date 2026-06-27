<template>
  <!-- ═══════════════════════ THE NORTH-STAR ASCENT · Objective Summit ═══════════════════════
       OKRs as a mountaineering ascent. A topographic massif rises to a glowing NORTH-STAR
       beacon (the org's aligned 100% — its shine binds to avg progress). Each objective is a
       roped CLIMBER MARKER placed on the slope by its progress altitude (0% = base camp →
       100% = summit), tinted by status; ACHIEVED objectives plant a flag at the peak. A left
       ALTITUDE GAUGE reads average progress. Flowing contour lines, drifting stardust + snow
       (data-independent → alive when empty), 3-tier pointer parallax. Unique within
       Performance — vs the dashboard ORRERY, insights BELL-CURVE, reviews FLUX-PIPELINE,
       cycles MATURATION-LANES, calibration 9-BOX, merit MINT. Dark+light · reduced-motion. -->
  <div ref="rootEl" class="ga" :class="{ lit }">
    <span class="ga-sky" aria-hidden="true" />
    <div class="ga-stars" aria-hidden="true">
      <span v-for="s in stars" :key="'st' + s.i" class="ga-star" :style="{ left: s.x + '%', top: s.y + '%', '--d': s.d + 's', '--dl': s.dl + 's', '--sz': s.sz + 'px' }" />
    </div>
    <div class="ga-snow" aria-hidden="true">
      <span v-for="f in snow" :key="'sn' + f.i" class="ga-flake" :style="{ left: f.x + '%', '--d': f.d + 's', '--dl': f.dl + 's', '--drift': f.drift + 'px' }" />
    </div>

    <svg class="ga-svg" viewBox="0 0 1000 380" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="gaMass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0.16" />
          <stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="gaMassBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--perf-orange)" stop-opacity="0.1" />
          <stop offset="100%" stop-color="var(--perf-orange)" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="gaBeacon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--perf-gold-bright)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- back ridge + front massif -->
      <path d="M-20 380 L 250 210 L 470 270 L 720 130 L 1020 250 L 1020 400 L -20 400 Z" fill="url(#gaMassBack)" class="ga-massback" />
      <path :d="MASSIF" fill="url(#gaMass)" class="ga-mass" />

      <!-- flowing contour lines -->
      <path v-for="(c, i) in contours" :key="'c' + i" :d="c" class="ga-contour" :style="{ '--cd': (9 + i * 2) + 's' }" />

      <!-- the ascent rope -->
      <path :d="SLOPE" class="ga-rope-base" />
      <path :d="SLOPE" class="ga-rope" :class="{ on: lit }" />

      <!-- north-star beacon -->
      <circle :cx="SUMMIT.x" :cy="SUMMIT.y" r="48" fill="url(#gaBeacon)" class="ga-beacon-glow" :style="{ opacity: 0.25 + beacon * 0.6 }" />
      <g class="ga-beacon" :style="{ '--tw': (3.4 - beacon * 1.2) + 's' }">
        <path :d="starPath(SUMMIT.x, SUMMIT.y, 13, 5)" class="ga-beacon-star" />
        <circle :cx="SUMMIT.x" :cy="SUMMIT.y" r="3.4" class="ga-beacon-core" />
      </g>
      <circle :cx="SUMMIT.x" :cy="SUMMIT.y" r="16" class="ga-beacon-ring one" />
      <circle :cx="SUMMIT.x" :cy="SUMMIT.y" r="16" class="ga-beacon-ring two" />
    </svg>

    <!-- altitude gauge -->
    <div class="ga-alt">
      <span class="ga-alt-track"><span class="ga-alt-fill" :style="{ height: (lit ? avg : 0) + '%' }" /></span>
      <span class="ga-alt-cap"><b><SetCountUp :value="avg" :decimals="0" suffix="%" /></b><i>avg altitude</i></span>
    </div>

    <!-- base camp -->
    <div class="ga-base" :style="basePos"><span class="ga-base-ic"><Tent :size="14" /></span></div>

    <!-- climber markers -->
    <button v-for="n in nodes" :key="n.id" class="ga-climber" :class="{ summited: n.achieved, active: n.id === activeId }"
      :style="{ left: n.xPct + '%', top: n.yPct + '%', '--c': n.color, '--dl': n.dl + 's' }"
      type="button" @click="$emit('focus', n.id)" @mouseenter="hover = n.id" @mouseleave="hover = null"
      :title="`${n.title} — ${Math.round(n.progress)}%`">
      <span class="ga-climber-trail" />
      <span class="ga-climber-dot"><component v-if="n.achieved" :is="Flag" :size="9" /></span>
      <span class="ga-climber-ping" />
      <transition name="ga-tip">
        <span v-if="hover === n.id" class="ga-tip">
          <b>{{ n.title }}</b><i :style="{ color: n.color }">{{ Math.round(n.progress) }}%</i>
        </span>
      </transition>
    </button>
    <span v-if="overflow" class="ga-overflow" :style="overflowPos">+{{ overflow }}</span>

    <!-- HUD -->
    <div class="ga-hud ga-hud-tl">
      <span class="ga-hud-k"><Target :size="12" /> Climbing</span><b><SetCountUp :value="climbing" /></b>
    </div>
    <div class="ga-hud ga-hud-tr">
      <span class="ga-hud-k"><Trophy :size="12" /> Summited</span><b><SetCountUp :value="achieved" /></b>
    </div>
    <div class="ga-hud ga-hud-br" :class="{ ember: atRisk > 0 }">
      <span class="ga-hud-k"><TriangleAlert :size="12" /> At risk</span><b><SetCountUp :value="atRisk" /></b>
    </div>
    <span class="ga-tag"><Mountain :size="12" /> North-Star Ascent</span>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Mountain, Tent, Flag, Target, Trophy, TriangleAlert } from 'lucide-vue-next'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { goalTone } from '@/composables/usePerformance'

const props = defineProps({
  objectives: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  activeId: { type: [String, Number], default: null },
})
defineEmits(['focus'])

const rootEl = ref(null)
usePointerSpotlight(rootEl)
const lit = ref(false)
const hover = ref(null)
onMounted(() => { requestAnimationFrame(() => { lit.value = true }) })

// geometry (viewBox 1000 x 380)
const B0 = { x: 130, y: 330 }, C = { x: 540, y: 298 }, SUMMIT = { x: 885, y: 78 }
const SLOPE = `M${B0.x} ${B0.y} Q${C.x} ${C.y} ${SUMMIT.x} ${SUMMIT.y}`
const MASSIF = 'M-20 380 L 180 300 L 380 330 L 560 250 L 720 290 L 885 78 L 1020 210 L 1020 400 L -20 400 Z'
const bez = (t) => {
  const u = 1 - t
  return { x: u * u * B0.x + 2 * u * t * C.x + t * t * SUMMIT.x, y: u * u * B0.y + 2 * u * t * C.y + t * t * SUMMIT.y }
}
const toPct = (p) => ({ xPct: +(p.x / 1000 * 100).toFixed(2), yPct: +(p.y / 380 * 100).toFixed(2) })
const basePos = computed(() => ({ left: toPct(B0).xPct + '%', top: toPct(B0).yPct + '%' }))

function starPath(cx, cy, r, spikes) {
  const inner = r * 0.42
  let d = ''
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : inner
    const a = (Math.PI / spikes) * i - Math.PI / 2
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1) + ' '
  }
  return d + 'Z'
}

const objNodes = computed(() => props.objectives.filter(o => (o.goal_type || 'OBJECTIVE') === 'OBJECTIVE'))
const MAX = 10
const overflow = computed(() => Math.max(0, objNodes.value.length - MAX))
const overflowPos = computed(() => ({ left: '50%', top: '6%' }))

const nodes = computed(() => {
  const seed = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1
  return objNodes.value.slice(0, MAX).map((o, i) => {
    const progress = Number(o.progress || 0)
    const achieved = o.status === 'ACHIEVED' || progress >= 100
    const t = Math.max(0.02, Math.min(1, progress / 100))
    const p = bez(t)
    // fan markers slightly off the rope so they don't stack
    const off = (i % 2 === 0 ? -1 : 1) * (10 + (i % 3) * 7)
    return { id: o.id, title: o.title || 'Objective', progress, status: o.status, color: goalTone(progress),
      achieved, ...toPct({ x: p.x + off, y: p.y - Math.abs(off) * 0.3 }), dl: (seed(i) * 1.5).toFixed(2) }
  })
})

const avg = computed(() => Math.round(Number(props.stats.avg_progress ?? (objNodes.value.length ? objNodes.value.reduce((a, o) => a + Number(o.progress || 0), 0) / objNodes.value.length : 0))))
const beacon = computed(() => Math.max(0.08, avg.value / 100))
const climbing = computed(() => objNodes.value.filter(o => !['ACHIEVED', 'CANCELLED', 'MISSED'].includes(o.status)).length)
const achieved = computed(() => Number(props.stats.achieved ?? objNodes.value.filter(o => o.status === 'ACHIEVED').length))
const atRisk = computed(() => Number(props.stats.at_risk ?? objNodes.value.filter(o => ['AT_RISK', 'OFF_TRACK'].includes(o.status)).length))

// flowing contour lines
const contours = computed(() => {
  const out = []
  for (let i = 0; i < 4; i++) {
    const y = 150 + i * 52
    out.push(`M40 ${y} C 260 ${y - 16}, 520 ${y + 14}, 760 ${y - 10} S 980 ${y + 6}, 1000 ${y}`)
  }
  return out
})

// data-independent ambient
const seed = (n) => ((Math.sin(n * 91.17) * 6271.21) % 1 + 1) % 1
const stars = Array.from({ length: 22 }, (_, i) => ({ i, x: Math.round(seed(i * 1.3) * 100), y: Math.round(seed(i * 2.7) * 46), d: (2.4 + seed(i * 3.1) * 3).toFixed(1), dl: (seed(i * 4.4) * 4).toFixed(1), sz: (1 + Math.round(seed(i) * 2)) }))
const snow = Array.from({ length: 16 }, (_, i) => ({ i, x: Math.round(seed(i * 5.5) * 100), d: (7 + seed(i * 6.1) * 6).toFixed(1), dl: (seed(i * 7.3) * 8).toFixed(1), drift: Math.round((seed(i * 8.9) - 0.5) * 40) }))
</script>

<style scoped>
.ga { position: relative; overflow: hidden; width: 100%; aspect-ratio: 1000 / 380; min-height: 300px; border-radius: 22px;
  background:
    radial-gradient(120% 90% at 88% -10%, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 55%),
    radial-gradient(120% 120% at 10% 110%, color-mix(in srgb, var(--perf-orange) 10%, transparent), transparent 60%),
    var(--perf-panel);
  border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.ga-sky { position: absolute; inset: 0 0 40% 0; pointer-events: none; z-index: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--perf-gold) 6%, transparent), transparent); }

/* stars + snow */
.ga-stars, .ga-snow { position: absolute; inset: 0; z-index: 1; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 22px), calc((var(--my, 0.5) - 0.5) * 16px)); }
.ga-star { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: var(--perf-gold-bright);
  box-shadow: 0 0 5px var(--perf-gold-bright); opacity: 0; animation: ga-tw var(--d) ease-in-out var(--dl) infinite; }
@keyframes ga-tw { 0%, 100% { opacity: 0.12; transform: scale(0.7); } 50% { opacity: 0.85; transform: scale(1); } }
.ga-flake { position: absolute; top: -6px; width: 3px; height: 3px; border-radius: 50%; background: color-mix(in srgb, #fff 75%, var(--perf-gold));
  opacity: 0; animation: ga-fall var(--d) linear var(--dl) infinite; }
@keyframes ga-fall { 0% { opacity: 0; transform: translate(0, 0); } 12% { opacity: 0.7; } 88% { opacity: 0.7; } 100% { opacity: 0; transform: translate(var(--drift), 320px); } }

.ga-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none;
  transform: translate(calc((var(--mx, 0.5) - 0.5) * 10px), calc((var(--my, 0.5) - 0.5) * 7px)); }
.ga-massback { transform: translateY(2px); }
.ga-contour { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 26%, transparent); stroke-width: 1; opacity: 0.4; stroke-dasharray: 5 10;
  animation: ga-flow var(--cd, 11s) linear infinite; }
@keyframes ga-flow { to { stroke-dashoffset: -150; } }
.ga-rope-base { fill: none; stroke: var(--perf-border-strong); stroke-width: 2; stroke-linecap: round; opacity: 0.5; }
.ga-rope { fill: none; stroke: var(--perf-gold); stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 1100; stroke-dashoffset: 1100;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--perf-gold) 60%, transparent)); transition: stroke-dashoffset 1.6s var(--perf-spring); }
.ga-rope.on { stroke-dashoffset: 0; }

.ga-beacon-glow { transform-box: fill-box; transform-origin: center; animation: ga-bglow 3s ease-in-out infinite; }
@keyframes ga-bglow { 0%, 100% { transform: scale(0.92); } 50% { transform: scale(1.08); } }
.ga-beacon { transform-box: fill-box; transform-origin: center; animation: ga-twinkle var(--tw, 2.6s) ease-in-out infinite; }
.ga-beacon-star { fill: var(--perf-gold-bright); filter: drop-shadow(0 0 6px var(--perf-gold)); }
.ga-beacon-core { fill: #fff; }
.ga-beacon-ring { fill: none; stroke: var(--perf-gold); stroke-width: 1.4; transform-box: fill-box; transform-origin: center; opacity: 0; }
.ga-beacon-ring.one { animation: ga-bring 3s ease-out infinite; } .ga-beacon-ring.two { animation: ga-bring 3s ease-out 1.5s infinite; }
@keyframes ga-bring { 0% { opacity: 0.6; transform: scale(0.5); } 100% { opacity: 0; transform: scale(2.4); } }
@keyframes ga-twinkle { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }

/* altitude gauge */
.ga-alt { position: absolute; left: 16px; top: 18px; bottom: 18px; z-index: 4; display: flex; flex-direction: column; align-items: center; gap: 8px; width: 46px; }
.ga-alt-track { position: relative; flex: 1; width: 7px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.ga-alt-fill { position: absolute; left: 0; right: 0; bottom: 0; border-radius: 999px; background: linear-gradient(0deg, var(--perf-ember), var(--perf-gold-bright));
  box-shadow: 0 0 10px -1px var(--perf-gold); transition: height 1.4s var(--perf-spring); }
.ga-alt-cap { display: flex; flex-direction: column; align-items: center; }
.ga-alt-cap b { font-size: 14px; font-weight: 900; color: var(--perf-gold); font-variant-numeric: tabular-nums; line-height: 1; }
.ga-alt-cap i { font-size: 7px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-style: normal; color: var(--perf-text-muted); text-align: center; }

.ga-base { position: absolute; z-index: 4; transform: translate(-50%, -50%); }
.ga-base-ic { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; color: var(--perf-text-muted);
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); }

/* climbers */
.ga-climber { position: absolute; z-index: 5; transform: translate(-50%, -50%); cursor: pointer; background: none; border: none; padding: 0;
  animation: ga-rise 0.6s var(--perf-spring) both; animation-delay: var(--dl, 0s); }
@keyframes ga-rise { from { opacity: 0; transform: translate(-50%, calc(-50% + 14px)) scale(0.6); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
.ga-climber-dot { position: relative; z-index: 2; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; color: #1a1206;
  background: var(--c); border: 2px solid var(--perf-surface-elevated); box-shadow: 0 0 12px -2px var(--c); transition: transform 0.2s; }
.ga-climber.summited .ga-climber-dot { background: var(--perf-grad-hero); }
.ga-climber:hover .ga-climber-dot { transform: scale(1.22); }
.ga-climber.active .ga-climber-dot { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 50%, transparent), 0 0 14px -1px var(--c); }
.ga-climber-trail { position: absolute; left: 50%; top: 50%; width: 22px; height: 2px; transform-origin: left center; transform: translate(-2px, -1px) rotate(150deg);
  background: linear-gradient(90deg, var(--c), transparent); opacity: 0.5; border-radius: 2px; }
.ga-climber-ping { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid var(--c); opacity: 0; }
.ga-climber:not(.summited) .ga-climber-ping { animation: ga-ping 2.6s ease-out infinite; }
@keyframes ga-ping { 0% { opacity: 0.6; transform: scale(0.7); } 100% { opacity: 0; transform: scale(1.9); } }
.ga-tip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); z-index: 9; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 6px 10px; border-radius: 10px; white-space: nowrap; pointer-events: none; max-width: 200px;
  background: var(--perf-glass); border: 1px solid var(--perf-border-strong); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 10px 26px -16px rgba(0,0,0,0.6); }
.ga-tip b { font-size: 11px; font-weight: 750; color: var(--perf-text); max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.ga-tip i { font-size: 12px; font-weight: 900; font-style: normal; font-variant-numeric: tabular-nums; }
.ga-overflow { position: absolute; z-index: 5; transform: translate(-50%, -50%); font-size: 10px; font-weight: 850; color: var(--perf-text-muted);
  padding: 3px 9px; border-radius: 999px; background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }

/* HUD */
.ga-hud { position: absolute; z-index: 6; display: flex; flex-direction: column; gap: 2px; padding: 8px 11px; border-radius: 12px;
  background: var(--perf-glass); border: 1px solid var(--perf-border); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 10px 26px -18px rgba(0,0,0,0.6); }
.ga-hud-tl { top: 12px; left: 74px; } .ga-hud-tr { top: 12px; right: 12px; align-items: flex-end; }
.ga-hud-br { bottom: 12px; right: 12px; align-items: flex-end; }
.ga-hud-k { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-muted); }
.ga-hud-k :deep(svg) { color: var(--perf-gold); }
.ga-hud b { font-size: 16px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.ga-hud-br.ember { border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); animation: ga-ember 2.4s ease-in-out infinite; }
.ga-hud-br.ember .ga-hud-k, .ga-hud-br.ember b { color: var(--perf-conflict); }
.ga-hud-br.ember .ga-hud-k :deep(svg) { color: var(--perf-conflict); }
@keyframes ga-ember { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 16px -3px color-mix(in srgb, var(--perf-conflict) 55%, transparent); } }
.ga-tag { position: absolute; left: 74px; bottom: 12px; z-index: 6; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: var(--perf-gold); }

.ga-tip-enter-active, .ga-tip-leave-active { transition: opacity 0.18s, transform 0.18s var(--perf-spring); }
.ga-tip-enter-from, .ga-tip-leave-to { opacity: 0; transform: translateX(-50%) translateY(4px); }

@media (max-width: 760px) { .ga-hud-tl { left: 12px; top: auto; bottom: 12px; } .ga-tag, .ga-hud-br { display: none; } .ga-alt { display: none; } .ga-hud-tl { left: 12px; } }
@media (prefers-reduced-motion: reduce) {
  .ga-star, .ga-flake, .ga-contour, .ga-beacon, .ga-beacon-glow, .ga-beacon-ring, .ga-climber, .ga-climber-ping, .ga-hud-br.ember { animation: none !important; }
  .ga-rope { transition: none; stroke-dashoffset: 0; } .ga-alt-fill { transition: none; }
  .ga-flake { display: none; }
}
</style>
