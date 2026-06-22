<template>
  <div ref="rootEl" class="sky" :class="{ empty: !plotted.length }" @pointermove="onMove" @pointerleave="hover = -1">
    <!-- ░ atmospheric layers — all CSS gradients (theme-adaptive, reliable) ░ -->
    <span class="sky-sun" aria-hidden="true" />
    <span class="sky-rays" aria-hidden="true" />
    <span class="sky-aurora a1" aria-hidden="true" />
    <span class="sky-aurora a2" aria-hidden="true" />
    <span class="sky-cloud c1" aria-hidden="true" />
    <span class="sky-cloud c2" aria-hidden="true" />
    <span class="sky-cloud c3" aria-hidden="true" />
    <span class="sky-cloud c4" aria-hidden="true" />

    <svg class="sky-svg" viewBox="0 0 1000 240" preserveAspectRatio="none" role="img"
      :aria-label="`${plotted.length} travel trajectories`">
      <defs>
        <filter id="sky-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" /></filter>
        <filter id="sky-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>

      <!-- altitude strata -->
      <g class="sky-grid" aria-hidden="true">
        <line v-for="y in 3" :key="'h' + y" x1="40" :y1="44 + y * 42" x2="960" :y2="44 + y * 42" />
      </g>

      <!-- runway approach lights converging on the horizon vanishing point -->
      <g class="sky-rwy" aria-hidden="true">
        <line class="rwy-center" x1="500" y1="246" x2="500" y2="198" />
        <line v-for="(l, i) in runway" :key="'rw' + i" :x1="l.x1" y1="246" :x2="l.x2" y2="198"
          :style="{ '--d': l.delay }" />
      </g>

      <!-- horizon line -->
      <line class="sky-horizon" x1="20" y1="214" x2="980" y2="214" />

      <!-- twinkling stars (night only) -->
      <g class="sky-stars" aria-hidden="true">
        <circle v-for="(st, i) in stars" :key="'st' + i" class="sky-star" :cx="st.x" :cy="st.y" :r="st.r"
          :style="{ '--d': st.delay + 's', '--o': st.o }" />
      </g>

      <!-- trajectories — jets riding glowing arcs, with contrails -->
      <g v-for="(t, i) in plotted" :key="t.id" class="traj" :class="{ dim: hover > -1 && hover !== i, hot: hover === i }"
        :style="{ '--c': t.hex }" @pointerenter="hover = i" @click="$emit('open', t.req)">
        <title>{{ t.from }} → {{ t.to }} · {{ t.empName }} · {{ t.statusLabel }}</title>
        <path class="traj-glow" :d="t.d" />
        <path class="traj-path" :d="t.d" />
        <path class="traj-hit" :d="t.d" />
        <!-- endpoints -->
        <circle class="traj-node o" :cx="t.x0" :cy="t.y" r="3.4" />
        <circle class="traj-node d" :cx="t.x1" :cy="t.y" r="3.4" />
        <text class="traj-code" :x="t.x0" :y="t.y - 9" text-anchor="middle">{{ t.fromCode }}</text>
        <text class="traj-code" :x="t.x1" :y="t.y - 9" text-anchor="middle">{{ t.toCode }}</text>
        <!-- jet + contrail riding the arc -->
        <template v-if="!reduced">
          <path class="traj-trail far" :d="t.d" pathLength="1" stroke-dasharray="0.24 0.76">
            <animate attributeName="stroke-dashoffset" :dur="t.dur" :begin="`-${t.offset}s`"
              from="0.24" to="-0.76" repeatCount="indefinite" />
          </path>
          <path class="traj-trail near" :d="t.d" pathLength="1" stroke-dasharray="0.1 0.9">
            <animate attributeName="stroke-dashoffset" :dur="t.dur" :begin="`-${t.offset}s`"
              from="0.1" to="-0.9" repeatCount="indefinite" />
          </path>
          <circle class="traj-comet" r="6.5" filter="url(#sky-blur)">
            <animateMotion :path="t.d" :dur="t.dur" repeatCount="indefinite" rotate="auto" :begin="`-${t.offset}s`" />
          </circle>
          <path class="traj-plane" d="M0,0 L-10,4.2 L-6.5,0 L-10,-4.2 Z">
            <animateMotion :path="t.d" :dur="t.dur" repeatCount="indefinite" rotate="auto" :begin="`-${t.offset}s`" />
          </path>
        </template>
        <circle v-else class="traj-comet" :cx="(t.x0 + t.x1) / 2" :cy="t.apexY + 6" r="3.4" />
      </g>
    </svg>

    <!-- ambient sweep + floating particles -->
    <span class="sky-sweep" aria-hidden="true" />
    <i v-for="p in 7" :key="'pt' + p" class="sky-particle" :style="particleStyle(p)" aria-hidden="true" />

    <!-- empty -->
    <div v-if="!plotted.length" class="sky-empty">
      <Radar :size="26" />
      <span>Sky is clear — no journeys in this view yet</span>
    </div>

    <!-- caption -->
    <div v-else class="sky-cap">
      <span class="cap-live"><i /> LIVE</span>
      <span class="cap-txt">{{ plotted.length }} of {{ total }} journeys plotted</span>
      <span v-if="soonest" class="cap-soon"><PlaneTakeoff :size="11" /> next departure {{ soonest }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Radar, PlaneTakeoff } from 'lucide-vue-next'
import { airportCode, statusMeta } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  requests: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
})
defineEmits(['open'])

const reduced = prefersReduced()
const rootEl = ref(null)
const hover = ref(-1)

const PRI_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
const daysTo = (d) => {
  if (!d) return 9e9
  const ms = new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

// runway approach lights — side rails converging on the horizon vanishing point (x=500)
const runway = [{ x1: 96, x2: 472 }, { x1: 320, x2: 488 }, { x1: 680, x2: 512 }, { x1: 904, x2: 528 }]
  .map((l, i) => ({ ...l, delay: (i * 0.5).toFixed(1) + 's' }))

// ambient particle motes
const particleStyle = (i) => {
  const left = 10 + ((i * 47) % 80)
  const delay = ((i * 0.8) % 5).toFixed(1)
  const dur = (6 + ((i * 1.7) % 5)).toFixed(1)
  const size = 1.5 + (i % 3)
  return { left: left + '%', width: size + 'px', height: size + 'px', animationDelay: delay + 's', animationDuration: dur + 's' }
}

// pick the most relevant journeys: active/upcoming first, then urgency, then soonest
const ranked = computed(() => {
  const live = props.requests.filter(r => !['REJECTED', 'CANCELLED'].includes(r.status))
  return [...live].sort((a, b) => {
    const aUp = ['IN_PROGRESS', 'APPROVED', 'PENDING_APPROVAL'].includes(a.status) ? 0 : 1
    const bUp = ['IN_PROGRESS', 'APPROVED', 'PENDING_APPROVAL'].includes(b.status) ? 0 : 1
    if (aUp !== bUp) return aUp - bUp
    const pr = (PRI_RANK[a.priority] ?? 2) - (PRI_RANK[b.priority] ?? 2)
    if (pr) return pr
    return daysTo(a.departure_date) - daysTo(b.departure_date)
  }).slice(0, 6)
})

const plotted = computed(() => {
  const arr = ranked.value
  const n = arr.length
  return arr.map((r, i) => {
    const laneY = n <= 1 ? 120 : 72 + i * ((182 - 72) / (n - 1))
    const days = Math.max(1, Number(r.num_days) || 1)
    const lift = 38 + Math.min(15, days) / 15 * 46
    const apexY = Math.max(20, laneY - lift)
    const x0 = 80, x1 = 920
    const m = statusMeta(r.status)
    return {
      id: r.id, req: r, x0, x1, y: laneY, apexY,
      d: `M${x0},${laneY} Q500,${apexY} ${x1},${laneY}`,
      from: r.from_location, to: r.to_location,
      fromCode: airportCode(r.from_location), toCode: airportCode(r.to_location),
      empName: r.employee_name || '—', hex: m.hex, statusLabel: m.label,
      dur: (6.5 + i * 1.15).toFixed(1) + 's', offset: (i * 1.7).toFixed(1),
    }
  })
})

const soonest = computed(() => {
  const upc = props.requests
    .filter(r => ['APPROVED', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(r.status))
    .map(r => daysTo(r.departure_date)).filter(d => d >= 0).sort((a, b) => a - b)
  if (!upc.length) return ''
  const d = upc[0]
  return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d}d`
})

// deterministic star field (no Math.random per-frame)
const stars = computed(() => {
  const out = []
  let s = 1337
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280
    const x = 30 + (s % 940)
    s = (s * 9301 + 49297) % 233280
    const y = 16 + (s % 150)
    s = (s * 9301 + 49297) % 233280
    out.push({ x, y, r: 0.6 + (s % 10) / 10, delay: ((s % 40) / 10).toFixed(1), o: 0.25 + (s % 6) / 11 })
  }
  return out
})

const onMove = () => { /* reserved for parallax; pointermove keeps hover responsive on touch */ }
</script>

<style scoped>
.sky {
  /* ── DARK (default) — deep warm dusk ── */
  --sky-grad: linear-gradient(176deg, #140e0a 0%, #1f140d 40%, #341f0f 70%, #5a3413 100%);
  --sky-horizon-glow: radial-gradient(140% 100% at 50% 122%, rgba(251,191,36,0.5), rgba(251,146,60,0.16) 32%, transparent 62%);
  --sky-sun-core: rgba(255,240,200,0.7);
  --sky-sun-mid: rgba(251,146,60,0.28);
  --sky-cloud: rgba(255,222,176,0.07);
  --sky-cloud-o: 0.6;
  --sky-grid: rgba(255,255,255,0.045);
  --sky-horizon-line: rgba(252,211,77,0.55);
  --sky-plane: #ffffff;
  --sky-trail: rgba(255,243,214,0.85);
  --sky-particle: rgba(255,237,180,0.85);
  --sky-ray: rgba(252,211,77,0.08);
  --sky-star-d: block;
  --sky-empty-fg: var(--trv-text-dim);
  --sky-empty-ic: var(--trv-amber);

  position: relative; width: 100%; height: 208px; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--trv-border-strong); isolation: isolate;
  background: var(--sky-horizon-glow), var(--sky-grad);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), var(--trv-card-shadow);
}

/* ── LIGHT — bright warm daytime sky (no dark!) ── */
[data-theme="light"] .sky {
  --sky-grad: linear-gradient(176deg, #fefaf2 0%, #fdeed4 36%, #fcdca8 68%, #f6bd76 100%);
  --sky-horizon-glow: radial-gradient(140% 100% at 50% 124%, rgba(255,236,182,0.95), rgba(251,191,36,0.34) 34%, transparent 66%);
  --sky-sun-core: rgba(255,253,244,0.98);
  --sky-sun-mid: rgba(255,214,140,0.6);
  --sky-cloud: rgba(255,255,255,0.95);
  --sky-cloud-o: 0.92;
  --sky-grid: rgba(180,120,40,0.10);
  --sky-horizon-line: rgba(217,119,6,0.42);
  --sky-plane: #6b3d12;
  --sky-trail: rgba(255,255,255,0.96);
  --sky-particle: rgba(255,255,255,0.9);
  --sky-ray: rgba(255,201,120,0.16);
  --sky-star-d: none;
  --sky-empty-fg: #8a6a3a;
  --sky-empty-ic: #d97706;
  border-color: rgba(217,119,6,0.26);
}

/* ── sun + rays ── */
.sky-sun {
  position: absolute; left: 50%; bottom: -58px; width: 234px; height: 234px; transform: translateX(-50%);
  border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(2px);
  background: radial-gradient(circle, var(--sky-sun-core) 0%, var(--sky-sun-mid) 38%, transparent 70%);
  animation: sky-sun 6.5s ease-in-out infinite;
}
.sky-rays {
  position: absolute; left: 50%; top: 104%; width: 150%; aspect-ratio: 1 / 1;
  transform: translate(-50%, -50%); pointer-events: none; z-index: 0; mix-blend-mode: screen; opacity: 0.8;
  background: repeating-conic-gradient(from 0deg at 50% 50%, var(--sky-ray) 0deg 2.4deg, transparent 2.4deg 13deg);
  -webkit-mask: radial-gradient(closest-side, #000 0%, #000 24%, transparent 72%);
          mask: radial-gradient(closest-side, #000 0%, #000 24%, transparent 72%);
  animation: sky-rays 52s linear infinite;
}

/* ── aurora ribbons (ambient colour wash) ── */
.sky-aurora { position: absolute; width: 56%; height: 92px; border-radius: 50%; filter: blur(36px); mix-blend-mode: screen; pointer-events: none; z-index: 0; }
.sky-aurora.a1 { top: 12%; left: -12%; opacity: 0.5; background: radial-gradient(closest-side, rgba(251,146,60,0.55), transparent); animation: sky-aur1 16s ease-in-out infinite; }
.sky-aurora.a2 { top: 34%; right: -12%; opacity: 0.45; background: radial-gradient(closest-side, rgba(245,158,11,0.5), transparent); animation: sky-aur2 20s ease-in-out infinite; }

/* ── drifting parallax clouds ── */
.sky-cloud { position: absolute; border-radius: 50%; filter: blur(16px); pointer-events: none; z-index: 0;
  background: radial-gradient(closest-side, var(--sky-cloud), transparent 78%); }
.sky-cloud.c1 { width: 250px; height: 60px; top: 16%; animation: cloud 34s linear infinite; }
.sky-cloud.c2 { width: 180px; height: 46px; top: 40%; animation: cloud 27s linear infinite; animation-delay: -12s; }
.sky-cloud.c3 { width: 320px; height: 74px; top: 26%; animation: cloud 44s linear infinite; animation-delay: -28s; }
.sky-cloud.c4 { width: 140px; height: 40px; top: 56%; animation: cloud 22s linear infinite; animation-delay: -6s; }

.sky-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 1; }
.sky-sweep {
  position: absolute; inset: -40% -10%; pointer-events: none; z-index: 2; mix-blend-mode: screen;
  background: linear-gradient(105deg, transparent 42%, rgba(255,236,180,0.16) 50%, transparent 58%);
  animation: sky-sweep 7.5s ease-in-out infinite;
}
.sky-particle { position: absolute; bottom: 8%; border-radius: 50%; background: var(--sky-particle);
  box-shadow: 0 0 6px var(--sky-particle); opacity: 0; animation: sky-mote linear infinite; z-index: 2; }

.sky-grid line { stroke: var(--sky-grid); stroke-width: 1; }
.sky-horizon { stroke: var(--sky-horizon-line); stroke-width: 1.4; filter: drop-shadow(0 0 4px var(--sky-horizon-line)); }

.sky-rwy line { stroke: color-mix(in srgb, var(--sky-horizon-line) 60%, transparent); stroke-width: 1.2; stroke-dasharray: 5 17; animation: sky-approach 2.4s linear infinite; animation-delay: var(--d, 0s); }
.sky-rwy .rwy-center { stroke: var(--sky-horizon-line); }

.sky-stars { display: var(--sky-star-d, block); }
.sky-star { fill: #fff; opacity: var(--o, 0.4); animation: sky-twinkle 3.4s ease-in-out infinite; animation-delay: var(--d, 0s); }

/* ── trajectories + jets ── */
.traj { cursor: pointer; transition: opacity 0.3s; }
.traj.dim { opacity: 0.22; }
.traj-glow { fill: none; stroke: var(--c); stroke-width: 6; stroke-linecap: round; opacity: 0.2; filter: url(#sky-blur); }
.traj-path { fill: none; stroke: var(--c); stroke-width: 2.2; stroke-linecap: round;
  stroke-dasharray: 1500; animation: trv-arc-fly 1.6s var(--trv-spring) backwards;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 60%, transparent)); --trv-arc-len: 1500; }
.traj.hot .traj-path { stroke-width: 3; }
.traj.hot .traj-glow { opacity: 0.4; }
.traj-hit { fill: none; stroke: transparent; stroke-width: 18; }
.traj-node { fill: var(--c); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 70%, transparent)); }
.traj-node.o { fill: var(--trv-amber-bright); }
.traj-code { fill: var(--trv-text-secondary); font-family: var(--trv-mono); font-size: 12px; font-weight: 700;
  letter-spacing: 0.04em; opacity: 0; transition: opacity 0.25s; }
.traj.hot .traj-code { opacity: 1; fill: var(--trv-amber-bright); }
[data-theme="light"] .traj.hot .traj-code { fill: #b45309; }

.traj-trail { fill: none; stroke: var(--sky-trail); stroke-linecap: round; filter: url(#sky-soft); }
.traj-trail.far { stroke-width: 4.5; opacity: 0.32; }
.traj-trail.near { stroke-width: 2.6; opacity: 0.8; }
.traj-comet { fill: var(--sky-trail); opacity: 0.5; }
.traj-plane { fill: var(--sky-plane); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 70%, transparent)); }

.sky-empty {
  position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px; color: var(--sky-empty-fg); font-size: 12.5px;
}
.sky-empty svg { color: var(--sky-empty-ic); opacity: 0.8; }

.sky-cap {
  position: absolute; left: 14px; bottom: 11px; z-index: 4; display: flex; align-items: center; gap: 12px;
  font-size: 10.5px; flex-wrap: wrap;
}
.cap-live { display: inline-flex; align-items: center; gap: 5px; font-weight: 800; letter-spacing: 0.14em; color: var(--trv-amber-bright); }
[data-theme="light"] .cap-live { color: #b45309; }
.cap-live i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; animation: sky-blink 1.6s ease-in-out infinite; }
.cap-txt { color: var(--trv-text-secondary); font-family: var(--trv-mono); }
.cap-soon { display: inline-flex; align-items: center; gap: 4px; color: var(--trv-st-approved); }

@keyframes sky-sweep { 0%, 100% { transform: translateX(-12%); } 50% { transform: translateX(12%); } }
@keyframes sky-twinkle { 0%, 100% { opacity: calc(var(--o, 0.4) * 0.35); } 50% { opacity: var(--o, 0.4); } }
@keyframes sky-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes sky-rays { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes sky-sun { 0%, 100% { opacity: 0.78; transform: translateX(-50%) scale(1); } 50% { opacity: 1; transform: translateX(-50%) scale(1.08); } }
@keyframes sky-aur1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30%, -10%); } }
@keyframes sky-aur2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-28%, 9%); } }
@keyframes sky-approach { from { stroke-dashoffset: 44; } to { stroke-dashoffset: 0; } }
@keyframes sky-mote { 0% { transform: translateY(0) scale(0.7); opacity: 0; } 16% { opacity: 0.85; } 100% { transform: translateY(-150px) scale(1); opacity: 0; } }
@keyframes cloud { 0% { transform: translateX(-40%); opacity: 0; } 12% { opacity: var(--sky-cloud-o, 0.7); } 88% { opacity: var(--sky-cloud-o, 0.7); } 100% { transform: translateX(440%); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .sky-sweep, .sky-particle, .cap-live i, .sky-rays, .sky-sun, .sky-aurora, .sky-cloud, .sky-rwy line, .sky-star { animation: none; }
  .sky-particle { display: none; }
  .traj-path { animation: none; }
}
@media (max-width: 640px) { .sky { height: 176px; } }
</style>
