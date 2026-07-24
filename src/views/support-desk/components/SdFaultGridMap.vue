<template>
  <!-- ═══════════ THE FAULT GRID — the agent desk's signature instrument ═══════════
       A night-city power grid rendered on phosphor glass (dark in BOTH themes — the
       display-panel trick). Categories/services are SUBSTATIONS wired to the central
       EXCHANGE; live incidents ride the feeders as ARC-FAULTS (flicker = SEV), a major
       incident BLACKS OUT its district with a rolling ripple, today's resolutions fire
       RE-ENERGIZE pulses back up the line. Click a substation → district lens; click a
       fault bead → open that incident. Pure SVG + global sd-inc-* keyframes. -->
  <div ref="rootEl" class="fgm" role="img" aria-label="Live incident grid map">
    <svg class="fgm-svg" viewBox="0 0 920 300" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="fgmFeeder" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f5a623" stop-opacity="0.05" />
          <stop offset="0.5" stop-color="#f5a623" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ffd166" stop-opacity="0.9" />
        </linearGradient>
        <radialGradient id="fgmCore" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffd166" stop-opacity="0.9" />
          <stop offset="0.55" stop-color="#f5a623" stop-opacity="0.32" />
          <stop offset="1" stop-color="#f5a623" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="fgmBlackout" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#04070b" stop-opacity="0.92" />
          <stop offset="0.8" stop-color="#04070b" stop-opacity="0.55" />
          <stop offset="1" stop-color="#04070b" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- graticule -->
      <g class="fgm-grat" aria-hidden="true">
        <line v-for="x in 12" :key="`v${x}`" :x1="x * 71" y1="8" :x2="x * 71" y2="292" />
        <line v-for="y in 4" :key="`h${y}`" x1="14" :y1="y * 60" x2="906" :y2="y * 60" />
      </g>

      <!-- the exchange (central node) -->
      <g class="fgm-exchange" transform="translate(460, 150)">
        <circle class="ex-halo" r="46" fill="url(#fgmCore)" />
        <circle class="ex-ring" r="24" />
        <circle class="ex-ring r2" r="31" />
        <circle class="ex-body" r="15" />
        <text class="ex-lbl" y="4">HQ</text>
        <text class="ex-sub" y="52">EXCHANGE · {{ activeTotal }} LIVE</text>
      </g>

      <!-- districts: feeder + substation + faults -->
      <g v-for="d in districts" :key="d.key" class="fgm-district"
         :class="{ blackout: d.blackout, hot: d.open > 0 }">
        <!-- feeder line HQ → substation -->
        <path class="feeder-base" :d="d.path" />
        <path class="feeder-flow" :d="d.path" :style="{ animationDuration: d.flowDur }" />
        <!-- blackout shroud + rolling ripple -->
        <template v-if="d.blackout">
          <circle class="bo-shroud" :cx="d.x" :cy="d.y" r="52" fill="url(#fgmBlackout)" />
          <circle class="bo-ripple" :cx="d.x" :cy="d.y" r="26" />
          <circle class="bo-ripple d2" :cx="d.x" :cy="d.y" r="26" />
        </template>
        <!-- substation -->
        <g class="sub" :transform="`translate(${d.x}, ${d.y})`" tabindex="0" role="button"
           :aria-label="`${d.label}: ${d.open} open incident(s)`"
           @click="$emit('district', d)" @keydown.enter="$emit('district', d)">
          <rect class="sub-pad" x="-17" y="-17" width="34" height="34" rx="9" />
          <rect class="sub-core" x="-9" y="-9" width="18" height="18" rx="5"
                :style="{ opacity: 0.45 + Math.min(0.55, d.open * 0.14) }" />
          <circle v-if="d.sev12 > 0 && !d.blackout" class="sub-alarm" r="22" />
          <text class="sub-lbl" y="33">{{ d.label }}</text>
          <text class="sub-count" y="46">{{ d.open }} OPEN<template v-if="d.breached"> · {{ d.breached }} BRC</template></text>
        </g>
        <!-- arc-faults riding the feeder -->
        <g v-for="f in d.faults" :key="f.id" class="fault" :class="`sev${f.sev}`"
           :transform="`translate(${f.px}, ${f.py})`" tabindex="0" role="button"
           :aria-label="`${f.number} ${f.subject}`"
           @click.stop="$emit('open', f)" @keydown.enter.stop="$emit('open', f)">
          <circle class="fault-glow" r="9" />
          <path class="fault-bolt" d="M-2.4,-5 L1.6,-1 L-0.6,-1 L2.4,5 L-1.6,0.6 L0.6,0.6 Z" />
          <title>{{ f.number }} · SEV{{ f.sev }} · {{ f.subject }}</title>
        </g>
        <!-- re-energize pulse (fires when the district resolved something today) -->
        <circle v-if="d.reenergized && !d.blackout" class="reener" :cx="d.x" :cy="d.y" r="20" />
      </g>

      <!-- scanline -->
      <rect class="fgm-scan" x="0" y="0" width="120" height="300" aria-hidden="true" />
    </svg>

    <!-- district hover legend (top-right corner readout) -->
    <div class="fgm-legend sd-mono" aria-hidden="true">
      <span><i class="lg-dot live" /> ENERGIZED</span>
      <span><i class="lg-dot arc" /> ARC-FAULT</span>
      <span><i class="lg-dot bo" /> BLACKOUT · MI</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { sevOf } from '@/composables/useSupportDesk'

const props = defineProps({
  stats: { type: Object, default: null },      // /incidents/stats payload
  incidents: { type: Array, default: () => [] }, // active-lens rows (≤100)
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['district', 'open'])

const rootEl = ref(null)

/* Six substation slots around the exchange (x, y in the 920×300 viewBox). */
const SLOTS = [
  { x: 130, y: 62 }, { x: 122, y: 224 }, { x: 320, y: 262 },
  { x: 640, y: 42 }, { x: 792, y: 120 }, { x: 742, y: 246 },
]
const HQ = { x: 460, y: 150 }

const activeTotal = computed(() => props.stats?.active_total ?? props.incidents.length)

/* Group live incidents into districts by category (fallback: first affected service,
   then "UNROUTED"). The stats by_category slice orders the slots; live rows attach
   their fault beads onto the feeder. */
const districts = computed(() => {
  const byKey = new Map()
  const catName = (r) => r.category_name || (r.affected_services || [])[0] || 'Unrouted'
  for (const r of props.incidents) {
    const label = catName(r)
    if (!byKey.has(label)) byKey.set(label, { label, rows: [] })
    byKey.get(label).rows.push(r)
  }
  // stable order: biggest districts first, cap 6 slots
  const groups = [...byKey.values()].sort((a, b) => b.rows.length - a.rows.length).slice(0, SLOTS.length)
  return groups.map((g, i) => {
    const slot = SLOTS[i]
    const open = g.rows.length
    const sev12 = g.rows.filter(r => sevOf(r) <= 2).length
    const blackout = g.rows.some(r => r.is_major_incident)
    const breached = g.rows.filter(r => r.sla_resolution_breached || r.sla_response_breached).length
    const reenergized = (props.stats?.resolved_today || 0) > 0 && i === 0
    // feeder: gentle curve HQ → slot
    const mx = (HQ.x + slot.x) / 2
    const my = (HQ.y + slot.y) / 2 + (slot.y > HQ.y ? 26 : -26)
    const path = `M${HQ.x},${HQ.y} Q${mx},${my} ${slot.x},${slot.y}`
    // up to 3 fault beads spaced along the feeder (quadratic bezier point at t)
    const bead = (t) => {
      const x = (1 - t) * (1 - t) * HQ.x + 2 * (1 - t) * t * mx + t * t * slot.x
      const y = (1 - t) * (1 - t) * HQ.y + 2 * (1 - t) * t * my + t * t * slot.y
      return { x, y }
    }
    const worst = [...g.rows].sort((a, b) => sevOf(a) - sevOf(b)).slice(0, 3)
    const faults = worst.map((r, j) => {
      const p = bead(0.42 + j * 0.18)
      return { id: r.id, number: r.ticket_number, subject: r.subject, sev: sevOf(r), px: p.x, py: p.y }
    })
    return {
      key: g.label, label: g.label.length > 14 ? `${g.label.slice(0, 13)}…` : g.label,
      x: slot.x, y: slot.y, path, open, sev12, blackout, breached, reenergized,
      faults, flowDur: `${Math.max(2.4, 7 - open)}s`,
    }
  })
})
</script>

<style scoped>
/* Phosphor glass — deliberately dark in BOTH themes (display panel). */
.fgm { position: relative; border-radius: 16px; overflow: hidden;
  background:
    radial-gradient(90% 120% at 50% -20%, rgba(245, 166, 35, 0.10), transparent 60%),
    var(--sd-inc-screen);
  border: 1px solid var(--sd-inc-brd);
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.55), var(--sd-inc-glow); }
.fgm-svg { display: block; width: 100%; height: auto; }

.fgm-grat line { stroke: var(--sd-inc-grid-line); stroke-width: 1; }

/* exchange */
.ex-halo { animation: sd-breathe 5s ease-in-out infinite; transform-origin: center; }
.ex-ring { fill: none; stroke: rgba(245, 166, 35, 0.5); stroke-width: 1.2; stroke-dasharray: 5 7;
  animation: sd-spin-slow 22s linear infinite; transform-origin: 0 0; transform-box: fill-box; }
.ex-ring.r2 { stroke: rgba(245, 166, 35, 0.22); stroke-dasharray: 2 9; animation-duration: 34s;
  animation-direction: reverse; }
.ex-body { fill: #10131a; stroke: #f5a623; stroke-width: 1.4; }
.ex-lbl { fill: #ffd166; font: 800 10px var(--sd-mono); text-anchor: middle; letter-spacing: 0.08em; }
.ex-sub { fill: var(--sd-inc-screen-dim); font: 700 8.5px var(--sd-mono); text-anchor: middle; letter-spacing: 0.18em; }

/* feeders */
.feeder-base { fill: none; stroke: rgba(245, 166, 35, 0.16); stroke-width: 1.6; }
.feeder-flow { fill: none; stroke: url(#fgmFeeder); stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 14 26; animation: sd-inc-current-flow 4s linear infinite; }
.blackout .feeder-flow { opacity: 0.12; animation-play-state: paused; }

/* substations */
.sub { cursor: pointer; outline: none; }
.sub-pad { fill: rgba(245, 166, 35, 0.06); stroke: rgba(245, 166, 35, 0.35); stroke-width: 1;
  transition: all 0.25s var(--sd-spring); }
.sub:hover .sub-pad, .sub:focus-visible .sub-pad { stroke: #ffd166; fill: rgba(245, 166, 35, 0.14);
  filter: drop-shadow(0 0 10px rgba(245, 166, 35, 0.5)); }
.sub-core { fill: #f5a623; filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.7)); }
.blackout .sub-core { fill: #3a3126; filter: none; }
.sub-alarm { fill: none; stroke: var(--sd-inc-arc); stroke-width: 1.2; opacity: 0.7;
  animation: sd-pulse-ring 2.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.sub-lbl { fill: var(--sd-inc-screen-ink); font: 800 10px var(--sd-mono); text-anchor: middle;
  letter-spacing: 0.08em; text-transform: uppercase; }
.sub-count { fill: var(--sd-inc-screen-dim); font: 700 8.5px var(--sd-mono); text-anchor: middle;
  letter-spacing: 0.12em; }
.blackout .sub-lbl { fill: #8a7350; }

/* arc-faults */
.fault { cursor: pointer; outline: none; }
.fault-glow { fill: rgba(240, 86, 74, 0.22); }
.fault-bolt { fill: #ffd166; stroke: rgba(240, 86, 74, 0.9); stroke-width: 0.8;
  animation: sd-inc-arc-flicker 2.6s steps(1) infinite; }
.fault.sev1 .fault-bolt { fill: #ff8f85; animation-duration: 1.4s; }
.fault.sev1 .fault-glow { fill: rgba(240, 86, 74, 0.4); animation: sd-breathe 1.6s ease-in-out infinite;
  transform-box: fill-box; transform-origin: center; }
.fault.sev2 .fault-bolt { animation-duration: 2s; }
.fault:hover .fault-glow, .fault:focus-visible .fault-glow { fill: rgba(255, 209, 102, 0.4); }

/* blackout ripples */
.bo-ripple { fill: none; stroke: var(--sd-inc-arc); stroke-width: 1.4; transform-box: fill-box;
  transform-origin: center; animation: sd-inc-blackout-ripple 2.8s ease-out infinite; }
.bo-ripple.d2 { animation-delay: 1.4s; }

/* re-energize */
.reener { fill: none; stroke: var(--sd-inc-live); stroke-width: 1.6; transform-box: fill-box;
  transform-origin: center; animation: sd-inc-reenergize 3.2s ease-out infinite; }

/* scanline */
.fgm-scan { fill: linear-gradient(90deg, transparent, rgba(255, 217, 160, 0.05), transparent);
  fill: rgba(255, 217, 160, 0.028); animation: fgm-scan-x 9s linear infinite; }
@keyframes fgm-scan-x { 0% { transform: translateX(-140px); } 100% { transform: translateX(940px); } }

/* legend */
.fgm-legend { position: absolute; top: 10px; right: 12px; display: flex; gap: 12px;
  font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-inc-screen-dim); }
.fgm-legend span { display: inline-flex; align-items: center; gap: 5px; }
.lg-dot { width: 7px; height: 7px; border-radius: 50%; }
.lg-dot.live { background: var(--sd-inc-live); box-shadow: 0 0 6px var(--sd-inc-live); }
.lg-dot.arc { background: #ffd166; box-shadow: 0 0 6px rgba(240, 86, 74, 0.9); }
.lg-dot.bo { background: #241d14; border: 1px solid var(--sd-inc-arc); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ex-halo,
  html:not([data-cinematic="on"]) .ex-ring,
  html:not([data-cinematic="on"]) .feeder-flow,
  html:not([data-cinematic="on"]) .sub-alarm,
  html:not([data-cinematic="on"]) .fault-bolt,
  html:not([data-cinematic="on"]) .fault-glow,
  html:not([data-cinematic="on"]) .bo-ripple,
  html:not([data-cinematic="on"]) .reener,
  html:not([data-cinematic="on"]) .fgm-scan { animation: none !important; }
}
</style>
