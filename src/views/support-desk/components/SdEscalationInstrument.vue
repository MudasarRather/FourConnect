<template>
  <div ref="root" class="tud" :style="{ height: height ? height + 'px' : '100%' }" role="img"
    aria-label="Thermal updraft — active escalations rise with time at tier">
    <canvas ref="cv" class="tud-cv" :class="{ hot: hovering }"
      @pointermove="onMove" @pointerleave="onLeave" @click="onClick" />
  </div>
</template>

<script setup>
/*
  SdEscalationInstrument — "THE THERMAL UPDRAFT" (gallery study 06, user-picked).
  Canvas-2D full-bleed hero backdrop for the Escalated desk: a fire-bed feeds a rising
  heat column; every ACTIVE escalation rides it as a labelled ember — ALTITUDE = time at
  tier (log dwell scale), SIZE/GLOW = tier, COLOR = state (amber flicker = awaiting the
  receiving tier's ack, red halo = response clock lapsed, steady ember = acknowledged,
  gold dash = auto-escalated by the SLA-breach sweep). New escalations IGNITE at the bed
  and climb to their dwell altitude; embers are hit-tested buttons (hover glow, click →
  open the ticket). Ambient embers keep the column alive at zero data.
  Dual palette: night-ops additive glow (dark) / day-ops warm dawn ink (light) — palette
  re-read via readVar + a data-theme MutationObserver. ResizeObserver + IO + visibility
  pause; reduced motion silently simulates ~30s then draws ONE static frame.
  Contract: { tickets(rank-ordered active), stats, now, reduced, height(0=fill) } → open.
*/
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },
})
const emit = defineEmits(['open'])

const root = ref(null)
const cv = ref(null)
const hovering = ref(false)

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, k) => a + (b - a) * k
function hexa(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
const readVar = (name, fb) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fb
}

/* ── theme palette (literal hex — canvas can't resolve var()/color-mix) ── */
const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light'
function palette() {
  const dark = isDark()
  return dark ? {
    dark, add: 'lighter',
    sky0: '#0b0a0e', sky1: '#150c04', bed: '#f97316',
    ink: '#f6ede2', sub: 'rgba(246,237,226,0.55)', dim: 'rgba(246,237,226,0.30)',
    grid: 'rgba(253,186,116,0.13)', shimmer: 'rgba(251,146,60,0.07)',
    core: readVar('--sd-esc-core', '#f97316'), hi: readVar('--sd-esc-hi', '#fb923c'),
    deep: readVar('--sd-esc-deep', '#c2410c'), ack: readVar('--sd-esc-ack', '#34d399'),
    auto: readVar('--sd-esc-auto', '#fbbf24'), alarm: '#ef4444',
    emberHot: '#fde68a', chipBg: 'rgba(12,10,7,0.88)', bedA: 0.55,
  } : {
    dark, add: 'source-over',
    sky0: '#f8f1e4', sky1: '#f0ddc0', bed: '#ea580c',
    ink: '#2b1c10', sub: 'rgba(43,28,16,0.62)', dim: 'rgba(43,28,16,0.38)',
    grid: 'rgba(154,52,18,0.16)', shimmer: 'rgba(194,65,12,0.06)',
    core: readVar('--sd-esc-core', '#ea580c'), hi: readVar('--sd-esc-hi', '#c2410c'),
    deep: readVar('--sd-esc-deep', '#9a3412'), ack: readVar('--sd-esc-ack', '#047857'),
    auto: readVar('--sd-esc-auto', '#b45309'), alarm: '#b91c1c',
    emberHot: '#b45309', chipBg: 'rgba(252,246,236,0.94)', bedA: 0.42,
  }
}
let P = null

/* ── geometry ── */
let W = 0, H = 0, DPR = 1
// The column occupies the RIGHT ~62% of the hero (glass console owns the calm left air).
const colX = () => W * 0.62
const colHalf = () => W * 0.21
// Dwell (ms) → altitude 0..1 on a log scale between 10 minutes and 48 hours.
const DWELL_MIN = 10 * 60000, DWELL_MAX = 48 * 3600000
const altOf = (ms) => clamp(Math.log(clamp(ms, DWELL_MIN, DWELL_MAX) / DWELL_MIN) / Math.log(DWELL_MAX / DWELL_MIN), 0, 1)
const bedY = () => H * 0.92
const skyY = () => H * 0.14
const altToY = (a) => lerp(bedY() - 26, skyY(), a)

/* ── ambient embers (data-independent — never empty) ── */
const AMBIENT = 130
let amb = []
const seedAmbient = () => {
  amb = Array.from({ length: AMBIENT }, () => ({
    x: Math.random(), y: Math.random(), v: 0.028 + Math.random() * 0.075,
    s: 0.8 + Math.random() * 1.9, ph: Math.random() * 9,
  }))
}

/* ── ticket embers (the story layer) ── */
const MAX_LABELLED = 12
let embers = new Map()   // id -> { tk, x(0..1 within column), y(px, eased), born, spark }
let knownIds = new Set()
const dwellOf = (tk) => (Number.isFinite(tk.time_since_escalated_ms) && tk.time_since_escalated_ms != null)
  ? tk.time_since_escalated_ms
  : Math.max(0, props.now - (tk.escalated_at ? new Date(tk.escalated_at).getTime() : props.now))
const stateOf = (tk) => tk.esc_response_overdue ? 'overdue' : (tk.escalation_acked ? 'acked' : 'unacked')
const colOf = (s) => s === 'overdue' ? P.alarm : (s === 'acked' ? P.core : P.auto)

function syncEmbers() {
  const list = (props.tickets || []).slice(0, MAX_LABELLED)
  const liveIds = new Set(list.map(t => String(t.id)))
  // retire departed embers (resolved / de-escalated) — they cool emerald and fade out
  for (const [id, e] of embers) if (!liveIds.has(id)) { e.leaving = e.leaving || perfNow(); if (perfNow() - e.leaving > 1.4) embers.delete(id) }
  list.forEach((tk, i) => {
    const id = String(tk.id)
    const cur = embers.get(id)
    if (cur) { cur.tk = tk; return }
    // deterministic lane spread so labels don't stack — golden-angle hash on index+id
    const seed = (id.charCodeAt(0) + id.charCodeAt(id.length - 1) + i * 7) % 100
    const fresh = !knownIds.has(id)
    embers.set(id, {
      tk, xr: 0.12 + 0.76 * ((seed * 0.6180339887) % 1),
      y: fresh ? bedY() : altToY(altOf(dwellOf(tk))),   // new arrivals ignite at the bed
      born: perfNow(), spark: fresh ? 1 : 0, ph: seed * 0.37, leaving: 0,
    })
    knownIds.add(id)
  })
}
watch(() => props.tickets, syncEmbers, { deep: false })

/* ── hit-testing (labelled embers are buttons) ── */
let hitBoxes = []
let pointer = { x: -1, y: -1 }
const onMove = (e) => {
  const r = cv.value.getBoundingClientRect()
  pointer = { x: e.clientX - r.left, y: e.clientY - r.top }
  hovering.value = hitBoxes.some(b => pointer.x >= b.x && pointer.x <= b.x + b.w && pointer.y >= b.y && pointer.y <= b.y + b.h)
  if (props.reduced) staticFrame()
}
const onLeave = () => { pointer = { x: -1, y: -1 }; hovering.value = false; if (props.reduced) staticFrame() }
const onClick = () => {
  const hit = hitBoxes.find(b => pointer.x >= b.x && pointer.x <= b.x + b.w && pointer.y >= b.y && pointer.y <= b.y + b.h)
  if (hit) emit('open', hit.tk)
}

/* ── drawing ── */
const perfNow = () => performance.now() / 1000
function drawScene(t, c) {
  /* sky */
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, P.sky0); g.addColorStop(1, P.sky1)
  c.fillStyle = g; c.fillRect(0, 0, W, H)

  /* dwell rulings (right edge) — the altitude scale IS the story's axis */
  c.font = '600 10px ui-monospace, Consolas, monospace'
  c.textAlign = 'left'; c.textBaseline = 'middle'
  ;[['10m', 0], ['1h', altOf(3600000)], ['4h', altOf(4 * 3600000)], ['12h', altOf(12 * 3600000)], ['48h+', 1]].forEach(([lb, a]) => {
    const y = altToY(a)
    c.strokeStyle = P.grid; c.setLineDash([5, 9])
    c.beginPath(); c.moveTo(W * 0.30, y); c.lineTo(W - 74, y); c.stroke(); c.setLineDash([])
    c.fillStyle = P.dim; c.fillText(lb + ' AT TIER', W - 68, y)
  })

  /* fire-bed */
  const bx = colX(), by = bedY()
  const flick = 0.86 + 0.14 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1.4)
  const bed = c.createRadialGradient(bx, by + 36, 8, bx, by + 36, colHalf() * 2.1)
  bed.addColorStop(0, hexa(P.bed, P.bedA * flick))
  bed.addColorStop(0.45, hexa(P.deep, P.bedA * 0.4 * flick))
  bed.addColorStop(1, 'rgba(0,0,0,0)')
  c.fillStyle = bed; c.fillRect(0, H * 0.5, W, H * 0.5)
  /* bed coals */
  c.save(); if (P.dark) c.globalCompositeOperation = P.add
  for (let i = 0; i < 14; i++) {
    const cx = bx + Math.sin(i * 2.7) * colHalf() * 0.9
    const glowk = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.9)
    c.globalAlpha = 0.25 + glowk * 0.4
    c.fillStyle = i % 3 ? P.core : P.emberHot
    c.beginPath(); c.arc(cx, by + 10 + Math.sin(i * 5.1) * 6, 2.4 + glowk * 2.2, 0, TAU); c.fill()
  }
  c.restore(); c.globalAlpha = 1

  /* heat shimmer filaments */
  c.strokeStyle = P.shimmer; c.lineWidth = 1.4
  for (let i = 0; i < 6; i++) {
    c.beginPath()
    const sx = bx + (i - 2.5) * colHalf() * 0.42
    for (let y = by; y > skyY() - 8; y -= 12) {
      const k = 1 - y / H
      const sway = Math.sin(y * 0.028 + t * 2.1 + i * 1.3) * (6 + 26 * k)
      y === by ? c.moveTo(sx + sway, y) : c.lineTo(sx + sway, y)
    }
    c.stroke()
  }
}

function drawAmbient(t, c) {
  c.save(); if (P.dark) c.globalCompositeOperation = P.add
  const bx = colX(), half = colHalf()
  for (const p of amb) {
    const heat = 1 - p.y
    const px = bx + (p.x - 0.5) * half * 2 + Math.sin(t * 1.6 + p.ph + p.y * 8) * 18 * (0.25 + heat * 0.75)
    const py = p.y * (bedY() - skyY()) + skyY()
    const a = clamp(heat * 0.85 + 0.03, 0, 0.9) * (0.55 + 0.45 * Math.sin(t * 4 + p.ph))
    c.globalAlpha = a
    c.fillStyle = heat > 0.72 ? P.emberHot : (heat > 0.35 ? P.core : P.deep)
    c.beginPath(); c.arc(px, py, p.s * (0.5 + heat * 0.9), 0, TAU); c.fill()
  }
  c.restore(); c.globalAlpha = 1
}

function stepAmbient(dt) {
  for (const p of amb) {
    p.y -= p.v * dt
    if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); p.v = 0.028 + Math.random() * 0.075 }
  }
}

function drawEmbers(t, c) {
  hitBoxes = []
  const bx = colX(), half = colHalf()
  c.font = '600 10.5px ui-monospace, Consolas, monospace'
  c.textAlign = 'left'; c.textBaseline = 'middle'
  const chips = []
  for (const [, e] of embers) {
    const tk = e.tk
    const st = e.leaving ? 'leaving' : stateOf(tk)
    const lvl = tk.escalation_level || 1
    const targetY = altToY(altOf(dwellOf(tk)))
    // ignition climb: ease toward the dwell altitude; leaving embers drift up + fade
    e.y = e.leaving ? e.y - 0.6 : lerp(e.y, targetY, 0.035)
    e.spark = Math.max(0, e.spark - 0.016)
    const wob = st === 'acked' ? 3.5 : (st === 'overdue' ? 10 : 7.5)
    const x = bx + (e.xr - 0.5) * half * 2 + Math.sin(t * (st === 'overdue' ? 2.6 : 1.4) + e.ph) * wob
    const y = e.y + Math.sin(t * 0.9 + e.ph * 2) * 4
    const fade = e.leaving ? clamp(1 - (perfNow() - e.leaving) / 1.4, 0, 1) : 1
    const col = e.leaving ? P.ack : colOf(st)
    const r = 4.2 + Math.min(3.4, lvl * 1.3)

    /* halo + core */
    c.save(); if (P.dark) c.globalCompositeOperation = P.add
    c.globalAlpha = fade
    if (st === 'overdue') {
      const ring = (t * 26 + e.ph * 9) % 30
      c.strokeStyle = hexa(P.alarm, clamp(0.8 - ring / 34, 0, 0.8) * fade)
      c.lineWidth = 1.6
      c.beginPath(); c.arc(x, y, r + 3 + ring, 0, TAU); c.stroke()
    }
    if (e.spark > 0) {   // ignition burst on arrival
      c.strokeStyle = hexa(P.hi, e.spark * 0.9)
      c.lineWidth = 2
      c.beginPath(); c.arc(x, y, r + (1 - e.spark) * 34, 0, TAU); c.stroke()
    }
    const glow = c.createRadialGradient(x, y, 0, x, y, r * 3.4)
    glow.addColorStop(0, hexa(col, 0.9 * fade)); glow.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = glow; c.beginPath(); c.arc(x, y, r * 3.4, 0, TAU); c.fill()
    c.fillStyle = col
    const flick = st === 'unacked' ? 0.75 + 0.25 * Math.sin(t * 9 + e.ph * 4) : 1
    c.globalAlpha = fade * flick
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill()
    c.restore(); c.globalAlpha = 1

    if (e.leaving) continue

    /* collect the label chip (drawn after a de-collision pass) */
    const l1 = `${tk.ticket_number || ''} · L${lvl}${tk.auto_escalated ? ' · AUTO' : ''}`
    const dm = Math.floor(dwellOf(tk) / 60000)
    const dwell = dm < 60 ? `${dm}m` : dm < 1440 ? `${Math.floor(dm / 60)}h` : `${Math.floor(dm / 1440)}d`
    const l2 = st === 'overdue' ? `${dwell} at tier · ACK OVERDUE` : (st === 'unacked' ? `${dwell} at tier · awaiting ack` : `${dwell} at tier · acked`)
    const w1 = c.measureText(l1).width, w2 = c.measureText(l2).width
    const bw = Math.max(w1, w2) + 18, bh = 32
    const side = e.xr > 0.72 ? -1 : 1     // flip the chip inward near the right edge
    const cxp = side > 0 ? x + r + 10 : x - r - 10 - bw
    // keep chips clear of the hero's docked lens row (~bottom 84px) — the ember dot may
    // sit lower; the leader line bridges the gap.
    const cyp = clamp(y - bh / 2, 8, H - bh - 88)
    chips.push({ x, y, r, side, cxp, cyp, bw, bh, col, st, l1, l2, tk })
  }

  /* de-collision: sort by anchor y, push overlapping chips downward (embers clustered
     at similar dwell altitudes otherwise bury each other's labels) */
  chips.sort((a, b) => a.cyp - b.cyp)
  for (let i = 1; i < chips.length; i++) {
    const cur = chips[i]
    for (let j = 0; j < i; j++) {
      const prev = chips[j]
      const xOverlap = cur.cxp < prev.cxp + prev.bw + 6 && prev.cxp < cur.cxp + cur.bw + 6
      const yOverlap = cur.cyp < prev.cyp + prev.bh + 5 && prev.cyp < cur.cyp + cur.bh + 5
      if (xOverlap && yOverlap) cur.cyp = prev.cyp + prev.bh + 6
    }
    cur.cyp = clamp(cur.cyp, 8, H - cur.bh - 88)
  }

  for (const ch of chips) {
    const hov = pointer.x >= ch.cxp && pointer.x <= ch.cxp + ch.bw && pointer.y >= ch.cyp && pointer.y <= ch.cyp + ch.bh
    c.strokeStyle = hov ? ch.col : P.grid
    c.fillStyle = P.chipBg
    c.beginPath(); c.roundRect(ch.cxp, ch.cyp, ch.bw, ch.bh, 7); c.fill(); c.stroke()
    /* leader line to the (possibly displaced) chip */
    c.strokeStyle = hexa(ch.col, 0.5)
    c.beginPath()
    c.moveTo(ch.side > 0 ? ch.x + ch.r + 2 : ch.x - ch.r - 2, ch.y)
    c.lineTo(ch.side > 0 ? ch.cxp : ch.cxp + ch.bw, ch.cyp + ch.bh / 2)
    c.stroke()
    c.fillStyle = hov ? P.ink : P.sub
    c.fillText(ch.l1, ch.cxp + 9, ch.cyp + 10)
    c.fillStyle = ch.st === 'overdue' ? P.alarm : P.dim
    c.fillText(ch.l2, ch.cxp + 9, ch.cyp + 22)
    hitBoxes.push({ x: ch.cxp, y: ch.cyp, w: ch.bw, h: ch.bh, tk: ch.tk })
  }
  cv.value && (cv.value.style.cursor = hovering.value ? 'pointer' : 'default')
}

function drawHud(t, c) {
  /* station tag + calm caption */
  c.font = '700 10px ui-monospace, Consolas, monospace'
  c.textAlign = 'right'; c.textBaseline = 'top'
  c.fillStyle = P.dim
  c.fillText('THERMAL UPDRAFT · ALTITUDE = TIME AT TIER', W - 16, 12)
  const active = (props.tickets || []).length
  if (!active) {
    c.textAlign = 'center'; c.font = '600 12.5px ui-monospace, Consolas, monospace'
    c.fillStyle = P.sub
    c.fillText('The column runs cool — no active escalations.', colX(), H * 0.42)
  }
  c.textAlign = 'left'
}

let raf = 0, last = 0, alive = false, visible = true, pageVisible = true
function frame(ts) {
  if (!alive) return
  if (!visible || !pageVisible) { last = 0; raf = requestAnimationFrame(frame); return }
  if (!last) last = ts
  const dt = clamp((ts - last) / 1000, 0, 0.05); last = ts
  const t = ts / 1000
  const c = cv.value?.getContext('2d'); if (!c) { raf = requestAnimationFrame(frame); return }
  stepAmbient(dt)
  drawScene(t, c)
  drawAmbient(t, c)
  drawEmbers(t, c)
  drawHud(t, c)
  raf = requestAnimationFrame(frame)
}

/* reduced motion: silently advance the simulation, then paint one composed frame */
function staticFrame() {
  const c = cv.value?.getContext('2d'); if (!c) return
  for (let i = 0; i < 240; i++) stepAmbient(0.12)
  for (const [, e] of embers) e.y = altToY(altOf(dwellOf(e.tk)))
  const t = 21.4
  drawScene(t, c); drawAmbient(t, c); drawEmbers(t, c); drawHud(t, c)
}

function resize() {
  if (!root.value || !cv.value) return
  const r = root.value.getBoundingClientRect()
  DPR = Math.min(window.devicePixelRatio || 1, 2)
  W = Math.max(80, r.width); H = Math.max(80, r.height)
  cv.value.width = W * DPR; cv.value.height = H * DPR
  const c = cv.value.getContext('2d')
  c.setTransform(DPR, 0, 0, DPR, 0, 0)
  if (props.reduced) staticFrame()
}

let ro = null, io = null, mo = null
const onVis = () => { pageVisible = document.visibilityState === 'visible'; last = 0 }
onMounted(() => {
  P = palette()
  seedAmbient()
  knownIds = new Set((props.tickets || []).map(t => String(t.id)))   // first load: no ignition burst pile
  syncEmbers()
  ro = new ResizeObserver(resize); ro.observe(root.value)
  io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting !== false; last = 0 }, { threshold: 0.05 })
  io.observe(root.value)
  mo = new MutationObserver(() => { P = palette(); if (props.reduced) staticFrame() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVis)
  resize()
  alive = true
  if (!props.reduced) raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  alive = false
  cancelAnimationFrame(raf)
  ro?.disconnect(); io?.disconnect(); mo?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.tud { position: relative; width: 100%; overflow: hidden; }
.tud-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
