<template>
  <!-- ══ Triage Scope — the All-Tickets signature instrument ══
       A framed top-down polar radar that plots the team's live queue:
         ANGLE  = priority sector (top = critical, clockwise to low)
         RADIUS = time-to-SLA-breach  (centre = breaching now, rim = comfortable)
       A conic beam sweeps the field and "paints" blips as it passes; breached
       tickets burn red at the core. The scope lives in its own obsidian panel so
       additive glow reads on both themes and it never bleeds into its neighbours.
       Canvas-2D (no WebGL) → reliable, theme-aware, reduced-motion-safe. -->
  <div ref="wrapEl" class="scope" :class="{ still: reduced }">
    <!-- frame chrome (CSS overlays — never drawn on canvas, never overlap blips) -->
    <span class="scope-rim" aria-hidden="true" />
    <span class="scope-grain" aria-hidden="true" />
    <i class="scope-corner tl" aria-hidden="true" /><i class="scope-corner tr" aria-hidden="true" />
    <i class="scope-corner bl" aria-hidden="true" /><i class="scope-corner br" aria-hidden="true" />
    <span class="scope-reticle" aria-hidden="true" />

    <header class="scope-bar">
      <span class="scope-tag sd-mono"><Radar :size="12" /> TRIAGE SCOPE</span>
      <span class="scope-live"><i /> {{ activeCount }} tracked</span>
    </header>

    <canvas ref="cvEl" class="scope-cv" @pointermove="onMove" @pointerleave="hover = null" @click="onClick" />

    <!-- breach reactor readout — pinned, never over the rings' busy centre -->
    <div class="scope-core" :class="{ hot: breaching > 0 }">
      <span class="sc-n sd-mono">{{ breaching }}</span>
      <span class="sc-l">{{ breaching === 1 ? 'breaching' : 'breaching' }}</span>
    </div>

    <!-- priority legend — its own bottom rail (canvas reserves this band) -->
    <div class="scope-legend">
      <span v-for="s in SECTORS" :key="s.key" class="lg-item">
        <i :style="{ background: s.css, boxShadow: `0 0 7px ${s.css}` }" />{{ s.label }}
      </span>
    </div>

    <Transition name="scope-tip">
      <div v-if="hover" class="scope-tip" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
        <span class="tp-no sd-mono">{{ hover.t.ticket_number }}</span>
        <span class="tp-sub">{{ hover.t.subject }}</span>
        <span class="tp-meta"><i :style="{ background: hover.col }" />{{ cap(hover.t.priority) }} · {{ hover.eta }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Radar } from 'lucide-vue-next'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  breaching: { type: Number, default: 0 },
})
const emit = defineEmits(['open'])

const SECTORS = [
  { key: 'critical', label: 'Critical', token: '--sd-pri-critical' },
  { key: 'urgent', label: 'Urgent', token: '--sd-pri-urgent' },
  { key: 'high', label: 'High', token: '--sd-pri-high' },
  { key: 'medium', label: 'Medium', token: '--sd-pri-medium' },
  { key: 'low', label: 'Low', token: '--sd-pri-low' },
]
const SECTOR_IDX = Object.fromEntries(SECTORS.map((s, i) => [s.key, i]))
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

const wrapEl = ref(null)
const cvEl = ref(null)
const hover = ref(null)
const activeCount = computed(() => (props.tickets || []).filter(t => !['resolved', 'closed'].includes(t.status)).length)

/* reduced motion (honoured unless cinematic is forced ON) */
const cinematicOn = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

let ctx = null, raf = null, ro = null, io = null, mo = null
let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 0
let sweep = -Math.PI / 2
let visible = true
let palette = {}
let blips = []
let motes = []        // ambient, data-independent
let t0 = 0

const readPalette = () => {
  if (!cvEl.value) return
  const cs = getComputedStyle(cvEl.value)
  const g = (v, fb) => (cs.getPropertyValue(v) || '').trim() || fb
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  palette = {
    light,
    grid: light ? 'rgba(120,90,40,.13)' : 'rgba(255,255,255,.07)',
    gridStrong: light ? 'rgba(120,90,40,.22)' : 'rgba(255,255,255,.14)',
    label: light ? 'rgba(120,90,40,.6)' : 'rgba(214,222,230,.4)',
    accent: g('--sd-amber', '#fbbf24'),
    ember: g('--sd-ember', '#fb923c'),
    danger: g('--sd-danger', '#dc2626') || '#dc2626',
    critical: g('--sd-pri-critical', '#ef4444'),
    urgent: g('--sd-pri-urgent', '#f97316'),
    high: g('--sd-pri-high', '#fb923c'),
    medium: g('--sd-pri-medium', '#fbbf24'),
    low: g('--sd-pri-low', '#a8a29e'),
  }
  for (const s of SECTORS) s.css = palette[s.key]
}

const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const seed = (id) => { let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }

const computeBlips = () => {
  const list = (props.tickets || []).filter(t => !['resolved', 'closed'].includes(t.status)).slice(0, 160)
  const band = (Math.PI * 2) / SECTORS.length
  blips = list.map((t) => {
    const si = SECTOR_IDX[t.priority] != null ? SECTOR_IDX[t.priority] : 3
    const sd = seed(t.id)
    const jitter = ((sd % 1000) / 1000 - 0.5) * band * 0.72
    const ang = -Math.PI / 2 + si * band + jitter
    const dm = dueMs(t)
    const breached = !!t.sla_resolution_breached || (dm != null && dm <= props.now)
    let nr
    // breached tickets ring just OUTSIDE the core readout (not on top of it)
    if (dm == null) nr = 0.9 + ((sd % 90) / 90) * 0.06
    else if (breached) nr = 0.22 + ((sd % 60) / 60) * 0.08
    else nr = Math.max(0.34, Math.min(0.96, 0.34 + Math.min(1, (dm - props.now) / (48 * 3600000)) * 0.62))
    return { t, ang, rad: nr, color: palette[t.priority] || palette.low, breached, lastPing: -9999, x: null, y: null }
  })
}

const buildMotes = () => {
  motes = Array.from({ length: 26 }, (_, i) => ({
    a: (i / 26) * Math.PI * 2 + (i % 5),
    r: 0.18 + ((i * 37) % 100) / 100 * 0.78,
    sp: 0.00018 + ((i * 13) % 7) * 0.00004,
    sz: 0.6 + ((i * 7) % 10) / 10 * 1.1,
  }))
}

const resize = () => {
  if (!cvEl.value || !wrapEl.value) return
  DPR = Math.min(2, window.devicePixelRatio || 1)
  W = wrapEl.value.clientWidth
  H = wrapEl.value.clientHeight
  cvEl.value.width = Math.round(W * DPR)
  cvEl.value.height = Math.round(H * DPR)
  cvEl.value.style.width = W + 'px'
  cvEl.value.style.height = H + 'px'
  ctx = cvEl.value.getContext('2d')
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  CX = W / 2
  CY = H * 0.50            // leave room top (bar) + bottom (legend)
  R = Math.min(W * 0.40, (H - 96) * 0.5)
  computeBlips()
}

const RING_LABELS = ['NOW', '12h', '24h', '48h+']

const drawFrame = () => {
  if (!ctx) return
  const tnow = performance.now()
  ctx.clearRect(0, 0, W, H)

  // ── range rings + frontier labels ──
  ctx.lineWidth = 1
  ctx.font = `600 8.5px ${getComputedStyle(document.documentElement).getPropertyValue('--sd-mono') || 'monospace'}`
  ctx.textAlign = 'center'
  for (let i = 1; i <= 4; i++) {
    const rr = (R * i) / 4
    ctx.beginPath()
    ctx.arc(CX, CY, rr, 0, Math.PI * 2)
    ctx.strokeStyle = i === 4 ? palette.gridStrong : palette.grid
    ctx.setLineDash(i === 4 ? [] : [2, 4])
    ctx.stroke()
    ctx.setLineDash([])
    // frontier label on the up-axis
    ctx.fillStyle = palette.label
    ctx.fillText(RING_LABELS[i - 1], CX, CY - rr + 11)
  }

  // ── sector wedges (faint priority tint) + spokes ──
  const band = (Math.PI * 2) / SECTORS.length
  for (let i = 0; i < SECTORS.length; i++) {
    const aMid = -Math.PI / 2 + i * band
    const a0 = aMid - band / 2, a1 = aMid + band / 2
    const wedge = ctx.createRadialGradient(CX, CY, R * 0.18, CX, CY, R)
    wedge.addColorStop(0, withAlpha(palette[SECTORS[i].key], 0))
    wedge.addColorStop(1, withAlpha(palette[SECTORS[i].key], palette.light ? 0.05 : 0.06))
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, R, a0, a1); ctx.closePath()
    ctx.fillStyle = wedge; ctx.fill()
    // spoke
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(a0) * R, CY + Math.sin(a0) * R)
    ctx.strokeStyle = palette.grid; ctx.stroke()
  }

  // ── ambient motes (data-independent so an empty queue still feels alive) ──
  if (!reduced.value) {
    for (const m of motes) {
      m.a += m.sp * 16
      const x = CX + Math.cos(m.a) * (R * m.r)
      const y = CY + Math.sin(m.a) * (R * m.r)
      ctx.beginPath(); ctx.arc(x, y, m.sz, 0, Math.PI * 2)
      ctx.fillStyle = withAlpha(palette.accent, 0.10 + 0.06 * Math.sin(tnow / 700 + m.a))
      ctx.fill()
    }
  }

  // ── conic sweep beam ──
  if (!reduced.value) {
    ctx.save()
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip()
    if (ctx.createConicGradient) {
      const cg = ctx.createConicGradient(sweep, CX, CY)
      cg.addColorStop(0.0, withAlpha(palette.accent, 0))
      cg.addColorStop(0.74, withAlpha(palette.accent, 0))
      cg.addColorStop(0.93, withAlpha(palette.ember, 0.07))
      cg.addColorStop(0.995, withAlpha(palette.accent, 0.30))
      cg.addColorStop(1.0, withAlpha(palette.accent, 0))
      ctx.fillStyle = cg
      ctx.fillRect(CX - R, CY - R, R * 2, R * 2)
    } else {
      ctx.translate(CX, CY)
      for (let k = 0; k < 24; k++) {
        const a0 = sweep - (k / 24) * 0.5
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0 - 0.025, a0); ctx.closePath()
        ctx.fillStyle = withAlpha(palette.accent, 0.09 * (1 - k / 24)); ctx.fill()
      }
      ctx.translate(-CX, -CY)
    }
    ctx.restore()
    // leading edge
    ctx.beginPath()
    ctx.moveTo(CX, CY)
    ctx.lineTo(CX + Math.cos(sweep) * R, CY + Math.sin(sweep) * R)
    const eg = ctx.createLinearGradient(CX, CY, CX + Math.cos(sweep) * R, CY + Math.sin(sweep) * R)
    eg.addColorStop(0, withAlpha(palette.accent, 0.7))
    eg.addColorStop(1, withAlpha(palette.accent, 0.12))
    ctx.strokeStyle = eg; ctx.lineWidth = 1.6; ctx.stroke()
  }

  // ── blips ──
  for (const b of blips) {
    const x = CX + Math.cos(b.ang) * (R * b.rad)
    const y = CY + Math.sin(b.ang) * (R * b.rad)
    b.x = x; b.y = y
    if (!reduced.value) {
      const da = Math.abs(((sweep - b.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (da < 0.05) b.lastPing = tnow
    }
    const since = tnow - b.lastPing
    const ping = since < 1100 ? (1 - since / 1100) : 0
    const col = b.breached ? palette.danger : b.color
    const isHover = hover.value && b === hover.value.b
    const baseR = 2.7 + (b.t.priority === 'critical' ? 1.5 : 0) + (isHover ? 1.4 : 0)
    // breach blips get a steady halo even without a sweep ping
    const breachPulse = b.breached && !reduced.value ? 0.45 + 0.35 * Math.sin(tnow / 320 + b.ang) : 0
    const glowA = Math.max(ping * 0.5, breachPulse * 0.4, isHover ? 0.5 : 0.18)
    const gr = baseR + 6 + ping * 8 + breachPulse * 4
    const halo = ctx.createRadialGradient(x, y, 0, x, y, gr)
    halo.addColorStop(0, withAlpha(col, 0.5 + glowA))
    halo.addColorStop(1, withAlpha(col, 0))
    ctx.fillStyle = halo
    ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill()
    // dot
    ctx.beginPath(); ctx.arc(x, y, baseR + ping * 1.2, 0, Math.PI * 2)
    ctx.fillStyle = palette.light ? withAlpha(col, 0.95) : col
    ctx.fill()
    if (isHover) { ctx.lineWidth = 1.6; ctx.strokeStyle = palette.light ? '#1d1812' : '#fff'; ctx.stroke() }
  }

  // ── breach reactor core ──
  const corePulse = reduced.value ? 0.5 : (0.5 + 0.5 * Math.sin(tnow / 340))
  const hot = props.breaching > 0
  const coreCol = hot ? palette.danger : palette.accent
  const coreR = 9 + (hot ? 4 * corePulse : 1.5 * corePulse)
  // shockwave ring when breaching
  if (hot && !reduced.value) {
    const wave = ((tnow / 1400) % 1)
    ctx.beginPath(); ctx.arc(CX, CY, 9 + wave * 40, 0, Math.PI * 2)
    ctx.strokeStyle = withAlpha(palette.danger, 0.5 * (1 - wave)); ctx.lineWidth = 1.4; ctx.stroke()
  }
  const cg2 = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR + 9)
  cg2.addColorStop(0, withAlpha(coreCol, 0.7))
  cg2.addColorStop(1, withAlpha(coreCol, 0))
  ctx.fillStyle = cg2
  ctx.beginPath(); ctx.arc(CX, CY, coreR + 9, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CX, CY, coreR * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = withAlpha(coreCol, 0.95); ctx.fill()
}

const withAlpha = (col, a) => {
  if (!col) return `rgba(255,200,80,${a})`
  col = col.trim()
  if (col.startsWith('#')) {
    let h = col.slice(1)
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    const n = parseInt(h, 16)
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
  }
  if (col.startsWith('rgb(')) return col.replace('rgb(', 'rgba(').replace(')', `,${a})`)
  if (col.startsWith('rgba(')) return col.replace(/,[^,]+\)$/, `,${a})`)
  return col
}

const loop = () => {
  if (!visible) { raf = null; return }
  if (!reduced.value) sweep = (sweep + 0.017) % (Math.PI * 2)
  drawFrame()
  raf = requestAnimationFrame(loop)
}
const start = () => { if (!raf) raf = requestAnimationFrame(loop) }
const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null } }

/* hit-test for hover/click */
const nearest = (mx, my) => {
  let best = null, bd = 17 * 17
  for (const b of blips) {
    if (b.x == null) continue
    const d = (b.x - mx) ** 2 + (b.y - my) ** 2
    if (d < bd) { bd = d; best = b }
  }
  return best
}
const onMove = (e) => {
  const rect = cvEl.value.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top
  const b = nearest(mx, my)
  cvEl.value.style.cursor = b ? 'pointer' : 'crosshair'
  if (b) {
    const dm = dueMs(b.t)
    const eta = b.breached ? 'breached' : (dm == null ? 'no SLA' : relTime(dm - props.now))
    hover.value = { b, t: b.t, col: b.breached ? palette.danger : b.color, x: Math.min(mx + 14, W - 180), y: Math.max(34, my - 8), eta }
  } else hover.value = null
}
const onClick = () => { if (hover.value) emit('open', hover.value.t.id) }
const relTime = (ms) => {
  const h = ms / 3600000
  if (h < 1) return `~${Math.max(1, Math.round(h * 60))} min left`
  if (h < 48) return `~${Math.round(h)} h left`
  return `~${Math.round(h / 24)} d left`
}

watch(() => [props.tickets, props.now], () => { computeBlips(); if (reduced.value) drawFrame() }, { deep: false })

onMounted(() => {
  readPalette(); buildMotes(); t0 = performance.now(); resize()
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { resize(); if (reduced.value) drawFrame() }); ro.observe(wrapEl.value) }
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((ents) => { visible = ents[0]?.isIntersecting ?? true; if (visible) start(); else stop() })
    io.observe(wrapEl.value)
  }
  mo = new MutationObserver(() => { readPalette(); computeBlips(); drawFrame() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-cinematic'] })
  document.addEventListener('visibilitychange', onVis)
  if (reduced.value) drawFrame(); else start()
})
const onVis = () => { if (document.hidden) stop(); else if (visible) start() }
onBeforeUnmount(() => {
  stop(); ro?.disconnect(); io?.disconnect(); mo?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
})
</script>

<style scoped>
.scope {
  position: relative; width: 100%; height: 100%; min-height: 300px; border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(120% 90% at 50% 12%, rgba(251, 146, 60, 0.10), transparent 62%),
    linear-gradient(160deg, #0c0f12, #07090b 62%, #050607);
  border: 1px solid var(--sd-border-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 0 60px rgba(0, 0, 0, 0.5);
}
[data-theme="light"] .scope {
  background:
    radial-gradient(120% 90% at 50% 12%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(160deg, #2a1f16, #1a130c 64%, #140e08);
  border-color: rgba(234, 88, 12, 0.3);
}
.scope-rim { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  box-shadow: inset 0 0 0 1px var(--sd-border-warm); }
.scope-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0); background-size: 18px 18px; }
.scope-corner { position: absolute; width: 13px; height: 13px; pointer-events: none; opacity: 0.6;
  border-color: var(--sd-amber-border); border-style: solid; border-width: 0; }
.scope-corner.tl { top: 9px; left: 9px; border-top-width: 1.4px; border-left-width: 1.4px; border-top-left-radius: 5px; }
.scope-corner.tr { top: 9px; right: 9px; border-top-width: 1.4px; border-right-width: 1.4px; border-top-right-radius: 5px; }
.scope-corner.bl { bottom: 9px; left: 9px; border-bottom-width: 1.4px; border-left-width: 1.4px; border-bottom-left-radius: 5px; }
.scope-corner.br { bottom: 9px; right: 9px; border-bottom-width: 1.4px; border-right-width: 1.4px; border-bottom-right-radius: 5px; }
.scope-reticle { position: absolute; left: 50%; top: 50%; width: min(58%, 330px); aspect-ratio: 1;
  transform: translate(-50%, -50%); pointer-events: none; border-radius: 50%;
  border: 1px dashed rgba(251, 191, 36, 0.13); }
.scope-reticle::after { content: ""; position: absolute; inset: 24%; border-radius: 50%; border: 1px dashed rgba(251, 146, 60, 0.10);
  animation: scope-spin 70s linear infinite; will-change: transform; }

.scope-cv { display: block; width: 100%; height: 100%; position: relative; z-index: 1; }

.scope-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; pointer-events: none; }
.scope-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-amber); }
.scope-tag svg { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--sd-amber) 60%, transparent)); }
.scope-live { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.04em; color: var(--sd-text-muted); }
.scope-live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-amber); box-shadow: 0 0 8px var(--sd-amber);
  animation: scope-blink 2.4s ease-in-out infinite; }

.scope-core { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2; pointer-events: none;
  display: flex; flex-direction: column; align-items: center; padding: 6px 14px; border-radius: 50%; }
.scope-core::before { content: ""; position: absolute; inset: -8px -2px; border-radius: 50%; z-index: -1;
  background: radial-gradient(closest-side, rgba(6, 8, 10, 0.78), rgba(6, 8, 10, 0.34) 60%, transparent 78%); }
[data-theme="light"] .scope-core::before { background: radial-gradient(closest-side, rgba(16, 11, 6, 0.7), rgba(16, 11, 6, 0.3) 60%, transparent 78%); }
.sc-n { font-size: 23px; font-weight: 800; line-height: 1; color: var(--sd-text); text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
.scope-core.hot .sc-n { color: var(--sd-danger); text-shadow: 0 0 16px color-mix(in srgb, var(--sd-danger) 70%, transparent); }
.sc-l { font-size: 7.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sd-text-muted); margin-top: 4px; }

.scope-legend { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; display: flex; flex-wrap: wrap; justify-content: center;
  gap: 5px 13px; padding: 9px 12px 11px; pointer-events: none;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.42), transparent); }
[data-theme="light"] .scope-legend { background: linear-gradient(0deg, rgba(20, 14, 8, 0.42), transparent); }
.lg-item { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 600; letter-spacing: 0.02em; color: var(--sd-text-secondary); }
.lg-item i { width: 6px; height: 6px; border-radius: 50%; }

.scope-tip { position: absolute; z-index: 5; display: flex; flex-direction: column; gap: 2px; max-width: 200px; padding: 8px 11px;
  border-radius: 11px; pointer-events: none; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4); }
.tp-no { font-size: 10px; font-weight: 700; color: var(--sd-amber); }
.tp-sub { font-size: 11.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--sd-text-muted); margin-top: 1px; }
.tp-meta i { width: 6px; height: 6px; border-radius: 50%; }
.scope-tip-enter-active, .scope-tip-leave-active { transition: opacity 0.14s; }
.scope-tip-enter-from, .scope-tip-leave-to { opacity: 0; }

@keyframes scope-spin { to { transform: rotate(360deg); } }
@keyframes scope-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .scope-reticle,
  html:not([data-cinematic="on"]) .scope-reticle::after,
  html:not([data-cinematic="on"]) .scope-live i { animation: none; }
}
</style>
