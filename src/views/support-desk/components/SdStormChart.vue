<template>
  <canvas ref="cv" class="stc" aria-hidden="true" />
</template>

<script setup>
/* SdStormChart — the Storm Bureau's signature instrument: a live synoptic chart.
   A drifting pressure field (sum of moving Gaussian lows/highs) rendered as ISOBAR
   contours via marching squares; WIND PARTICLES advect along the isobars; the open
   BREACHES ride the field as tight low-pressure STORM CELLS; a warm-front ribbon
   sweeps with escalation inflow. One rAF loop; `reduced` freezes it to a single
   static frame. Colors resolve from the --sd-l2-* tokens and re-resolve when the
   theme flips (MutationObserver on <html data-theme>). */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  breached: { type: Number, default: 0 },    // storm cells (capped at 4)
  escalated: { type: Number, default: 0 },   // front intensity
  open: { type: Number, default: 0 },        // particle density driver
  pulse: { type: Number, default: 0 },       // increment → gust event (serve/refresh)
  reduced: { type: Boolean, default: false },
})

const cv = ref(null)
let ctx = null
let raf = 0
let ro = null
let mo = null
let W = 0, H = 0, DPR = 1
let t0 = performance.now()
let gustUntil = 0

/* resolved theme colors */
const C = { ink: '#e8dcc3', core: '#fb7d3c', halt: '#fb7185', front: '#f5c04e', dim: 'rgba(232,220,195,0.28)' }
const readVars = () => {
  if (!cv.value) return
  const cs = getComputedStyle(cv.value)
  const v = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb
  C.ink = v('--sd-l2-ink', C.ink)
  C.core = v('--sd-l2-core', C.core)
  C.halt = v('--sd-l2-halt', C.halt)
  C.front = v('--sd-l2-front', C.front)
}

/* ── the pressure field: base gradient + moving gaussian systems ── */
const SYSTEMS = Array.from({ length: 5 }, (_, i) => ({
  ax: 0.13 + i * 0.19, ay: 0.22 + (i % 3) * 0.26,   // anchor (fractions)
  rx: 0.16 + (i % 2) * 0.1, wob: 0.6 + i * 0.23,     // radius + wobble speed
  amp: (i % 2 ? 1 : -1) * (0.55 + (i % 3) * 0.2),    // highs and lows
}))
const field = (x, y, tm) => {
  // x/y in 0..1 — smooth base tilt + drifting systems
  let p = 0.32 * Math.sin(x * 2.4 + tm * 0.05) + 0.2 * Math.cos(y * 3.1 - tm * 0.04)
  for (const s of SYSTEMS) {
    const cx = s.ax + 0.07 * Math.sin(tm * 0.07 * s.wob + s.ax * 9)
    const cy = s.ay + 0.06 * Math.cos(tm * 0.05 * s.wob + s.ay * 7)
    const dx = (x - cx) / s.rx, dy = (y - cy) / s.rx
    p += s.amp * Math.exp(-(dx * dx + dy * dy))
  }
  return p
}
/* field gradient → wind (particles ride perpendicular = along the isobars) */
const wind = (x, y, tm) => {
  const e = 0.004
  const gx = (field(x + e, y, tm) - field(x - e, y, tm)) / (2 * e)
  const gy = (field(x, y + e, tm) - field(x, y - e, tm)) / (2 * e)
  return { u: -gy, v: gx } // geostrophic: flow along contours
}

/* ── marching squares over a coarse grid ── */
const GX = 56, GY = 34
const grid = new Float32Array((GX + 1) * (GY + 1))
const LEVELS = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]
const drawContours = (tm) => {
  for (let j = 0; j <= GY; j++) {
    for (let i = 0; i <= GX; i++) grid[j * (GX + 1) + i] = field(i / GX, j / GY, tm)
  }
  const sx = W / GX, sy = H / GY
  ctx.lineWidth = 1
  for (let li = 0; li < LEVELS.length; li++) {
    const lv = LEVELS[li]
    ctx.strokeStyle = C.ink
    ctx.globalAlpha = lv === 0 ? 0.34 : 0.16 + 0.05 * (li % 2)
    ctx.beginPath()
    for (let j = 0; j < GY; j++) {
      for (let i = 0; i < GX; i++) {
        const a = grid[j * (GX + 1) + i] - lv
        const b = grid[j * (GX + 1) + i + 1] - lv
        const c = grid[(j + 1) * (GX + 1) + i + 1] - lv
        const d = grid[(j + 1) * (GX + 1) + i] - lv
        const idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        const x0 = i * sx, y0 = j * sy
        const top = [x0 + sx * (a / (a - b)), y0]
        const right = [x0 + sx, y0 + sy * (b / (b - c))]
        const bottom = [x0 + sx * (d / (d - c)), y0 + sy]
        const left = [x0, y0 + sy * (a / (a - d))]
        const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]) }
        switch (idx) {
          case 1: case 14: seg(left, bottom); break
          case 2: case 13: seg(bottom, right); break
          case 3: case 12: seg(left, right); break
          case 4: case 11: seg(top, right); break
          case 5: seg(top, left); seg(bottom, right); break
          case 6: case 9: seg(top, bottom); break
          case 7: case 8: seg(top, left); break
          case 10: seg(top, right); seg(left, bottom); break
        }
      }
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

/* ── wind particles ── */
let parts = []
const seedParts = () => {
  const n = Math.min(110, 46 + (props.open || 0) * 2)
  parts = Array.from({ length: n }, () => ({
    x: Math.random(), y: Math.random(), life: 40 + Math.random() * 120,
  }))
}
const stepParts = (tm) => {
  const gust = performance.now() < gustUntil ? 2.4 : 1
  ctx.fillStyle = C.ink
  for (const p of parts) {
    const w = wind(p.x, p.y, tm)
    p.x += w.u * 0.0016 * gust
    p.y += w.v * 0.0016 * gust
    p.life -= 1
    if (p.life <= 0 || p.x < -0.02 || p.x > 1.02 || p.y < -0.02 || p.y > 1.02) {
      p.x = Math.random(); p.y = Math.random(); p.life = 40 + Math.random() * 120
    }
    ctx.globalAlpha = Math.min(0.5, p.life / 160)
    ctx.fillRect(p.x * W, p.y * H, 1.4 * DPR, 1.4 * DPR)
  }
  ctx.globalAlpha = 1
}

/* ── storm cells (breaches) — tight whorls riding the deepest lows ── */
const drawCells = (tm) => {
  const n = Math.min(4, props.breached || 0)
  for (let k = 0; k < n; k++) {
    const s = SYSTEMS[(k * 2 + 1) % SYSTEMS.length]
    const cx = (s.ax + 0.07 * Math.sin(tm * 0.07 * s.wob + s.ax * 9)) * W
    const cy = (s.ay + 0.06 * Math.cos(tm * 0.05 * s.wob + s.ay * 7)) * H
    ctx.strokeStyle = C.halt
    for (let r = 0; r < 3; r++) {
      const rad = (10 + r * 9 + 2.4 * Math.sin(tm * 1.6 + r + k)) * DPR
      ctx.globalAlpha = 0.5 - r * 0.13
      ctx.beginPath()
      // a distorted ring — the whorl
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 18) {
        const rr = rad * (1 + 0.14 * Math.sin(a * 3 + tm * 1.8 + k))
        const px = cx + rr * Math.cos(a + tm * 0.35)
        const py = cy + rr * Math.sin(a + tm * 0.35)
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    // the cell's eye
    ctx.globalAlpha = 0.85
    ctx.fillStyle = C.halt
    ctx.beginPath(); ctx.arc(cx, cy, 2.4 * DPR, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
  }
}

/* ── the warm front — a sweeping ribbon with semicircle pips ── */
const drawFront = (tm) => {
  if (!(props.escalated > 0)) return
  const sweep = 0.5 + 0.42 * Math.sin(tm * 0.09)
  ctx.strokeStyle = C.front
  ctx.fillStyle = C.front
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 1.6 * DPR
  ctx.beginPath()
  const pts = []
  for (let j = 0; j <= 20; j++) {
    const y = (j / 20) * H
    const x = (sweep + 0.09 * Math.sin(j * 0.55 + tm * 0.5)) * W
    pts.push([x, y])
    j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  // semicircle pips every 4th point (warm-front notation)
  for (let j = 2; j < pts.length; j += 4) {
    const [x, y] = pts[j]
    ctx.beginPath(); ctx.arc(x, y, 3.2 * DPR, -Math.PI / 2, Math.PI / 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

const frame = () => {
  const tm = (performance.now() - t0) / 1000
  ctx.clearRect(0, 0, W, H)
  drawContours(tm)
  drawFront(tm)
  stepParts(tm)
  drawCells(tm)
  if (!props.reduced) raf = requestAnimationFrame(frame)
}

const size = () => {
  const el = cv.value
  if (!el) return
  DPR = Math.min(2, window.devicePixelRatio || 1)
  const r = el.getBoundingClientRect()
  W = Math.max(1, Math.round(r.width * DPR))
  H = Math.max(1, Math.round(r.height * DPR))
  el.width = W; el.height = H
}

const start = () => {
  cancelAnimationFrame(raf)
  size(); readVars(); seedParts()
  if (props.reduced) { frame() } else { raf = requestAnimationFrame(frame) }
}

watch(() => props.pulse, () => { gustUntil = performance.now() + 1400 })
watch(() => [props.breached, props.escalated, props.open, props.reduced], () => {
  seedParts()
  if (props.reduced) { cancelAnimationFrame(raf); frame() }
  else { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) }
})

onMounted(() => {
  ctx = cv.value.getContext('2d')
  start()
  ro = new ResizeObserver(() => { size(); if (props.reduced) frame() })
  ro.observe(cv.value)
  mo = new MutationObserver(() => { readVars(); if (props.reduced) frame() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => { cancelAnimationFrame(raf); ro?.disconnect(); mo?.disconnect() })
</script>

<style scoped>
.stc { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
</style>
