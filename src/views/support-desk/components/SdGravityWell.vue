<template>
  <div ref="wrap" class="gw" :style="{ height: height ? height + 'px' : '100%' }" role="img"
    aria-label="Gravity Well — every overdue ticket orbits the singularity; the later it runs, the deeper and faster the orbit">
    <canvas ref="cv" class="gw-cv" @mousemove="onMove" @mouseleave="onLeave" @click="onClick" />
    <!-- hover telemetry card (HTML so it stays crisp + theme-correct) -->
    <div v-if="hover" class="gw-tip sd-mono" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
      <div class="gw-tip-no">{{ hover.t.ticket_number }} · {{ String(hover.t.priority || '').toUpperCase() }}</div>
      <div class="gw-tip-subj">{{ hover.t.subject }}</div>
      <div class="gw-tip-meta">
        <b>{{ hover.late }}</b>
        <span>{{ hover.t.assigned_agent_name || 'UNOWNED' }}</span>
      </div>
      <div class="gw-tip-cta">CLICK TO OPEN</div>
    </div>
    <div class="gw-legend sd-mono" aria-hidden="true">ORBIT DEPTH = TIME PAST TARGET · <i>{{ bodyCount }}</i> IN DECAY</div>
  </div>
</template>

<script setup>
/*
  SdGravityWell — "THE GRAVITY WELL" (gallery pick 01/08), the Overdue desk's signature
  instrument. Every overdue ticket is a burning body spiralling toward a singularity:
  orbit radius = log(lateness) (later = deeper), angular speed = Keplerian (deeper =
  faster), color = priority, dashed halo = unowned. Accretion arcs + infalling dust show
  the desk losing time in real time; an emerald escape burn celebrates each recovery.
  Canvas is DPR-aware, pauses on document.hidden, re-reads --sd-ovd-* tokens on theme
  flips, and hit-tests bodies (hover telemetry, click → @open). `reduced` renders a
  single static frame (data-cinematic="on" un-reduces upstream). Fills the hero as its
  full-bleed backdrop (height=0 → 100%); the left air stays calm for the glass console.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // filtered working set (decorated rows)
  stats: { type: Object, default: () => ({}) },  // /me/tickets/overdue/stats
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },
})
const emit = defineEmits(['open'])

const wrap = ref(null), cv = ref(null)
const hover = ref(null)
let ctx = null, W = 0, H = 0, CX = 0, CY = 0
let raf = 0, tPrev = 0, running = false, hidden = false

/* ── palette from the --sd-ovd-* tokens (re-read on theme flips) ── */
const readVar = (k, fb) => (getComputedStyle(document.documentElement).getPropertyValue(k).trim() || fb)
let P = {}
const PRI_FALLBACK = { critical: '#ef4444', urgent: '#f97316', high: '#f97316', medium: '#f59e0b', low: '#9aa3ac' }
const readPalette = () => {
  P = {
    core: readVar('--sd-ovd-core', '#e11d48'),
    hi: readVar('--sd-ovd-hi', '#fb7185'),
    deep: readVar('--sd-ovd-deep', '#9f1239'),
    dust: readVar('--sd-ovd-dust', '#f59e0b'),
    escape: readVar('--sd-ovd-escape', '#34d399'),
    ink: '#f5eee9',                                  // the well stays dark in BOTH themes
    pri: {
      critical: readVar('--sd-pri-critical', PRI_FALLBACK.critical),
      urgent: readVar('--sd-pri-urgent', PRI_FALLBACK.urgent),
      high: readVar('--sd-pri-high', PRI_FALLBACK.high),
      medium: readVar('--sd-pri-medium', PRI_FALLBACK.medium),
      low: readVar('--sd-pri-low', PRI_FALLBACK.low),
    },
  }
}
const priCol = (t) => P.pri[t.priority] || PRI_FALLBACK[t.priority] || P.dust

/* ── lateness (pause-aware fallback; scope guarantees the clock runs) ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const lateMin = (t) => {
  const resDue = ep(t.resolution_due_at), respDue = ep(t.response_due_at)
  const end = ep(t.sla_paused_since) || props.now
  const due = (resDue && resDue < end) ? resDue : ((respDue && !t.first_responded_at && respDue < end) ? respDue : 0)
  return due ? Math.max(0, Math.floor((end - due) / 60000)) : 0
}
const lateLabel = (m) => (m < 60 ? `${m}m LATE` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m LATE`
  : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h LATE`)

/* ── bodies (keyed by ticket id so orbits stay stable across refetches) ── */
const RMIN = 62
const LMAX = Math.log(3 * 24 * 60 + 1)               // >3d pins to the horizon
const bodies = new Map()
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const rMax = () => Math.min(H * 0.44, 300)
const targetR = (m) => {
  const f = Math.min(1, Math.log(m + 1) / LMAX)
  return rMax() - (rMax() - RMIN - 8) * f
}
const syncBodies = () => {
  const seen = new Set()
  for (const t of props.tickets) {
    const id = String(t.id)
    seen.add(id)
    const m = lateMin(t)
    const b = bodies.get(id)
    if (b) { b.t = t; b.m = m; b.fade = Math.min(1, b.fade + 0.1) }
    else bodies.set(id, {
      t, m, fade: 0, trail: [],
      a: (hash(id) % 628) / 100,
      r: targetR(m) + 26,                             // spiral IN on arrival
      x: 0, y: 0, hover: false,
    })
  }
  for (const [id, b] of bodies) if (!seen.has(id)) { b.dying = true; if (b.fade <= 0) bodies.delete(id) }
}
watch(() => props.tickets, () => { syncBodies(); if (props.reduced) drawStatic() }, { deep: false })
const bodyCount = computed(() => props.tickets.length)

/* ── ambient fields ── */
let dust = [], stars = []
const seedAmbient = () => {
  dust = Array.from({ length: 110 }, (_, i) => ({
    r: rMax() + ((i * 53) % 180), a: ((i * 97) % 628) / 100, sp: 0.10 + ((i * 29) % 35) / 100, sz: 0.6 + ((i * 13) % 14) / 10,
  }))
  stars = Array.from({ length: 80 }, (_, i) => ({
    x: ((i * 137) % 1000) / 1000, y: ((i * 71) % 1000) / 1000, tw: ((i * 31) % 628) / 100, sz: 0.4 + ((i * 17) % 12) / 10,
  }))
}
/* one emerald escape burn, riding whenever the team has recovered something today */
let escape = { r: RMIN + 26, a: 1.2, alpha: 1 }

/* ── sizing (DPR-aware, observes the hero) ── */
let ro = null
const size = () => {
  if (!wrap.value || !cv.value) return
  const rect = wrap.value.getBoundingClientRect()
  W = Math.max(1, rect.width); H = Math.max(1, rect.height)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.value.width = W * dpr; cv.value.height = H * dpr
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  CX = W * (W < 940 ? 0.5 : 0.66); CY = H * 0.46
  seedAmbient()
  if (props.reduced) drawStatic()
}

/* ── one simulation/draw pass ── */
const TWO_PI = Math.PI * 2
function drawFrame (nowT, dt) {
  ctx.clearRect(0, 0, W, H)
  const t = nowT * 0.001

  /* deep-space vignette toward the well */
  const vg = ctx.createRadialGradient(CX, CY, RMIN * 0.4, CX, CY, rMax() + 160)
  vg.addColorStop(0, 'rgba(225,29,72,0.10)'); vg.addColorStop(0.45, 'rgba(13,5,9,0)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  /* stars */
  for (const s of stars) {
    s.tw += 0.02 * dt
    ctx.globalAlpha = 0.22 + 0.20 * Math.sin(s.tw)
    ctx.fillStyle = P.dust
    ctx.fillRect(s.x * W, s.y * H, s.sz, s.sz)
  }
  ctx.globalAlpha = 1

  /* accretion disk — layered rotating arcs */
  for (let i = 0; i < 24; i++) {
    const rr = RMIN - 8 + i * 1.7 + Math.sin(t * 2 + i) * 1.4
    const start = t * (0.5 + i * 0.028) + i * 1.7
    const len = 0.7 + ((i * 7) % 10) / 6
    ctx.beginPath(); ctx.arc(CX, CY, rr, start, start + len)
    ctx.strokeStyle = i % 3 ? P.core : P.hi
    ctx.globalAlpha = 0.55 * (0.16 + 0.5 * (i / 24))
    ctx.lineWidth = i % 4 === 0 ? 2.2 : 1.1
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  /* infalling dust — the desk losing minutes */
  for (const d of dust) {
    d.r -= d.sp * dt
    d.a += (2.2 / Math.max(30, d.r)) * dt * 2.6
    if (d.r < RMIN - 6) { d.r = rMax() + 40 + ((d.a * 997) % 160); d.a = (d.a * 7.31) % TWO_PI }
    const x = CX + Math.cos(d.a) * d.r, y = CY + Math.sin(d.a) * d.r * 0.92
    const heat = 1 - Math.min(1, (d.r - RMIN) / 220)
    ctx.globalAlpha = 0.10 + heat * 0.45
    ctx.fillStyle = heat > 0.72 ? P.hi : P.dust
    ctx.beginPath(); ctx.arc(x, y, d.sz * (0.7 + heat), 0, TWO_PI); ctx.fill()
  }
  ctx.globalAlpha = 1

  /* event horizon */
  const hg = ctx.createRadialGradient(CX, CY, RMIN * 0.15, CX, CY, RMIN)
  hg.addColorStop(0, '#000'); hg.addColorStop(0.8, '#070304'); hg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(CX, CY, RMIN, 0, TWO_PI); ctx.fill()
  ctx.beginPath(); ctx.arc(CX, CY, RMIN * 0.62, 0, TWO_PI)
  ctx.strokeStyle = P.hi; ctx.lineWidth = 1.6
  ctx.shadowColor = P.core; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0

  /* ── ticket bodies ── */
  for (const [id, b] of bodies) {
    if (b.dying) { b.fade -= 0.06 * dt; if (b.fade <= 0) { bodies.delete(id); continue } }
    else if (b.fade < 1) b.fade = Math.min(1, b.fade + 0.04 * dt)
    const tr = targetR(b.m)
    b.r += (tr - b.r) * Math.min(1, 0.02 * dt)                    // ease toward decayed orbit
    b.a += (5.4 / Math.pow(Math.max(RMIN, b.r), 1.18)) * dt       // Kepler: deeper = faster
    b.x = CX + Math.cos(b.a) * b.r
    b.y = CY + Math.sin(b.a) * b.r * 0.92
    b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 24) b.trail.shift()

    const col = priCol(b.t)
    if (b.hover) {
      ctx.beginPath(); ctx.ellipse(CX, CY, b.r, b.r * 0.92, 0, 0, TWO_PI)
      ctx.strokeStyle = P.hi; ctx.globalAlpha = 0.5 * b.fade; ctx.lineWidth = 1
      ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
    }
    for (let i = 1; i < b.trail.length; i++) {
      const p0 = b.trail[i - 1], p1 = b.trail[i]
      ctx.globalAlpha = (i / b.trail.length) * 0.5 * b.fade
      ctx.strokeStyle = col; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke()
    }
    ctx.globalAlpha = b.fade
    const rad = b.t.priority === 'critical' ? 6 : (b.t.priority === 'high' || b.t.priority === 'urgent') ? 5 : 4
    ctx.shadowColor = col; ctx.shadowBlur = b.hover ? 22 : 12
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(b.x, b.y, b.hover ? rad + 2 : rad, 0, TWO_PI); ctx.fill()
    ctx.shadowBlur = 0
    if (!b.t.assigned_agent_id) {                                  // unowned = dashed halo
      ctx.strokeStyle = P.ink; ctx.globalAlpha = 0.8 * b.fade; ctx.lineWidth = 1
      ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(b.x, b.y, rad + 4, 0, TWO_PI); ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }

  /* labels for the three deepest */
  const worst = [...bodies.values()].filter(b => !b.dying).sort((a, b) => b.m - a.m).slice(0, 3)
  ctx.font = '600 10px ui-monospace, Consolas, monospace'
  for (const b of worst) {
    ctx.globalAlpha = 0.9 * b.fade; ctx.fillStyle = P.ink
    ctx.fillText(b.t.ticket_number || '', b.x + 10, b.y - 6)
    ctx.globalAlpha = 0.75 * b.fade; ctx.fillStyle = P.hi
    ctx.fillText(lateLabel(b.m).replace(' LATE', ''), b.x + 10, b.y + 6)
  }
  ctx.globalAlpha = 1

  /* escape burn — only when the team actually recovered something today */
  if ((props.stats.recovered_today || 0) > 0) {
    escape.r += 1.4 * dt; escape.a += 0.02 * dt
    if (escape.r > rMax() + 120) { escape.alpha -= 0.03 * dt; if (escape.alpha <= 0) escape = { r: RMIN + 26, a: (t * 3) % TWO_PI, alpha: 1 } }
    const x = CX + Math.cos(escape.a) * escape.r, y = CY + Math.sin(escape.a) * escape.r * 0.92
    ctx.globalAlpha = Math.max(0, escape.alpha)
    ctx.shadowColor = P.escape; ctx.shadowBlur = 16; ctx.fillStyle = P.escape
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TWO_PI); ctx.fill(); ctx.shadowBlur = 0
    ctx.strokeStyle = P.escape; ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(x - Math.cos(escape.a) * 16, y - Math.sin(escape.a) * 16); ctx.lineTo(x, y); ctx.stroke()
    ctx.globalAlpha = 1
  }
}

/* ── loop control ── */
const loop = (nowT) => {
  if (!running) return
  const dt = Math.min(32, nowT - (tPrev || nowT)) / 16.6
  tPrev = nowT
  if (!hidden) drawFrame(nowT, dt)
  raf = requestAnimationFrame(loop)
}
const start = () => { if (running || props.reduced) return; running = true; tPrev = 0; raf = requestAnimationFrame(loop) }
const stop = () => { running = false; cancelAnimationFrame(raf) }
const drawStatic = () => { if (ctx) drawFrame(performance.now(), 0) }

watch(() => props.reduced, (r) => { if (r) { stop(); drawStatic() } else start() })

/* ── pointer: hover hit-test + click-through to the drawer ── */
let hoverBody = null
const onMove = (e) => {
  const rect = cv.value.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top
  let best = null, bd = 26 * 26
  for (const b of bodies.values()) {
    if (b.dying) continue
    const dx = b.x - mx, dy = b.y - my, d = dx * dx + dy * dy
    if (d < bd) { bd = d; best = b }
  }
  for (const b of bodies.values()) b.hover = (b === best)
  hoverBody = best
  cv.value.style.cursor = best ? 'pointer' : 'default'
  hover.value = best ? { t: best.t, x: best.x, y: best.y, late: lateLabel(best.m) } : null
  if (props.reduced) drawStatic()
}
const onLeave = () => { for (const b of bodies.values()) b.hover = false; hoverBody = null; hover.value = null; if (props.reduced) drawStatic() }
const onClick = () => { if (hoverBody) emit('open', hoverBody.t) }

/* ── theme + visibility wiring ── */
let mo = null
const onVis = () => { hidden = document.hidden }
onMounted(() => {
  readPalette()
  size()
  syncBodies()
  ro = new ResizeObserver(size); ro.observe(wrap.value)
  mo = new MutationObserver(() => { readPalette(); if (props.reduced) drawStatic() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVis)
  if (props.reduced) drawStatic(); else start()
})
onBeforeUnmount(() => {
  stop()
  ro?.disconnect(); mo?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.gw { position: relative; width: 100%; overflow: hidden; background: var(--sd-ovd-deep-bg); }
.gw-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* hover telemetry card */
.gw-tip { position: absolute; z-index: 3; transform: translate(-50%, calc(-100% - 16px)); pointer-events: none;
  min-width: 210px; max-width: 270px; padding: 10px 12px; border-radius: 12px;
  border: 1px solid var(--sd-ovd-brd); background: rgba(13, 5, 9, 0.88);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #f5eee9; }
.gw-tip-no { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-ovd-hi); }
.gw-tip-subj { margin: 4px 0 6px; font-size: 12px; font-weight: 650; line-height: 1.35;
  font-family: var(--sd-font, inherit); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gw-tip-meta { display: flex; justify-content: space-between; gap: 10px; font-size: 10.5px; }
.gw-tip-meta b { color: var(--sd-ovd-hi); font-weight: 800; }
.gw-tip-meta span { color: rgba(245, 238, 233, 0.55); font-weight: 700; }
.gw-tip-cta { margin-top: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: rgba(245, 238, 233, 0.4); }

/* corner legend */
.gw-legend { position: absolute; right: 16px; bottom: 12px; z-index: 2; pointer-events: none;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: rgba(245, 238, 233, 0.4); }
.gw-legend i { font-style: normal; color: var(--sd-ovd-hi); }

@media (max-width: 940px) { .gw-legend { display: none; } }
</style>
