<template>
  <div ref="root" class="sh" :class="{ reduced, idle: score == null }" @pointermove="onMove" @pointerleave="reset">
    <!-- ambient field -->
    <div class="sh-fx" aria-hidden="true" :style="parallax">
      <span class="sh-conic" />
      <span class="sh-aura" />
      <span v-for="n in 10" :key="n" class="sh-mote" :style="moteStyle(n)" />
    </div>

    <span class="sh-eye"><Compass :size="11" /> Your standing</span>

    <!-- semicircular merit-band gauge -->
    <svg class="sh-svg" viewBox="0 0 280 172" role="img" :aria-label="ariaLabel">
      <defs>
        <filter id="shGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <!-- track -->
      <path class="sh-track" :d="arc(0, 1)" />

      <!-- band segments -->
      <path v-for="b in bandArcs" :key="b.key" class="sh-band" :class="{ on: b.key === activeKey }" :d="b.d"
        :style="{ stroke: b.color, '--c': b.color, '--dash': b.len, '--dashFrom': b.len, '--delay': b.delay + 's' }" />

      <!-- sweeping read-head shimmer along the rail -->
      <path class="sh-sweep" :d="arc(0, 1)" />

      <!-- filled progress up to current standing -->
      <path v-if="score != null" class="sh-fill" :d="arc(0, shownFrac)" :style="{ stroke: activeColor }" />

      <!-- tick markers between bands -->
      <g class="sh-ticks">
        <line v-for="(t, i) in tickPts" :key="i" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" />
      </g>

      <!-- needle -->
      <g class="sh-needle" :style="{ transform: 'rotate(' + needleDeg + 'deg)' }">
        <line class="sh-needle-stem" :x1="CX" :y1="CY" :x2="CX" :y2="CY - (R - 30)" :style="{ stroke: activeColor }" />
        <circle class="sh-needle-tip" :cx="CX" :cy="CY - (R - 30)" r="5.5" :style="{ fill: activeColor }" filter="url(#shGlow)" />
        <circle v-if="score != null && !reduced" class="sh-needle-ping" :cx="CX" :cy="CY - (R - 30)" r="5.5" :style="{ stroke: activeColor }" />
      </g>
      <circle class="sh-hub" :cx="CX" :cy="CY" r="8" />
      <circle class="sh-hub-dot" :cx="CX" :cy="CY" r="3.5" :style="{ fill: activeColor }" />
    </svg>

    <!-- center readout -->
    <div class="sh-read">
      <template v-if="score != null">
        <b class="sh-read-val" :style="{ color: activeColor }"><SetCountUp :value="score" :decimals="1" /><i>/{{ max }}</i></b>
        <span class="sh-read-band" :style="{ '--c': activeColor }">{{ activeLabel }}</span>
      </template>
      <template v-else>
        <b class="sh-read-val muted">—</b>
        <span class="sh-read-empty">Awaiting your first score</span>
      </template>
    </div>

    <!-- band legend rail -->
    <div class="sh-legend">
      <span v-for="b in bands" :key="b.key" class="sh-leg" :class="{ on: b.key === activeKey }" :style="{ '--c': bandColor(b.key) }">
        <i /><em>{{ b.short }}</em>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { Compass } from 'lucide-vue-next'
import SetCountUp from '../../settings/components/SetCountUp.vue'
import { DEFAULT_MERIT_BANDS, bandTone } from '@/composables/usePerformance'

const props = defineProps({
  score: { type: Number, default: null },
  max: { type: Number, default: 5 },
  band: { type: String, default: null },   // backend final_rating_band label, if any
  reduced: { type: Boolean, default: false },
})

// geometry — semicircle over the top: f=0 left, f=0.5 top, f=1 right
const CX = 140, CY = 140, R = 116
const ang = (f) => (1 - Math.max(0, Math.min(1, f))) * Math.PI        // radians; f0→π, f1→0
const pt = (f, r = R) => ({ x: +(CX + r * Math.cos(ang(f))).toFixed(2), y: +(CY - r * Math.sin(ang(f))).toFixed(2) })
function arc(f0, f1, r = R) {
  const a = pt(f0, r), b = pt(f1, r)
  const large = Math.abs(f1 - f0) > 0.5 ? 1 : 0
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`   // sweep=1 (clockwise over the top)
}

// merit bands (mirror of company policy) — short labels for the legend
const SHORT = { EXCEPTIONAL: 'Exceptional', EXCEEDS: 'Exceeds', MEETS: 'Meets', PARTIAL: 'Partial', BELOW: 'Below' }
const bands = computed(() => DEFAULT_MERIT_BANDS.map(b => ({ ...b, short: SHORT[b.key] || b.label })))
const bandColor = (k) => bandTone(k)

// each band drawn as an arc spanning its fraction window (clamped to 0..1)
const ARC_LEN = Math.PI * R   // semicircle arc length (px) for dash animation
const bandArcs = computed(() => bands.value.map((b, i) => {
  const lo = Math.max(0, Math.min(1, b.frac_min)), hi = Math.max(0, Math.min(1, b.frac_max))
  const len = +((hi - lo) * ARC_LEN).toFixed(1)
  return { key: b.key, color: bandColor(b.key), d: arc(lo, hi), len, delay: +(0.15 + i * 0.08).toFixed(2) }
}))

// tick markers at each band boundary
const tickPts = computed(() => {
  const fs = [...new Set(bands.value.flatMap(b => [Math.max(0, b.frac_min), Math.min(1, b.frac_max)]))].sort((a, b) => a - b)
  return fs.map(f => {
    const o = pt(f, R + 9), inn = pt(f, R - 9)
    return { x1: inn.x, y1: inn.y, x2: o.x, y2: o.y }
  })
})

const frac = computed(() => props.score == null ? 0 : Math.max(0, Math.min(1, props.score / props.max)))
const activeBand = computed(() => {
  // prefer the backend-resolved band label; else derive from the score fraction
  if (props.band) { const m = bands.value.find(b => b.label === props.band || b.key === props.band); if (m) return m }
  return bands.value.find(b => frac.value >= b.frac_min && frac.value < b.frac_max) || bands.value[bands.value.length - 1]
})
const activeKey = computed(() => props.score == null ? null : activeBand.value?.key)
const activeColor = computed(() => props.score == null ? 'var(--perf-unset)' : bandColor(activeBand.value?.key))
const activeLabel = computed(() => activeBand.value?.label || '—')

// needle — armed after mount so the sweep animates from rest (left) to the value
const armed = ref(false)
onMounted(() => { nextTick(() => { armed.value = true }) })
const shownFrac = computed(() => (armed.value || props.reduced) ? frac.value : 0)
const needleDeg = computed(() => ((armed.value || props.reduced ? frac.value : 0) - 0.5) * 180)

const ariaLabel = computed(() => props.score == null ? 'No score yet' : `Standing ${props.score} of ${props.max} — ${activeLabel.value}`)

// ambient motes
const moteStyle = (n) => {
  const x = 12 + (n * 71) % 76, y = 18 + (n * 37) % 52, dur = 7 + (n % 5), del = (n % 6) * 0.7
  return { left: x + '%', top: y + '%', '--md': dur + 's', '--mdelay': del + 's' }
}

// pointer parallax on the atmosphere
const root = ref(null)
const parallax = ref({})
function onMove(e) {
  if (props.reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  parallax.value = { transform: `translate3d(${(-dx * 14).toFixed(1)}px, ${(-dy * 10).toFixed(1)}px, 0)` }
}
const reset = () => { parallax.value = {} }
</script>

<style scoped>
.sh { position: relative; overflow: hidden; border-radius: 20px; padding: 14px 16px 16px; min-height: 232px;
  display: flex; flex-direction: column; align-items: center;
  background:
    radial-gradient(90% 80% at 50% 4%, color-mix(in srgb, var(--perf-gold) 10%, transparent), transparent 62%),
    linear-gradient(180deg, var(--perf-surface), var(--perf-panel));
  border: 1px solid var(--perf-border); }

.sh-fx { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.sh-conic { position: absolute; left: 50%; top: 116px; width: 320px; height: 320px; transform: translate(-50%, -50%);
  border-radius: 50%; opacity: 0.5; mix-blend-mode: screen;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--perf-gold) 26%, transparent), transparent 42%, color-mix(in srgb, var(--perf-orange) 22%, transparent), transparent 72%);
  filter: blur(20px); animation: sh-spin 26s linear infinite; }
.sh-aura { position: absolute; left: 50%; top: 30px; width: 220px; height: 150px; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 22%, transparent), transparent 70%); filter: blur(38px); opacity: 0.5;
  animation: sh-breathe 7s var(--perf-ease) infinite; }
.sh-mote { position: absolute; width: 2.5px; height: 2.5px; border-radius: 50%; background: color-mix(in srgb, var(--perf-gold) 75%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--perf-gold) 85%, transparent); opacity: 0; animation: sh-mote var(--md, 8s) ease-in-out infinite; animation-delay: var(--mdelay, 0s); }

.sh-eye { position: relative; z-index: 2; align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--perf-gold); }
.sh-eye :deep(svg) { color: var(--perf-gold); }

.sh-svg { position: relative; z-index: 1; width: 100%; max-width: 280px; margin-top: 2px; overflow: visible; }
.sh-track { fill: none; stroke: var(--perf-track); stroke-width: 15; stroke-linecap: round; }
.sh-band { fill: none; stroke-width: 15; stroke-linecap: round; opacity: 0.4;
  stroke-dasharray: var(--dash); stroke-dashoffset: var(--dashFrom);
  animation: sh-draw 0.9s var(--perf-ease) forwards; animation-delay: var(--delay); transition: opacity 0.4s, filter 0.4s, stroke-width 0.4s; }
.sh-band.on { opacity: 1; stroke-width: 17; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--c) 60%, transparent)); }
.sh-fill { fill: none; stroke-width: 4; stroke-linecap: round; opacity: 0.9;
  stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: sh-fill 1.2s var(--perf-spring) 0.3s forwards;
  filter: drop-shadow(0 0 6px color-mix(in srgb, currentColor 50%, transparent)); }
.sh-sweep { fill: none; stroke: color-mix(in srgb, var(--perf-gold-bright) 85%, transparent); stroke-width: 15; stroke-linecap: round;
  stroke-dasharray: 26 1000; stroke-dashoffset: 1000; opacity: 0.6; mix-blend-mode: screen; animation: sh-sweep 4.5s ease-in-out infinite 1s; }
.sh-ticks line { stroke: var(--perf-border-strong); stroke-width: 1.5; }

.sh-needle { transform-box: view-box; transform-origin: 140px 140px; transition: transform 1.15s var(--perf-spring); }
.sh-needle-stem { stroke-width: 3; stroke-linecap: round; opacity: 0.95; }
.sh-needle-tip { stroke: var(--perf-surface-elevated); stroke-width: 2; }
.sh-needle-ping { fill: none; stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: sh-ping 2.4s ease-out infinite; }
.sh-hub { fill: var(--perf-surface-elevated); stroke: var(--perf-border-strong); stroke-width: 1.5; }

.sh-read { position: absolute; left: 0; right: 0; top: 110px; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 3px; pointer-events: none; }
.sh-read-val { font-size: 32px; font-weight: 850; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.sh-read-val.muted { color: var(--perf-text-dim); }
.sh-read-val i { font-size: 13px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); }
.sh-read-band { display: inline-flex; font-size: 11px; font-weight: 800; padding: 2px 11px; border-radius: 999px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.sh-read-empty { font-size: 10.5px; color: var(--perf-text-muted); }

.sh-legend { position: relative; z-index: 2; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; margin-top: auto; padding-top: 12px; }
.sh-leg { display: inline-flex; align-items: center; gap: 5px; opacity: 0.5; transition: opacity 0.3s; }
.sh-leg.on { opacity: 1; }
.sh-leg i { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.sh-leg.on i { box-shadow: 0 0 7px color-mix(in srgb, var(--c) 75%, transparent); }
.sh-leg em { font-size: 10px; font-style: normal; font-weight: 700; color: var(--perf-text-muted); }
.sh-leg.on em { color: var(--perf-text-secondary); }

@keyframes sh-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
@keyframes sh-breathe { 0%, 100% { opacity: 0.35; transform: translateX(-50%) scale(1); } 50% { opacity: 0.6; transform: translateX(-50%) scale(1.08); } }
@keyframes sh-mote { 0% { transform: translateY(8px); opacity: 0; } 30% { opacity: 0.85; } 70% { opacity: 0.7; } 100% { transform: translateY(-22px); opacity: 0; } }
@keyframes sh-draw { to { stroke-dashoffset: 0; } }
@keyframes sh-fill { to { stroke-dashoffset: 0; } }
@keyframes sh-sweep { 0% { stroke-dashoffset: 1000; opacity: 0; } 12% { opacity: 0.6; } 60%, 100% { stroke-dashoffset: 200; opacity: 0; } }
@keyframes sh-ping { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(2.6); } }

.sh.reduced .sh-conic, .sh.reduced .sh-aura, .sh.reduced .sh-mote, .sh.reduced .sh-sweep, .sh.reduced .sh-needle-ping { animation: none; }
.sh.reduced .sh-mote { display: none; }
.sh.reduced .sh-band, .sh.reduced .sh-fill { animation: none; stroke-dashoffset: 0; }
.sh.reduced .sh-needle { transition: none; }
.sh.reduced .sh-fx { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .sh-conic, .sh-aura, .sh-mote, .sh-sweep, .sh-needle-ping { animation: none; }
  .sh-mote { display: none; }
  .sh-band, .sh-fill { animation: none; stroke-dashoffset: 0; }
  .sh-needle { transition: none; }
}
</style>
