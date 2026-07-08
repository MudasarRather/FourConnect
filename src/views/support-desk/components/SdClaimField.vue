<template>
  <!-- ══ Claim Field — the Unassigned signature instrument: a "Dispatch Conveyor" ══
       Unclaimed tickets ride a warm-graphite conveyor belt (perspective, scrolling tread,
       volumetric light shafts) from the right toward a glowing CLAIM GATE on the left. The
       front capsule is docked under a spotlight = NEXT. Claiming sweeps a scan-bar across the
       gate, pops the capsule, and the queue advances one slot. Horizontal industrial motion +
       warm palette — shares NOTHING with the All-Tickets radar (no dark scope, no polar sweep).
       Canvas-2D → reliable, theme-aware, reduced-motion-safe. -->
  <div ref="wrapEl" class="belt" :class="{ still: reduced, hot: breaching > 0 }">
    <span class="belt-grain" aria-hidden="true" />

    <header class="belt-hud">
      <span class="hud-tag sd-mono"><ConveyorIcon /> DISPATCH BELT</span>
      <span class="hud-live" :class="{ crit: breaching > 0 }">
        <b class="sd-mono">{{ nodeCount }}</b> inbound
        <span class="hud-bars" aria-hidden="true"><i /><i /><i /></span>
      </span>
    </header>

    <canvas ref="cvEl" class="belt-cv" @pointermove="onMove" @pointerleave="hover = null" @click="onClick" />

    <button class="belt-claim" :class="{ armed: !!nextTicket }" :disabled="!nextTicket"
      :title="nextTicket ? 'Claim the ticket docked at the gate' : 'Queue clear'" @click.stop="emit('claim-next')">
      <ScanLine :size="13" /> {{ nextTicket ? 'Claim at gate' : 'Queue clear' }}
      <span v-if="nextTicket" class="bc-no sd-mono">{{ nextTicket.ticket_number }}</span>
    </button>

    <Transition name="belt-tip">
      <div v-if="hover" class="belt-tip" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
        <span class="tp-no sd-mono">{{ hover.t.ticket_number }}</span>
        <span class="tp-sub">{{ hover.t.subject }}</span>
        <span class="tp-meta"><i :style="{ background: hover.col }" />{{ cap(hover.t.priority) }} · {{ hover.eta }}</span>
        <span class="tp-hint">click to open · {{ hover.slot === 0 ? 'at the gate' : 'in queue' }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, h } from 'vue'
import { ScanLine } from 'lucide-vue-next'

// small inline glyph (avoids depending on a specific lucide name for the belt motif)
const ConveyorIcon = () => h('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' }, [
  h('circle', { cx: 5, cy: 16, r: 2.4, stroke: 'currentColor', 'stroke-width': 1.6 }),
  h('circle', { cx: 19, cy: 16, r: 2.4, stroke: 'currentColor', 'stroke-width': 1.6 }),
  h('path', { d: 'M5 18.4h14', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round' }),
  h('rect', { x: 8, y: 6, width: 8, height: 6, rx: 1.4, stroke: 'currentColor', 'stroke-width': 1.6 }),
])

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  breaching: { type: Number, default: 0 },
  nextId: { type: [String, Number], default: null },
})
const emit = defineEmits(['open', 'claim-next'])

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const wrapEl = ref(null)
const cvEl = ref(null)
const hover = ref(null)
const nodeCount = computed(() => (props.tickets || []).length)
const nextTicket = computed(() => (props.tickets || []).find(t => String(t.id) === String(props.nextId)) || (props.tickets || [])[0] || null)

const cinematicOn = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

let ctx = null, raf = null, ro = null, io = null, mo = null
let W = 0, H = 0, DPR = 1
let visible = true
let palette = {}, mono = 'monospace'
let capsules = []
let shafts = []
let pops = []          // claim scan+pop bursts at the gate
let tread = 0
let prevIds = new Set()
// layout (set in resize)
let gateX = 0, beltCY = 0, beltH = 0, capW = 0, capH = 0, gap = 0, slotCount = 0

const TWO_PI = Math.PI * 2

const readPalette = () => {
  if (!cvEl.value) return
  const cs = getComputedStyle(cvEl.value)
  const g = (v, fb) => (cs.getPropertyValue(v) || '').trim() || fb
  mono = g('--sd-mono', "'JetBrains Mono', monospace")
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  palette = {
    light,
    accent: g('--sd-amber', '#fbbf24'),
    ember: g('--sd-ember', '#fb923c'),
    deep: g('--sd-ember-deep', '#ea580c'),
    danger: g('--sd-danger', '#dc2626') || '#dc2626',
    text: g('--sd-text', '#f4f6f8'),
    beltHi: light ? 'rgba(120,84,40,.20)' : 'rgba(255,231,190,.10)',
    beltLo: light ? 'rgba(90,62,30,.10)' : 'rgba(255,231,190,.03)',
    tread: light ? 'rgba(120,84,40,.28)' : 'rgba(251,191,36,.14)',
    shaft: light ? 'rgba(234,140,50,.10)' : 'rgba(251,191,36,.09)',
    crateFace: light ? 'rgba(255,250,242,.92)' : 'rgba(34,30,26,.92)',
    crateEdge: light ? 'rgba(120,84,40,.3)' : 'rgba(255,231,190,.14)',
    crateTxt: light ? '#3a2c18' : '#f2ede4',
    critical: g('--sd-pri-critical', '#ef4444'),
    urgent: g('--sd-pri-urgent', '#f97316'),
    high: g('--sd-pri-high', '#fb923c'),
    medium: g('--sd-pri-medium', '#fbbf24'),
    low: g('--sd-pri-low', '#a8a29e'),
  }
}

const dueMs = (t) => { const d = t.resolution_due_at || t.response_due_at; return d ? new Date(d).getTime() : null }
const urgency = (t) => {
  const dm = dueMs(t)
  if (t.sla_resolution_breached || (dm != null && dm <= props.now)) return 1
  if (dm == null) return 0.05
  return Math.max(0, Math.min(1, 1 - (dm - props.now) / (48 * 3600000)))
}
const seed = (id) => { let hsh = 0; const s = String(id); for (let i = 0; i < s.length; i++) hsh = (hsh * 31 + s.charCodeAt(i)) | 0; return Math.abs(hsh) }

const slotX = (i) => gateX + capW * 0.5 + i * (capW + gap)

const computeCapsules = () => {
  const prev = new Map(capsules.map(c => [String(c.t.id), c]))
  // Order: the recommended NEXT pick first (docked at the gate), then by urgency desc.
  const list = [...(props.tickets || [])].sort((a, b) => {
    const an = String(a.id) === String(props.nextId) ? 1 : 0
    const bn = String(b.id) === String(props.nextId) ? 1 : 0
    if (an !== bn) return bn - an
    return urgency(b) - urgency(a)
  })
  capsules = list.map((t, i) => {
    const old = prev.get(String(t.id))
    const tx = slotX(i)
    return {
      t, slot: i, tx,
      x: old ? old.x : (W + capW),      // new capsules slide in from the right
      breached: urgency(t) >= 1,
      color: palette[t.priority] || palette.low,
      bob: (seed(t.id) % 100) / 100 * TWO_PI,
    }
  })
}

const buildShafts = () => {
  shafts = [
    { cx: 0.28, w: 0.16, slant: 0.10, sp: 0.00006 },
    { cx: 0.55, w: 0.22, slant: 0.14, sp: 0.00004 },
    { cx: 0.82, w: 0.14, slant: 0.08, sp: 0.00008 },
  ]
}

const resize = () => {
  if (!cvEl.value || !wrapEl.value) return
  DPR = Math.min(2, window.devicePixelRatio || 1)
  W = wrapEl.value.clientWidth; H = wrapEl.value.clientHeight
  cvEl.value.width = Math.round(W * DPR); cvEl.value.height = Math.round(H * DPR)
  cvEl.value.style.width = W + 'px'; cvEl.value.style.height = H + 'px'
  ctx = cvEl.value.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  gateX = W * 0.16
  beltCY = H * 0.55
  beltH = Math.max(96, Math.min(150, H * 0.42))
  capW = Math.max(76, Math.min(122, W * 0.13))
  capH = beltH * 0.6
  gap = capW * 0.36
  slotCount = Math.max(1, Math.floor((W - gateX - capW * 0.4) / (capW + gap)))
  computeCapsules()
}

const withAlpha = (col, a) => {
  if (!col) return `rgba(255,200,80,${a})`
  col = col.trim()
  if (col.startsWith('#')) {
    let hx = col.slice(1); if (hx.length === 3) hx = hx.split('').map(c => c + c).join('')
    const n = parseInt(hx, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
  }
  if (col.startsWith('rgb(')) return col.replace('rgb(', 'rgba(').replace(')', `,${a})`)
  if (col.startsWith('rgba(')) return col.replace(/,[^,]+\)$/, `,${a})`)
  return col
}
const rr = (x, y, w, hh, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r)
  ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

const drawFrame = () => {
  if (!ctx) return
  const tnow = performance.now()
  ctx.clearRect(0, 0, W, H)
  const beltTop = beltCY - beltH / 2, beltBot = beltCY + beltH / 2

  // ── volumetric light shafts ──
  for (const s of shafts) {
    if (!reduced.value) s.cx = (s.cx + s.sp * 16) % 1.2
    const cx = s.cx * W, w = s.w * W, sl = s.slant * W
    const gr = ctx.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, withAlpha(palette.accent, palette.light ? 0.12 : 0.10))
    gr.addColorStop(1, withAlpha(palette.accent, 0))
    ctx.fillStyle = gr
    ctx.beginPath(); ctx.moveTo(cx - w / 2, 0); ctx.lineTo(cx + w / 2, 0)
    ctx.lineTo(cx + w / 2 + sl, H); ctx.lineTo(cx - w / 2 + sl, H); ctx.closePath(); ctx.fill()
  }

  // ── belt surface + rails + scrolling tread ──
  const bg = ctx.createLinearGradient(0, beltTop, 0, beltBot)
  bg.addColorStop(0, palette.beltHi); bg.addColorStop(0.5, palette.beltLo); bg.addColorStop(1, palette.beltHi)
  ctx.fillStyle = bg; ctx.fillRect(0, beltTop, W, beltH)
  // tread chevrons scrolling left
  if (!reduced.value) tread = (tread + 1.1) % 46
  ctx.strokeStyle = palette.tread; ctx.lineWidth = 2
  for (let x = W + 46; x > -46; x -= 46) {
    const px = x - tread
    ctx.beginPath(); ctx.moveTo(px, beltTop + 6); ctx.lineTo(px - 12, beltCY); ctx.lineTo(px, beltBot - 6); ctx.stroke()
  }
  // rim lights
  for (const yy of [beltTop, beltBot]) {
    const rg = ctx.createLinearGradient(gateX, 0, W, 0)
    rg.addColorStop(0, withAlpha(palette.accent, 0.7)); rg.addColorStop(1, withAlpha(palette.ember, 0.08))
    ctx.strokeStyle = rg; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(gateX, yy); ctx.lineTo(W, yy); ctx.stroke()
  }

  // ── capsules (right → gate), eased to slots, bobbing ──
  for (let idx = capsules.length - 1; idx >= 0; idx--) {
    const c = capsules[idx]
    if (!reduced.value) c.x += (c.tx - c.x) * 0.10
    else c.x = c.tx
    if (c.slot >= slotCount) continue                 // off-belt (counted in "+N more")
    const depth = 1 - Math.min(1, c.slot / (slotCount + 1)) * 0.34   // near gate = bigger/brighter
    const cw = capW * (0.7 + depth * 0.3), ch = capH * (0.72 + depth * 0.28)
    const bob = reduced.value ? 0 : Math.sin(tnow / 700 + c.bob) * 3
    const cx = c.x, cy = beltCY + bob
    const x = cx - cw / 2, y = cy - ch / 2
    const col = c.breached ? palette.danger : c.color
    const isNext = c.slot === 0
    const isHover = hover.value && c === hover.value.c
    c._rect = { x, y, w: cw, h: ch }
    // shadow on belt
    ctx.save(); ctx.globalAlpha = 0.32 * depth
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.beginPath(); ctx.ellipse(cx, beltBot - 8, cw * 0.5, 7, 0, 0, TWO_PI); ctx.fill(); ctx.restore()
    // motion streak while sliding in
    if (!reduced.value && Math.abs(c.tx - c.x) > 2) {
      ctx.strokeStyle = withAlpha(col, 0.25); ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x + cw, cy); ctx.lineTo(x + cw + 26, cy); ctx.stroke()
    }
    // body
    const face = ctx.createLinearGradient(x, y, x, y + ch)
    face.addColorStop(0, palette.crateFace); face.addColorStop(1, withAlpha(col, palette.light ? 0.12 : 0.16))
    ctx.fillStyle = face; rr(x, y, cw, ch, 9); ctx.fill()
    ctx.lineWidth = isHover || isNext ? 1.8 : 1; ctx.strokeStyle = isHover ? withAlpha(col, 0.95) : palette.crateEdge; ctx.stroke()
    // priority spine
    ctx.fillStyle = col; rr(x, y, 5, ch, 3); ctx.fill()
    if (c.breached && !reduced.value) {
      ctx.strokeStyle = withAlpha(palette.danger, 0.4 + 0.35 * Math.sin(tnow / 260 + c.bob)); ctx.lineWidth = 2
      rr(x - 1, y - 1, cw + 2, ch + 2, 10); ctx.stroke()
    }
    // labels
    ctx.fillStyle = palette.crateTxt; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.font = `700 ${Math.round(10 * depth + 2)}px ${mono}`
    ctx.fillText((c.t.ticket_number || '').slice(0, 12), x + 12, cy - ch * 0.16)
    ctx.fillStyle = withAlpha(col, 0.95)
    ctx.beginPath(); ctx.arc(x + 15, cy + ch * 0.2, 3.2, 0, TWO_PI); ctx.fill()
    ctx.fillStyle = palette.light ? 'rgba(58,44,24,.72)' : 'rgba(242,237,228,.66)'
    ctx.font = `600 ${Math.round(8.5 * depth + 1)}px ${mono}`
    ctx.fillText(cap(c.t.priority), x + 23, cy + ch * 0.2)
  }

  // ── CLAIM GATE (left) + spotlight on the docked NEXT capsule ──
  const gtop = beltTop - 16, gh = beltH + 32
  // spotlight cone from above onto slot 0
  const sx = slotX(0)
  const spot = ctx.createLinearGradient(sx, 0, sx, beltBot)
  spot.addColorStop(0, withAlpha(palette.accent, 0)); spot.addColorStop(1, withAlpha(palette.accent, nextTicket.value ? 0.12 : 0.03))
  ctx.fillStyle = spot
  ctx.beginPath(); ctx.moveTo(sx - 8, 0); ctx.lineTo(sx + 8, 0); ctx.lineTo(sx + capW * 0.6, beltBot); ctx.lineTo(sx - capW * 0.6, beltBot); ctx.closePath(); ctx.fill()
  // gate posts
  const hot = props.breaching > 0
  const gcol = hot ? palette.danger : palette.accent
  const gp = reduced.value ? 0.6 : 0.5 + 0.5 * Math.sin(tnow / 420)
  ctx.strokeStyle = withAlpha(gcol, 0.55 + gp * 0.35); ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(gateX, gtop); ctx.lineTo(gateX, gtop + gh); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(gateX, gtop); ctx.lineTo(gateX + 16, gtop); ctx.moveTo(gateX, gtop + gh); ctx.lineTo(gateX + 16, gtop + gh); ctx.stroke()
  // gate glow
  const gg = ctx.createLinearGradient(gateX - 20, 0, gateX + 24, 0)
  gg.addColorStop(0, withAlpha(gcol, 0)); gg.addColorStop(1, withAlpha(gcol, 0.16))
  ctx.fillStyle = gg; ctx.fillRect(gateX - 20, gtop, 44, gh)
  // vertical scan line sweeping the gate
  if (!reduced.value) {
    const sy = gtop + ((tnow / 1400) % 1) * gh
    ctx.strokeStyle = withAlpha(gcol, 0.5); ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(gateX - 14, sy); ctx.lineTo(gateX + 18, sy); ctx.stroke()
  }

  // ── claim scan+pop bursts at the gate ──
  pops = pops.filter(p => tnow - p.born < 620)
  for (const p of pops) {
    const t = (tnow - p.born) / 620
    // scan bar sweeps right along the belt
    const bx = gateX + t * (capW + gap) * 1.4
    ctx.strokeStyle = withAlpha(palette.accent, 0.8 * (1 - t)); ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(bx, beltTop); ctx.lineTo(bx, beltBot); ctx.stroke()
    // particle pop at gate
    const n = 9
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TWO_PI, d = t * 34
      ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, beltCY + Math.sin(a) * d, 2.4 * (1 - t), 0, TWO_PI)
      ctx.fillStyle = withAlpha(p.color, 0.9 * (1 - t)); ctx.fill()
    }
  }

  // ── "+N more" overflow tag ──
  const overflow = capsules.filter(c => c.slot >= slotCount).length
  if (overflow > 0) {
    ctx.fillStyle = withAlpha(palette.accent, 0.16); rr(W - 74, beltCY - 13, 62, 26, 13); ctx.fill()
    ctx.fillStyle = palette.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `700 11px ${mono}`; ctx.fillText('+' + overflow + ' more', W - 43, beltCY)
  }
}

const loop = () => {
  if (!visible) { raf = null; return }
  drawFrame()
  raf = requestAnimationFrame(loop)
}
const start = () => { if (!raf) raf = requestAnimationFrame(loop) }
const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null } }

const hit = (mx, my) => {
  for (const c of capsules) { const r = c._rect; if (r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return c }
  return null
}
const relTime = (ms) => {
  const hh = ms / 3600000
  if (hh < 1) return `~${Math.max(1, Math.round(hh * 60))} min left`
  if (hh < 48) return `~${Math.round(hh)} h left`
  return `~${Math.round(hh / 24)} d left`
}
const onMove = (e) => {
  const rect = cvEl.value.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top
  const c = hit(mx, my)
  cvEl.value.style.cursor = c ? 'pointer' : 'default'
  if (c) {
    const dm = dueMs(c.t)
    const eta = c.breached ? 'breached' : (dm == null ? 'no SLA' : relTime(dm - props.now))
    hover.value = { c, t: c.t, slot: c.slot, col: c.breached ? palette.danger : c.color, eta,
      x: Math.min(mx + 14, W - 200), y: Math.max(30, my - 8) }
  } else hover.value = null
}
const onClick = () => { if (hover.value) emit('open', hover.value.t.id) }

watch(() => props.tickets, (list) => {
  const ids = new Set((list || []).map(t => String(t.id)))
  if (prevIds.size && !reduced.value) {
    for (const c of capsules) {
      const id = String(c.t.id)
      if (!ids.has(id) && prevIds.has(id) && c.slot < slotCount) pops.push({ born: performance.now(), color: c.breached ? palette.danger : c.color })
    }
  }
  prevIds = ids
  computeCapsules()
  if (reduced.value) drawFrame()
}, { deep: false })
watch(() => props.now, () => { if (reduced.value) drawFrame() })
watch(() => props.nextId, () => { computeCapsules(); if (reduced.value) drawFrame() })

const onVis = () => { if (document.hidden) stop(); else if (visible) start() }
onMounted(() => {
  readPalette(); buildShafts(); resize()
  prevIds = new Set((props.tickets || []).map(t => String(t.id)))
  if ('ResizeObserver' in window) { ro = new ResizeObserver(() => { resize(); if (reduced.value) drawFrame() }); ro.observe(wrapEl.value) }
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((ents) => { visible = ents[0]?.isIntersecting ?? true; if (visible) start(); else stop() })
    io.observe(wrapEl.value)
  }
  mo = new MutationObserver(() => { readPalette(); computeCapsules(); drawFrame() })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-cinematic'] })
  document.addEventListener('visibilitychange', onVis)
  if (reduced.value) drawFrame(); else start()
})
onBeforeUnmount(() => { stop(); ro?.disconnect(); io?.disconnect(); mo?.disconnect(); document.removeEventListener('visibilitychange', onVis) })
</script>

<style scoped>
.belt {
  position: relative; width: 100%; height: 100%; min-height: 300px; border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(120% 80% at 12% 0%, rgba(251, 146, 60, 0.14), transparent 55%),
    linear-gradient(135deg, #2c2723 0%, #211d18 58%, #1b1712 100%);
  border: 1px solid var(--sd-border-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 0 70px rgba(0, 0, 0, 0.45);
}
[data-theme="light"] .belt {
  background:
    radial-gradient(120% 80% at 12% 0%, rgba(234, 88, 12, 0.16), transparent 52%),
    linear-gradient(135deg, #f3ead9 0%, #ecdfc9 58%, #e4d3b8 100%);
  border-color: rgba(234, 88, 12, 0.3);
}
.belt-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0); background-size: 20px 20px; }
[data-theme="light"] .belt-grain { background-image: radial-gradient(circle at 1px 1px, rgba(120, 84, 40, 0.06) 1px, transparent 0); }

.belt-cv { display: block; width: 100%; height: 100%; position: relative; z-index: 1; }

.belt-hud { position: absolute; top: 0; left: 0; right: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; pointer-events: none; }
.hud-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-amber); }
.hud-tag svg { filter: drop-shadow(0 0 6px color-mix(in srgb, var(--sd-amber) 60%, transparent)); }
.hud-live { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 600; color: var(--sd-text-muted); }
.hud-live b { color: var(--sd-text); }
.hud-live.crit b { color: var(--sd-danger); }
.hud-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 11px; }
.hud-bars i { width: 2.5px; border-radius: 2px; background: var(--sd-amber); animation: belt-eq 1.1s ease-in-out infinite; }
.hud-bars i:nth-child(1) { height: 5px; animation-delay: 0s; }
.hud-bars i:nth-child(2) { height: 11px; animation-delay: 0.18s; }
.hud-bars i:nth-child(3) { height: 7px; animation-delay: 0.36s; }
.belt.hot .hud-bars i { background: var(--sd-danger); }

.belt-claim { position: absolute; left: 15px; bottom: 13px; z-index: 3;
  display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 999px; cursor: pointer; font-family: inherit;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--sd-text);
  background: color-mix(in srgb, var(--sd-surface-elevated) 84%, transparent);
  border: 1px solid var(--sd-amber-border); backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); transition: transform 0.18s var(--sd-spring), border-color 0.18s; }
.belt-claim svg { color: var(--sd-amber); }
.belt-claim.armed:hover { transform: translateY(-2px); border-color: var(--sd-amber); }
.belt-claim:disabled { cursor: default; color: var(--sd-text-muted); border-color: var(--sd-border); }
.bc-no { font-size: 10px; font-weight: 700; color: var(--sd-amber); padding-left: 3px; border-left: 1px solid var(--sd-amber-border); margin-left: 2px; }

.belt-tip { position: absolute; z-index: 5; display: flex; flex-direction: column; gap: 2px; max-width: 220px; padding: 8px 11px;
  border-radius: 11px; pointer-events: none; background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.42); }
.tp-no { font-size: 10px; font-weight: 700; color: var(--sd-amber); }
.tp-sub { font-size: 11.5px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-meta { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--sd-text-muted); margin-top: 1px; }
.tp-meta i { width: 6px; height: 6px; border-radius: 50%; }
.tp-hint { font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); margin-top: 2px; }
.belt-tip-enter-active, .belt-tip-leave-active { transition: opacity 0.14s; }
.belt-tip-enter-from, .belt-tip-leave-to { opacity: 0; }

@keyframes belt-eq { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .hud-bars i { animation: none; }
}
</style>
