<template>
  <div ref="wrap" class="swy" :style="{ height: height ? height + 'px' : '100%' }" role="img"
    aria-label="The Switchyard — inbound tickets ride the mainline, routing rules throw the switches, queues are the classification lanes; lane fill = live depth">
    <canvas ref="cv" class="swy-cv" @mousemove="onMove" @mouseleave="onLeave" @click="onClick" />
    <!-- hover telemetry card (HTML so it stays crisp + theme-correct) -->
    <div v-if="hover" class="swy-tip sd-mono" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
      <div class="swy-tip-no" :style="{ color: hover.q.color || 'var(--sd-qs-hi)' }">
        {{ hover.q.name }}<template v-if="hover.q.tier"> · L{{ hover.q.tier }}</template>
      </div>
      <div class="swy-tip-meta">
        <b>{{ hover.q.open }} OPEN</b>
        <span>{{ hover.q.unassigned }} UNOWNED</span>
        <span :class="{ hot: hover.q.breached }">{{ hover.q.breached }} BREACHED</span>
      </div>
      <div class="swy-tip-meta">
        <em>{{ hover.q.agents_online }}/{{ hover.q.agents_total }} ONLINE</em>
        <span>{{ hover.wait }}</span>
      </div>
      <div class="swy-tip-cta">CLICK TO INSPECT LANE</div>
    </div>
    <div class="swy-legend sd-mono" aria-hidden="true">
      MAINLINE → SWITCHES → LANES · <i>{{ laneCount }}</i> LANES · <i>{{ totalOpen }}</i> WAGONS ON YARD
    </div>
  </div>
</template>

<script setup>
/*
  SdSwitchyard — "THE SWITCHYARD", the Queues module's signature instrument. A night
  rail classification yard: one inbound MAINLINE enters from the left, hits a throat
  of glowing SWITCH POINTS (the routing rules — they blink when a packet takes a
  branch), and fans into one classification LANE per visible queue. Lane edge color =
  queue color / tier accent; the wagon stack riding each lane = live open depth
  (capped visually); a SEMAPHORE lamp at each lane throat shows queue health
  (green/amber/red). Ticket-packets spawn on the mainline at a rate scaled by recent
  inflow and slide through their switch into a lane, coupling onto the wagon stack
  with a soft brass flash. Tier bands (L1/L2/L3) tint the right margin. Canvas is
  DPR-aware, pauses on document.hidden + off-screen (IntersectionObserver), re-reads
  --sd-qs-* tokens on theme flips, and hit-tests lanes (hover telemetry, click →
  @pick(queue)). `reduced` renders one static frame (data-cinematic="on" un-reduces
  upstream). Fills the hero as its full-bleed backdrop (height=0 → 100%); the LEFT
  air above the mainline stays calm for the glass console.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  queues: { type: Array, default: () => [] },     // QueueOverviewCard[]
  totals: { type: Object, default: () => ({}) },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },
})
const emit = defineEmits(['pick'])

const wrap = ref(null), cv = ref(null)
const hover = ref(null)
let ctx = null, W = 0, H = 0
let raf = 0, tPrev = 0, running = false, offscreen = false
let io = null, mo = null, ro = null

/* ── palette from the --sd-qs-* tokens (re-read on theme flips) ── */
const readVar = (k, fb) => (getComputedStyle(document.documentElement).getPropertyValue(k).trim() || fb)
let P = {}
const readPalette = () => {
  P = {
    core: readVar('--sd-qs-core', '#edb249'),
    hi: readVar('--sd-qs-hi', '#ffd98a'),
    deep: readVar('--sd-qs-deep', '#9a6b1f'),
    rail: readVar('--sd-qs-rail', '#8b93a3'),
    go: readVar('--sd-qs-go', '#34d399'),
    warn: readVar('--sd-qs-warn', '#fbbf24'),
    halt: readVar('--sd-qs-halt', '#fb7185'),
    t: { 1: readVar('--sd-qs-t1', '#f5c04e'), 2: readVar('--sd-qs-t2', '#fb7d3c'), 3: readVar('--sd-qs-t3', '#b7841f') },
    ink: '#f6efdf',                                // the yard night stays dark in BOTH themes
  }
}
const laneColor = (q) => q.color || (q.tier ? P.t[q.tier] : P.rail)
const healthColor = (h) => (h === 'red' ? P.halt : h === 'amber' ? P.warn : P.go)

/* ── layout ── */
const MAX_LANES = 9
const lanes = ref([])          // computed geometry per visible queue
const laneCount = computed(() => Math.min(props.queues.length, MAX_LANES))
const totalOpen = computed(() => props.queues.reduce((a, q) => a + (q.open || 0), 0))

const buildLanes = () => {
  // Order: tier asc (untiered last), then queue_priority desc — the yard reads L1 top.
  const qs = [...props.queues]
    .sort((a, b) => ((a.tier || 9) - (b.tier || 9)) || ((b.queue_priority || 50) - (a.queue_priority || 50)))
    .slice(0, MAX_LANES)
  const n = qs.length
  if (!n || !W) { lanes.value = []; return }
  const top = H * 0.30, bottom = H - 34
  const gap = Math.min(46, (bottom - top) / Math.max(n, 1))
  const throatX = W * 0.34, laneEndX = W - 24
  lanes.value = qs.map((q, i) => ({
    q, i,
    y: top + gap * (i + 0.5),
    x0: throatX + 40 + i * 6,          // staggered switch exits read as a real ladder
    x1: laneEndX,
    color: laneColor(q),
  }))
}
watch(() => props.queues, () => { buildLanes(); seedWagons(); if (props.reduced) drawStatic() }, { deep: false })

/* ── mainline + packets ── */
const mainY = () => H * 0.80
let packets = []               // { seg: 'main'|'branch'|'couple', p, lane, speed }
let sparks = []                // coupling flashes
let switchGlow = new Map()     // laneIdx → glow ttl
const spawnPacket = () => {
  if (!lanes.value.length) return
  // Weight lane choice by recent inflow so busy queues visibly pull traffic.
  const weights = lanes.value.map(l => 1 + (l.q.flow || []).reduce((a, f) => a + (f.inflow || 0), 0))
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * sum, idx = 0
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { idx = i; break } }
  packets.push({ seg: 'main', p: 0, lane: idx, speed: 0.10 + Math.random() * 0.05 })
}

/* wagons: the resting depth stack per lane (visual cap so a 200-deep queue stays readable) */
let wagons = []                // per lane: count
const seedWagons = () => { wagons = lanes.value.map(l => Math.min(l.q.open || 0, 14)) }

/* ── draw ── */
const drawYardBase = () => {
  ctx.clearRect(0, 0, W, H)
  // yard night gradient + faint ballast texture rows
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(237,178,73,0.05)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // tier bands on the right margin
  const bands = {}
  for (const l of lanes.value) {
    const t = l.q.tier || 0
    if (!bands[t]) bands[t] = { y0: l.y, y1: l.y }
    bands[t].y0 = Math.min(bands[t].y0, l.y); bands[t].y1 = Math.max(bands[t].y1, l.y)
  }
  ctx.save()
  ctx.font = '700 9px ui-monospace, monospace'
  for (const [t, b] of Object.entries(bands)) {
    if (t === '0') continue
    const col = P.t[t] || P.rail
    ctx.fillStyle = col + '14'
    ctx.fillRect(W - 66, b.y0 - 16, 50, (b.y1 - b.y0) + 32)
    ctx.fillStyle = col + 'aa'
    ctx.fillText(`L${t}`, W - 58, b.y0 - 4)
  }
  ctx.restore()

  // mainline
  const my = mainY()
  ctx.strokeStyle = P.rail + '66'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(-10, my); ctx.lineTo(W * 0.34, my); ctx.stroke()
  ctx.strokeStyle = P.rail + '2a'
  ctx.lineWidth = 9
  ctx.beginPath(); ctx.moveTo(-10, my); ctx.lineTo(W * 0.34, my); ctx.stroke()
  // sleepers
  ctx.strokeStyle = P.rail + '30'
  ctx.lineWidth = 1
  for (let x = 8; x < W * 0.34; x += 16) {
    ctx.beginPath(); ctx.moveTo(x, my - 6); ctx.lineTo(x, my + 6); ctx.stroke()
  }
}

const branchPath = (lane) => {
  // bezier from the throat (mainline end) up/over to the lane start
  const my = mainY()
  const tx = W * 0.34
  return { x0: tx, y0: my, cx: tx + (lane.x0 - tx) * 0.45, cy: my, cx2: tx + (lane.x0 - tx) * 0.6, cy2: lane.y, x1: lane.x0, y1: lane.y }
}
const bezPoint = (b, t) => {
  const u = 1 - t
  const x = u * u * u * b.x0 + 3 * u * u * t * b.cx + 3 * u * t * t * b.cx2 + t * t * t * b.x1
  const y = u * u * u * b.y0 + 3 * u * u * t * b.cy + 3 * u * t * t * b.cy2 + t * t * t * b.y1
  return [x, y]
}

const drawLanes = (nowMs) => {
  ctx.save()
  ctx.font = '700 10px ui-monospace, monospace'
  for (const l of lanes.value) {
    const col = l.color
    // branch curve (the ladder)
    const b = branchPath(l)
    ctx.strokeStyle = P.rail + '4d'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.bezierCurveTo(b.cx, b.cy, b.cx2, b.cy2, b.x1, b.y1); ctx.stroke()
    // switch glow when a packet recently branched
    const glow = switchGlow.get(l.i) || 0
    if (glow > 0) {
      ctx.fillStyle = P.hi + Math.floor(140 * glow).toString(16).padStart(2, '0')
      ctx.beginPath(); ctx.arc(b.x0 + 6, b.y0 - 4 - l.i * 2, 3.4 + glow * 2.4, 0, Math.PI * 2); ctx.fill()
    }
    // lane rails
    ctx.strokeStyle = col + '73'
    ctx.lineWidth = 2.4
    ctx.beginPath(); ctx.moveTo(l.x0, l.y); ctx.lineTo(l.x1, l.y); ctx.stroke()
    ctx.strokeStyle = col + '22'
    ctx.lineWidth = 8
    ctx.beginPath(); ctx.moveTo(l.x0, l.y); ctx.lineTo(l.x1, l.y); ctx.stroke()
    // depth fill (proportional lane occupancy)
    const cap = Math.max(1, ...lanes.value.map(x => x.q.open || 0))
    const fillW = ((l.q.open || 0) / cap) * (l.x1 - l.x0 - 78)
    if (fillW > 0) {
      const fg = ctx.createLinearGradient(l.x1 - fillW, 0, l.x1, 0)
      fg.addColorStop(0, col + '00'); fg.addColorStop(1, col + '55')
      ctx.fillStyle = fg
      ctx.fillRect(l.x1 - 66 - fillW, l.y - 5, fillW, 10)
    }
    // wagon stack (resting depth, capped)
    const n = wagons[l.i] || 0
    for (let w = 0; w < n; w++) {
      const wx = l.x1 - 70 - w * 11
      if (wx < l.x0 + 30) break
      ctx.fillStyle = col + (w === 0 ? 'e6' : 'a6')
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') ctx.roundRect(wx, l.y - 4, 8, 8, 2)
      else ctx.rect(wx, l.y - 4, 8, 8)
      ctx.fill()
    }
    // semaphore lamp at the throat + breathing halo when red
    const hc = healthColor(l.q.health)
    const breathe = l.q.health === 'red' ? (0.6 + 0.4 * Math.sin(nowMs / 300)) : 1
    ctx.fillStyle = hc
    ctx.beginPath(); ctx.arc(l.x0 - 9, l.y, 3.2, 0, Math.PI * 2); ctx.fill()
    if (l.q.health !== 'green') {
      ctx.fillStyle = hc + Math.floor(64 * breathe).toString(16).padStart(2, '0')
      ctx.beginPath(); ctx.arc(l.x0 - 9, l.y, 7.5, 0, Math.PI * 2); ctx.fill()
    }
    // label: NAME · open (hover brightens)
    ctx.fillStyle = l.hovered ? P.ink : P.ink + 'b3'
    const label = `${(l.q.code || l.q.name || '').toString().toUpperCase().slice(0, 14)} · ${l.q.open || 0}`
    ctx.fillText(label, l.x0 + 4, l.y - 9)
    // default-queue chevron
    if (l.q.is_default) {
      ctx.fillStyle = P.core + 'cc'
      ctx.fillText('◈ DEFAULT', l.x1 - 58, l.y - 9)
    }
  }
  ctx.restore()
}

const drawPackets = (dt, nowMs) => {
  const my = mainY()
  for (const pk of packets) {
    const lane = lanes.value[pk.lane]
    if (!lane) { pk.dead = true; continue }
    if (pk.seg === 'main') {
      pk.p += pk.speed * dt
      const x = -10 + pk.p * (W * 0.34 + 10)
      drawGlowDot(x, my, lane.color)
      if (pk.p >= 1) { pk.seg = 'branch'; pk.p = 0; switchGlow.set(pk.lane, 1) }
    } else if (pk.seg === 'branch') {
      pk.p += pk.speed * 1.15 * dt
      const [x, y] = bezPoint(branchPath(lane), Math.min(1, pk.p))
      drawGlowDot(x, y, lane.color)
      if (pk.p >= 1) {
        pk.dead = true
        wagons[pk.lane] = Math.min((wagons[pk.lane] || 0) + 1, 14)
        sparks.push({ x: lane.x1 - 70 - (wagons[pk.lane] - 1) * 11, y: lane.y, ttl: 1, color: lane.color })
      }
    }
  }
  packets = packets.filter(pk => !pk.dead)
  for (const s of sparks) {
    s.ttl -= dt * 2.2
    if (s.ttl <= 0) continue
    ctx.fillStyle = P.hi + Math.floor(150 * s.ttl).toString(16).padStart(2, '0')
    ctx.beginPath(); ctx.arc(s.x + 4, s.y, 4 + (1 - s.ttl) * 7, 0, Math.PI * 2); ctx.fill()
  }
  sparks = sparks.filter(s => s.ttl > 0)
  for (const [k, v] of switchGlow) { const nv = v - dt * 1.6; if (nv <= 0) switchGlow.delete(k); else switchGlow.set(k, nv) }
}

const drawGlowDot = (x, y, col) => {
  ctx.fillStyle = col
  ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = col + '38'
  ctx.beginPath(); ctx.arc(x, y, 6.5, 0, Math.PI * 2); ctx.fill()
}

let spawnAcc = 0
const frame = (nowMs) => {
  if (!running) return
  const dt = Math.min(0.05, (nowMs - tPrev) / 1000 || 0.016)
  tPrev = nowMs
  if (!offscreen && !document.hidden) {
    // spawn cadence scales with yard traffic (min gentle drizzle, max busy yard)
    const busy = Math.min(1, totalOpen.value / 40)
    spawnAcc += dt
    if (spawnAcc > (1.6 - busy * 1.1) && lanes.value.length) { spawnAcc = 0; spawnPacket() }
    drawYardBase()
    drawLanes(nowMs)
    drawPackets(dt, nowMs)
  }
  raf = requestAnimationFrame(frame)
}

const drawStatic = () => {
  if (!ctx || !W) return
  drawYardBase()
  drawLanes(0)
}

/* ── hit-testing ── */
const laneAt = (mx, my2) => lanes.value.find(l => my2 > l.y - 14 && my2 < l.y + 12 && mx > l.x0 - 20 && mx < l.x1)
const fmtWait = (m) => (m == null ? 'NO WAIT DATA' : m < 60 ? `~${Math.round(m)}m FIRST TOUCH` : `~${(m / 60).toFixed(1)}h FIRST TOUCH`)
const onMove = (e) => {
  const r = cv.value.getBoundingClientRect()
  const mx = e.clientX - r.left, my2 = e.clientY - r.top
  const l = laneAt(mx, my2)
  lanes.value.forEach(x => { x.hovered = x === l })
  hover.value = l ? {
    q: l.q, x: Math.min(mx + 14, W - 210), y: Math.max(10, l.y - 86),
    wait: fmtWait(l.q.avg_wait_mins),
  } : null
  cv.value.style.cursor = l ? 'pointer' : 'default'
}
const onLeave = () => { hover.value = null; lanes.value.forEach(x => { x.hovered = false }) }
const onClick = () => { if (hover.value) emit('pick', hover.value.q) }

/* ── lifecycle ── */
const resize = () => {
  if (!wrap.value || !cv.value) return
  const r = wrap.value.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  W = Math.max(10, r.width); H = Math.max(10, r.height)
  cv.value.width = W * dpr; cv.value.height = H * dpr
  cv.value.style.width = `${W}px`; cv.value.style.height = `${H}px`
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildLanes(); seedWagons()
  if (props.reduced) drawStatic()
}

onMounted(() => {
  readPalette()
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value)
  mo = new MutationObserver(() => { readPalette(); if (props.reduced) drawStatic() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  io = new IntersectionObserver(([en]) => { offscreen = !en.isIntersecting }, { threshold: 0.05 })
  io.observe(wrap.value)
  if (props.reduced) { drawStatic() } else { running = true; tPrev = performance.now(); raf = requestAnimationFrame(frame) }
})
watch(() => props.reduced, (v) => {
  if (v) { running = false; cancelAnimationFrame(raf); drawStatic() }
  else if (!running) { running = true; tPrev = performance.now(); raf = requestAnimationFrame(frame) }
})
onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
  ro?.disconnect(); mo?.disconnect(); io?.disconnect()
})
</script>

<style scoped>
.swy { position: relative; width: 100%; overflow: hidden; }
.swy-cv { display: block; width: 100%; height: 100%; }

.swy-tip { position: absolute; z-index: 3; width: 200px; padding: 10px 12px; border-radius: 12px; pointer-events: none;
  border: 1px solid var(--sd-qs-brd); background: rgba(11, 9, 6, 0.92); backdrop-filter: blur(8px); color: #f6efdf; }
.swy-tip-no { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; }
.swy-tip-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px; font-size: 9.5px; color: rgba(246, 239, 223, 0.62); }
.swy-tip-meta b { color: var(--sd-qs-hi); }
.swy-tip-meta .hot { color: var(--sd-qs-halt); }
.swy-tip-meta em { font-style: normal; color: var(--sd-qs-go); }
.swy-tip-cta { margin-top: 7px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-qs-core); }

.swy-legend { position: absolute; right: 14px; bottom: 10px; z-index: 2; font-size: 9px; font-weight: 700;
  letter-spacing: 0.16em; color: rgba(246, 239, 223, 0.4); pointer-events: none; }
.swy-legend i { font-style: normal; color: var(--sd-qs-hi); }
</style>
