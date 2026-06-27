<template>
  <!-- "The Performance Spectrograph" — org score distribution as a luminous
       bell curve riding a poor→outstanding prism, with rising band peaks, a
       one-shot scan sweep and an animated org-average plumb line. Distinct from
       the dashboard's orrery and merit-policy's step-curve. -->
  <div class="ps" ref="rootEl" :class="{ live: !reduced }">
    <span class="ps-grain" aria-hidden="true" />
    <span class="ps-aura" aria-hidden="true" />
    <div class="ps-motes" aria-hidden="true"><i v-for="n in 16" :key="n" class="ps-mote" :style="moteStyle(n)" /></div>

    <div class="ps-hud ps-hud-l">
      <span class="ps-hud-dot" /><b>Score spectrum</b>
      <span class="ps-hud-sep">·</span><span>{{ total }} scored</span>
    </div>
    <div class="ps-hud ps-hud-r" v-if="avg != null">
      <span class="ps-hud-avg" :style="{ color: avgColor }">{{ avg.toFixed(1) }}</span><em>avg / {{ max }}</em>
    </div>

    <svg class="ps-svg" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="aid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="curveColor" stop-opacity="0.34" />
          <stop offset="100%" :stop-color="curveColor" stop-opacity="0" />
        </linearGradient>
        <linearGradient :id="sid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--perf-gold-bright)" stop-opacity="0" />
          <stop offset="50%" stop-color="var(--perf-gold-bright)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--perf-gold-bright)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- prism zones (poor → outstanding) -->
      <g class="ps-zones">
        <rect v-for="z in zones" :key="z.band" :x="z.x" :y="padTop" :width="z.w" :height="plotH"
          :fill="z.fill" :class="{ on: ready }" :style="{ transitionDelay: (z.band * 0.05) + 's' }" />
      </g>

      <!-- gridlines -->
      <line v-for="gy in gridY" :key="'g' + gy" :x1="padX" :x2="W - padX" :y1="gy" :y2="gy" class="ps-grid" />

      <!-- rising band peaks -->
      <g class="ps-bars">
        <rect v-for="(p, i) in pts" :key="'b' + p.band" :x="p.x - barW / 2" :width="barW"
          :y="ready ? p.y : baseline" :height="ready ? (baseline - p.y) : 0" rx="6"
          :fill="p.tone" class="ps-bar" :style="{ transitionDelay: (0.15 + i * 0.07) + 's' }" />
      </g>

      <!-- bell area + curve -->
      <path :d="areaPath" :fill="`url(#${aid})`" class="ps-area" :class="{ on: ready }" />
      <path :d="curvePath" fill="none" :stroke="curveColor" stroke-width="2.5" stroke-linecap="round"
        stroke-linejoin="round" pathLength="1" class="ps-curve" :class="{ on: ready }" />

      <!-- org-average plumb -->
      <g v-if="avg != null" class="ps-avg" :class="{ on: ready }" :style="{ '--ax': avgX + 'px' }">
        <line :x1="avgX" :x2="avgX" :y1="padTop - 4" :y2="baseline" class="ps-avg-line" :stroke="avgColor" />
        <circle :cx="avgX" :cy="padTop - 4" r="4.5" :fill="avgColor" class="ps-avg-dot" />
      </g>

      <!-- one-shot scan sweep -->
      <rect class="ps-scan" :x="padX" :y="padTop" :width="40" :height="plotH" :fill="`url(#${sid})`" />
    </svg>

    <!-- avg flag (HTML, so text stays crisp) -->
    <div v-if="avg != null" class="ps-flag" :class="{ on: ready }" :style="{ left: avgPct + '%', '--c': avgColor }">
      avg {{ avg.toFixed(1) }}
    </div>

    <!-- band axis -->
    <div class="ps-axis">
      <div v-for="p in pts" :key="'ax' + p.band" class="ps-tick" :style="{ left: p.xPct + '%' }">
        <b :style="{ color: p.tone }">{{ p.count }}</b>
        <span class="ps-tick-dot" :style="{ background: p.tone }" />
        <em>{{ p.band }}</em>
      </div>
    </div>
    <div class="ps-axis-cap"><span>Poor</span><span>Performance band score (1–{{ max }})</span><span>Outstanding</span></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'

const props = defineProps({
  bands: { type: Array, default: () => [] },   // [{ band:1..5, count }]
  avg: { type: Number, default: null },
  total: { type: Number, default: 0 },
  max: { type: Number, default: 5 },
})

const reduced = prefersReduced()
const rootEl = ref(null)
usePointerSpotlight(rootEl)
const ready = ref(false)
// unique gradient ids (avoid collisions if mounted twice)
const uid = Math.round((props.total + 1) * 97 + (props.avg || 0) * 13) % 99999
const aid = `psArea${uid}`
const sid = `psScan${uid}`

// geometry
const W = 1000, H = 300
const padX = 60, padTop = 26, padBottom = 24
const plotH = H - padTop - padBottom
const baseline = padTop + plotH
const barW = 78

const counts = computed(() => {
  const by = {}
  for (const d of (props.bands || [])) by[d.band] = d.count || 0
  return [1, 2, 3, 4, 5].map(b => ({ band: b, count: by[b] || 0 }))
})
const distMax = computed(() => Math.max(1, ...counts.value.map(d => d.count)))
const pts = computed(() => counts.value.map((d, i) => {
  const x = padX + (i / 4) * (W - padX * 2)
  const y = baseline - (d.count / distMax.value) * plotH
  return { band: d.band, count: d.count, x, y, xPct: (x / W) * 100, tone: scoreTone(d.band, 5) }
}))

const zones = computed(() => counts.value.map((d, i) => {
  const seg = (W - padX * 2) / 5
  return { band: d.band, x: padX + i * seg, w: seg, fill: `color-mix(in srgb, ${scoreTone(d.band, 5)} 9%, transparent)` }
}))

const gridY = computed(() => [0.25, 0.5, 0.75].map(f => +(padTop + f * plotH).toFixed(1)))

function smoothPath(arr) {
  if (arr.length < 2) return ''
  let d = `M ${arr[0].x},${arr[0].y}`
  for (let i = 0; i < arr.length - 1; i++) {
    const p0 = arr[i - 1] || arr[i], p1 = arr[i], p2 = arr[i + 1], p3 = arr[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}
const curvePath = computed(() => smoothPath(pts.value))
const areaPath = computed(() => {
  const p = pts.value
  if (p.length < 2) return ''
  return `${smoothPath(p)} L ${p[p.length - 1].x},${baseline} L ${p[0].x},${baseline} Z`
})

const clampedAvg = computed(() => props.avg == null ? null : Math.max(1, Math.min(props.max, props.avg)))
const avgX = computed(() => clampedAvg.value == null ? 0 : padX + ((clampedAvg.value - 1) / (props.max - 1)) * (W - padX * 2))
const avgPct = computed(() => (avgX.value / W) * 100)
const avgColor = computed(() => scoreTone(props.avg, props.max))
const curveColor = computed(() => 'var(--perf-gold)')

const moteStyle = (n) => {
  const x = (n * 61) % 100
  return { left: x + '%', '--d': (n % 7) * 0.7 + 's', '--dur': (8 + (n % 5)) + 's', width: (2 + (n % 2)) + 'px', height: (2 + (n % 2)) + 'px' }
}

onMounted(() => { requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) })
</script>

<style scoped>
.ps { position: relative; overflow: hidden; border-radius: 20px; padding: 16px 18px 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.ps-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.45; z-index: 0;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 32px 32px; mask-image: radial-gradient(120% 130% at 50% 0%, #000 12%, transparent 76%); -webkit-mask-image: radial-gradient(120% 130% at 50% 0%, #000 12%, transparent 76%); }
.ps-aura { position: absolute; inset: -40% 20% auto 20%; height: 80%; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 70%); filter: blur(38px);
  transform: translateX(calc((var(--mx, 0.5) - 0.5) * 22px)); }
.ps-motes { position: absolute; inset: 0; pointer-events: none; z-index: 1; transform: translateX(calc((var(--mx, 0.5) - 0.5) * 12px)); }
.ps-mote { position: absolute; bottom: 22%; border-radius: 50%; background: var(--perf-gold-bright); box-shadow: 0 0 8px var(--perf-gold); opacity: 0; }
.ps.live .ps-mote { animation: ps-rise var(--dur, 9s) linear infinite; animation-delay: var(--d, 0s); }
@keyframes ps-rise { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 20% { opacity: 0.7; } 80% { opacity: 0.4; } 100% { transform: translateY(-150px) scale(1.1); opacity: 0; } }

.ps-hud { position: absolute; top: 14px; z-index: 4; display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-text-dim); }
.ps-hud-l { left: 18px; } .ps-hud-r { right: 18px; text-transform: none; letter-spacing: 0; }
.ps-hud-l b { color: var(--perf-gold); }
.ps-hud-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 9px var(--perf-gold); animation: ps-pulse 2.4s ease-in-out infinite; }
.ps-hud-sep { color: var(--perf-text-dim); }
.ps-hud-avg { font-size: 18px; font-weight: 850; font-variant-numeric: tabular-nums; }
.ps-hud-r em { font-style: normal; font-size: 10px; color: var(--perf-text-muted); }
@keyframes ps-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

.ps-svg { position: relative; z-index: 2; width: 100%; height: 230px; display: block; margin-top: 22px; overflow: visible; }
.ps-zones rect { opacity: 0; transition: opacity 0.6s ease; }
.ps-zones rect.on { opacity: 1; }
.ps-grid { stroke: var(--perf-border); stroke-width: 1; stroke-dasharray: 2 6; vector-effect: non-scaling-stroke; opacity: 0.6; }
.ps-bar { filter: drop-shadow(0 0 10px color-mix(in srgb, currentColor 0%, transparent)); transition: y 0.85s var(--perf-spring), height 0.85s var(--perf-spring); }
.ps-area { opacity: 0; transition: opacity 0.7s ease 0.4s; }
.ps-area.on { opacity: 1; }
.ps-curve { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.2s var(--perf-spring) 0.2s;
  filter: drop-shadow(0 2px 10px color-mix(in srgb, var(--perf-gold) 45%, transparent)); }
.ps-curve.on { stroke-dashoffset: 0; }

.ps-avg { opacity: 0; transition: opacity 0.5s ease 0.9s; }
.ps-avg.on { opacity: 1; }
.ps-avg-line { stroke-width: 1.6; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; opacity: 0.85; }
.ps-avg-dot { filter: drop-shadow(0 0 8px currentColor); }
.ps.live .ps-avg.on .ps-avg-dot { animation: ps-bob 2.6s ease-in-out infinite; }
@keyframes ps-bob { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }

.ps-scan { opacity: 0; }
.ps.live .ps-scan { animation: ps-sweep 5.5s ease-in-out 0.3s infinite; }
@keyframes ps-sweep { 0% { transform: translateX(0); opacity: 0; } 8% { opacity: 1; } 50% { transform: translateX(860px); opacity: 1; } 58% { opacity: 0; } 100% { transform: translateX(860px); opacity: 0; } }

.ps-flag { position: absolute; top: 30px; transform: translateX(-50%); z-index: 5; opacity: 0; transition: opacity 0.5s ease 1s;
  padding: 2px 8px; border-radius: 7px; font-size: 10px; font-weight: 850; letter-spacing: 0.02em; color: #1a1206;
  background: var(--c, var(--perf-gold)); box-shadow: 0 4px 14px -4px var(--c); white-space: nowrap; }
.ps-flag.on { opacity: 1; }
[data-theme="light"] .ps-flag { color: #fff; }

.ps-axis { position: relative; z-index: 2; height: 30px; margin-top: 2px; }
.ps-tick { position: absolute; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px; }
.ps-tick b { font-size: 12.5px; font-weight: 850; font-variant-numeric: tabular-nums; }
.ps-tick-dot { width: 7px; height: 7px; border-radius: 50%; }
.ps-tick em { font-style: normal; font-size: 10px; font-weight: 750; color: var(--perf-text-dim); }
.ps-axis-cap { display: flex; align-items: center; justify-content: space-between; margin-top: 4px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-dim); }
.ps-axis-cap span:nth-child(2) { color: var(--perf-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .ps-bar, .ps-area, .ps-curve, .ps-avg, .ps-zones rect, .ps-flag { transition: none !important; }
  .ps-curve { stroke-dashoffset: 0 !important; }
  .ps-area, .ps-avg, .ps-flag, .ps-zones rect { opacity: 1 !important; }
  .ps-mote, .ps-scan, .ps-hud-dot, .ps-avg-dot { animation: none !important; }
  .ps-scan { display: none; }
}
</style>
