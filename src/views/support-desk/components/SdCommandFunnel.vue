<template>
  <!-- ═══════════ THE COMMAND FUNNEL — the admin desk's signature instrument ═══════════
       A braided-stream wall on obsidian glass (dark in BOTH themes): every source
       category feeds a FILAMENT that braids inward through the pulsing INCIDENT CORE,
       then diverges into three OUTFALLS — restored (emerald), escalated (fault red),
       in-flight (amber). Live MI events flare the core. Counters ride the junctions.
       Click an inflow → district lens; click an outfall → the matching board. -->
  <div class="cfn" role="img" aria-label="Desk-wide incident flow funnel">
    <svg class="cfn-svg" viewBox="0 0 960 320" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="cfnIn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fb923c" stop-opacity="0.12" />
          <stop offset="1" stop-color="#ffc46b" stop-opacity="0.85" />
        </linearGradient>
        <linearGradient id="cfnOutOk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#34d399" stop-opacity="0.85" />
          <stop offset="1" stop-color="#34d399" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="cfnOutEsc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f0564a" stop-opacity="0.85" />
          <stop offset="1" stop-color="#f0564a" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="cfnOutLive" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fb923c" stop-opacity="0.85" />
          <stop offset="1" stop-color="#fb923c" stop-opacity="0.1" />
        </linearGradient>
        <radialGradient id="cfnCore" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffc46b" stop-opacity="0.75" />
          <stop offset="0.6" stop-color="#fb923c" stop-opacity="0.2" />
          <stop offset="1" stop-color="#fb923c" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- wall graticule -->
      <g class="cfn-grat" aria-hidden="true">
        <line v-for="y in 5" :key="`h${y}`" x1="16" :y1="y * 53" x2="944" :y2="y * 53" />
      </g>

      <!-- inflow filaments -->
      <g v-for="(f, i) in inflows" :key="f.key" class="inflow" :class="{ hot: f.sev12 > 0 }">
        <path class="in-base" :d="f.path" :style="{ strokeWidth: f.w + 2 }" />
        <path class="in-flow" :d="f.path"
          :style="{ strokeWidth: f.w, animationDuration: f.dur, animationDelay: `${i * 0.35}s` }" />
        <g class="in-tap" :transform="`translate(20, ${f.y})`" tabindex="0" role="button"
           :aria-label="`${f.label}: ${f.count} incidents`" @click="$emit('district', f)"
           @keydown.enter="$emit('district', f)">
          <rect class="tap-pad" x="0" y="-13" rx="13" width="150" height="26" />
          <circle class="tap-dot" cx="16" cy="0" r="4" />
          <text class="tap-lbl" x="28" y="3.5">{{ f.label }}</text>
          <text class="tap-n" x="138" y="3.5">{{ f.count }}</text>
        </g>
      </g>

      <!-- the incident core -->
      <g class="core" transform="translate(520, 160)" tabindex="0" role="button"
         aria-label="Active incident core" @click="$emit('core')" @keydown.enter="$emit('core')">
        <circle class="core-halo" r="66" fill="url(#cfnCore)" />
        <circle class="core-ring r1" r="40" />
        <circle class="core-ring r2" r="48" />
        <circle v-if="miActive > 0" class="core-flare" r="42" />
        <circle v-if="miActive > 0" class="core-flare d2" r="42" />
        <text class="core-n" y="-2">{{ activeTotal }}</text>
        <text class="core-lbl" y="16">ACTIVE</text>
        <text v-if="miActive" class="core-mi" y="60">⚠ {{ miActive }} MAJOR</text>
      </g>

      <!-- outfalls -->
      <g v-for="o in outfalls" :key="o.key" class="outfall">
        <path class="out-base" :d="o.path" :style="{ strokeWidth: o.w + 2 }" />
        <path class="out-flow" :class="o.key" :d="o.path"
          :style="{ strokeWidth: o.w, animationDuration: o.dur }" />
        <g class="out-tap" :transform="`translate(806, ${o.y})`" tabindex="0" role="button"
           :aria-label="`${o.label}: ${o.count}`" @click="$emit('outfall', o.key)"
           @keydown.enter="$emit('outfall', o.key)">
          <rect class="tap-pad" x="0" y="-14" rx="14" width="138" height="28" />
          <text class="out-n" :class="o.key" x="16" y="4">{{ o.count }}</text>
          <text class="out-lbl" x="58" y="-1">{{ o.label }}</text>
          <text class="out-sub" x="58" y="9">{{ o.sub }}</text>
        </g>
      </g>

      <!-- riding beads on the busiest inflow -->
      <circle v-for="b in 3" :key="`bead${b}`" class="bead" r="3"
        :style="{ animationDelay: `${b * 2.2}s` }">
        <animateMotion v-if="beadPath" :dur="`${6.5 + b}s`" repeatCount="indefinite" :path="beadPath" />
      </circle>
    </svg>

    <div class="cfn-legend sd-mono" aria-hidden="true">
      <span><i class="lg in" /> INFLOW</span>
      <span><i class="lg ok" /> RESTORED · 24H</span>
      <span><i class="lg esc" /> ESCALATED</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stats: { type: Object, default: null },       // /incidents/stats payload
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
defineEmits(['district', 'core', 'outfall'])

const CORE = { x: 520, y: 160 }
const activeTotal = computed(() => props.stats?.active_total ?? 0)
const miActive = computed(() => props.stats?.major_active ?? 0)

/* Up to 6 inflow filaments from by_category (fallback: top_services). Width = share. */
const inflows = computed(() => {
  const cats = (props.stats?.by_category || []).slice(0, 6)
  const src = cats.length ? cats.map(c => ({ key: c.key || c.label, label: c.label, count: c.count, hotN: c.breached }))
    : (props.stats?.top_services || []).slice(0, 6).map(s => ({ key: s.service, label: s.service, count: s.count, hotN: s.sev12 }))
  const max = Math.max(1, ...src.map(s => s.count))
  const n = src.length || 1
  return src.map((s, i) => {
    const y = 46 + (228 / Math.max(1, n - 1 || 1)) * i
    const mx = (170 + CORE.x) / 2
    return {
      ...s,
      y,
      sev12: s.hotN || 0,
      w: 1.5 + (s.count / max) * 5,
      dur: `${Math.max(3, 9 - (s.count / max) * 5)}s`,
      path: `M170,${y} C${mx},${y} ${mx},${CORE.y} ${CORE.x - 46},${CORE.y}`,
    }
  })
})

const beadPath = computed(() => inflows.value[0]?.path || '')

const outfalls = computed(() => {
  const s = props.stats
  const rows = [
    { key: 'ok', label: 'RESTORED', sub: 'today', count: s?.resolved_today ?? 0, y: 78 },
    { key: 'live', label: 'IN FLIGHT', sub: 'working now', count: s?.active_total ?? 0, y: 160 },
    { key: 'esc', label: 'ESCALATED', sub: 'lifted tiers', count: (s?.by_sev?.sev1 ?? 0) + (s?.by_sev?.sev2 ?? 0), y: 242 },
  ]
  const max = Math.max(1, ...rows.map(r => r.count))
  return rows.map(r => {
    const mx = (CORE.x + 806) / 2
    return {
      ...r,
      w: 1.5 + (r.count / max) * 5,
      dur: `${Math.max(3.4, 9 - (r.count / max) * 4)}s`,
      path: `M${CORE.x + 46},${CORE.y} C${mx},${CORE.y} ${mx},${r.y} 806,${r.y}`,
    }
  })
})
</script>

<style scoped>
/* Obsidian wall — dark in BOTH themes (display panel). */
.cfn { position: relative; border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(80% 130% at 50% -30%, rgba(251, 146, 60, 0.10), transparent 60%),
    var(--sd-fun-wall);
  border: 1px solid var(--sd-fun-brd);
  box-shadow: inset 0 0 70px rgba(0, 0, 0, 0.6), var(--sd-fun-glow); }
.cfn-svg { display: block; width: 100%; height: auto; }
.cfn-grat line { stroke: var(--sd-fun-wall-line); stroke-width: 1; }

/* inflows */
.in-base { fill: none; stroke: rgba(251, 146, 60, 0.10); stroke-linecap: round; }
.in-flow { fill: none; stroke: url(#cfnIn); stroke-linecap: round; stroke-dasharray: 16 22;
  animation: sd-fun-stream-drift linear infinite; }
.inflow.hot .in-flow { filter: drop-shadow(0 0 5px rgba(240, 86, 74, 0.6)); }
.in-tap { cursor: pointer; outline: none; }
.tap-pad { fill: rgba(251, 146, 60, 0.06); stroke: rgba(251, 146, 60, 0.28); stroke-width: 1;
  transition: all 0.25s var(--sd-spring); }
.in-tap:hover .tap-pad, .in-tap:focus-visible .tap-pad,
.out-tap:hover .tap-pad, .out-tap:focus-visible .tap-pad {
  stroke: #ffc46b; fill: rgba(251, 146, 60, 0.14);
  filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.45)); }
.tap-dot { fill: #fb923c; }
.inflow.hot .tap-dot { fill: #f0564a; }
.tap-lbl { fill: var(--sd-fun-wall-ink); font: 700 10px var(--sd-mono); letter-spacing: 0.06em; }
.tap-n { fill: #ffc46b; font: 800 11px var(--sd-mono); text-anchor: end; }

/* core */
.core { cursor: pointer; outline: none; }
.core-halo { animation: sd-fun-core-pulse 4.5s ease-in-out infinite; transform-box: fill-box;
  transform-origin: center; }
.core-ring { fill: rgba(10, 8, 6, 0.75); stroke: rgba(251, 146, 60, 0.6); stroke-width: 1.4; }
.core-ring.r2 { fill: none; stroke: rgba(251, 146, 60, 0.28); stroke-dasharray: 4 8;
  animation: sd-spin-slow 26s linear infinite; transform-box: fill-box; transform-origin: center; }
.core-flare { fill: none; stroke: var(--sd-fun-esc); stroke-width: 1.6; transform-box: fill-box;
  transform-origin: center; animation: sd-fun-flare 2.6s ease-out infinite; }
.core-flare.d2 { animation-delay: 1.3s; }
.core-n { fill: #ffe9c9; font: 850 30px var(--sd-mono); text-anchor: middle; }
.core-lbl { fill: var(--sd-fun-wall-dim); font: 800 9px var(--sd-mono); letter-spacing: 0.24em;
  text-anchor: middle; }
.core-mi { fill: #ff9d94; font: 800 10px var(--sd-mono); letter-spacing: 0.14em; text-anchor: middle;
  animation: sd-inc-led 1.4s ease-in-out infinite; }

/* outfalls */
.out-base { fill: none; stroke: rgba(251, 146, 60, 0.08); stroke-linecap: round; }
.out-flow { fill: none; stroke-linecap: round; stroke-dasharray: 16 22;
  animation: sd-fun-stream-drift linear infinite; }
.out-flow.ok { stroke: url(#cfnOutOk); }
.out-flow.esc { stroke: url(#cfnOutEsc); }
.out-flow.live { stroke: url(#cfnOutLive); }
.out-tap { cursor: pointer; outline: none; }
.out-n { font: 850 16px var(--sd-mono); }
.out-n.ok { fill: #59e3ac; }
.out-n.esc { fill: #ff8f85; }
.out-n.live { fill: #ffc46b; }
.out-lbl { fill: var(--sd-fun-wall-ink); font: 800 9px var(--sd-mono); letter-spacing: 0.14em; }
.out-sub { fill: var(--sd-fun-wall-dim); font: 700 8px var(--sd-mono); letter-spacing: 0.08em; }

/* riding beads */
.bead { fill: #ffd9a0; filter: drop-shadow(0 0 6px rgba(255, 196, 107, 0.9)); opacity: 0.9; }

/* legend */
.cfn-legend { position: absolute; top: 10px; right: 14px; display: flex; gap: 12px;
  font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-fun-wall-dim); }
.cfn-legend span { display: inline-flex; align-items: center; gap: 5px; }
.lg { width: 7px; height: 7px; border-radius: 50%; }
.lg.in { background: #fb923c; }
.lg.ok { background: #34d399; }
.lg.esc { background: #f0564a; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .in-flow,
  html:not([data-cinematic="on"]) .out-flow,
  html:not([data-cinematic="on"]) .core-halo,
  html:not([data-cinematic="on"]) .core-ring.r2,
  html:not([data-cinematic="on"]) .core-flare,
  html:not([data-cinematic="on"]) .core-mi { animation: none !important; }
  html:not([data-cinematic="on"]) .bead { display: none; }
}
</style>
