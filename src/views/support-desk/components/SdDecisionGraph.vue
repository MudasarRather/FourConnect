<template>
  <div ref="wrapEl" class="qdg" :class="{ reduced }" aria-hidden="true">
    <canvas ref="cvsEl" class="qdg-cvs" @pointermove="onMove" @pointerleave="hover = null" @click="onClick" />
    <div v-if="hover" class="qdg-tip sd-mono" :style="{ left: hover.x + 'px', top: hover.y + 'px' }">
      <b>{{ hover.name }}</b>
      <span v-if="hover.kind === 'lane'">{{ hover.open }} open{{ hover.cap ? ` / cap ${hover.cap}` : '' }}{{ hover.at ? ' · AT CAPACITY' : '' }}</span>
      <span v-else-if="hover.kind === 'rule'">fired ×{{ hover.runs }}</span>
      <span v-else>the desk intake</span>
    </div>
  </div>
</template>

<script setup>
/* SdDecisionGraph — the Queue Config signature instrument ("THE DECISION GRAPH").
   The live routing engine as a glass node-flow canvas: intake orb → the on_create
   rule chain (spine order = evaluation order, halos flash as packets pass) → lane
   terminals with load bars + capacity rings; a steel dashed spill edge lights when
   a lane runs at capacity. Ticket packets ride the beziers continuously, spawn rate
   scaled to live open counts. `probe` animates one golden dry-run packet along the
   simulator's decided path. DPR canvas, IO-paused, --sd-qc-* re-read on theme flip,
   reduced-motion (unless data-cinematic=on) renders a single static frame. */
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  queues: { type: Array, default: () => [] },   // [{id,name,color,tier,open,capacity_limit,at_capacity,is_default,overflow_queue_id}]
  rules: { type: Array, default: () => [] },    // on_create rules [{id,name,is_active,run_count,target_queue_id}]
  probe: { type: Object, default: null },       // {seq, rule_id|null, queue_id, overflow_from_id|null}
})
const emit = defineEmits(['pick'])

const wrapEl = ref(null)
const cvsEl = ref(null)
const hover = ref(null)

const reduced = computed(() => {
  if (typeof window === 'undefined') return true
  if (document.documentElement.getAttribute('data-cinematic') === 'on') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

/* ── theme palette (plain-hex tokens, re-read on data-theme flips) ── */
let C = {}
const readVar = (name, fb) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fb
}
const readPalette = () => {
  C = {
    stage: readVar('--sd-qc-stage', '#080604'),
    core: readVar('--sd-qc-core', '#f2b64d'),
    hi: readVar('--sd-qc-hi', '#ffdf9e'),
    ink: readVar('--sd-qc-ink', '#f5ead6'),
    edge: readVar('--sd-qc-edge', '#6f5a30'),
    packet: readVar('--sd-qc-packet', '#ffd98a'),
    node: readVar('--sd-qc-node', '#14100a'),
    go: '#34d399', halt: '#fb7185', spill: '#8b93a3',
  }
}

/* ── layout ── */
const MAXR = 5, MAXQ = 6
let W = 0, H = 0, DPR = 1
let nodes = { intake: null, rules: [], lanes: [], moreR: 0, moreQ: 0 }
let edges = []   // {from:{x,y}, to:{x,y}, cx1, cy1, cx2, cy2, kind:'chain'|'route'|'fallback'|'spill', color, ruleIdx, laneIdx}

const bez = (e, t) => {
  const u = 1 - t
  return {
    x: u * u * u * e.from.x + 3 * u * u * t * e.cx1 + 3 * u * t * t * e.cx2 + t * t * t * e.to.x,
    y: u * u * u * e.from.y + 3 * u * u * t * e.cy1 + 3 * u * t * t * e.cy2 + t * t * t * e.to.y,
  }
}
const edgeBetween = (a, b, kind, color, extra = {}) => ({
  from: a, to: b,
  cx1: a.x + (b.x - a.x) * 0.45, cy1: a.y,
  cx2: a.x + (b.x - a.x) * 0.55, cy2: b.y,
  kind, color, ...extra,
})

const layout = () => {
  const rs = (props.rules || []).filter(r => r).slice(0, MAXR)
  const qs = (props.queues || []).filter(q => q).slice(0, MAXQ)
  nodes.moreR = Math.max(0, (props.rules || []).length - MAXR)
  nodes.moreQ = Math.max(0, (props.queues || []).length - MAXQ)

  const pad = Math.min(40, W * 0.04)
  nodes.intake = { x: pad + 52, y: H / 2, r: Math.min(34, H * 0.11) }

  const rx = W * 0.42, rw = Math.min(150, W * 0.2), rh = 36
  nodes.rules = rs.map((r, i) => {
    const gap = Math.min(52, (H - 60) / Math.max(rs.length, 1))
    const y0 = H / 2 - ((rs.length - 1) * gap) / 2
    return { ...r, x: rx, y: y0 + i * gap, w: rw, h: rh, flash: 0 }
  })

  const lx = W - pad - Math.min(170, W * 0.21), lw = Math.min(170, W * 0.21), lh = Math.min(42, (H - 40) / Math.max(qs.length, 1) - 8)
  nodes.lanes = qs.map((q, i) => {
    const gap = (H - 40) / Math.max(qs.length, 1)
    return { ...q, x: lx, y: 20 + gap * i + gap / 2, w: lw, h: lh, hot: 0 }
  })

  edges = []
  const laneById = Object.fromEntries(nodes.lanes.map((l, i) => [String(l.id), i]))
  // intake → first rule, then the chain spine rule→rule
  if (nodes.rules.length) {
    edges.push(edgeBetween(nodes.intake, { x: nodes.rules[0].x - 6, y: nodes.rules[0].y }, 'chain', C.edge, { ruleIdx: 0 }))
    for (let i = 0; i < nodes.rules.length - 1; i++) {
      edges.push(edgeBetween(
        { x: nodes.rules[i].x + nodes.rules[i].w / 2, y: nodes.rules[i].y + rh / 2 },
        { x: nodes.rules[i + 1].x + nodes.rules[i + 1].w / 2, y: nodes.rules[i + 1].y - rh / 2 },
        'chain', C.edge, { ruleIdx: i + 1 }))
    }
  }
  // rule → its routed lane
  nodes.rules.forEach((r, ri) => {
    const li = laneById[String(r.target_queue_id || '')]
    if (li == null) return
    const l = nodes.lanes[li]
    edges.push(edgeBetween(
      { x: r.x + r.w + 6, y: r.y }, { x: l.x - 6, y: l.y },
      'route', l.color || C.core, { ruleIdx: ri, laneIdx: li }))
  })
  // intake → default lane (the category/default fallback path)
  const di = nodes.lanes.findIndex(l => l.is_default)
  if (di >= 0) {
    edges.push(edgeBetween(
      { x: nodes.intake.x + nodes.intake.r, y: nodes.intake.y + 8 },
      { x: nodes.lanes[di].x - 6, y: nodes.lanes[di].y }, 'fallback', C.edge, { laneIdx: di }))
  }
  // capacity spill edges lane → overflow lane
  nodes.lanes.forEach((l, li) => {
    const oi = laneById[String(l.overflow_queue_id || '')]
    if (oi == null || oi === li) return
    const o = nodes.lanes[oi]
    edges.push({
      from: { x: l.x + l.w + 4, y: l.y }, to: { x: o.x + o.w + 4, y: o.y },
      cx1: l.x + l.w + 34, cy1: l.y, cx2: o.x + o.w + 34, cy2: o.y,
      kind: 'spill', color: C.spill, laneIdx: li, spillTo: oi, active: !!l.at_capacity,
    })
  })
}

/* ── packets ── */
let packets = []   // {edge, t, speed, gold}
const spawn = () => {
  const routes = edges.filter(e => e.kind === 'route' || e.kind === 'fallback')
  if (!routes.length && !edges.length) return
  const pool = routes.length ? routes : edges
  const e = pool[Math.floor(Math.random() * pool.length)]
  packets.push({ edge: e, t: 0, speed: 0.004 + Math.random() * 0.004, gold: false })
}

/* ── probe (dry-run) animation ── */
let probeAnim = null   // {stage:'toRule'|'toLane'|'spill', t, ruleIdx, laneIdx, spillIdx}
watch(() => props.probe && props.probe.seq, () => {
  if (!props.probe) return
  const ri = nodes.rules.findIndex(r => String(r.id) === String(props.probe.rule_id || ''))
  let li = nodes.lanes.findIndex(l => String(l.id) === String(props.probe.queue_id || ''))
  let spillFrom = -1
  if (props.probe.overflow_from_id) {
    spillFrom = nodes.lanes.findIndex(l => String(l.id) === String(props.probe.overflow_from_id))
  }
  if (li < 0 && spillFrom < 0) return
  probeAnim = { stage: ri >= 0 ? 'toRule' : 'toLane', t: 0, ruleIdx: ri, laneIdx: li, spillFrom }
})

/* ── draw ── */
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
const hexA = (hex, a) => {
  const h = hex.replace('#', '')
  if (h.length < 6) return hex
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`
}

let tPrev = 0, ringPhase = 0, spawnAcc = 0
const draw = (ctx, dt) => {
  ctx.clearRect(0, 0, W, H)
  // stage
  ctx.fillStyle = C.stage
  ctx.fillRect(0, 0, W, H)
  // faint grid
  ctx.strokeStyle = hexA(C.core, 0.05)
  ctx.lineWidth = 1
  for (let gx = 40; gx < W; gx += 70) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke() }
  for (let gy = 30; gy < H; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke() }

  // edges
  for (const e of edges) {
    ctx.beginPath()
    ctx.moveTo(e.from.x, e.from.y)
    ctx.bezierCurveTo(e.cx1, e.cy1, e.cx2, e.cy2, e.to.x, e.to.y)
    if (e.kind === 'spill') {
      ctx.setLineDash([5, 6])
      ctx.strokeStyle = e.active ? hexA(C.halt, 0.85) : hexA(C.spill, 0.4)
      ctx.lineWidth = e.active ? 2 : 1.4
    } else {
      ctx.setLineDash([])
      ctx.strokeStyle = e.kind === 'route' ? hexA(e.color || C.core, 0.5) : hexA(C.edge, 0.85)
      ctx.lineWidth = e.kind === 'route' ? 1.8 : 1.4
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // intake orb
  const io = nodes.intake
  if (io) {
    const grad = ctx.createRadialGradient(io.x, io.y, 2, io.x, io.y, io.r * 2.2)
    grad.addColorStop(0, hexA(C.core, 0.32)); grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.beginPath(); ctx.arc(io.x, io.y, io.r * 2.2, 0, 7); ctx.fill()
    ctx.strokeStyle = hexA(C.core, 0.9)
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -ringPhase
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(io.x, io.y, io.r, 0, 7); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = C.node
    ctx.beginPath(); ctx.arc(io.x, io.y, io.r * 0.66, 0, 7); ctx.fill()
    ctx.strokeStyle = hexA(C.core, 0.6); ctx.stroke()
    ctx.fillStyle = C.hi
    ctx.font = `700 ${Math.max(9, io.r * 0.34)}px Consolas, monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('INTAKE', io.x, io.y)
  }

  // rule nodes
  ctx.textAlign = 'left'
  for (const r of nodes.rules) {
    const x = r.x, y = r.y - r.h / 2
    if (r.flash > 0) {
      ctx.strokeStyle = hexA(C.hi, Math.min(1, r.flash))
      ctx.lineWidth = 2
      rr(ctx, x - 3, y - 3, r.w + 6, r.h + 6, 12); ctx.stroke()
      r.flash -= dt * 0.0016
    }
    ctx.fillStyle = C.node
    rr(ctx, x, y, r.w, r.h, 9); ctx.fill()
    ctx.strokeStyle = r.is_active ? hexA(C.core, 0.55) : hexA(C.spill, 0.4)
    ctx.lineWidth = 1.2; ctx.stroke()
    ctx.fillStyle = r.is_active ? C.hi : hexA(C.ink, 0.45)
    ctx.font = '600 10px Consolas, monospace'
    ctx.textBaseline = 'alphabetic'
    const name = (r.name || '').slice(0, Math.floor(r.w / 7))
    ctx.fillText(name, x + 10, y + 15)
    ctx.fillStyle = hexA(C.ink, 0.45)
    ctx.font = '9px Consolas, monospace'
    ctx.fillText(`×${r.run_count || 0}${r.stop_processing ? ' · STOP' : ''}`, x + 10, y + 28)
  }
  if (nodes.moreR) {
    const last = nodes.rules[nodes.rules.length - 1]
    if (last) {
      ctx.fillStyle = hexA(C.ink, 0.4)
      ctx.font = '9px Consolas, monospace'
      ctx.fillText(`+${nodes.moreR} more rules`, last.x + 8, last.y + last.h / 2 + 16)
    }
  }

  // lane terminals
  for (const l of nodes.lanes) {
    const x = l.x, y = l.y - l.h / 2
    const col = l.color || C.core
    ctx.fillStyle = C.node
    rr(ctx, x, y, l.w, l.h, 10); ctx.fill()
    ctx.strokeStyle = l.at_capacity ? hexA(C.halt, 0.5 + 0.4 * Math.sin(ringPhase * 0.35)) : hexA(col, 0.55)
    ctx.lineWidth = l.at_capacity ? 1.8 : 1.2
    ctx.stroke()
    // spine — clipped to the card's rounded silhouette so the colored side bar
    // can't poke past the top/bottom corner radii
    ctx.save()
    rr(ctx, x, y, l.w, l.h, 10); ctx.clip()
    ctx.fillStyle = col
    ctx.fillRect(x, y, 3.5, l.h)
    ctx.restore()
    // name + load bar
    ctx.fillStyle = C.ink
    ctx.font = '600 10.5px Consolas, monospace'
    ctx.textBaseline = 'alphabetic'
    const nm = `${l.name || ''}${l.tier ? ` · L${l.tier}` : ''}${l.is_default ? ' ◈' : ''}`
    ctx.fillText(nm.slice(0, Math.floor(l.w / 6.6)), x + 12, y + 15)
    const bw = l.w - 24
    ctx.fillStyle = hexA(col, 0.18)
    rr(ctx, x + 12, y + l.h - 11, bw, 4, 2); ctx.fill()
    const cap = Number(l.capacity_limit) || 0
    const ratio = cap ? Math.min(1, (l.open || 0) / cap) : Math.min(1, (l.open || 0) / 25)
    ctx.fillStyle = l.at_capacity ? C.halt : col
    rr(ctx, x + 12, y + l.h - 11, Math.max(3, bw * ratio), 4, 2); ctx.fill()
    if (cap) {
      ctx.fillStyle = hexA(C.ink, 0.5)
      ctx.font = '8.5px Consolas, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${l.open || 0}/${cap}`, x + l.w - 8, y + 14)
      ctx.textAlign = 'left'
    }
    if (l.hot > 0) {
      ctx.strokeStyle = hexA(C.hi, Math.min(1, l.hot))
      ctx.lineWidth = 2
      rr(ctx, x - 3, y - 3, l.w + 6, l.h + 6, 12); ctx.stroke()
      l.hot -= dt * 0.0016
    }
  }
  if (nodes.moreQ) {
    const last = nodes.lanes[nodes.lanes.length - 1]
    if (last) {
      ctx.fillStyle = hexA(C.ink, 0.4)
      ctx.font = '9px Consolas, monospace'
      ctx.fillText(`+${nodes.moreQ} more lanes`, last.x + 12, last.y + last.h / 2 + 14)
    }
  }

  // ambient packets
  packets = packets.filter(p => p.t <= 1)
  for (const p of packets) {
    p.t += p.speed * dt * 0.06
    const pos = bez(p.edge, Math.min(1, p.t))
    ctx.fillStyle = hexA(C.packet, 0.9)
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 2.6, 0, 7); ctx.fill()
    const trail = bez(p.edge, Math.max(0, Math.min(1, p.t) - 0.05))
    ctx.strokeStyle = hexA(C.packet, 0.3)
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(trail.x, trail.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    if (p.t >= 1) {
      if (p.edge.laneIdx != null && nodes.lanes[p.edge.laneIdx]) nodes.lanes[p.edge.laneIdx].hot = 0.7
      if (p.edge.kind === 'chain' && p.edge.ruleIdx != null && nodes.rules[p.edge.ruleIdx]) nodes.rules[p.edge.ruleIdx].flash = 0.9
    }
  }

  // dry-run probe packet — bright gold, bigger, staged path
  if (probeAnim) {
    probeAnim.t += dt * 0.0009
    let e = null
    const io2 = nodes.intake
    if (probeAnim.stage === 'toRule' && probeAnim.ruleIdx >= 0) {
      const r = nodes.rules[probeAnim.ruleIdx]
      e = edgeBetween(io2, { x: r.x - 4, y: r.y }, 'probe', C.hi)
      if (probeAnim.t >= 1) { r.flash = 1.2; probeAnim = { ...probeAnim, stage: 'toLane', t: 0 } }
    } else if (probeAnim.stage === 'toLane') {
      const fromN = probeAnim.ruleIdx >= 0 ? nodes.rules[probeAnim.ruleIdx] : io2
      const fromPt = probeAnim.ruleIdx >= 0 ? { x: fromN.x + fromN.w + 4, y: fromN.y } : { x: io2.x + io2.r, y: io2.y }
      const li = probeAnim.spillFrom >= 0 ? probeAnim.spillFrom : probeAnim.laneIdx
      const l = nodes.lanes[li]
      if (!l) { probeAnim = null } else {
        e = edgeBetween(fromPt, { x: l.x - 4, y: l.y }, 'probe', C.hi)
        if (probeAnim.t >= 1) {
          l.hot = 1.2
          if (probeAnim.spillFrom >= 0 && probeAnim.laneIdx >= 0 && probeAnim.laneIdx !== probeAnim.spillFrom) {
            probeAnim = { ...probeAnim, stage: 'spill', t: 0 }
          } else probeAnim = null
        }
      }
    } else if (probeAnim.stage === 'spill') {
      const a = nodes.lanes[probeAnim.spillFrom], b = nodes.lanes[probeAnim.laneIdx]
      if (!a || !b) { probeAnim = null } else {
        e = {
          from: { x: a.x + a.w + 4, y: a.y }, to: { x: b.x + b.w + 4, y: b.y },
          cx1: a.x + a.w + 36, cy1: a.y, cx2: b.x + b.w + 36, cy2: b.y,
        }
        if (probeAnim.t >= 1) { b.hot = 1.2; probeAnim = null }
      }
    }
    if (probeAnim && e) {
      const pos = bez(e, Math.min(1, probeAnim.t))
      const g = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, 14)
      g.addColorStop(0, hexA(C.hi, 0.9)); g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, 7); ctx.fill()
      ctx.fillStyle = C.hi
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 4.2, 0, 7); ctx.fill()
    }
  }
}

/* ── loop / lifecycle ── */
let raf = null, io = null, visible = true, obs = null, ro = null
const size = () => {
  const el = wrapEl.value, cvs = cvsEl.value
  if (!el || !cvs) return
  DPR = Math.min(2, window.devicePixelRatio || 1)
  W = el.clientWidth; H = el.clientHeight
  cvs.width = W * DPR; cvs.height = H * DPR
  const ctx = cvs.getContext('2d')
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  layout()
}
const frame = (ts) => {
  raf = null
  const cvs = cvsEl.value
  if (!cvs) return
  const dt = Math.min(48, ts - (tPrev || ts)); tPrev = ts
  ringPhase += dt * 0.02
  spawnAcc += dt
  const rate = Math.max(500, 2600 - (props.queues || []).reduce((s, q) => s + (q.open || 0), 0) * 30)
  if (spawnAcc > rate && packets.length < 14) { spawnAcc = 0; spawn() }
  draw(cvs.getContext('2d'), dt)
  if (visible && !reduced.value) raf = requestAnimationFrame(frame)
}
const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame) }

watch(() => [props.queues, props.rules], () => { layout(); if (reduced.value) staticFrame() }, { deep: true })
const staticFrame = () => { const cvs = cvsEl.value; if (cvs) draw(cvs.getContext('2d'), 16) }

/* hover + click hit-test (lanes + rules) */
const hitAt = (mx, my) => {
  for (const l of nodes.lanes) {
    if (mx >= l.x && mx <= l.x + l.w && my >= l.y - l.h / 2 && my <= l.y + l.h / 2) {
      return { kind: 'lane', id: l.id, name: l.name, open: l.open || 0, cap: l.capacity_limit, at: l.at_capacity }
    }
  }
  for (const r of nodes.rules) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y - r.h / 2 && my <= r.y + r.h / 2) {
      return { kind: 'rule', id: r.id, name: r.name, runs: r.run_count || 0 }
    }
  }
  const o = nodes.intake
  if (o && Math.hypot(mx - o.x, my - o.y) <= o.r) return { kind: 'intake', name: 'Intake' }
  return null
}
const onMove = (e) => {
  const r = cvsEl.value.getBoundingClientRect()
  const h = hitAt(e.clientX - r.left, e.clientY - r.top)
  hover.value = h ? { ...h, x: e.clientX - r.left + 12, y: e.clientY - r.top - 8 } : null
  cvsEl.value.style.cursor = h && h.kind !== 'intake' ? 'pointer' : 'default'
}
const onClick = (e) => {
  const r = cvsEl.value.getBoundingClientRect()
  const h = hitAt(e.clientX - r.left, e.clientY - r.top)
  if (h && h.kind !== 'intake') emit('pick', h)
}

onMounted(() => {
  readPalette()
  size()
  ro = new ResizeObserver(() => { size(); if (reduced.value) staticFrame() })
  ro.observe(wrapEl.value)
  io = new IntersectionObserver(([en]) => {
    visible = !!en?.isIntersecting
    if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = null }
  }, { threshold: 0.05 })
  io.observe(wrapEl.value)
  obs = new MutationObserver(() => { readPalette(); layout(); if (reduced.value) staticFrame() })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-cinematic'] })
  if (reduced.value) staticFrame(); else kick()
})
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  io?.disconnect(); obs?.disconnect(); ro?.disconnect()
})
</script>

<style scoped>
.qdg { position: absolute; inset: 0; overflow: hidden; }
.qdg-cvs { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.qdg-tip {
  position: absolute; z-index: 3; pointer-events: none;
  display: flex; flex-direction: column; gap: 2px;
  padding: 7px 10px; border-radius: 9px;
  background: rgba(8, 6, 4, 0.92); border: 1px solid var(--sd-qc-brd);
  color: var(--sd-qc-ink); font-size: 10px; letter-spacing: 0.04em;
  box-shadow: var(--sd-qc-glow); white-space: nowrap;
}
.qdg-tip b { color: var(--sd-qc-hi); font-size: 10.5px; }
</style>
