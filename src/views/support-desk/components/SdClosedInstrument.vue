<template>
  <div ref="wrap" class="cli" :style="height ? { height: height + 'px' } : null">
    <canvas ref="cv" class="cli-cv" aria-label="The Vault — tumbler rings lock in every closure; the outer ring's notches are the newest sealed records" />
  </div>
</template>

<script setup>
/*
  SdClosedInstrument — "THE VAULT" (gallery pick 01 of 8: vault / strata / stacks /
  amber / monolith / cold storage / seal press / pneumatic).
  A bank-vault door fills the hero: three concentric tumbler rings notched like a
  combination lock. Every new closure spins the rings to a fresh alignment (outer→inner
  cascade), the pins seat with a door shudder, and the brass bolt slides home under a
  glint sweep — the lifetime record count is engraved in the hub. An exhume runs the
  sequence in REVERSE (rose counter-spin, bolt withdrawn, count unchanged — history
  keeps the row). Idle state breathes: rings drift and the hub glow pulses slowly.
  DATA: outer-ring notches = the newest sealed records (notch tint = provenance via
  closeSourceOf: brass manual / frost auto-sweep / dim merged / warm no-reply; rose =
  exhumed-before). Outer notches are CLICKABLE → emit open(ticket). Hub = closed_total.
  THEME-NATIVE (the Silence-Chronometer rule): source-over drawing only — no additive
  blending — with the full palette re-read from --sd-cls-* tokens + data-theme on every
  theme flip, so the door is night-steel on dark and porcelain-and-slate on cream.
  House canvas conventions: ResizeObserver + DPR, IntersectionObserver +
  visibilitychange pause, reduced-motion = one static locked frame, never-empty
  (ghost notches when the archive has no rows yet).
*/
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { closeSourceOf } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },   // 0 = absolute-fill backdrop (hero contract)
})
const emit = defineEmits(['open'])

const wrap = ref(null)
const cv = ref(null)

let ctx = null, raf = 0, running = false, visible = true, tabVisible = true
let W = 0, H = 0, DPR = 1
let ro = null, io = null, mo = null

/* ── palette — re-read on data-theme flips; tokens already carry the light variants ── */
let PAL = {}
const readVar = (name, fb) => {
  try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb } catch { return fb }
}
const readPalette = () => {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  PAL = {
    light,
    air0: light ? '#f4f2ec' : '#07080b',
    air1: light ? '#edeae2' : '#0a0b0e',
    air2: light ? '#e6e3da' : '#0d0f13',
    plateHi: light ? '#e8e6e0' : '#1d2027',
    plateLo: light ? '#d3d2cb' : '#101218',
    hubHi: light ? '#f0eee8' : '#2a2e37',
    hubLo: light ? '#d9d7d0' : '#14161b',
    ring: readVar('--sd-cls-core', light ? '#5c6674' : '#c9cfd8'),
    hi: readVar('--sd-cls-hi', light ? '#414a56' : '#eef1f6'),
    deep: readVar('--sd-cls-deep', light ? '#2f3742' : '#767e8c'),
    seal: readVar('--sd-cls-seal', light ? '#a16207' : '#d9a441'),
    frost: readVar('--sd-cls-frost', light ? '#6b7889' : '#a8b6c4'),
    risk: readVar('--sd-cls-risk', light ? '#be123c' : '#fb7185'),
    warm: light ? '#8a6a24' : '#d9b98a',
    ink: light ? '#232631' : '#f0f2f6',
    inkDim: light ? 'rgba(35,38,49,.45)' : 'rgba(240,242,246,.4)',
    line: light ? 'rgba(40,45,60,.28)' : 'rgba(201,207,216,.22)',
    lineSoft: light ? 'rgba(40,45,60,.14)' : 'rgba(201,207,216,.1)',
    boltHi: light ? '#c99b3e' : '#d9a441',
    boltLo: light ? '#8a6a24' : '#8a6a24',
    glint: light ? 'rgba(255,255,255,.5)' : 'rgba(238,241,246,.12)',
    shadow: light ? 'rgba(60,55,40,.18)' : 'rgba(0,0,0,.5)',
  }
}

/* ── vault state ── */
const rings = [
  { r: 0.42, w: 0.075, a: 0.3, t: 0.3, notches: 26, seed: 3 },
  { r: 0.31, w: 0.065, a: 1.4, t: 1.4, notches: 18, seed: 7 },
  { r: 0.21, w: 0.055, a: 2.6, t: 2.6, notches: 12, seed: 11 },
]
let bolt = 1, boltT = 1        // 1 = locked home
let shake = 0
let glint = -1                 // -1 idle, else 0..1 sweep progress
let reverseTint = 0            // rose flash while an exhume counter-spins
let hover = -1                 // hovered outer-notch index

const toneFor = (t) => {
  if (!t) return PAL.frost
  if ((t.reopened_count || 0) > 0) return PAL.risk
  const src = closeSourceOf(t)
  if (src === 'manual') return PAL.seal
  if (src === 'merged') return PAL.deep
  if (src === 'no_response') return PAL.warm
  return PAL.frost
}

const geom = () => {
  const cx = W * (W / H > 1.55 ? 0.64 : 0.5)
  const cy = H * 0.52
  const R = Math.min(W * 0.31, H * 0.42)
  return { cx, cy, R }
}

function lockIn(reverse = false) {
  if (props.reduced) return
  rings.forEach((rg, i) => setTimeout(() => {
    rg.t += (reverse ? -1 : 1) * (Math.PI / rg.notches) * (2 + ((Math.random() * 3) | 0) * 2)
  }, i * 90))
  if (reverse) reverseTint = 1
  setTimeout(() => { boltT = 0 }, 420)
  setTimeout(() => { boltT = 1; shake = 1; glint = 0 }, 760)
}

/* ── render ── */
const draw = (T) => {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)
  const { cx, cy, R } = geom()
  const sh = shake * Math.sin(T * 60) * 3 * DPR
  shake = Math.max(0, shake - 0.02)
  if (reverseTint > 0) reverseTint = Math.max(0, reverseTint - 0.012)

  // stage air — porcelain on light, night-steel on dark
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, PAL.air0); bg.addColorStop(0.55, PAL.air1); bg.addColorStop(1, PAL.air2)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  // soft vignette around the door so it reads on both grounds
  const vg = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2.4)
  vg.addColorStop(0, PAL.light ? 'rgba(255,255,255,.28)' : 'rgba(238,241,246,.03)')
  vg.addColorStop(1, PAL.light ? 'rgba(120,112,95,.12)' : 'rgba(0,0,0,.22)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

  ctx.save(); ctx.translate(sh, sh * 0.6)

  // door drop-shadow (grounds the plate on the cream theme especially)
  ctx.beginPath(); ctx.arc(cx + R * 0.03, cy + R * 0.06, R * 1.16, 0, 7)
  ctx.fillStyle = PAL.shadow; ctx.filter = `blur(${10 * DPR}px)`; ctx.fill(); ctx.filter = 'none'

  // door plate
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, 7)
  const plate = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.5, R * 0.2, cx, cy, R * 1.2)
  plate.addColorStop(0, PAL.plateHi); plate.addColorStop(1, PAL.plateLo)
  ctx.fillStyle = plate; ctx.fill()
  ctx.strokeStyle = PAL.line; ctx.lineWidth = 2 * DPR; ctx.stroke()
  // rivets
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 1.09, cy + Math.sin(a) * R * 1.09, 2.4 * DPR, 0, 7)
    ctx.fillStyle = PAL.line; ctx.fill()
  }

  // tumbler rings + notches
  const outerTickets = (props.tickets || []).slice(0, rings[0].notches)
  rings.forEach((rg, ri) => {
    rg.a += (rg.t - rg.a) * 0.07                                  // spring toward target
    const idle = props.reduced ? 0 : Math.sin(T * 0.32 + ri) * 0.014
    const rad = (rg.r / 0.42) * R, w = (rg.w / 0.42) * R
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7)
    ctx.strokeStyle = PAL.lineSoft; ctx.lineWidth = w; ctx.stroke()
    for (let i = 0; i < rg.notches; i++) {
      const a = rg.a + idle + (i / rg.notches) * Math.PI * 2
      const tk = ri === 0 ? outerTickets[i] : null
      const ghost = ri === 0 && !outerTickets.length
      const lit = Math.abs(((a % 6.2832) + 6.2832) % 6.2832 - 4.7124) < 0.15   // 12 o'clock gate
      const isHover = ri === 0 && i === hover
      ctx.save()
      ctx.translate(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
      ctx.rotate(a + Math.PI / 2)
      let tone = ri === 0 ? toneFor(tk) : [PAL.frost, PAL.seal, PAL.deep][(i + rg.seed) % 3]
      if (reverseTint > 0.4) tone = PAL.risk
      ctx.fillStyle = lit || isHover ? PAL.hi : tone
      ctx.globalAlpha = ghost ? 0.22 : lit || isHover ? 1 : 0.6
      const nw = (isHover ? 4.4 : 3.2) * DPR
      ctx.fillRect(-nw / 2, -w * 0.32, nw, w * 0.64)
      if (lit || isHover) {
        ctx.shadowColor = PAL.hi; ctx.shadowBlur = (PAL.light ? 7 : 12) * DPR
        ctx.fillRect(-nw / 2, -w * 0.32, nw, w * 0.64)
      }
      ctx.restore()
    }
    ctx.globalAlpha = 1
  })

  // hub + engraved lifetime counter
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.145, 0, 7)
  const hub = ctx.createRadialGradient(cx, cy - R * 0.05, 2, cx, cy, R * 0.15)
  hub.addColorStop(0, PAL.hubHi); hub.addColorStop(1, PAL.hubLo)
  ctx.fillStyle = hub; ctx.fill()
  const pulse = props.reduced ? 0.5 : 0.4 + 0.25 * Math.sin(T * 0.9)
  ctx.strokeStyle = PAL.seal; ctx.lineWidth = 1.4 * DPR
  ctx.globalAlpha = 0.55 + pulse * 0.45; ctx.stroke(); ctx.globalAlpha = 1
  const count = props.stats.closed_total ?? (props.tickets || []).length
  ctx.fillStyle = PAL.seal
  ctx.font = `800 ${R * 0.068}px ui-monospace, monospace`; ctx.textAlign = 'center'
  ctx.fillText(Number(count).toLocaleString(), cx, cy + R * 0.024)
  ctx.fillStyle = PAL.inkDim
  ctx.font = `700 ${R * 0.03}px ui-monospace, monospace`
  ctx.fillText('RECORDS SEALED', cx, cy + R * 0.072)

  // brass bolt (slides right, home = locked)
  bolt += (boltT - bolt) * 0.16
  const bw = R * 0.5, bx = cx + R * 1.16 - bw * (1 - bolt) - R * 0.06, by = cy - R * 0.05
  const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0)
  bg2.addColorStop(0, PAL.boltLo); bg2.addColorStop(0.5, PAL.boltHi); bg2.addColorStop(1, PAL.boltLo)
  ctx.fillStyle = bg2
  ctx.fillRect(bx, by, bw, R * 0.1)
  ctx.strokeStyle = PAL.light ? 'rgba(90,65,15,.5)' : 'rgba(0,0,0,.4)'
  ctx.lineWidth = 1 * DPR; ctx.strokeRect(bx, by, bw, R * 0.1)

  // glint sweep after a lock-in (clipped to the door)
  if (glint >= 0) {
    glint += 0.02
    const gx = cx - R * 1.2 + glint * R * 2.4
    const gr = ctx.createLinearGradient(gx - R * 0.18, 0, gx + R * 0.18, 0)
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, PAL.glint); gr.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 1.16, 0, 7); ctx.clip()
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore()
    if (glint > 1) glint = -1
  }
  ctx.restore()
}

/* ── outer-notch hit testing (click a record's notch → open its drawer) ── */
const notchAt = (mx, my) => {
  const { cx, cy, R } = geom()
  const rg = rings[0]
  const rad = (rg.r / 0.42) * R
  const dx = mx - cx, dy = my - cy
  const dist = Math.hypot(dx, dy)
  if (Math.abs(dist - rad) > (rg.w / 0.42) * R * 0.7) return -1
  const a = Math.atan2(dy, dx)
  const rel = ((a - rg.a) % 6.2832 + 6.2832) % 6.2832
  const i = Math.round(rel / (6.2832 / rg.notches)) % rg.notches
  return (props.tickets || [])[i] ? i : -1
}
const onMove = (e) => {
  const rect = cv.value.getBoundingClientRect()
  hover = notchAt((e.clientX - rect.left) * DPR, (e.clientY - rect.top) * DPR)
  cv.value.style.cursor = hover >= 0 ? 'pointer' : 'default'
  if (!running) draw(performance.now() / 1000)
}
const onClick = (e) => {
  const rect = cv.value.getBoundingClientRect()
  const i = notchAt((e.clientX - rect.left) * DPR, (e.clientY - rect.top) * DPR)
  const tk = (props.tickets || [])[i]
  if (tk) emit('open', tk)
}

/* ── loop management (pause off-screen / hidden tab; reduced = one locked frame) ── */
let lastAmbient = 0
const loop = (ms) => {
  if (!running) return
  const T = ms / 1000
  draw(T)
  // ambient life: a full lock-in every ~9s; rarely the exhume counter-spin
  if (T - lastAmbient > 9) { lastAmbient = T; lockIn(Math.random() < 0.12 && (props.stats.reopened_from_closed_30d || 0) > 0) }
  if (props.reduced) { running = false; return }
  raf = requestAnimationFrame(loop)
}
const start = () => {
  if (running || !ctx || !visible || !tabVisible) return
  running = true
  raf = requestAnimationFrame(loop)
}
const stop = () => { running = false; if (raf) cancelAnimationFrame(raf) }

const resize = () => {
  const el = wrap.value
  if (!el || !cv.value) return
  DPR = Math.min(2, window.devicePixelRatio || 1)
  W = Math.max(1, el.clientWidth * DPR)
  H = Math.max(1, el.clientHeight * DPR)
  cv.value.width = W
  cv.value.height = H
  if (!running && ctx) draw(performance.now() / 1000)
}

onMounted(() => {
  ctx = cv.value?.getContext('2d')
  readPalette()
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value)
  io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; visible ? start() : stop() }, { threshold: 0.05 })
  io.observe(wrap.value)
  mo = new MutationObserver(() => { readPalette(); if (!running) draw(performance.now() / 1000) })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-cinematic'] })
  document.addEventListener('visibilitychange', onVis)
  cv.value.addEventListener('mousemove', onMove)
  cv.value.addEventListener('click', onClick)
  start()
  if (!props.reduced) setTimeout(() => lockIn(false), 900)   // entrance lock-in
})
const onVis = () => { tabVisible = document.visibilityState === 'visible'; tabVisible ? start() : stop() }
onBeforeUnmount(() => {
  stop()
  ro?.disconnect(); io?.disconnect(); mo?.disconnect()
  document.removeEventListener('visibilitychange', onVis)
  cv.value?.removeEventListener('mousemove', onMove)
  cv.value?.removeEventListener('click', onClick)
})

// a NEW closure arriving in the window fires the lock-in ceremony
watch(() => `${(props.tickets || []).length}:${(props.tickets || [])[0]?.id || ''}`,
  (v, old) => { if (old !== undefined && v !== old) lockIn(false); if (!running) draw(performance.now() / 1000) })
watch(() => props.reduced, (r) => { if (!r) start(); else { stop(); draw(performance.now() / 1000) } })
</script>

<style scoped>
.cli { position: absolute; inset: 0; overflow: hidden; background: var(--sd-cls-deep-bg); }
[data-theme="light"] .cli { background: #f2f0ea; }
/* when mounted standalone (height > 0) it becomes a normal block */
.cli[style*="height"] { position: relative; border-radius: 18px; }
.cli-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
