<template>
  <!-- "THE TERMINAL" exchange screen — embedded inside the dashboard hero's screen frame.
       14-day inflow/outflow candles + cumulative backlog index line, then a footer with
       the backlog delta readout and the aging-depth ladder. Geometry from pulse.agent.
       The frame, scanlines and ticker tape are owned by the parent hero. -->
  <div class="ti" :class="{ dim: !hasData }">
    <header class="ti-head">
      <span class="ti-title sd-mono"><i class="ti-dot" aria-hidden="true" /> INFLOW · OUTFLOW — 14D</span>
      <span class="ti-legend">
        <span><i class="lg up" />resolved</span>
        <span><i class="lg dn" />created</span>
        <span><i class="lg idx" />backlog</span>
      </span>
    </header>

    <svg :viewBox="`0 0 ${W} ${H}`" class="ti-svg" preserveAspectRatio="none" aria-hidden="true">
      <line v-for="(gy, i) in geo.grid" :key="'g' + i" class="ti-grid" :x1="padL" :x2="W - padR" :y1="gy" :y2="gy" />
      <line class="ti-base" :x1="padL" :x2="W - padR" :y1="geo.baseY" :y2="geo.baseY" />
      <g v-for="(c, i) in geo.candles" :key="'c' + i">
        <line class="ti-wick" :class="c.tone" :x1="c.x" :x2="c.x" :y1="geo.baseY" :y2="c.wickY" />
        <rect class="ti-body" :class="c.tone" :x="c.x - c.cw / 2" :y="c.bodyY" :width="c.cw" :height="c.bodyH"
          :style="{ '--i': i, transformOrigin: `center ${geo.baseY}px` }" rx="1.5" />
      </g>
      <path class="ti-idx" :d="geo.idxPath" pathLength="1" />
      <circle v-if="geo.idxHead" class="ti-idx-head" :cx="geo.idxHead.x" :cy="geo.idxHead.y" r="3.2" />
    </svg>
    <div class="ti-axis">
      <span v-for="(lb, i) in geo.labels" :key="'l' + i" class="tax sd-mono" :style="{ left: lb.pct + '%' }">{{ lb.txt }}</span>
    </div>

    <div class="ti-foot">
      <div class="ti-idx-box" :class="deltaTone">
        <span class="tif-label sd-mono">BACKLOG Δ 14D</span>
        <span class="tif-val sd-mono">{{ deltaText }}</span>
        <span class="tif-sub sd-mono">in {{ created14 }} · out {{ resolved14 }}</span>
      </div>
      <div class="ti-depth">
        <span class="tif-label sd-mono">AGING DEPTH</span>
        <div v-for="(d, i) in depth" :key="d.key" class="td-row" :style="{ '--i': i }">
          <span class="td-key sd-mono">{{ d.key }}</span>
          <span class="td-bar"><i :class="d.tone" :style="{ '--w': d.pct + '%' }" /></span>
          <span class="td-n sd-mono">{{ d.n }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  agent: { type: Object, default: null },   // pulse.agent block
})

const a = computed(() => props.agent || {})
const flow = computed(() => Array.isArray(a.value.flow) ? a.value.flow : [])
const hasData = computed(() => flow.value.some((p) => (p.created || 0) + (p.resolved || 0) > 0)
  || Object.values(a.value.aging || {}).some((v) => v > 0))

const created14 = computed(() => a.value.created_14d ?? 0)
const resolved14 = computed(() => a.value.resolved_14d ?? 0)
const deltaRaw = computed(() => a.value.backlog_delta_14d ?? (created14.value - resolved14.value))
const deltaTone = computed(() => (deltaRaw.value > 0 ? 'down' : deltaRaw.value < 0 ? 'up' : 'flat'))
const deltaText = computed(() => (deltaRaw.value > 0 ? `+${deltaRaw.value}` : `${deltaRaw.value}`))

/* ── chart geometry ── */
const W = 470, H = 148, padL = 8, padR = 8, padT = 10, padB = 16
const innerH = H - padT - padB

const geo = computed(() => {
  const days = flow.value.length ? flow.value : Array.from({ length: 14 }, () => ({ created: 0, resolved: 0, day: null }))
  const n = days.length
  const maxVol = Math.max(1, ...days.map((d) => Math.max(d.created || 0, d.resolved || 0)))
  const slot = (W - padL - padR) / n
  const cw = Math.min(14, slot * 0.5)
  const baseY = padT + innerH
  const yOf = (v) => padT + innerH * (1 - Math.max(0, v) / maxVol)

  const candles = days.map((d, i) => {
    const created = d.created || 0, resolved = d.resolved || 0
    const hi = Math.max(created, resolved), lo = Math.min(created, resolved)
    const bodyY = yOf(hi), bodyH = Math.max(2, yOf(lo) - yOf(hi))
    return {
      x: padL + slot * i + slot / 2, cw,
      wickY: yOf(hi), bodyY, bodyH,
      tone: resolved >= created ? 'up' : 'dn',
    }
  })

  // backlog index line — cumulative net (created − resolved), own scale, upper band
  let acc = 0
  const cum = days.map((d) => (acc += (d.created || 0) - (d.resolved || 0)))
  const iMin = Math.min(0, ...cum), iMax = Math.max(0, ...cum)
  const iSpan = (iMax - iMin) || 1
  const bandTop = padT + innerH * 0.06, bandH = innerH * 0.5
  const iy = (v) => bandTop + bandH * (1 - (v - iMin) / iSpan)
  const pts = cum.map((v, i) => [padL + slot * i + slot / 2, iy(v)])
  const idxPath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const idxHead = pts.length ? { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1] } : null

  const grid = [0.25, 0.5, 0.75].map((g) => padT + innerH * g)

  const labels = days.map((d, i) => ({ i, day: d.day })).filter((_, i) => i % 3 === 0 || i === n - 1)
    .map((o) => ({ pct: ((padL + slot * o.i + slot / 2) / W) * 100, txt: o.day ? String(new Date(o.day).getDate()) : '·' }))

  return { candles, idxPath, idxHead, grid, baseY, labels }
})

/* ── aging depth ladder ── */
const DEPTH_KEYS = ['<4h', '4-24h', '1-3d', '3-7d', '>7d']
const DEPTH_TONE = { '<4h': 'ok', '4-24h': 'ok', '1-3d': 'warn', '3-7d': 'hot', '>7d': 'crit' }
const depth = computed(() => {
  const ag = a.value.aging || {}
  const max = Math.max(1, ...DEPTH_KEYS.map((k) => ag[k] || 0))
  return DEPTH_KEYS.map((k) => ({ key: k, n: ag[k] || 0, pct: Math.round(((ag[k] || 0) / max) * 100), tone: DEPTH_TONE[k] }))
})
</script>

<style scoped>
.ti { display: flex; flex-direction: column; min-width: 0; }
.ti.dim { filter: saturate(0.75) opacity(0.92); }

.ti-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.ti-title { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--pulse-screen-dim); }
.ti-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pulse); box-shadow: 0 0 8px var(--pulse-glow); animation: sd-breathe 2.4s ease-in-out infinite; }
.ti-legend { display: inline-flex; gap: 11px; font-size: 10px; color: var(--pulse-screen-dim); }
.ti-legend span { display: inline-flex; align-items: center; gap: 5px; }
.lg { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }
.lg.up { background: var(--pulse-up); } .lg.dn { background: var(--pulse-dn); }
.lg.idx { background: var(--pulse); border-radius: 999px; height: 3px; }

.ti-svg { width: 100%; height: 128px; display: block; }
.ti-grid { stroke: var(--pulse-grid); stroke-width: 1; stroke-dasharray: 2 5; }
.ti-base { stroke: color-mix(in srgb, var(--pulse-grid) 180%, transparent); stroke-width: 1; }
.ti-wick { stroke-width: 1.4; opacity: 0.5; }
.ti-wick.up { stroke: var(--pulse-up); } .ti-wick.dn { stroke: var(--pulse-dn); }
.ti-body { animation: ti-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i) * 0.035s + 0.5s); }
.ti-body.up { fill: var(--pulse-up); } .ti-body.dn { fill: var(--pulse-dn); }
.ti-idx { fill: none; stroke: var(--pulse); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--pulse) 60%, transparent));
  stroke-dasharray: 1; stroke-dashoffset: 1; animation: ti-draw 1.7s ease-out 0.7s forwards; }
.ti-idx-head { fill: var(--pulse-bright); filter: drop-shadow(0 0 6px var(--pulse));
  opacity: 0; animation: ti-head 0.4s ease-out 2.1s forwards; }
@keyframes ti-grow { from { transform: scaleY(0); } }
@keyframes ti-draw { to { stroke-dashoffset: 0; } }
@keyframes ti-head { to { opacity: 1; } }

.ti-axis { position: relative; height: 11px; margin-top: 1px; }
.tax { position: absolute; transform: translateX(-50%); font-size: 9px; color: var(--pulse-screen-dim); }

/* footer: backlog delta + aging ladder side by side */
.ti-foot { display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--pulse-screen-edge); }
.ti-idx-box { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 11px; min-width: 108px;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--pulse-screen-edge); }
.tif-label { font-size: 9px; letter-spacing: 0.12em; color: var(--pulse-screen-dim); }
.tif-val { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
.ti-idx-box.up .tif-val { color: var(--pulse-up); } .ti-idx-box.down .tif-val { color: var(--pulse-dn); }
.ti-idx-box.flat .tif-val { color: var(--pulse-bright); }
.tif-sub { font-size: 9.5px; color: var(--pulse-screen-dim); }

.ti-depth { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.td-row { display: grid; grid-template-columns: 38px 1fr 24px; align-items: center; gap: 8px; }
.td-key { font-size: 9.5px; color: var(--pulse-screen-dim); }
.td-bar { height: 7px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
.td-bar i { display: block; height: 100%; width: var(--w); border-radius: 999px; transform-origin: left center;
  animation: ti-bar 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(0.8s + var(--i) * 0.08s); }
.td-bar i.ok { background: var(--pulse-up); }
.td-bar i.warn { background: var(--pulse); }
.td-bar i.hot { background: var(--pulse-ember); }
.td-bar i.crit { background: var(--pulse-dn); }
.td-n { font-size: 10.5px; font-weight: 700; color: var(--pulse-screen-txt); text-align: right; }
@keyframes ti-bar { from { transform: scaleX(0); } }

@media (max-width: 520px) { .ti-foot { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ti-dot,
  html:not([data-cinematic="on"]) .ti-body,
  html:not([data-cinematic="on"]) .td-bar i { animation: none; }
  html:not([data-cinematic="on"]) .ti-idx { stroke-dasharray: none; stroke-dashoffset: 0; animation: none; }
  html:not([data-cinematic="on"]) .ti-idx-head { opacity: 1; animation: none; }
}
</style>
