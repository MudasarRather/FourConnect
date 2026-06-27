<template>
  <!-- ═══════════════════ THE MERIT CURVE ═══════════════════
       Merit Policy's signature instrument — the policy drawn as its actual
       transfer function: X = performance score (% of rating max), Y = hike %.
       Each band is a STEP ZONE (score range → hike window) forming an ascending
       staircase; a continuous oscilloscope PROBE sweeps the score axis with a
       live "score → band → hike" readout; uncovered score ranges show as red
       HATCHED gaps (a governance defect made visible). Distinct from every
       sibling settings motif (no transfer-curve / oscilloscope exists). -->
  <div ref="rootEl" class="mc" :class="{ compact, drawn }">
    <div class="mc-stage" :style="{ aspectRatio: compact ? '1000 / 150' : '1000 / 430' }">
      <svg class="mc-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern :id="hatchId" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" :fill="'color-mix(in srgb, var(--set-conflict) 8%, transparent)'" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--set-conflict)" stroke-width="1.4" opacity="0.5" />
          </pattern>
        </defs>

        <!-- grid -->
        <template v-if="!compact">
          <line v-for="(t, i) in yTicks" :key="'yg' + i" class="mc-grid" :x1="padL" :y1="Y(t)" :x2="W - padR" :y2="Y(t)" />
          <line v-for="(t, i) in xTicks" :key="'xg' + i" class="mc-grid soft" :x1="X(t)" :y1="padT" :x2="X(t)" :y2="baseline" />
        </template>

        <!-- gap zones (governance defect) -->
        <rect v-for="(g, i) in geo.gaps" :key="'gap' + i" class="mc-gap" :x="X(g.lo)" :y="padT" :width="Math.max(0, X(g.hi) - X(g.lo))" :height="baseline - padT" :fill="`url(#${hatchId})`" />

        <!-- band zones -->
        <g v-for="(z, i) in geo.zones" :key="'z' + i" class="mc-zone" :style="{ '--c': z.color, '--zi': i }">
          <rect class="mc-zone-fill" :x="z.x0" :y="padT" :width="z.w" :height="baseline - padT"
            :fill="`color-mix(in srgb, ${z.color} 13%, transparent)`" />
          <rect class="mc-zone-clamp" :x="z.x0" :y="z.yMaxPx" :width="z.w" :height="Math.max(0, z.yMinPx - z.yMaxPx)"
            :fill="`color-mix(in srgb, ${z.color} 42%, transparent)`" />
          <line class="mc-zone-cap" :x1="z.x0" :y1="z.yMaxPx" :x2="z.x1" :y2="z.yMaxPx" :stroke="z.color" />
          <line v-if="i < geo.zones.length - 1" class="mc-zone-sep" :x1="z.x1" :y1="padT" :x2="z.x1" :y2="baseline" />
        </g>

        <!-- staircase silhouette -->
        <path class="mc-stair" :d="geo.stairPath" pathLength="1" />

        <!-- axes -->
        <template v-if="!compact">
          <line class="mc-axis" :x1="padL" :y1="padT" :x2="padL" :y2="baseline" />
          <line class="mc-axis" :x1="padL" :y1="baseline" :x2="W - padR" :y2="baseline" />
        </template>
      </svg>

      <!-- axis labels (HTML, crisp) -->
      <template v-if="!compact">
        <span v-for="(t, i) in yTicks" :key="'yl' + i" class="mc-ylab" :style="{ top: pY(Y(t)) }">{{ t }}%</span>
        <span v-for="(t, i) in xTicks" :key="'xl' + i" class="mc-xlab" :style="{ left: pX(X(t)) }">{{ Math.round(t * 100) }}</span>
        <span class="mc-axis-cap y"><TrendingUp :size="11" /> hike %</span>
        <span class="mc-axis-cap x">performance score →</span>
      </template>

      <!-- oscilloscope probe -->
      <template v-if="!compact && sweeping">
        <span class="mc-probe" :style="{ left: pX(X(probe)) }">
          <span class="mc-probe-dot" :style="{ top: pY(Y(probeBandHmax)), '--c': probeColor }" />
        </span>
        <span class="mc-readout" :style="{ left: readoutLeft, '--c': probeColor }">
          <b>{{ Math.round(probe * 100) }}%</b>
          <span class="mc-readout-band">{{ probeBand ? probeBand.label : '—' }}</span>
          <em>{{ probeBand ? rangeLabel(probeBand) : '' }}</em>
        </span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import { sortedBands, analyzeBands, bandColor, bandAtFrac, hikeRangeLabel } from '../composables/meritBands'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  bands: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const reduced = prefersReduced()
const rootEl = ref(null)
const { visible } = useInView(rootEl, { threshold: 0.18 })

// uid so multiple curves on one page don't share the hatch pattern id
const uid = Math.random().toString(36).slice(2, 8)
const hatchId = `mc-hatch-${uid}`

const W = 1000
const H = computed(() => (props.compact ? 150 : 430))
const padL = computed(() => (props.compact ? 8 : 58))
const padR = computed(() => (props.compact ? 8 : 24))
const padT = computed(() => (props.compact ? 12 : 28))
const padB = computed(() => (props.compact ? 10 : 40))
const baseline = computed(() => H.value - padB.value)

const desc = computed(() => sortedBands(props.bands))
const yMax = computed(() => {
  const maxH = Math.max(2, ...desc.value.map((b) => b.hmax))
  return Math.max(4, Math.ceil((maxH * 1.12) / 2) * 2)
})
const X = (f) => padL.value + Math.max(0, Math.min(1, f)) * (W - padL.value - padR.value)
const Y = (h) => baseline.value - (Math.max(0, Math.min(yMax.value, h)) / yMax.value) * (baseline.value - padT.value)
const pX = (px) => (px / W * 100) + '%'
const pY = (py) => (py / H.value * 100) + '%'

const geo = computed(() => {
  const zones = desc.value.map((b, i) => ({
    ...b, color: bandColor(b, i),
    x0: X(b.lo), x1: X(b.hi), w: Math.max(0, X(b.hi) - X(b.lo)),
    yMaxPx: Y(b.hmax), yMinPx: Y(b.hmin),
  }))
  const a = analyzeBands(props.bands)
  // staircase: ascending by score, cap line + riser to next cap
  const asc = [...zones].sort((p, q) => p.lo - q.lo)
  let d = ''
  asc.forEach((z, i) => {
    if (i === 0) d += `M ${z.x0.toFixed(1)} ${z.yMaxPx.toFixed(1)}`
    else d += ` L ${z.x0.toFixed(1)} ${z.yMaxPx.toFixed(1)}`
    d += ` L ${z.x1.toFixed(1)} ${z.yMaxPx.toFixed(1)}`
  })
  return { zones, gaps: a.gaps, stairPath: d }
})

const yTicks = computed(() => {
  const m = yMax.value
  return [0, m * 0.25, m * 0.5, m * 0.75, m].map((v) => Math.round(v))
})
const xTicks = [0, 0.25, 0.5, 0.75, 1]

// ── draw-on ──
const drawn = ref(false)
// ── oscilloscope sweep ──
const probe = ref(0.6)
const sweeping = computed(() => !props.compact && !reduced)
let raf = null
let t0 = null
function loop(ts) {
  if (t0 == null) t0 = ts
  const e = (ts - t0) / 1000
  probe.value = 0.05 + (Math.sin(e * 0.45) * 0.5 + 0.5) * 0.9
  raf = requestAnimationFrame(loop)
}

const probeBand = computed(() => bandAtFrac(props.bands, probe.value))
const probeBandHmax = computed(() => probeBand.value ? probeBand.value.hmax : 0)
const probeColor = computed(() => {
  const i = desc.value.findIndex((b) => probeBand.value && b.lo === probeBand.value.lo && b.hi === probeBand.value.hi)
  return bandColor(probeBand.value || {}, i < 0 ? 0 : i)
})
const rangeLabel = (b) => hikeRangeLabel(b)
const readoutLeft = computed(() => {
  const pct = X(probe.value) / W * 100
  return Math.max(13, Math.min(82, pct)) + '%'
})

onMounted(() => {
  if (reduced) { drawn.value = true; return }
  const t = setInterval(() => {
    if (visible.value) {
      drawn.value = true
      if (sweeping.value && !raf) raf = requestAnimationFrame(loop)
      clearInterval(t)
    }
  }, 100)
  setTimeout(() => clearInterval(t), 4000)
})
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.mc { position: relative; width: 100%; }
.mc-stage { position: relative; width: 100%; }
.mc-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }

.mc-grid { stroke: var(--set-border); stroke-width: 1; opacity: 0.7; }
.mc-grid.soft { opacity: 0.4; stroke-dasharray: 2 5; }
.mc-axis { stroke: var(--set-border-strong); stroke-width: 1.2; }

.mc-gap { opacity: 0; transition: opacity 0.6s ease 0.5s; }
.mc.drawn .mc-gap { opacity: 1; }

.mc-zone-fill { opacity: 0; transform-box: fill-box; transform-origin: bottom; transform: scaleY(0.4);
  transition: opacity 0.5s ease, transform 0.6s var(--set-spring); transition-delay: calc(var(--zi) * 0.06s); }
.mc.drawn .mc-zone-fill { opacity: 1; transform: scaleY(1); }
.mc-zone-clamp { opacity: 0; transform-box: fill-box; transform-origin: bottom; transform: scaleY(0);
  transition: opacity 0.4s ease, transform 0.55s var(--set-spring); transition-delay: calc(0.15s + var(--zi) * 0.07s); }
.mc.drawn .mc-zone-clamp { opacity: 1; transform: scaleY(1); }
.mc-zone-cap { stroke-width: 2.4; stroke-linecap: round; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 55%, transparent));
  opacity: 0; transition: opacity 0.4s ease; transition-delay: calc(0.2s + var(--zi) * 0.07s); }
.mc.drawn .mc-zone-cap { opacity: 1; }
.mc-zone-sep { stroke: var(--set-canvas, #060607); stroke-width: 1.5; opacity: 0.5; }

.mc-stair { fill: none; stroke: var(--set-gold); stroke-width: 1.6; stroke-linejoin: round; opacity: 0.0;
  stroke-dasharray: 1; stroke-dashoffset: 1; vector-effect: non-scaling-stroke; }
.mc.drawn .mc-stair { opacity: 0.55; stroke-dashoffset: 0; transition: stroke-dashoffset 1.2s var(--set-spring) 0.2s, opacity 0.5s ease 0.2s; }

/* axis labels */
.mc-ylab { position: absolute; left: 0; transform: translateY(-50%); width: 46px; text-align: right; padding-right: 7px;
  font-size: 9.5px; font-weight: 700; color: var(--set-text-dim); font-variant-numeric: tabular-nums; }
.mc-xlab { position: absolute; bottom: 16px; transform: translateX(-50%); font-size: 9.5px; font-weight: 700; color: var(--set-text-dim); font-variant-numeric: tabular-nums; }
.mc-axis-cap { position: absolute; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.mc-axis-cap :deep(svg) { color: var(--set-gold); }
.mc-axis-cap.y { top: 6px; left: 6px; }
.mc-axis-cap.x { bottom: 0; right: 8px; }

/* oscilloscope probe */
.mc-probe { position: absolute; top: 6%; bottom: 9%; width: 0; pointer-events: none;
  border-left: 1.5px dashed color-mix(in srgb, var(--set-gold) 55%, transparent); }
.mc-probe-dot { position: absolute; left: 0; transform: translate(-50%, -50%); width: 11px; height: 11px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--c) 62%); box-shadow: 0 0 12px var(--c), 0 0 4px var(--c); }
.mc-readout { position: absolute; top: 2px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px; white-space: nowrap; pointer-events: none;
  background: color-mix(in srgb, var(--set-surface-elevated) 86%, transparent); border: 1px solid color-mix(in srgb, var(--c) 38%, transparent);
  backdrop-filter: blur(8px); box-shadow: 0 8px 22px -12px rgba(0,0,0,0.6); }
.mc-readout b { font-size: 12px; font-weight: 900; color: var(--set-text); font-variant-numeric: tabular-nums; }
.mc-readout-band { font-size: 10.5px; font-weight: 700; color: var(--c); }
.mc-readout em { font-style: normal; font-size: 10px; font-weight: 750; color: var(--set-text-muted); font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .mc-zone-fill, .mc-zone-clamp, .mc-zone-cap, .mc-stair, .mc-gap { transition: none; }
}
</style>
