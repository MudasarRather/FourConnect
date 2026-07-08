<template>
  <!--
    SdCriticalInstrument — "THE SEISMOGRAPH WALL" (War Room signature, gallery pick 01).
    A live strip-chart of the desk's tremors: the pen draws a continuous baseline; every
    active critical re-fires as a MAGNITUDE EVENT (spike burst + flagged ticket chip riding
    the paper), a major incident slams a full-height shockwave through the strip. Layered
    Canvas2D (paper → rulings → flash → rings → flags → trace → pen), theme-adaptive dual
    palette (night-ops additive glow / day-ops chart paper), ambient at zero data,
    IO/visibility pause, reduced-motion static frame, click a flag → open the ticket.
    Contract: props { tickets(rank-ordered active), stats, now, reduced, height (0 = fill) }
    · emits open(ticket).
  -->
  <div ref="root" class="smg" :class="{ fill: !height }" :style="height ? { height: `${height}px` } : null">
    <canvas ref="cv" class="smg-cv" :class="{ hot: hovering }"
      @pointermove="onMove" @pointerleave="onLeave" @click="onClick" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // rank-ordered ACTIVE criticals
  stats: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },          // 0 = fill the parent (hero full-bleed)
})
const emit = defineEmits(['open'])

const root = ref(null)
const cv = ref(null)
const hovering = ref(false)

const TAU = Math.PI * 2
const MONO = "'Cascadia Mono','Consolas',ui-monospace,monospace"
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3)
const noise = (x, a, b, c) => Math.sin(x * a) * 0.5 + Math.sin(x * b + 1.7) * 0.3 + Math.sin(x * c + 4.1) * 0.2
function hexa(hex, a) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
const readVar = (name, fb) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fb
}

/* ── theme palette (literal hex only — canvas can't resolve var()/color-mix) ── */
const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light'
function palette() {
  const dark = isDark()
  return dark ? {
    dark, add: 'lighter',
    bg0: '#0a0b0f', bg1: '#111319', paper: '#0d0f14',
    ink: '#f4e9e9', sub: 'rgba(244,233,233,0.52)', dim: 'rgba(244,233,233,0.30)',
    grid: 'rgba(255,255,255,0.055)', grid2: 'rgba(255,255,255,0.12)',
    core: readVar('--sd-crit-core', '#ef4444'), deep: readVar('--sd-crit-deep', '#b91c1c'),
    flare: readVar('--sd-crit-flare', '#f97316'), ack: readVar('--sd-crit-ack', '#34d399'),
    amber: '#fbbf24', penHot: '#ffd9b0',
    chipBg: 'rgba(10,11,15,0.88)', auraA: 0.10,
  } : {
    dark, add: 'source-over',
    bg0: '#f7f2e8', bg1: '#efe7d6', paper: '#f4eee0',
    ink: '#2b2018', sub: 'rgba(43,32,24,0.62)', dim: 'rgba(43,32,24,0.38)',
    grid: 'rgba(43,32,24,0.085)', grid2: 'rgba(43,32,24,0.18)',
    core: readVar('--sd-crit-core', '#dc2626'), deep: readVar('--sd-crit-deep', '#991b1b'),
    flare: readVar('--sd-crit-flare', '#ea580c'), ack: readVar('--sd-crit-ack', '#059669'),
    amber: '#b45309', penHot: '#991b1b',
    chipBg: 'rgba(250,246,238,0.94)', auraA: 0.07,
  }
}
let P = null

/* ── runtime state ── */
let c = null, W = 0, H = 0, DPR = 1
let raf = 0, visible = true, pageVisible = true, alive = false
let t = 0, last = 0
let samples = []            // { t, v } recorded at the pen
let events = []             // { t0, tk, mag, lane, col }
let rings = []              // { t0 } — MI shockwaves, travel with the paper
let flash = 0
let queueIdx = 0, nextFire = 1.4
let laneLast = [-1e9, -1e9, -1e9]   // LRU flag lanes — maximizes horizontal spacing per lane
let flagRects = []          // { x, y, w, h, tk } CSS px — pointer hit-testing
let knownIds = new Set()
let seeded = false          // first data load staggers in via the scheduler, not a burst

const penX = () => W * 0.87
const speed = () => Math.max(26, W * 0.023)      // paper px/s

/* magnitude = how loud this ticket screams */
function magOf(tk) {
  let m = 4.6
  if (tk.is_major_incident) m += 2.6
  if (tk.sla_response_breached || tk.sla_resolution_breached) m += 1.5
  if (!tk.acknowledged_at) m += 0.8
  if (tk.priority === 'critical') m += 0.4
  return Math.min(9.4, m)
}
const colOf = (tk) => (tk.is_major_incident || tk.sla_response_breached || tk.sla_resolution_breached)
  ? P.core : (!tk.acknowledged_at ? P.flare : P.amber)

function pickLane() {
  let best = 0, bestAge = -Infinity
  for (let l = 0; l < 3; l++) {
    const age = t - laneLast[l]
    if (age > bestAge) { bestAge = age; best = l }
  }
  laneLast[best] = t
  return best
}
function fire(tk, quiet = false) {
  events.push({ t0: t, tk, mag: magOf(tk), lane: pickLane(), col: colOf(tk) })
  if (tk.is_major_incident && !quiet) { rings.push({ t0: t }); flash = 1 }
}

/* ── simulation step ── */
function step(dt) {
  t += dt
  const act = props.tickets
  if (t > nextFire) {
    const interval = act.length ? clamp(26 / act.length, 2.6, 8.5) : 10
    nextFire = t + interval * (0.85 + Math.abs(noise(t, 0.9, 1.7, 2.9)) * 0.35)
    if (act.length) fire(act[queueIdx++ % act.length])
    else events.push({ t0: t, tk: null, mag: 1.6 + Math.abs(noise(t, 1.1, 2.3, 3.7)) * 1.2, lane: 0, col: P.amber })
  }
  // pen sample = baseline micro-tremor + active event envelopes
  let v = noise(t * 2.3, 3.1, 7.7, 13.3) * Math.max(3, H * 0.012)
  for (const e of events) {
    const a = t - e.t0
    if (a >= 0 && a < 2.3) {
      const env = Math.exp(-a * 2.4) * e.mag
      v += Math.sin(a * (30 + e.mag * 5.5)) * env * H * 0.026
    }
  }
  samples.push({ t, v })
  const horizon = penX() / speed() + 6
  while (samples.length && t - samples[0].t > horizon) samples.shift()
  events = events.filter(e => penX() - (t - e.t0) * speed() > -140)
  rings = rings.filter(r => t - r.t0 < 3.0)
  flash = Math.max(0, flash - dt * 1.5)
}

/* ── draw ── */
function draw() {
  if (!c || !W || !H) return
  const px = penX(), spd = speed(), base = H * 0.47
  flagRects = []

  // paper
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, P.bg1); g.addColorStop(0.5, P.bg0); g.addColorStop(1, P.bg1)
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  // crimson station aura behind the pen
  const ag = c.createRadialGradient(px, base, 0, px, base, W * 0.34)
  ag.addColorStop(0, hexa(P.core, P.auraA)); ag.addColorStop(1, hexa(P.core, 0))
  c.fillStyle = ag; c.fillRect(0, 0, W, H)

  // horizontal rulings
  c.lineWidth = 1
  const rowH = H * 0.085
  for (let y = base % rowH; y < H; y += rowH) {
    c.strokeStyle = Math.abs(y - base) < 2 ? P.grid2 : P.grid
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke()
  }
  // vertical time rulings scroll with the paper
  const colW = Math.max(48, W * 0.055)
  const scroll = (t * spd) % colW
  c.strokeStyle = P.grid
  for (let x = px - scroll; x > -colW; x -= colW) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke() }
  // time ruler labels along the bottom ruling
  c.font = `9px ${MONO}`
  c.fillStyle = P.dim
  c.textAlign = 'left'
  const lblW = colW * 3
  for (let x = px - ((t * spd) % lblW); x > W * 0.05; x -= lblW) {
    const sec = Math.max(0, Math.round(t - (px - x) / spd))
    c.fillText(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, x + 4, H - 10)
  }

  // MI flash band
  if (flash > 0) { c.fillStyle = hexa(P.core, flash * (P.dark ? 0.09 : 0.06)); c.fillRect(0, 0, W, H) }

  // shockwave rings — travel with the paper from where they fired
  c.save(); c.globalCompositeOperation = P.add
  for (const r of rings) {
    const a = (t - r.t0) / 3.0
    const cx = px - (t - r.t0) * spd
    const R = ease(a) * Math.min(W * 0.24, H * 0.9)
    c.strokeStyle = hexa(P.core, (1 - a) * (P.dark ? 0.5 : 0.4)); c.lineWidth = 2
    c.beginPath(); c.arc(cx, base, R, 0, TAU); c.stroke()
    c.strokeStyle = hexa(P.flare, (1 - a) * 0.25); c.lineWidth = 1
    c.beginPath(); c.arc(cx, base, R * 0.68, 0, TAU); c.stroke()
  }
  c.restore()

  // event flags (skip ambient null-ticket events)
  const fadeFrom = W * 0.42, fadeTo = W * 0.3
  c.textAlign = 'left'
  for (const e of events) {
    if (!e.tk) continue
    const x = px - (t - e.t0) * spd
    if (x < fadeTo) continue
    const fade = clamp((x - fadeTo) / (fadeFrom - fadeTo), 0, 1)
    const hov = hoverKey === flagKey(e)
    const yTop = H * [0.105, 0.215, 0.325][e.lane]
    // dashed drop line
    c.strokeStyle = hexa(e.col, 0.45 * fade); c.setLineDash([3, 5]); c.lineWidth = 1
    c.beginPath(); c.moveTo(x, yTop + 20); c.lineTo(x, H * 0.8); c.stroke(); c.setLineDash([])
    // chip
    const tags = [`${e.tk.ticket_number} · M${e.mag.toFixed(1)}`]
    if (e.tk.is_major_incident) tags.push('MAJOR')
    else if (e.tk.sla_response_breached || e.tk.sla_resolution_breached) tags.push('BREACH')
    else if (!e.tk.acknowledged_at) tags.push('UNACKED')
    const label = tags.join(' · ')
    c.font = `600 10px ${MONO}`
    const tw = c.measureText(label).width
    const bw = tw + 16, bh = 20
    const bx = clamp(x - tw / 2 - 8, W * 0.30, W - bw - 10), by = yTop
    c.globalAlpha = fade
    c.fillStyle = P.chipBg
    rr(bx, by, bw, bh, 6); c.fill()
    c.strokeStyle = hexa(e.col, hov ? 1 : 0.6); c.lineWidth = hov ? 1.6 : 1
    rr(bx, by, bw, bh, 6); c.stroke()
    if (hov) {
      c.save(); c.globalCompositeOperation = P.add
      c.strokeStyle = hexa(e.col, 0.35); c.lineWidth = 5
      rr(bx, by, bw, bh, 6); c.stroke(); c.restore()
    }
    c.fillStyle = hov ? P.ink : hexa(e.col, 1)
    c.fillText(label, bx + 8, by + 14)
    c.globalAlpha = 1
    flagRects.push({ x: bx, y: by, w: bw, h: bh, tk: e.tk, key: flagKey(e) })
  }

  // trace — glow pass + core pass
  const n = samples.length
  if (n > 2) {
    for (const [wd, al] of [[6, P.dark ? 0.16 : 0.10], [2, 1]]) {
      c.lineWidth = wd; c.lineJoin = 'round'
      if (wd > 3) { c.save(); c.globalCompositeOperation = P.add } else { c.save() }
      c.beginPath()
      let started = false
      for (let i = 0; i < n; i++) {
        const s = samples[i], x = px - (t - s.t) * spd
        if (x < -8) continue
        if (!started) { c.moveTo(x, base + s.v); started = true } else c.lineTo(x, base + s.v)
      }
      const gr = c.createLinearGradient(0, 0, W, 0)
      gr.addColorStop(0, hexa(P.amber, 0))
      gr.addColorStop(0.45, hexa(P.amber, 0.55 * al))
      gr.addColorStop(0.86, hexa(P.core, 0.95 * al))
      gr.addColorStop(1, hexa(P.core, al))
      c.strokeStyle = gr; c.stroke(); c.restore()
    }
    // pen head
    const pv = samples[n - 1].v
    c.save(); c.globalCompositeOperation = P.add
    const pg = c.createRadialGradient(px, base + pv, 0, px, base + pv, 24)
    pg.addColorStop(0, hexa(P.core, 0.9)); pg.addColorStop(1, hexa(P.core, 0))
    c.fillStyle = pg; c.beginPath(); c.arc(px, base + pv, 24, 0, TAU); c.fill()
    c.restore()
    c.fillStyle = P.penHot; c.beginPath(); c.arc(px, base + pv, 2.8, 0, TAU); c.fill()
  }

  // magnitude scale beside the pen
  c.font = `9px ${MONO}`; c.fillStyle = P.dim; c.textAlign = 'left'
  ;['M8', 'M6', 'M4', 'M2'].forEach((m, i) => c.fillText(m, W - 26, H * 0.16 + i * H * 0.15))

  // station HUD (top-right)
  c.textAlign = 'right'
  c.font = `600 9.5px ${MONO}`
  c.fillStyle = P.sub
  c.fillText(`STN CRIT-OPS · ${new Date(props.now).toISOString().substr(11, 8)} UTC`, W - 40, 22)
  const live = (props.stats.major_incidents || 0) > 0
  c.fillStyle = live ? P.core : P.ack
  c.beginPath(); c.arc(W - 28, 18, 3, 0, TAU); c.fill()
  c.textAlign = 'left'

  // calm caption at zero data
  if (!props.tickets.length) {
    c.font = `600 11px ${MONO}`; c.fillStyle = hexa(P.ack, 0.85); c.textAlign = 'center'
    c.fillText('ALL QUIET — NO ACTIVE CRITICALS · BASELINE TREMOR ONLY', px - W * 0.22, H * 0.24)
    c.textAlign = 'left'
  }
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
const flagKey = (e) => `${e.tk?.id || 'amb'}:${e.t0.toFixed(2)}`

/* ── pointer (flag hit-testing) ── */
let hoverKey = null
const hit = (ev) => {
  const r = cv.value.getBoundingClientRect()
  const x = ev.clientX - r.left, y = ev.clientY - r.top
  return flagRects.find(f => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) || null
}
const onMove = (ev) => { const f = hit(ev); hoverKey = f?.key || null; hovering.value = !!f; if (props.reduced && c) draw() }
const onLeave = () => { hoverKey = null; hovering.value = false; if (props.reduced && c) draw() }
const onClick = (ev) => { const f = hit(ev); if (f?.tk) emit('open', f.tk) }

/* ── loop + lifecycle ── */
function frame(nowMs) {
  if (!alive) return
  if (visible && pageVisible && !props.reduced) {
    const dt = last ? Math.min((nowMs - last) / 1000, 0.05) : 0.016
    last = nowMs
    step(dt)
    draw()
  } else { last = 0 }
  raf = requestAnimationFrame(frame)
}
/* reduced-motion: silently simulate ~45s so the strip shows a REAL composition, draw once */
function staticFrame() {
  samples = []; events = []; rings = []; flash = 0; t = 0; queueIdx = 0; nextFire = 1
  for (let i = 0; i < 900; i++) step(1 / 20)
  flash = 0; rings = []
  draw()
}
function resize() {
  const r = root.value?.getBoundingClientRect()
  if (!r || !r.width || !cv.value) return
  W = r.width; H = r.height
  DPR = Math.min(window.devicePixelRatio || 1, 1.75)
  cv.value.width = Math.round(W * DPR)
  cv.value.height = Math.round(H * DPR)
  c = cv.value.getContext('2d')
  c.setTransform(DPR, 0, 0, DPR, 0, 0)
  if (props.reduced) staticFrame()
}

let ro = null, io = null, mo = null
const onVis = () => { pageVisible = document.visibilityState === 'visible'; last = 0 }
onMounted(() => {
  P = palette()
  knownIds = new Set(props.tickets.map(x => String(x.id)))
  ro = new ResizeObserver(resize); ro.observe(root.value)
  io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting !== false; last = 0 }, { threshold: 0.05 })
  io.observe(root.value)
  mo = new MutationObserver(() => {
    P = palette()
    events.forEach(e => { if (e.tk) e.col = colOf(e.tk) })
    if (props.reduced) staticFrame()
  })
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

/* new arrivals hit the pen immediately (cap a burst at 3); the FIRST load staggers in
   through the scheduler instead — a cold strip drawing itself in reads better than a pile. */
watch(() => props.tickets, (list) => {
  const ids = new Set((list || []).map(x => String(x.id)))
  if (!seeded) {
    if (ids.size) seeded = true
    knownIds = ids
    if (props.reduced && c) staticFrame()
    return
  }
  if (alive && !props.reduced) {
    let fired = 0
    for (const tk of list || []) {
      if (!knownIds.has(String(tk.id)) && fired < 3) { fire(tk); fired++ }
    }
    if (fired) nextFire = Math.max(nextFire, t + 4)
  }
  knownIds = ids
  if (props.reduced && c) staticFrame()
}, { deep: false })
watch(() => props.reduced, (v) => { if (v) staticFrame(); else { last = 0 } })
</script>

<style scoped>
.smg { position: relative; width: 100%; overflow: hidden; }
.smg.fill { position: absolute; inset: 0; height: auto; }
.smg-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.smg-cv.hot { cursor: pointer; }
</style>
