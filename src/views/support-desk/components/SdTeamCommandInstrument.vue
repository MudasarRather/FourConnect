<template>
  <div ref="wrap" class="pne" aria-hidden="true">
    <canvas ref="cv" />
  </div>
</template>

<script setup>
/* SdTeamCommandInstrument — ⚑ "THE PNEUMATIC EXCHANGE" (gallery pick 08 of 8).
   The Team Command signature stage: a brass capsule-post exchange where the intake
   manifold routes ticket-capsules down glass tubes to one station per team.
   LIVE physics: capsule traffic rides real inflow, a breached team's tube JAMS (rose
   quiver + pressure stack, periodic clear ceremony), idle tubes fog with condensation,
   an off-shift station dims under a moon, an orphan station (no assignable agents) is
   corked shut with capsules queuing above the cork, and unassigned work waits as a
   capsule rack beside the port. A drop in a team's unassigned count (route/rebalance)
   fires a burst of capsules down its tube. Canvas2D, theme-native via --sd-team-*
   (re-read on data-theme flips), ResizeObserver geometry, IO+visibility pause.
   CONTRACT (frozen): props { teams, stats, activeTeam, lens, now, reduced },
   emits ['hover-team','select-team'] — the fleet board stays the accessible path;
   this stage is enhancement only (aria-hidden). */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  teams: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  activeTeam: { type: String, default: null },
  lens: { type: String, default: 'fleet' },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['hover-team', 'select-team'])

const wrap = ref(null)
const cv = ref(null)

let ctx = null
let W = 0, H = 0
let raf = 0
let visible = true
let ro = null, io = null, mo = null
let t0 = performance.now()
let P = null                      // palette (re-read on theme flip)
let hoverIdx = -1
const capsules = []               // { i, born, dur, burst }
const pulses = {}                 // station arrival pulse 0..1 by index
const jams = {}                   // per-index jam clear cycle anchor
let nextAmbient = 0
let prevSnap = {}                 // id -> { open, unassigned } for burst diffs

/* ── helpers ── */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, u) => a + (b - a) * u
const EIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const bez = (p, u) => {
  const v = 1 - u, [a, b, c, d] = p
  return { x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
           y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y }
}
const bezT = (p, u) => {
  const v = 1 - u, [a, b, c, d] = p
  return { x: 3 * v * v * (b.x - a.x) + 6 * v * u * (c.x - b.x) + 3 * u * u * (d.x - c.x),
           y: 3 * v * v * (b.y - a.y) + 6 * v * u * (c.y - b.y) + 3 * u * u * (d.y - c.y) }
}
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}

/* ── palette: theme-native, straight off the --sd-team-* tokens ── */
function readPalette() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n, fb) => (cs.getPropertyValue(n) || '').trim() || fb
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  P = {
    light,
    core: v('--sd-team-core', '#e8b04b'),
    hi: v('--sd-team-hi', '#ffd98a'),
    deep: v('--sd-team-deep', '#9a6d1f'),
    sync: v('--sd-team-sync', '#34d399'),
    strain: v('--sd-team-strain', '#fb7185'),
    idle: v('--sd-team-idle', '#a8a29e'),
    ink: light ? 'rgba(58, 47, 29, 0.9)' : 'rgba(243, 233, 210, 0.92)',
    sub: light ? 'rgba(109, 88, 52, 0.72)' : 'rgba(179, 165, 138, 0.75)',
    faint: light ? 'rgba(109, 74, 10, 0.16)' : 'rgba(232, 176, 75, 0.15)',
    glass: light ? 'rgba(109, 74, 10, 0.10)' : 'rgba(255, 217, 138, 0.075)',
    plate: light ? 'rgba(255, 251, 240, 0.92)' : 'rgba(14, 11, 5, 0.88)',
    glow: light ? 0.4 : 1,
  }
}

/* ── live teams + geometry (console owns the left air; stations arc the right) ── */
const MAXT = 10
const live = () => props.teams.slice(0, MAXT)
function geo() {
  const ts = live()
  const n = Math.max(ts.length, 1)
  const man = { x: W * 0.665, y: H * 0.135, w: clamp(W * 0.2, 150, 300), h: 32 }
  const x0 = Math.max(W * 0.42, 260), x1 = W * 0.94
  const sy = H * 0.68
  const st = ts.map((t, i) => {
    const f = n === 1 ? 0.5 : i / (n - 1)
    const x = lerp(x0, x1, f)
    const y = sy - Math.sin(f * Math.PI) * H * 0.06
    const mx = man.x - man.w / 2 + man.w * ((i + 0.5) / n)
    return {
      t, i, x, y,
      path: [{ x: mx, y: man.y + man.h / 2 }, { x: mx, y: lerp(man.y, y, 0.55) },
             { x, y: lerp(man.y, y, 0.62) }, { x, y: y - 24 }],
    }
  })
  return { man, st }
}
const matchesLens = (t) => {
  switch (props.lens) {
    case 'unassigned': return (t.unassigned || 0) > 0
    case 'breached': return (t.breached || 0) > 0
    case 'due_soon': return (t.due_soon || 0) > 0
    case 'idle': return (t.idle || 0) > 0
    case 'uncovered': return t.coverage_open === false && (t.open || 0) > 0
    case 'orphaned': return !(t.agent_count || 0)
    default: return true
  }
}
const jammed = (t) => (t.breached || 0) > 0
const orphan = (t) => !(t.agent_count || 0)
const receiving = (t) => !orphan(t) && t.coverage_open !== false

/* ── traffic: ambient weighted round-robin + diff bursts ── */
function spawn(i, burst = false) {
  if (capsules.length > 26) return
  capsules.push({ i, born: performance.now(), dur: burst ? 1150 : 1500, burst })
}
function scheduleAmbient(nowMs) {
  if (nowMs < nextAmbient) return
  const ts = live()
  const pool = ts.map((t, i) => ({ i, w: receiving(t) ? 1 + (t.flow?.[6]?.inflow || 0) + (t.unassigned || 0) * 0.4 : 0 }))
    .filter(p => p.w > 0)
  if (pool.length) {
    let r = Math.random() * pool.reduce((s, p) => s + p.w, 0)
    const pick = pool.find(p => (r -= p.w) <= 0) || pool[0]
    spawn(pick.i)
  }
  nextAmbient = nowMs + 1500 + Math.random() * 900
}
watch(() => props.teams, (ts) => {
  const snap = {}
  ts.slice(0, MAXT).forEach((t, i) => {
    snap[t.id] = { open: t.open || 0, unassigned: t.unassigned || 0 }
    const prev = prevSnap[t.id]
    if (prev && !props.reduced) {
      const landed = Math.max(t.open - prev.open, prev.unassigned - t.unassigned)
      for (let k = 0; k < Math.min(landed, 6); k++) setTimeout(() => spawn(i, true), k * 130)
    }
  })
  prevSnap = snap
}, { deep: false })

/* ── draw ── */
function draw(tSec) {
  ctx.clearRect(0, 0, W, H)
  const { man, st } = geo()

  // air haze (right air belongs to the exchange)
  let g = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.5)
  g.addColorStop(0, P.light ? 'rgba(180,120,22,0.07)' : 'rgba(232,176,75,0.07)')
  g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  /* ── tubes first (under everything) ── */
  for (const s of st) {
    const t = s.t
    const dim = (matchesLens(t) ? 1 : 0.3) * (t.coverage_open === false ? 0.6 : 1)
    ctx.save(); ctx.globalAlpha = dim
    // glass
    ctx.strokeStyle = P.glass; ctx.lineWidth = 13; ctx.lineCap = 'round'
    tubePath(s); ctx.stroke()
    ctx.strokeStyle = P.faint; ctx.lineWidth = 1.3
    tubePath(s); ctx.stroke()
    // travelling specular glint
    const gu = (tSec * 0.06 + s.i * 0.17) % 1
    const gp = bez(s.path, gu)
    ctx.fillStyle = P.hi; ctx.globalAlpha = dim * 0.35
    ctx.beginPath(); ctx.arc(gp.x, gp.y, 2.2, 0, 7); ctx.fill()
    ctx.globalAlpha = dim
    // idle fog + condensation drips
    if ((t.idle || 0) > 0 && !jammed(t)) {
      ctx.save(); ctx.strokeStyle = P.idle; ctx.globalAlpha = dim * 0.3
      ctx.lineWidth = 9; ctx.setLineDash([14, 9]); ctx.lineDashOffset = -tSec * 2.5
      tubePath(s); ctx.stroke(); ctx.restore()
      const du = (tSec * 0.04 + s.i * 0.3) % 1
      const dp = bez(s.path, 0.55 + du * 0.35)
      ctx.fillStyle = P.idle; ctx.globalAlpha = dim * 0.5
      ctx.beginPath(); ctx.arc(dp.x + 6, dp.y, 1.4, 0, 7); ctx.fill()
    }
    ctx.restore()
  }

  /* ── manifold ── */
  const sheen = (tSec * 0.16) % 1
  ctx.save()
  ctx.fillStyle = P.glass
  rr(ctx, man.x - man.w / 2 - 13, man.y - man.h / 2, man.w + 26, man.h, 15); ctx.fill()
  ctx.strokeStyle = P.core; ctx.lineWidth = 1.8
  rr(ctx, man.x - man.w / 2 - 13, man.y - man.h / 2, man.w + 26, man.h, 15); ctx.stroke()
  ctx.save(); rr(ctx, man.x - man.w / 2 - 13, man.y - man.h / 2, man.w + 26, man.h, 15); ctx.clip()
  ctx.fillStyle = P.hi; ctx.globalAlpha = 0.22
  rr(ctx, man.x - man.w / 2 - 13 + (man.w + 26) * sheen - 11, man.y - man.h / 2 + 2, 22, man.h - 4, 9); ctx.fill()
  ctx.restore()
  ctx.fillStyle = P.deep
  for (let rv = 0; rv <= 6; rv++) {
    const rx = man.x - man.w / 2 + man.w * rv / 6
    ctx.beginPath(); ctx.arc(rx, man.y - man.h / 2 + 5, 1.3, 0, 7); ctx.fill()
    ctx.beginPath(); ctx.arc(rx, man.y + man.h / 2 - 5, 1.3, 0, 7); ctx.fill()
  }
  // intake funnel + feed capsule
  ctx.strokeStyle = P.sub; ctx.lineWidth = 1.8
  ctx.beginPath(); ctx.moveTo(man.x - 11, man.y - man.h / 2 - 15); ctx.lineTo(man.x - 4, man.y - man.h / 2)
  ctx.moveTo(man.x + 11, man.y - man.h / 2 - 15); ctx.lineTo(man.x + 4, man.y - man.h / 2); ctx.stroke()
  const du = (tSec * 0.85) % 1
  ctx.fillStyle = P.hi; rr(ctx, man.x - 2.6, man.y - man.h / 2 - 13 + du * 11, 5.2, 8, 2.6); ctx.fill()
  // pressure dial (needle ∝ fleet unowned share)
  const press = clamp((props.stats.unassigned || 0) / Math.max(props.stats.open || 1, 1), 0, 1)
  const dx = man.x - man.w / 2 - 26, dy = man.y
  ctx.strokeStyle = P.faint; ctx.lineWidth = 3.6
  ctx.beginPath(); ctx.arc(dx, dy, 11, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke()
  ctx.strokeStyle = press > 0.5 ? P.strain : P.core
  ctx.beginPath(); ctx.arc(dx, dy, 11, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * press)); ctx.stroke()
  const na = Math.PI * (0.75 + 1.5 * press) + (props.reduced ? 0 : Math.sin(tSec * 6) * 0.03 * press)
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + Math.cos(na) * 8, dy + Math.sin(na) * 8); ctx.stroke()
  ctx.font = '700 8px ui-monospace, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'; ctx.fillStyle = P.sub
  ctx.fillText('INTAKE MANIFOLD', man.x, man.y - man.h / 2 - 21)
  ctx.restore()

  /* ── stations ── */
  const nowMs = performance.now()
  for (const s of st) {
    const t = s.t
    const isHover = hoverIdx === s.i
    const isActive = props.activeTeam && String(props.activeTeam) === String(t.id)
    const dim = matchesLens(t) ? 1 : 0.3
    const col = t.color || P.core
    const cap = Math.max((t.agent_count || 0) * 3, 1)
    const ratio = clamp((t.open || 0) / cap, 0, 1.25)
    const loadCol = orphan(t) ? P.idle : ratio >= 1 ? P.strain : ratio >= 0.7 ? P.core : P.sync
    ctx.save(); ctx.globalAlpha = dim * (t.coverage_open === false ? 0.72 : 1)

    // arrival pulse
    if (pulses[s.i] > 0) {
      pulses[s.i] = Math.max(0, pulses[s.i] - 0.022)
      ctx.strokeStyle = col; ctx.globalAlpha = dim * pulses[s.i]
      ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12 * P.glow
      ctx.beginPath(); ctx.arc(s.x, s.y, 17 + (1 - pulses[s.i]) * 17, 0, 7); ctx.stroke()
      ctx.shadowBlur = 0; ctx.globalAlpha = dim
    }
    // port ring (+ load arc)
    ctx.fillStyle = P.glass; ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, 7); ctx.fill()
    ctx.strokeStyle = col; ctx.lineWidth = isHover || isActive ? 3 : 2.2
    if (isHover || isActive) { ctx.shadowColor = col; ctx.shadowBlur = 14 * P.glow }
    ctx.beginPath(); ctx.arc(s.x, s.y, 17, 0, 7); ctx.stroke(); ctx.shadowBlur = 0
    ctx.strokeStyle = loadCol; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(s.x, s.y, 21.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(ratio / 1.25, 0, 1)); ctx.stroke()
    // open count + code
    ctx.fillStyle = P.ink; ctx.font = '800 11px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'center'
    ctx.fillText(String(t.open ?? 0), s.x, s.y + 4)
    ctx.fillStyle = isHover || isActive ? P.hi : P.sub; ctx.font = '700 9px ui-monospace, Menlo, Consolas, monospace'
    ctx.fillText(t.code || (t.name || '').slice(0, 6).toUpperCase(), s.x, s.y + 36)

    // unassigned rack (waiting capsules beside the port)
    for (let q = 0; q < Math.min(t.unassigned || 0, 5); q++) {
      const on = props.reduced || Math.sin(tSec * 2.4 + q * 1.1 + s.i) > -0.4
      ctx.fillStyle = P.hi; ctx.globalAlpha = dim * (on ? 0.85 : 0.3)
      rr(ctx, s.x - 33, s.y + 8 - q * 8, 8.5, 5.5, 2.6); ctx.fill()
    }
    ctx.globalAlpha = dim * (t.coverage_open === false ? 0.72 : 1)

    // cork (orphan) + queue above it
    if (orphan(t)) {
      ctx.fillStyle = P.deep; ctx.strokeStyle = P.idle; ctx.lineWidth = 1.4
      rr(ctx, s.x - 9, s.y - 30, 18, 8, 3); ctx.fill(); ctx.stroke()
      ctx.fillStyle = P.idle; ctx.font = '700 7px ui-monospace, Menlo, Consolas, monospace'
      ctx.fillText('CAPPED', s.x, s.y - 35)
      for (let q = 0; q < 3; q++) {
        const bob = props.reduced ? 0 : Math.sin(tSec * 1.6 + q) * 1.5
        ctx.fillStyle = P.idle; ctx.globalAlpha = dim * 0.7
        rr(ctx, s.x - 3, s.y - 46 - q * 11 + bob, 6, 8.5, 3); ctx.fill()
      }
      ctx.globalAlpha = dim
    }
    // off-shift moon
    if (t.coverage_open === false) {
      ctx.fillStyle = P.idle; ctx.globalAlpha = dim * 0.9
      ctx.beginPath(); ctx.arc(s.x + 24, s.y - 24, 5, 0, 7); ctx.fill()
      ctx.fillStyle = P.light ? '#f5edda' : '#0b0904'
      ctx.beginPath(); ctx.arc(s.x + 26.5, s.y - 25.6, 4.2, 0, 7); ctx.fill()
      ctx.globalAlpha = dim
    }

    // JAM — breached tube: quivering capsule + pressure stack + periodic clear ceremony
    if (jammed(t) && !orphan(t)) {
      if (!jams[s.i]) jams[s.i] = nowMs + 4000 + s.i * 900
      const clearIn = jams[s.i] - nowMs
      const clearing = clearIn <= 0 && clearIn > -900
      if (clearIn < -900) jams[s.i] = nowMs + 7000 + Math.random() * 2500
      const stack = Math.min(t.breached || 1, 3)
      for (let j = 0; j < stack; j++) {
        let ju = 0.58 - j * 0.075
        if (clearing) ju = lerp(ju, 0.99, EIO(clamp(-clearIn / 900, 0, 1)))
        const q = props.reduced || clearing ? { x: 0, y: 0 } : { x: Math.sin(tSec * 24 + j) * 1.3, y: Math.cos(tSec * 21 + j) * 1.1 }
        const jp = bez(s.path, clamp(ju, 0.05, 0.99)), jt = bezT(s.path, clamp(ju, 0.05, 0.99))
        ctx.save(); ctx.translate(jp.x + q.x, jp.y + q.y); ctx.rotate(Math.atan2(jt.y, jt.x))
        ctx.fillStyle = clearing ? P.sync : P.strain
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = (props.reduced ? 6 : 11 * (0.6 + 0.4 * Math.sin(tSec * 5 + j))) * P.glow
        rr(ctx, -6.5, -3.6, 13, 7.2, 3.6); ctx.fill(); ctx.shadowBlur = 0; ctx.restore()
      }
      if (!clearing) {
        for (let m = 1; m <= 2; m++) {
          const mp = bez(s.path, 0.58 - stack * 0.075 - m * 0.07)
          ctx.strokeStyle = P.strain; ctx.globalAlpha = dim * (0.45 - m * 0.14)
          ctx.beginPath(); ctx.arc(mp.x, mp.y, 3.5 + m, 0, 7); ctx.stroke()
        }
        ctx.globalAlpha = dim
      } else if (clearIn < -850) pulses[s.i] = 1
    } else delete jams[s.i]

    // hover / active name plate
    if (isHover || isActive) {
      const label = t.name || 'Team'
      ctx.font = '700 10px ui-monospace, Menlo, Consolas, monospace'
      const tw = ctx.measureText(label).width + 18
      ctx.fillStyle = P.plate; ctx.strokeStyle = col; ctx.lineWidth = 1
      rr(ctx, s.x - tw / 2, s.y - (orphan(t) ? 74 : 58), tw, 20, 8); ctx.fill(); ctx.stroke()
      ctx.fillStyle = P.ink; ctx.textAlign = 'center'
      ctx.fillText(label, s.x, s.y - (orphan(t) ? 60 : 44))
    }
    ctx.restore()
  }

  /* ── flying capsules ── */
  for (let k = capsules.length - 1; k >= 0; k--) {
    const c = capsules[k]
    const s = st[c.i]
    if (!s) { capsules.splice(k, 1); continue }
    let u = (nowMs - c.born) / c.dur
    if (u >= 1) { pulses[s.i] = 1; capsules.splice(k, 1); continue }
    // capsules bound for a jammed tube stop behind the jam and evaporate
    if (jammed(s.t) && u > 0.42) { capsules.splice(k, 1); continue }
    u = EIO(u)
    const p0 = bez(s.path, u), tg = bezT(s.path, u)
    for (let sl = 1; sl <= 3; sl++) {
      const sp = bez(s.path, Math.max(0, u - sl * 0.05))
      ctx.strokeStyle = P.hi; ctx.globalAlpha = 0.42 - sl * 0.12; ctx.lineWidth = 1.6
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.6, 0, 7); ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.save(); ctx.translate(p0.x, p0.y); ctx.rotate(Math.atan2(tg.y, tg.x))
    ctx.fillStyle = c.burst ? P.sync : P.hi
    ctx.shadowColor = c.burst ? P.sync : P.core; ctx.shadowBlur = 9 * P.glow
    rr(ctx, -6.5, -3.6, 13, 7.2, 3.6); ctx.fill(); ctx.shadowBlur = 0
    ctx.fillStyle = P.deep; ctx.fillRect(-1.6, -3.6, 1.6, 7.2)
    ctx.restore()
  }

  function tubePath(s) {
    ctx.beginPath(); ctx.moveTo(s.path[0].x, s.path[0].y)
    ctx.bezierCurveTo(s.path[1].x, s.path[1].y, s.path[2].x, s.path[2].y, s.path[3].x, s.path[3].y)
  }
}

/* ── loop / lifecycle ── */
function frame() {
  raf = requestAnimationFrame(frame)
  if (!visible || !ctx || !W) return
  const tSec = props.reduced ? 11.7 : (performance.now() - t0) / 1000
  if (!props.reduced) scheduleAmbient(performance.now())
  draw(tSec)
}
function fit() {
  if (!cv.value || !wrap.value) return
  const r = wrap.value.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = Math.max(r.width, 2); H = Math.max(r.height, 2)
  cv.value.width = W * dpr; cv.value.height = H * dpr
  ctx = cv.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (props.reduced) draw(11.7)
}
function onMove(e) {
  const r = cv.value.getBoundingClientRect()
  const mx = e.clientX - r.left, my = e.clientY - r.top
  const { st } = geo()
  let best = -1, bd = 30 * 30
  for (const s of st) {
    const d = (s.x - mx) ** 2 + (s.y - my) ** 2
    if (d < bd) { bd = d; best = s.i }
  }
  if (best !== hoverIdx) {
    hoverIdx = best
    cv.value.style.cursor = best >= 0 ? 'pointer' : 'default'
    if (best >= 0) emit('hover-team', String(live()[best].id))
    if (props.reduced) draw(11.7)
  }
}
function onLeave() { hoverIdx = -1; if (cv.value) cv.value.style.cursor = 'default'; if (props.reduced) draw(11.7) }
function onClick() { if (hoverIdx >= 0 && live()[hoverIdx]) emit('select-team', String(live()[hoverIdx].id)) }

onMounted(() => {
  readPalette()
  fit()
  ro = new ResizeObserver(fit); ro.observe(wrap.value)
  io = new IntersectionObserver(es => { visible = es[0].isIntersecting }, { rootMargin: '60px' })
  io.observe(wrap.value)
  mo = new MutationObserver(() => { readPalette(); if (props.reduced) draw(11.7) })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVis)
  cv.value.addEventListener('pointermove', onMove, { passive: true })
  cv.value.addEventListener('pointerleave', onLeave, { passive: true })
  cv.value.addEventListener('click', onClick)
  live().forEach((t) => { prevSnap[t.id] = { open: t.open || 0, unassigned: t.unassigned || 0 } })
  frame()
})
const onVis = () => { visible = !document.hidden }
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect(); io?.disconnect(); mo?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.pne { position: absolute; inset: 0; overflow: hidden; }
.pne canvas { display: block; width: 100%; height: 100%; }
</style>
