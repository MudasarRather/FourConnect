<template>
  <div class="orb" ref="rootRef">
    <canvas ref="canvasRef" class="orb-canvas" aria-hidden="true" />

    <!-- HUD — top-right cluster (console owns top-left, lens rail owns the bottom) -->
    <div class="orb-hud" aria-hidden="true">
      <div class="orb-col">
        <div class="orb-readout">
          <span class="k">OLDEST WAIT</span>
          <span class="v sd-mono">{{ latencyLabel }}</span>
        </div>
        <div class="orb-tag" :class="{ hot }">
          <span class="pip" /> {{ hot ? 'VENDOR OVERDUE' : 'AWAITING RETURN SIGNAL' }}
          <span class="dots"><i /><i /><i /></span>
        </div>
        <div class="orb-chips sd-mono">
          <span class="c">{{ pending }} in orbit</span>
          <span v-if="overdue > 0" class="c hot">{{ overdue }} overdue</span>
          <span v-if="reactivatedToday > 0" class="c back">{{ reactivatedToday }} returned</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdVendorOrbital — Pending Vendor hero backdrop ("Orbital Handshake", round-2 concept 05).
  Sunrise creeping over the Earth's limb; the desk station holds laser links to vendor
  satellites drifting in higher orbit — packets ride the beams out amber and come home
  emerald; an overdue hand-off flares its satellite red and quickens the whole scene.

  Layered Canvas2D cinematic (gradients + glow + light-trails + pointer parallax) — the
  round-2 preview renderer shipped 1:1, NOT a three.js mesh scene (that's what sank the
  dish). Two full palettes: night orbit for dark theme, dawn orbit for light theme
  (additive compositing washes out on cream, so light mode renders source-over with
  deepened inks). ALWAYS ALIVE at zero data: stars breathe, the rim glows, one idle
  relay keeps faint ambient traffic. Data mapping: pending → satellites + packet
  density · overdue → red grade + tempo · returns → emerald arrivals · oldest wait →
  HUD readout. Paused offscreen/tab-hidden, ResizeObserver-sized, theme-reactive,
  static single frame under reduced motion.
*/
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  pending: { type: Number, default: 0 },
  overdue: { type: Number, default: 0 },
  reactivatedToday: { type: Number, default: 0 },
  oldestWaitMs: { type: Number, default: 0 },
  reduced: { type: Boolean, default: false },
})

const rootRef = ref(null)
const canvasRef = ref(null)
const hot = computed(() => (props.overdue || 0) > 0)

const latencyLabel = computed(() => {
  const ms = Number(props.oldestWaitMs) || 0
  if (ms <= 0) return 'CLEAR'
  const h = ms / 3600000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))}m`
  if (h < 48) return `${h.toFixed(1)}h`
  return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`
})

/* ── render engine ── */
const TAU = Math.PI * 2
const hexa = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})` }
const fractf = v => v - Math.floor(v)
const rnd = i => fractf(Math.sin(i * 127.1 + 311.7) * 43758.5453)
const lerp = (a, b, t) => a + (b - a) * t

let ctx = null, cw = 2, ch = 2
let raf = 0, running = false, t0 = 0
let ro = null, io = null, themeObs = null
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

const cssVar = (n, fb) => {
  try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || fb } catch { return fb }
}
let pal = null
function buildPalette() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  pal = light ? {
    light: true, comp: 'source-over',
    sky: [[0, '#f7f0e2'], [0.42, '#f4e7d0'], [0.60, '#eed7b4'], [1, '#f2e8d6']],
    earth: '#33261a', terrain: 'rgba(0,0,0,0.10)',
    rim: cssVar('--sd-ember', '#ea580c'), rim2: '#d97706', rimA: [0.55, 0.20, 0.08],
    sun: '#f59e0b', sunA: 0.22,
    star: '#8a7a5f', starN: 42, starA: 0.20,
    desk: cssVar('--sd-vendor-signal', '#ea580c'), sat: cssVar('--sd-vendor-steel', '#64707c'),
    panel: 'rgba(70,60,50,0.55)', link: 'rgba(70,58,44,0.28)',
    packet: '#c2410c', ret: cssVar('--sd-vendor-return', '#059669'),
    danger: cssVar('--sd-vendor-overdue', '#dc2626'),
    glint: '#b45309', vignette: 0,
  } : {
    light: false, comp: 'lighter',
    sky: [[0, '#05070c'], [1, '#070a10']],
    earth: '#04060a', terrain: null,
    rim: cssVar('--sd-vendor-signal', '#fb923c'), rim2: cssVar('--sd-amber-bright', '#fcd34d'), rimA: [0.38, 0.14, 0.05],
    sun: cssVar('--sd-amber-bright', '#fcd34d'), sunA: 0.32,
    star: '#cfd6dd', starN: 110, starA: 0.55,
    desk: cssVar('--sd-vendor-signal', '#fb923c'), sat: cssVar('--sd-vendor-steel', '#9aa3ac'),
    panel: 'rgba(154,163,172,0.5)', link: 'rgba(154,163,172,0.15)',
    packet: cssVar('--sd-amber-bright', '#fcd34d'), ret: cssVar('--sd-vendor-return', '#34d399'),
    danger: cssVar('--sd-vendor-overdue', '#ef4444'),
    glint: '#ffffff', vignette: 0.32,
  }
}

function glowDot(x, px, py, r, c, a) {
  if (r <= 0 || a <= 0) return
  x.save(); x.globalCompositeOperation = pal.comp
  const g = x.createRadialGradient(px, py, 0, px, py, r)
  g.addColorStop(0, hexa(c, a)); g.addColorStop(1, hexa(c, 0))   // NOT 'transparent' — avoids the dark fringe in source-over
  x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); x.restore()
}
function trail(x, fn, u, col, size, ghosts, gap, headA) {
  x.save(); x.globalCompositeOperation = pal.comp
  for (let k = ghosts; k >= 0; k--) {
    const uu = u - k * gap; if (uu < 0 || uu > 1) continue
    const p = fn(uu); const f = 1 - k / (ghosts + 1)
    x.fillStyle = hexa(col, (pal.light ? 0.7 : 0.85) * f * f * (headA ?? 1))
    x.beginPath(); x.arc(p[0], p[1], size * (0.35 + 0.65 * f), 0, TAU); x.fill()
  }
  x.restore()
  const hp = fn(Math.min(1, Math.max(0, u)))
  glowDot(x, hp[0], hp[1], size * 5, col, (pal.light ? 0.26 : 0.5) * (headA ?? 1))
}

function draw(t) {
  const x = ctx; if (!x) return
  const w = cw, h = ch
  const mx = pointer.x, my = pointer.y
  const isHot = hot.value
  const tempo = isHot ? 1.35 : 1

  // ── sky ──
  const g = x.createLinearGradient(0, 0, 0, h)
  pal.sky.forEach(([o, c]) => g.addColorStop(o, c))
  x.fillStyle = g; x.fillRect(0, 0, w, h)

  // ── stars / dawn motes ──
  x.save(); x.globalCompositeOperation = pal.comp
  for (let i = 0; i < pal.starN; i++) {
    const sx = rnd(i) * w + mx * (4 + rnd(i + 7) * 8), sy = rnd(i + 50) * h * 0.55 + my * 4
    const a = pal.starA * (0.35 + 0.65 * rnd(i + 99)) * (0.55 + 0.45 * Math.sin(t * 1.3 + i))
    x.fillStyle = hexa(pal.star, Math.max(0, a)); x.fillRect(sx, sy, 1.2, 1.2)
  }
  x.restore()

  // ── sunrise glow (behind the limb, right of frame) ──
  glowDot(x, w * 0.74 + mx * 8, h * 0.60, h * 0.55, pal.sun, pal.sunA * (0.85 + 0.15 * Math.sin(t * 0.8)))

  // ── Earth limb ──
  const ex = w * 0.5 + mx * 12, ey = h * 2.05, er = h * 1.5
  x.fillStyle = pal.earth; x.beginPath(); x.arc(ex, ey, er, 0, TAU); x.fill()
  if (pal.light) {
    // dawn terrain bands inside the limb
    x.save(); x.strokeStyle = pal.terrain; x.lineWidth = 3
    ;[0.975, 0.945].forEach(rr => { x.beginPath(); x.arc(ex, ey, er * rr, -Math.PI * 0.72, -Math.PI * 0.28); x.stroke() })
    x.restore()
  } else {
    // night-side city lights
    x.save(); x.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (rnd(i + 5) - 0.5) * 0.72
      const rr = er * (0.965 - rnd(i + 30) * 0.05)
      x.fillStyle = hexa('#fbbf24', 0.12 + 0.22 * rnd(i) * (0.6 + 0.4 * Math.sin(t * 1.1 + i)))
      x.fillRect(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr, 1.6, 1.6)
    }
    x.restore()
  }

  // ── atmosphere rim (breathing; grades red when overdue) ──
  x.save(); x.globalCompositeOperation = pal.comp
  const breathe = 0.85 + 0.15 * Math.sin(t * 0.9)
  const widths = pal.light ? [4, 11, 24] : [7, 20, 44]
  widths.forEach((lw, i) => {
    x.strokeStyle = hexa(i === 0 ? pal.rim2 : pal.rim, pal.rimA[i] * breathe)
    x.lineWidth = lw
    x.beginPath(); x.arc(ex, ey, er + 2, -Math.PI * 0.80, -Math.PI * 0.20); x.stroke()
  })
  if (isHot) {
    x.strokeStyle = hexa(pal.danger, 0.10 + 0.08 * Math.sin(t * 3)); x.lineWidth = pal.light ? 8 : 14
    x.beginPath(); x.arc(ex, ey, er + 2, -Math.PI * 0.62, -Math.PI * 0.20); x.stroke()
  }
  x.restore()

  // ── desk station (left-center, clear of the console scrim) ──
  const desk = [w * 0.34 + mx * 16, h * 0.42 + my * 8]
  x.save(); x.translate(desk[0], desk[1]); x.rotate(t * 0.15 + 0.35)
  x.fillStyle = hexa(pal.desk, 0.95); x.fillRect(-4, -4, 8, 8)
  x.fillStyle = pal.panel; x.fillRect(-17, -2.6, 10, 5.2); x.fillRect(7, -2.6, 10, 5.2)
  x.restore()
  glowDot(x, desk[0], desk[1], 24, pal.desk, pal.light ? 0.30 : 0.6)

  // ── vendor satellites: count scales with the queue; last one runs hot when overdue ──
  const p = Math.max(0, Math.round(props.pending || 0))
  const nSats = p <= 0 ? 1 : p < 5 ? 2 : 3
  const BASE = [[0.62, 0.16], [0.78, 0.32], [0.90, 0.13]]
  const sats = []
  for (let i = 0; i < nSats; i++) {
    const sx = w * BASE[i][0] + mx * 20
    const sy = h * BASE[i][1] + Math.sin(t * 0.5 + i * 2.1) * 6 + my * 6
    const satHot = isHot && i === nSats - 1
    sats.push([sx, sy, satHot])
  }

  // links + outbound packets
  const perLink = 1 + Math.min(2, Math.floor(p / 3))
  sats.forEach(([sx, sy, satHot], i) => {
    x.save(); x.strokeStyle = satHot ? hexa(pal.danger, 0.20) : pal.link; x.lineWidth = 1
    x.beginPath(); x.moveTo(desk[0], desk[1]); x.lineTo(sx, sy); x.stroke(); x.restore()
    const fn = u => [lerp(desk[0], sx, u), lerp(desk[1], sy, u)]
    for (let k = 0; k < perLink; k++) {
      const u = fractf(t * 0.30 * tempo + k / perLink + i * 0.37)
      trail(x, fn, u, satHot ? pal.danger : pal.packet, 2.3, 9, 0.02)
    }
  })

  // return traffic (vendor replies) — emerald packets riding home; faint ambient echo at zero
  const backFn = u => [lerp(sats[0][0], desk[0], u), lerp(sats[0][1], desk[1], u)]
  const rets = Math.min(2, props.reactivatedToday || 0)
  if (rets > 0) {
    for (let k = 0; k < rets; k++) trail(x, backFn, fractf(t * 0.24 + k * 0.5), pal.ret, 2.3, 9, 0.02)
  } else {
    const amb = fractf(t / 9)
    if (amb < 0.28) trail(x, backFn, amb / 0.28, pal.ret, 1.7, 7, 0.02, 0.45)
  }

  // ── satellite bodies + hot flare + glints ──
  sats.forEach(([sx, sy, satHot], i) => {
    x.save(); x.translate(sx, sy); x.rotate(t * 0.22 + i)
    x.fillStyle = hexa(satHot ? pal.danger : pal.sat, 0.95); x.fillRect(-3.2, -3.2, 6.4, 6.4)
    x.fillStyle = pal.panel; x.fillRect(-12, -1.7, 7, 3.4); x.fillRect(5, -1.7, 7, 3.4)
    x.restore()
    glowDot(x, sx, sy, 16, satHot ? pal.danger : pal.sat, pal.light ? 0.28 : 0.55)
    if (satHot) {
      glowDot(x, sx, sy, 34, pal.danger, 0.16 + 0.14 * Math.sin(t * 4))
      const pr = fractf(t * 0.8)
      x.save(); x.globalCompositeOperation = pal.comp
      x.strokeStyle = hexa(pal.danger, 0.7 * (1 - pr)); x.lineWidth = 1.6
      x.beginPath(); x.arc(sx, sy, 5 + pr * 24, 0, TAU); x.stroke(); x.restore()
    }
    const gl = Math.sin(t * 1.5 + i * 2.4)
    if (gl > 0.94) {
      x.save(); x.globalCompositeOperation = pal.comp
      x.strokeStyle = hexa(pal.glint, (gl - 0.94) * (pal.light ? 8 : 12)); x.lineWidth = 1
      x.beginPath(); x.moveTo(sx - 12, sy); x.lineTo(sx + 12, sy); x.moveTo(sx, sy - 12); x.lineTo(sx, sy + 12); x.stroke()
      x.restore()
    }
  })

  // ── shooting star (night only) ──
  if (!pal.light) {
    const ss = fractf(t / 8)
    if (ss < 0.06) {
      const sp = ss / 0.06
      const sx = w * (0.2 + sp * 0.42), sy = h * 0.08 + sp * h * 0.10
      x.save(); x.globalCompositeOperation = 'lighter'
      x.strokeStyle = hexa('#ffffff', 0.6 * (1 - sp)); x.lineWidth = 1.3
      x.beginPath(); x.moveTo(sx - 24, sy - 7); x.lineTo(sx, sy); x.stroke(); x.restore()
    }
  }

  // ── vignette (night) ──
  if (pal.vignette > 0) {
    const vg = x.createRadialGradient(w * 0.5, h * 0.46, h * 0.25, w * 0.5, h * 0.5, w * 0.62)
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${pal.vignette})`)
    x.fillStyle = vg; x.fillRect(0, 0, w, h)
  }
}

/* ── lifecycle ── */
function resize() {
  const cv = canvasRef.value, root = rootRef.value
  if (!cv || !root) return
  const r = root.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  cw = Math.max(2, r.width); ch = Math.max(2, r.height)
  cv.width = cw * dpr; cv.height = ch * dpr
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (props.reduced) drawStatic()
}
function frame(ts) {
  if (!running) return
  if (!t0) t0 = ts
  pointer.x += (pointer.tx - pointer.x) * 0.06
  pointer.y += (pointer.ty - pointer.y) * 0.06
  draw((ts - t0) / 1000)
  raf = requestAnimationFrame(frame)
}
function start() { if (running || props.reduced) return; running = true; raf = requestAnimationFrame(frame) }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }
function drawStatic() { if (ctx) draw(2.1) }

const onVis = () => { if (document.hidden) stop(); else start() }
const onPointer = (e) => {
  const r = rootRef.value?.getBoundingClientRect(); if (!r) return
  pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
  pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const onLeave = () => { pointer.tx = 0; pointer.ty = 0 }

onMounted(() => {
  buildPalette()
  resize()
  ro = new ResizeObserver(() => resize())
  ro.observe(rootRef.value)
  themeObs = new MutationObserver(() => { buildPalette(); if (props.reduced) drawStatic() })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  rootRef.value?.addEventListener('pointermove', onPointer)
  rootRef.value?.addEventListener('pointerleave', onLeave)
  document.addEventListener('visibilitychange', onVis)
  if (props.reduced) { drawStatic() }
  else if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => es.forEach(e => (e.isIntersecting ? start() : stop())), { threshold: 0.05 })
    io.observe(rootRef.value)
  } else start()
})
onBeforeUnmount(() => {
  stop()
  ro?.disconnect(); io?.disconnect(); themeObs?.disconnect()
  rootRef.value?.removeEventListener('pointermove', onPointer)
  rootRef.value?.removeEventListener('pointerleave', onLeave)
  document.removeEventListener('visibilitychange', onVis)
})
watch(() => [props.pending, props.overdue, props.reactivatedToday], () => { if (props.reduced) drawStatic() })
</script>

<style scoped>
.orb { position: relative; width: 100%; height: 100%; min-height: 300px; overflow: hidden; border-radius: inherit; }
.orb-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* HUD — top-right; console owns top-left, lens rail owns the bottom */
.orb-hud { position: absolute; inset: 0; pointer-events: none; }
.orb-col { position: absolute; top: 14px; right: 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
.orb-readout { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.orb-readout .k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.orb-readout .v { font-size: 17px; font-weight: 800; color: var(--sd-vendor-signal); text-shadow: 0 0 16px var(--sd-vendor-signal-soft); }
.orb-tag { display: inline-flex; align-items: center; gap: 7px; font-family: var(--sd-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-vendor-return); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); padding: 5px 11px; border-radius: 999px; backdrop-filter: blur(6px); }
.orb-tag.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.orb-tag .pip { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 9px currentColor; animation: orb-pip 1.6s ease-in-out infinite; }
.orb-tag .dots { display: inline-flex; gap: 3px; }
.orb-tag .dots i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.4; animation: orb-dot 1.4s ease-in-out infinite; }
.orb-tag .dots i:nth-child(2) { animation-delay: 0.2s; }
.orb-tag .dots i:nth-child(3) { animation-delay: 0.4s; }
.orb-chips { display: flex; gap: 7px; flex-wrap: wrap; justify-content: flex-end; }
.orb-chips .c { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--sd-text-muted);
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); backdrop-filter: blur(6px); }
.orb-chips .c.hot { color: var(--sd-vendor-overdue); border-color: var(--sd-vendor-overdue-soft); }
.orb-chips .c.back { color: var(--sd-vendor-return); border-color: color-mix(in srgb, var(--sd-vendor-return) 30%, transparent); }

@keyframes orb-pip { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.7); opacity: 0.5; } }
@keyframes orb-dot { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .orb-tag .pip,
  html:not([data-cinematic="on"]) .orb-tag .dots i { animation: none; }
}
</style>
