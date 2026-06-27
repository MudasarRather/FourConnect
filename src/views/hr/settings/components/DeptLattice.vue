<template>
  <div ref="wrap" class="lat" :class="{ light: false }" @mousemove="onMove" @mouseleave="onLeave">
    <span class="lat-grid" aria-hidden="true" />
    <span class="lat-vignette" aria-hidden="true" />

    <svg class="lat-svg" viewBox="0 0 480 360" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Organization department lattice">
      <defs>
        <radialGradient id="lat-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--set-gold-bright)" stop-opacity="0.95" />
          <stop offset="60%" stop-color="var(--set-amber)" stop-opacity="0.5" />
          <stop offset="100%" stop-color="var(--set-amber)" stop-opacity="0" />
        </radialGradient>
        <filter id="lat-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g class="lat-parallax" :style="parallaxStyle">
        <!-- edges -->
        <g class="lat-edges">
          <g v-for="(e, i) in layout.edges" :key="'e' + i" class="lat-edge"
            :class="{ child: e.child, hot: isHot(e) }" :style="{ '--i': i }">
            <path class="lat-edge-base" :d="e.d" />
            <path class="lat-edge-flow" :d="e.d" :style="{ animationDelay: (i * 0.18) + 's' }" />
          </g>
        </g>

        <!-- nodes -->
        <g v-for="(n, i) in layout.nodes" :key="n.id" class="lat-node"
          :class="[n.kind, { dim: hovered && !isNear(n), focus: hovered === n.id }]"
          :style="{ '--i': i }" @mouseenter="hovered = n.id" @click="onNodeClick(n)">
          <template v-if="n.kind === 'core'">
            <circle :cx="n.x" :cy="n.y" r="34" fill="url(#lat-core)" class="lat-core-halo" />
            <circle :cx="n.x" :cy="n.y" r="15" class="lat-core-ring" />
            <circle :cx="n.x" :cy="n.y" r="8" class="lat-core-dot" />
            <text :x="n.x" :y="n.y + 30" class="lat-core-label">{{ topCount }} ROOTS</text>
          </template>
          <template v-else>
            <circle :cx="n.x" :cy="n.y" :r="n.r + 6" class="lat-node-aura" filter="url(#lat-glow)" />
            <circle :cx="n.x" :cy="n.y" :r="n.r" class="lat-node-disc" />
            <circle v-if="n.hasHead" :cx="n.x + n.r * 0.72" :cy="n.y - n.r * 0.72" r="3" class="lat-node-head" />
            <text :x="n.x" :y="n.y + 1" class="lat-node-code">{{ shortCode(n.dept) }}</text>
          </template>
        </g>
      </g>
    </svg>

    <!-- tooltip -->
    <transition name="lat-tip">
      <div v-if="hoveredNode && hoveredNode.dept" class="lat-tip"
        :style="{ left: (hoveredNode.x / 480 * 100) + '%', top: (hoveredNode.y / 360 * 100) + '%' }">
        <b>{{ hoveredNode.dept.name }}</b>
        <span class="lat-tip-code set-mono">{{ hoveredNode.dept.code }}</span>
        <div class="lat-tip-stats">
          <span><Users :size="10" /> {{ hoveredNode.hc }} people</span>
          <span v-if="hoveredNode.kids"><GitBranch :size="10" /> {{ hoveredNode.kids }} sub</span>
          <span v-if="hoveredNode.hasHead" class="ok"><Crown :size="10" /> head</span>
        </div>
      </div>
    </transition>

    <div class="lat-legend">
      <span><i class="d top" /> Department</span>
      <span><i class="d child" /> Sub-dept</span>
      <span><i class="d flow" /> Reports into</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Users, GitBranch, Crown } from 'lucide-vue-next'

const props = defineProps({
  departments: { type: Array, default: () => [] },
  headcountById: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['select'])

const wrap = ref(null)
const hovered = ref(null)
const px = ref(0)
const py = ref(0)

const topCount = computed(() => props.departments.filter(d => !d.parent_department_id).length)

const childrenOf = (id) => props.departments.filter(d => String(d.parent_department_id) === String(id))
const hc = (id) => Number(props.headcountById[id] || 0)
const maxHc = computed(() => Math.max(1, ...props.departments.map(d => hc(d.id))))
const nodeR = (id, base) => {
  const ratio = hc(id) / maxHc.value
  return base + Math.round(Math.sqrt(ratio) * (base * 0.55))
}

const CX = 240, CY = 178, R = 128, R2 = 52
const layout = computed(() => {
  const tops = props.departments.filter(d => !d.parent_department_id).slice(0, 9)
  const nodes = [{ id: 'core', x: CX, y: CY, kind: 'core' }]
  const edges = []
  const T = Math.max(tops.length, 1)
  tops.forEach((t, i) => {
    const ang = -Math.PI / 2 + (i / T) * Math.PI * 2
    const x = CX + Math.cos(ang) * R
    const y = CY + Math.sin(ang) * R * 0.74
    const r = nodeR(t.id, 13)
    const kids = childrenOf(t.id)
    nodes.push({ id: t.id, x, y, kind: 'top', dept: t, hc: hc(t.id), kids: kids.length, r, ang,
      hasHead: !!t.head_employee_id, parent: 'core' })
    edges.push({ d: curve(CX, CY, x, y), from: 'core', to: t.id })
    const shown = kids.slice(0, 4)
    const K = shown.length
    shown.forEach((k, j) => {
      const a2 = ang + (K > 1 ? (j / (K - 1) - 0.5) * 0.9 : 0)
      const x2 = x + Math.cos(a2) * R2
      const y2 = y + Math.sin(a2) * R2 * 0.92
      const r2 = nodeR(k.id, 8)
      nodes.push({ id: k.id, x: x2, y: y2, kind: 'child', dept: k, hc: hc(k.id),
        kids: 0, r: r2, hasHead: !!k.head_employee_id, parent: t.id })
      edges.push({ d: curve(x, y, x2, y2), from: t.id, to: k.id, child: true })
    })
  })
  return { nodes, edges }
})

function curve(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const cx = mx - dy * 0.16, cy = my + dx * 0.16
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

const hoveredNode = computed(() => layout.value.nodes.find(n => n.id === hovered.value) || null)
const isNear = (n) => {
  if (!hovered.value) return true
  if (n.id === hovered.value) return true
  const h = layout.value.nodes.find(x => x.id === hovered.value)
  if (!h) return true
  return n.id === h.parent || n.parent === h.id || (h.parent && n.parent === h.parent)
}
const isHot = (e) => hovered.value && (e.from === hovered.value || e.to === hovered.value)

const shortCode = (d) => String(d.code || d.name || '?').slice(0, 3).toUpperCase()

const parallaxStyle = computed(() => ({ transform: `translate(${px.value * 9}px, ${py.value * 7}px)` }))
const onMove = (e) => {
  const r = wrap.value?.getBoundingClientRect(); if (!r) return
  px.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  py.value = ((e.clientY - r.top) / r.height - 0.5) * 2
}
const onLeave = () => { px.value = 0; py.value = 0; hovered.value = null }
const onNodeClick = (n) => { if (n.dept) emit('select', n.dept) }
</script>

<style scoped>
.lat { position: relative; width: 100%; aspect-ratio: 480 / 360; border-radius: 18px; overflow: hidden;
  background:
    radial-gradient(120% 90% at 80% 0%, color-mix(in srgb, var(--set-gold) 12%, transparent), transparent 60%),
    var(--set-panel);
  border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.lat-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
  background-image: linear-gradient(rgba(251,191,36,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.06) 1px, transparent 1px);
  background-size: 30px 30px; mask-image: radial-gradient(80% 80% at 50% 45%, #000 30%, transparent 85%);
  -webkit-mask-image: radial-gradient(80% 80% at 50% 45%, #000 30%, transparent 85%); }
.lat-vignette { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(70% 60% at 50% 42%, transparent 50%, color-mix(in srgb, var(--set-canvas) 60%, transparent) 100%); }
.lat-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.lat-parallax { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1); }

/* edges */
.lat-edge-base { fill: none; stroke: var(--set-trace-idle); stroke-width: 1.4; }
.lat-edge.child .lat-edge-base { stroke-width: 1; }
.lat-edge-flow { fill: none; stroke: var(--set-gold); stroke-width: 1.6; stroke-linecap: round;
  stroke-dasharray: 3 30; opacity: 0.55; animation: dept-flow 2.4s linear infinite; filter: drop-shadow(0 0 3px var(--set-gold)); }
.lat-edge.child .lat-edge-flow { stroke: var(--set-orange); animation-duration: 1.9s; }
.lat-edge.hot .lat-edge-flow { opacity: 1; stroke-width: 2.2; }
@keyframes dept-flow { to { stroke-dashoffset: -33; } }

/* nodes */
.lat-node { cursor: pointer; transition: opacity 0.3s; transform-box: fill-box; }
.lat-node.dim { opacity: 0.28; }
.lat-node-disc, .lat-node-aura, .lat-core-ring, .lat-core-dot, .lat-core-halo { animation: dept-pop 0.6s cubic-bezier(0.16,1,0.3,1) both; animation-delay: calc(var(--i) * 0.05s); }
.lat-node-aura { fill: color-mix(in srgb, var(--set-gold) 22%, transparent); opacity: 0.5; }
.lat-node.child .lat-node-aura { fill: color-mix(in srgb, var(--set-orange) 22%, transparent); }
.lat-node-disc { fill: var(--set-surface-elevated); stroke: var(--set-gold); stroke-width: 1.6; transition: r 0.2s, stroke-width 0.2s; }
.lat-node.child .lat-node-disc { stroke: var(--set-orange); }
.lat-node.focus .lat-node-disc { stroke-width: 2.6; }
.lat-node.focus .lat-node-aura { opacity: 0.95; }
.lat-node-code { fill: var(--set-text); font-size: 7px; font-weight: 800; text-anchor: middle; dominant-baseline: middle; font-family: var(--set-mono); pointer-events: none; }
.lat-node.child .lat-node-code { font-size: 6px; }
.lat-node-head { fill: var(--set-ok); stroke: var(--set-panel); stroke-width: 1; }

.lat-core-halo { animation: dept-core-breathe 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.lat-core-ring { fill: none; stroke: var(--set-gold); stroke-width: 1.4; opacity: 0.7; }
.lat-core-dot { fill: var(--set-gold-bright); filter: drop-shadow(0 0 6px var(--set-gold)); }
.lat-core-label { fill: var(--set-text-muted); font-size: 7px; font-weight: 800; letter-spacing: 0.12em; text-anchor: middle; font-family: var(--set-mono); }
@keyframes dept-pop { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
@keyframes dept-core-breathe { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }

/* tooltip */
.lat-tip { position: absolute; transform: translate(-50%, calc(-100% - 12px)); z-index: 3; pointer-events: none;
  min-width: 130px; padding: 8px 10px; border-radius: 11px; background: var(--set-surface-elevated);
  border: 1px solid var(--set-border-strong); box-shadow: 0 14px 32px -16px rgba(0,0,0,0.7); }
.lat-tip b { display: block; font-size: 11.5px; font-weight: 800; color: var(--set-text); }
.lat-tip-code { font-size: 9px; color: var(--set-text-muted); }
.lat-tip-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
.lat-tip-stats span { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; color: var(--set-text-secondary); }
.lat-tip-stats span :deep(svg) { color: var(--set-gold); }
.lat-tip-stats span.ok :deep(svg) { color: var(--set-ok); }
.lat-tip-enter-active, .lat-tip-leave-active { transition: opacity 0.18s, transform 0.18s; }
.lat-tip-enter-from, .lat-tip-leave-to { opacity: 0; }

.lat-legend { position: absolute; left: 12px; bottom: 10px; display: flex; gap: 12px; flex-wrap: wrap; }
.lat-legend span { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); }
.lat-legend i.d { width: 8px; height: 8px; border-radius: 50%; }
.lat-legend i.top { background: var(--set-gold); }
.lat-legend i.child { background: var(--set-orange); }
.lat-legend i.flow { width: 14px; height: 2px; border-radius: 2px; background: var(--set-gold); }

@media (prefers-reduced-motion: reduce) {
  .lat-edge-flow, .lat-core-halo { animation: none; }
  .lat-node-disc, .lat-node-aura, .lat-core-ring, .lat-core-dot, .lat-core-halo { animation: none; }
  .lat-parallax { transition: none; }
}
</style>
