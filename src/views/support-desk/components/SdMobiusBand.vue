<template>
  <div ref="wrap" class="mb" :style="{ height: height ? height + 'px' : '100%' }" role="img"
    aria-label="Möbius Loop — every reopened ticket rides a one-sided band between DESK and RESOLVE; loops ridden = reopen cycles">
    <canvas ref="cv" class="mb-cv" @mousemove="onMove" @mouseleave="onLeave" @click="onClick" />
    <!-- hover telemetry card (HTML so it stays crisp + theme-correct) -->
    <div v-if="hover" class="mb-tip sd-mono" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
      <div class="mb-tip-no">{{ hover.t.ticket_number }} · {{ String(hover.t.priority || '').toUpperCase() }}</div>
      <div class="mb-tip-subj">{{ hover.t.subject }}</div>
      <div class="mb-tip-meta">
        <b>{{ hover.cycles }}× ON THE LOOP</b>
        <span>{{ hover.t.assigned_agent_name || 'UNOWNED' }}</span>
      </div>
      <div class="mb-tip-meta">
        <em>{{ hover.source }}</em>
        <span>{{ hover.age }}</span>
      </div>
      <div class="mb-tip-cta">CLICK TO OPEN</div>
    </div>
    <div class="mb-legend sd-mono" aria-hidden="true">ONE SURFACE · LOOPS = REOPEN CYCLES · <i>{{ riderCount }}</i> RIDING</div>
  </div>
</template>

<script setup>
/*
  SdMobiusBand — "THE MÖBIUS LOOP" (gallery pick 03/08), the Reopened desk's signature
  instrument. The band is a woven lemniscate with a half-twist — ONE surface, no other
  side: a ticket that crosses RESOLVE is still on the same face and rides back to DESK.
  Every active reopened ticket is a rider: speed grows with reopen cycles, color =
  priority, glow ring = chronic (>=2 loops), dashed halo = unowned. A desk-crossing
  fires an amber re-entry pulse; an emerald off-ramp comet departs RESOLVE whenever the
  team re-resolved something today. Canvas is DPR-aware, pauses on document.hidden,
  re-reads --sd-rop-* tokens on theme flips, and hit-tests riders (hover telemetry,
  click → @open). `reduced` renders a single static frame (data-cinematic="on"
  un-reduces upstream). Fills the hero as its full-bleed backdrop (height=0 → 100%);
  the left air stays calm for the glass console.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { reopenSourceLabel } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // filtered working set (decorated rows)
  stats: { type: Object, default: () => ({}) },  // /me/tickets/reopened/stats
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },
})
const emit = defineEmits(['open'])

const wrap = ref(null), cv = ref(null)
const hover = ref(null)
let ctx = null, W = 0, H = 0, CX = 0, CY = 0, A = 0
let raf = 0, tPrev = 0, running = false, hidden = false

/* ── palette from the --sd-rop-* tokens (re-read on theme flips) ── */
const readVar = (k, fb) => (getComputedStyle(document.documentElement).getPropertyValue(k).trim() || fb)
let P = {}
const PRI_FALLBACK = { critical: '#ef4444', urgent: '#f97316', high: '#f97316', medium: '#f59e0b', low: '#9aa3ac' }
const readPalette = () => {
  P = {
    core: readVar('--sd-rop-core', '#e0509b'),
    hi: readVar('--sd-rop-hi', '#ff8fc6'),
    deep: readVar('--sd-rop-deep', '#93275f'),
    band: readVar('--sd-rop-band', '#f6b352'),
    offramp: readVar('--sd-rop-offramp', '#34d399'),
    ink: '#f7edf3',                                  // the band air stays dark in BOTH themes
    pri: {
      critical: readVar('--sd-pri-critical', PRI_FALLBACK.critical),
      urgent: readVar('--sd-pri-urgent', PRI_FALLBACK.urgent),
      high: readVar('--sd-pri-high', PRI_FALLBACK.high),
      medium: readVar('--sd-pri-medium', PRI_FALLBACK.medium),
      low: readVar('--sd-pri-low', PRI_FALLBACK.low),
    },
  }
}
const priCol = (t) => P.pri[t.priority] || PRI_FALLBACK[t.priority] || P.core

/* ── loop telemetry ── */
const ep = (v) => (v ? new Date(v).getTime() : 0)
const cycles = (t) => Math.max(1, t.reopened_count || 1)
const cycleAgeMin = (t) => {
  const at = ep(t.last_reopened_at)
  return at ? Math.max(0, Math.floor((props.now - at) / 60000)) : 0
}
const ageLabel = (m) => (m < 60 ? `${m}m ON CYCLE` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m ON CYCLE`
  : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h ON CYCLE`)

/* ── the one-sided band: lemniscate of Bernoulli + half-twist normal offset ── */
const TWO_PI = Math.PI * 2
const lem = (th) => {
  const s = Math.sin(th), c = Math.cos(th), d = 1 + s * s
  return [(A * c) / d, (A * s * c) / d]
}
const bandPoint = (th, off) => {
  const [x, y] = lem(th)
  const tw = Math.sin(th / 2) * off        // the half-twist: offset flips side over one lap
  return [CX + x, CY + y * 1.4 + tw]
}

/* ── riders (keyed by ticket id so loop positions stay stable across refetches) ── */
const riders = new Map()
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const syncRiders = () => {
  const seen = new Set()
  for (const t of props.tickets) {
    const id = String(t.id)
    seen.add(id)
    const r = riders.get(id)
    if (r) { r.t = t; r.fade = Math.min(1, r.fade + 0.1) }
    else riders.set(id, {
      t, fade: 0, trail: [],
      th: (hash(id) % 628) / 100,
      x: 0, y: 0, hover: false,
    })
  }
  for (const [id, r] of riders) if (!seen.has(id)) { r.dying = true; if (r.fade <= 0) riders.delete(id) }
}
watch(() => props.tickets, () => { syncRiders(); if (props.reduced) drawStatic() }, { deep: false })
const riderCount = computed(() => props.tickets.length)

/* ── ambient fields + event pools ── */
let stars = []
const seedAmbient = () => {
  stars = Array.from({ length: 90 }, (_, i) => ({
    x: ((i * 137) % 1000) / 1000, y: ((i * 71) % 1000) / 1000, tw: ((i * 31) % 628) / 100, sz: 0.4 + ((i * 17) % 12) / 10,
  }))
}
let pulses = []                                     // amber desk re-entry rings
let offramp = { d: 0, alpha: 1 }                    // emerald re-resolution comet

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
  CX = W * (W < 940 ? 0.5 : 0.63); CY = H * 0.5
  A = Math.min(W * (W < 940 ? 0.42 : 0.31), H * 0.62)
  seedAmbient()
  if (props.reduced) drawStatic()
}

/* ── one simulation/draw pass ── */
function drawFrame (nowT, dt) {
  ctx.clearRect(0, 0, W, H)
  const t = nowT * 0.001

  /* night-air vignette around the band */
  const vg = ctx.createRadialGradient(CX, CY, A * 0.15, CX, CY, A * 1.6)
  vg.addColorStop(0, 'rgba(224,80,155,0.10)'); vg.addColorStop(0.5, 'rgba(18,6,14,0)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  /* stars */
  for (const s of stars) {
    s.tw += 0.02 * dt
    ctx.globalAlpha = 0.2 + 0.18 * Math.sin(s.tw)
    ctx.fillStyle = P.band
    ctx.fillRect(s.x * W, s.y * H, s.sz, s.sz)
  }
  ctx.globalAlpha = 1

  /* ── the woven one-sided band (11 twisted strands, counter-flowing dashes) ── */
  const STRANDS = 11
  for (let s = 0; s < STRANDS; s++) {
    const off = (s - (STRANDS - 1) / 2) * 5
    ctx.beginPath()
    for (let i = 0; i <= 220; i++) {
      const th = (i / 220) * TWO_PI
      const [px, py] = bandPoint(th, off)
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    }
    const centered = 1 - Math.abs(off) / ((STRANDS / 2) * 5)
    ctx.strokeStyle = s === Math.floor(STRANDS / 2) ? P.hi : P.core
    ctx.globalAlpha = 0.06 + 0.12 * centered
    ctx.lineWidth = s === Math.floor(STRANDS / 2) ? 1.6 : 1.1
    ctx.setLineDash([9, 13])
    ctx.lineDashOffset = -t * 26 * (s % 2 ? 1 : -1)
    ctx.stroke()
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1

  /* ── crossings: DESK (right lobe) and RESOLVE (left lobe) ── */
  const [dx, dy] = bandPoint(0, 0)               // th=0 → (+A, 0): the desk re-entry
  const [rx, ry] = bandPoint(Math.PI, 0)         // th=π → (−A, 0): the resolve crossing
  ctx.font = '700 9.5px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.shadowColor = P.band; ctx.shadowBlur = 14
  ctx.fillStyle = P.band; ctx.beginPath(); ctx.arc(dx, dy, 4.5, 0, TWO_PI); ctx.fill()
  ctx.shadowColor = P.offramp
  ctx.fillStyle = P.offramp; ctx.beginPath(); ctx.arc(rx, ry, 4.5, 0, TWO_PI); ctx.fill()
  ctx.shadowBlur = 0
  ctx.globalAlpha = 0.8
  ctx.fillStyle = P.band; ctx.fillText('D E S K', dx, dy - 14)
  ctx.fillStyle = P.offramp; ctx.fillText('R E S O L V E', rx, ry - 14)
  ctx.globalAlpha = 1; ctx.textAlign = 'left'

  /* ── riders ── */
  for (const [id, r] of riders) {
    if (r.dying) { r.fade -= 0.06 * dt; if (r.fade <= 0) { riders.delete(id); continue } }
    else if (r.fade < 1) r.fade = Math.min(1, r.fade + 0.04 * dt)
    const cyc = cycles(r.t)
    const prevTh = r.th
    r.th += 0.006 * dt * (1 + 0.16 * Math.min(cyc, 5))       // more loops ridden = faster
    const [px, py] = bandPoint(r.th, 0)
    r.x = px; r.y = py
    r.trail.push({ x: px, y: py }); if (r.trail.length > 22) r.trail.shift()

    /* desk re-entry pulse: theta crossing 0 (mod 2π) */
    if (Math.floor(prevTh / TWO_PI) !== Math.floor(r.th / TWO_PI)) pulses.push({ x: dx, y: dy, r: 4, alpha: 0.6 })

    const col = priCol(r.t)
    const chronic = cyc >= 2
    for (let i = 1; i < r.trail.length; i++) {
      const p0 = r.trail[i - 1], p1 = r.trail[i]
      ctx.globalAlpha = (i / r.trail.length) * (chronic ? 0.55 : 0.35) * r.fade
      ctx.strokeStyle = col; ctx.lineWidth = chronic ? 2 : 1.3; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke()
    }
    ctx.globalAlpha = r.fade
    const rad = r.t.priority === 'critical' ? 6 : (r.t.priority === 'high' || r.t.priority === 'urgent') ? 5 : 4
    ctx.shadowColor = col; ctx.shadowBlur = r.hover ? 22 : (chronic ? 16 : 10)
    ctx.fillStyle = col
    ctx.beginPath(); ctx.arc(px, py, r.hover ? rad + 2 : rad, 0, TWO_PI); ctx.fill()
    ctx.shadowBlur = 0
    if (chronic) {                                            // chronic = orbit ring
      ctx.strokeStyle = P.hi; ctx.globalAlpha = 0.85 * r.fade; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.arc(px, py, rad + 5, 0, TWO_PI); ctx.stroke()
    }
    if (!r.t.assigned_agent_id) {                             // unowned = dashed halo
      ctx.strokeStyle = P.ink; ctx.globalAlpha = 0.8 * r.fade; ctx.lineWidth = 1
      ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(px, py, rad + 8, 0, TWO_PI); ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.globalAlpha = 1
  }

  /* labels for the three most-looped riders */
  const worst = [...riders.values()].filter(r => !r.dying).sort((a, b) => cycles(b.t) - cycles(a.t)).slice(0, 3)
  ctx.font = '600 10px ui-monospace, Consolas, monospace'
  for (const r of worst) {
    ctx.globalAlpha = 0.9 * r.fade; ctx.fillStyle = P.ink
    ctx.fillText(r.t.ticket_number || '', r.x + 10, r.y - 6)
    ctx.globalAlpha = 0.8 * r.fade; ctx.fillStyle = P.hi
    ctx.fillText(`×${cycles(r.t)}`, r.x + 10, r.y + 7)
  }
  ctx.globalAlpha = 1

  /* desk re-entry pulses */
  pulses.forEach(p => {
    p.r += 1.6 * dt; p.alpha -= 0.014 * dt
    ctx.globalAlpha = Math.max(0, p.alpha)
    ctx.strokeStyle = P.band; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TWO_PI); ctx.stroke()
  })
  pulses = pulses.filter(p => p.alpha > 0)
  ctx.globalAlpha = 1

  /* off-ramp comet — only when the team actually re-resolved something today */
  if ((props.stats.re_resolved_today || 0) > 0) {
    offramp.d += 1.5 * dt
    if (offramp.d > A * 0.9) { offramp.alpha -= 0.03 * dt; if (offramp.alpha <= 0) offramp = { d: 0, alpha: 1 } }
    const ox = rx - offramp.d * 0.8, oy = ry - offramp.d * 0.55
    ctx.globalAlpha = Math.max(0, offramp.alpha)
    ctx.shadowColor = P.offramp; ctx.shadowBlur = 16; ctx.fillStyle = P.offramp
    ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, TWO_PI); ctx.fill(); ctx.shadowBlur = 0
    ctx.strokeStyle = P.offramp; ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(ox + 14, oy + 10); ctx.lineTo(ox, oy); ctx.stroke()
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
let hoverRider = null
const onMove = (e) => {
  const rect = cv.value.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top
  let best = null, bd = 26 * 26
  for (const r of riders.values()) {
    if (r.dying) continue
    const dx2 = r.x - mx, dy2 = r.y - my, d = dx2 * dx2 + dy2 * dy2
    if (d < bd) { bd = d; best = r }
  }
  for (const r of riders.values()) r.hover = (r === best)
  hoverRider = best
  cv.value.style.cursor = best ? 'pointer' : 'default'
  hover.value = best ? {
    t: best.t, x: best.x, y: best.y, cycles: cycles(best.t),
    source: reopenSourceLabel(best.t.reopen_source).toUpperCase(),
    age: ageLabel(cycleAgeMin(best.t)),
  } : null
  if (props.reduced) drawStatic()
}
const onLeave = () => { for (const r of riders.values()) r.hover = false; hoverRider = null; hover.value = null; if (props.reduced) drawStatic() }
const onClick = () => { if (hoverRider) emit('open', hoverRider.t) }

/* ── theme + visibility wiring ── */
let mo = null
const onVis = () => { hidden = document.hidden }
onMounted(() => {
  readPalette()
  size()
  syncRiders()
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
.mb { position: relative; width: 100%; overflow: hidden; background: var(--sd-rop-deep-bg); }
.mb-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

/* hover telemetry card */
.mb-tip { position: absolute; z-index: 3; transform: translate(-50%, calc(-100% - 16px)); pointer-events: none;
  min-width: 220px; max-width: 280px; padding: 10px 12px; border-radius: 12px;
  border: 1px solid var(--sd-rop-brd); background: rgba(18, 6, 14, 0.9);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #f7edf3; }
.mb-tip-no { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-rop-hi); }
.mb-tip-subj { margin: 4px 0 6px; font-size: 12px; font-weight: 650; line-height: 1.35;
  font-family: var(--sd-font, inherit); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mb-tip-meta { display: flex; justify-content: space-between; gap: 10px; font-size: 10.5px; }
.mb-tip-meta b { color: var(--sd-rop-hi); font-weight: 800; }
.mb-tip-meta em { font-style: normal; color: var(--sd-rop-band); font-weight: 800; }
.mb-tip-meta span { color: rgba(247, 237, 243, 0.55); font-weight: 700; }
.mb-tip-cta { margin-top: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: rgba(247, 237, 243, 0.4); }

/* corner legend */
.mb-legend { position: absolute; right: 16px; bottom: 12px; z-index: 2; pointer-events: none;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: rgba(247, 237, 243, 0.4); }
.mb-legend i { font-style: normal; color: var(--sd-rop-hi); }

@media (max-width: 940px) { .mb-legend { display: none; } }
</style>
