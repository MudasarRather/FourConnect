<template>
  <section class="fb sd-card">
    <header class="fb-h">
      <div>
        <p class="fb-eyebrow"><Waves :size="12" /> FLOW BALANCE · 14 DAYS</p>
        <p class="fb-sub">Inflow (raised) vs outflow (shipped) — is the crew keeping pace?</p>
      </div>
      <div class="fb-net sd-mono" :class="{ ahead: net >= 0 }">
        <i>{{ net >= 0 ? 'CREW AHEAD' : 'QUEUE GROWING' }}</i>
        <b>{{ net >= 0 ? '+' : '' }}<SdCountUp :value="net" /></b>
      </div>
    </header>

    <div class="fb-stage" @pointermove="scrub" @pointerleave="hover = -1">
      <span class="fb-sheen" aria-hidden="true" />
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="fb-svg">
        <defs>
          <linearGradient id="fb-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--sd-team-core)" stop-opacity="0.32" />
            <stop offset="1" stop-color="var(--sd-team-core)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="fb-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--sd-team-sync)" stop-opacity="0.3" />
            <stop offset="1" stop-color="var(--sd-team-sync)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <line v-for="g in 3" :key="'g' + g" :x1="0" :x2="W" :y1="(H - PAD) * g / 3" :y2="(H - PAD) * g / 3" class="fb-grid" />
        <path :d="area(inPts)" fill="url(#fb-in)" class="fb-area" />
        <path :d="line(inPts)" fill="none" stroke="var(--sd-team-core)" stroke-width="2" class="fb-line in" />
        <path :d="area(outPts)" fill="url(#fb-out)" class="fb-area" />
        <path :d="line(outPts)" fill="none" stroke="var(--sd-team-sync)" stroke-width="2" class="fb-line out" />
        <!-- persistent 'today' node — a live ping at the newest bucket -->
        <template v-if="flow.length">
          <circle :cx="x(flow.length - 1)" :cy="y(flow[flow.length - 1].outflow)" class="fb-ping out" />
          <circle :cx="x(flow.length - 1)" :cy="y(flow[flow.length - 1].inflow)" class="fb-ping in" />
          <circle :cx="x(flow.length - 1)" :cy="y(flow[flow.length - 1].outflow)" r="3" fill="var(--sd-team-sync)" class="fb-node" />
          <circle :cx="x(flow.length - 1)" :cy="y(flow[flow.length - 1].inflow)" r="3" fill="var(--sd-team-core)" class="fb-node" />
        </template>
        <template v-if="hover >= 0 && flow[hover]">
          <line :x1="x(hover)" :x2="x(hover)" :y1="6" :y2="H - PAD" class="fb-cursor" />
          <circle :cx="x(hover)" :cy="y(flow[hover].inflow)" r="3.4" fill="var(--sd-team-core)" />
          <circle :cx="x(hover)" :cy="y(flow[hover].outflow)" r="3.4" fill="var(--sd-team-sync)" />
        </template>
      </svg>
      <div v-if="hover >= 0 && flow[hover]" class="fb-tip sd-mono" :style="tipStyle">
        <b>{{ dayLabel(flow[hover].day) }}</b>
        <span class="in">▲ {{ flow[hover].inflow }} in</span>
        <span class="out">▼ {{ flow[hover].outflow }} out</span>
      </div>
    </div>

    <div class="fb-legend sd-mono">
      <span class="in"><i /> Inflow · {{ totalIn }}</span>
      <span class="out"><i /> Outflow · {{ totalOut }}</span>
      <span class="days">{{ firstDay }} → today</span>
    </div>
  </section>
</template>

<script setup>
/* SdFlowBalance — the 14-day inflow/outflow tide chart of the Team Ops desk. Pure SVG
   (no chart lib): two draw-in strokes + soft area fills, pointer scrub with a docked
   tooltip, and a net-balance verdict chip. Gold = work arriving, emerald = work shipped. */
import { ref, computed } from 'vue'
import { Waves } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  flow: { type: Array, default: () => [] },   // TeamFlowBucket[] (oldest → today)
})

const W = 640
const H = 190
const PAD = 22
const hover = ref(-1)

const maxV = computed(() => Math.max(1, ...props.flow.map(b => Math.max(b.inflow || 0, b.outflow || 0))))
const x = (i) => props.flow.length <= 1 ? W / 2 : (i / (props.flow.length - 1)) * (W - 16) + 8
const y = (v) => (H - PAD) - ((v || 0) / maxV.value) * (H - PAD - 14)
const inPts = computed(() => props.flow.map((b, i) => [x(i), y(b.inflow)]))
const outPts = computed(() => props.flow.map((b, i) => [x(i), y(b.outflow)]))

const line = (pts) => {
  if (!pts.length) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1]; const [cx, cy] = pts[i]; const mx = (px + cx) / 2
    d += ` C ${mx} ${py}, ${mx} ${cy}, ${cx} ${cy}`
  }
  return d
}
const area = (pts) => pts.length ? `${line(pts)} L ${pts[pts.length - 1][0]} ${H - PAD} L ${pts[0][0]} ${H - PAD} Z` : ''

const totalIn = computed(() => props.flow.reduce((s, b) => s + (b.inflow || 0), 0))
const totalOut = computed(() => props.flow.reduce((s, b) => s + (b.outflow || 0), 0))
const net = computed(() => totalOut.value - totalIn.value)
const dayLabel = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const firstDay = computed(() => props.flow.length ? dayLabel(props.flow[0].day) : '—')

const scrub = (e) => {
  if (!props.flow.length) return
  const r = e.currentTarget.getBoundingClientRect()
  const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  hover.value = Math.round(t * (props.flow.length - 1))
}
const tipStyle = computed(() => {
  const t = props.flow.length <= 1 ? 0.5 : hover.value / (props.flow.length - 1)
  return { left: `clamp(8px, calc(${(t * 100).toFixed(1)}% - 54px), calc(100% - 118px))` }
})
</script>

<style scoped>
.fb { padding: 16px 18px 12px; display: flex; flex-direction: column; gap: 8px; }
.fb-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.fb-eyebrow { display: inline-flex; align-items: center; gap: 7px; margin: 0 0 3px; font-family: var(--sd-mono);
  font-size: 10px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-team-core); }
.fb-sub { margin: 0; font-size: 11.5px; color: var(--sd-text-muted); }
.fb-net { display: flex; flex-direction: column; align-items: flex-end; }
.fb-net i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-team-strain); }
.fb-net b { font-size: 20px; font-weight: 800; color: var(--sd-team-strain); font-variant-numeric: tabular-nums; }
.fb-net.ahead i, .fb-net.ahead b { color: var(--sd-team-sync); }

.fb-stage { position: relative; overflow: hidden; border-radius: 12px; }
/* slow tide sheen drifting across the chart */
.fb-sheen { position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: linear-gradient(100deg, transparent 42%, var(--sd-team-hi-soft) 50%, transparent 58%);
  background-size: 260% 100%; animation: fb-tide 7s ease-in-out infinite; }
.fb-svg { position: relative; z-index: 1; display: block; width: 100%; height: clamp(120px, 16vw, 190px); }
.fb-grid { stroke: var(--sd-border); stroke-dasharray: 3 5; }
.fb-node { filter: drop-shadow(0 0 4px currentColor); }
.fb-ping { fill: none; stroke-width: 1.5; opacity: 0; }
.fb-ping.in { stroke: var(--sd-team-core); animation: fb-ping 2.4s ease-out infinite; }
.fb-ping.out { stroke: var(--sd-team-sync); animation: fb-ping 2.4s ease-out infinite 0.4s; }
@keyframes fb-ping { 0% { r: 3; opacity: 0.55; } 100% { r: 13; opacity: 0; } }
@keyframes fb-tide { 0% { background-position: 160% 0; } 100% { background-position: -160% 0; } }
.fb-line { stroke-linecap: round; stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: fb-draw 1.4s var(--sd-ease, ease-out) forwards; }
.fb-line.out { animation-delay: 0.25s; }
.fb-area { opacity: 0; animation: fb-fade 0.8s ease-out 0.7s forwards; }
@keyframes fb-draw { to { stroke-dashoffset: 0; } }
@keyframes fb-fade { to { opacity: 1; } }
.fb-cursor { stroke: var(--sd-team-brd); stroke-width: 1; }
.fb-tip { position: absolute; top: 0; display: flex; flex-direction: column; gap: 2px; padding: 7px 10px;
  border-radius: 10px; pointer-events: none; font-size: 10.5px;
  background: var(--sd-panel, var(--sd-surface)); border: 1px solid var(--sd-team-brd); box-shadow: var(--sd-card-shadow); }
.fb-tip b { color: var(--sd-text); font-size: 10px; letter-spacing: 0.06em; }
.fb-tip .in { color: var(--sd-team-core); }
.fb-tip .out { color: var(--sd-team-sync); }

.fb-legend { display: flex; align-items: center; gap: 16px; font-size: 10.5px; color: var(--sd-text-muted); }
.fb-legend span { display: inline-flex; align-items: center; gap: 6px; }
.fb-legend i { width: 14px; height: 3px; border-radius: 2px; }
.fb-legend .in i { background: var(--sd-team-core); }
.fb-legend .out i { background: var(--sd-team-sync); }
.fb-legend .days { margin-left: auto; color: var(--sd-text-dim); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .fb-line { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .fb-area { animation: none; opacity: 1; }
  html:not([data-cinematic="on"]) .fb-sheen,
  html:not([data-cinematic="on"]) .fb-ping { animation: none; }
  html:not([data-cinematic="on"]) .fb-ping { display: none; }
}
</style>
