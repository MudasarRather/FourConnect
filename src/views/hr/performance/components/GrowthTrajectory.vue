<template>
  <div ref="root" class="gt" :class="{ reduced }" @pointermove="onMove" @pointerleave="reset">
    <!-- ambient field -->
    <div class="gt-fx" aria-hidden="true" :style="parallax">
      <span class="gt-aura a1" /><span class="gt-aura a2" />
      <span class="gt-grid" />
      <span v-for="n in 14" :key="n" class="gt-mote" :style="moteStyle(n)" />
    </div>

    <!-- readout -->
    <div class="gt-read">
      <span class="gt-read-eye">Growth trajectory</span>
      <div class="gt-read-row">
        <b class="gt-read-val"><SetCountUp :value="currentScore || 0" :decimals="1" /><i v-if="currentScore != null">/{{ max }}</i></b>
        <span v-if="delta != null" class="gt-read-delta" :class="delta >= 0 ? 'up' : 'down'">
          <component :is="delta >= 0 ? TrendingUp : TrendingDown" :size="13" />{{ delta >= 0 ? '+' : '' }}{{ delta.toFixed(1) }}
        </span>
      </div>
      <span class="gt-read-sub">{{ subline }}</span>
    </div>

    <!-- chart -->
    <svg class="gt-svg" viewBox="0 0 1000 200" preserveAspectRatio="none" role="img" :aria-label="`Score trajectory across ${points.length} reviews`">
      <defs>
        <linearGradient id="gtArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0.34" />
          <stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- rating gridlines -->
      <g class="gt-rules">
        <line v-for="g in gridLines" :key="g.v" x1="40" :y1="g.y" x2="985" :y2="g.y" />
      </g>

      <template v-if="points.length">
        <!-- area + path -->
        <path class="gt-area" :d="areaPath" fill="url(#gtArea)" />
        <path class="gt-line" :d="linePath" pathLength="100" />
        <!-- projection hint beyond NOW -->
        <path v-if="points.length > 1" class="gt-proj" :d="projPath" pathLength="100" />

        <!-- nodes -->
        <g v-for="(p, i) in points" :key="i" class="gt-node" :class="{ now: i === points.length - 1 }" :style="{ '--c': p.color, '--d': (0.5 + i * 0.12).toFixed(2) + 's' }">
          <circle v-if="i === points.length - 1" class="gt-node-ping" :cx="p.x" :cy="p.y" r="9" />
          <circle class="gt-node-dot" :cx="p.x" :cy="p.y" :r="i === points.length - 1 ? 6 : 4.5" />
          <text class="gt-node-val" :x="p.x" :y="p.y - 14" text-anchor="middle">{{ p.score.toFixed(1) }}</text>
        </g>
      </template>
    </svg>

    <!-- x-axis cycle labels (HTML so they wrap/ellipsize cleanly) -->
    <div v-if="points.length" class="gt-axis">
      <span v-for="(p, i) in points" :key="i" class="gt-axis-lab" :class="{ now: i === points.length - 1 }" :style="{ left: (p.x / 1000 * 100) + '%' }">{{ p.label }}</span>
    </div>

    <!-- empty -->
    <div v-if="!points.length" class="gt-empty"><Sparkles :size="16" /> Your trajectory appears after your first completed review.</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-vue-next'
import { scoreTone } from '@/composables/usePerformance'

const props = defineProps({
  reviews: { type: Array, default: () => [] },
  max: { type: Number, default: 5 },
  reduced: { type: Boolean, default: false },
})
const root = ref(null)

// scored reviews, oldest → newest
const scored = computed(() => {
  const list = (props.reviews || []).filter(r => r && r.overall_score != null)
  const key = (r) => r.completed_at || r.manager_submitted_at || r.created_at || r.period_label || ''
  return [...list].sort((a, b) => String(key(a)).localeCompare(String(key(b))))
})

const PADL = 44, PADR = 28, TOP = 40, BASE = 158
const xFor = (i, n) => n <= 1 ? 520 : PADL + i * (985 - PADL) / (n - 1)
const yFor = (s) => BASE - Math.max(0, Math.min(1, s / props.max)) * (BASE - TOP)

const points = computed(() => {
  const n = scored.value.length
  return scored.value.map((r, i) => ({
    x: +xFor(i, n).toFixed(1),
    y: +yFor(r.overall_score).toFixed(1),
    score: Number(r.overall_score),
    color: scoreTone(r.overall_score, r.rating_max || props.max),
    label: shortLabel(r),
  }))
})
function shortLabel(r) {
  const l = r.period_label || r.cycle || ''
  return String(l).replace(/^FY\s*/i, '').slice(0, 10) || '—'
}

const smooth = (pts) => {
  if (!pts.length) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2
    d += ` C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`
  }
  return d
}
const linePath = computed(() => smooth(points.value))
const areaPath = computed(() => {
  const p = points.value
  if (!p.length) return ''
  return smooth(p) + ` L ${p[p.length - 1].x} ${BASE} L ${p[0].x} ${BASE} Z`
})
const projPath = computed(() => {
  const p = points.value
  if (p.length < 1) return ''
  const last = p[p.length - 1]
  return `M ${last.x} ${last.y} L 985 ${Math.max(TOP, last.y - 18)}`
})

const gridLines = computed(() => {
  const out = []
  const steps = props.max <= 5 ? props.max : 5
  for (let v = 1; v <= steps; v++) out.push({ v, y: +yFor((v / steps) * props.max).toFixed(1) })
  return out
})

const currentScore = computed(() => scored.value.length ? Number(scored.value[scored.value.length - 1].overall_score) : null)
const delta = computed(() => {
  const n = scored.value.length
  if (n < 2) return null
  return Number(scored.value[n - 1].overall_score) - Number(scored.value[n - 2].overall_score)
})
const subline = computed(() => {
  const n = scored.value.length
  if (!n) return 'No completed reviews yet'
  if (n === 1) return 'First review on record'
  return `${n} reviews · ${delta.value >= 0 ? 'trending up' : 'dip vs last cycle'}`
})

const moteStyle = (n) => {
  const x = (n * 61) % 100, y = (n * 43) % 70, dur = 8 + (n % 5), del = (n % 7) * 0.6
  return { left: x + '%', top: y + '%', '--md': dur + 's', '--mdelay': del + 's' }
}

const parallax = ref({})
function onMove(e) {
  if (props.reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  parallax.value = { transform: `translate3d(${(-dx * 16).toFixed(1)}px, ${(-dy * 10).toFixed(1)}px, 0)` }
}
const reset = () => { parallax.value = {} }
</script>

<style scoped>
.gt { position: relative; overflow: hidden; border-radius: 20px; padding: 16px 18px 30px; min-height: 220px;
  background:
    radial-gradient(80% 120% at 12% 0%, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent 60%),
    linear-gradient(180deg, var(--perf-surface), var(--perf-panel));
  border: 1px solid var(--perf-border); }

.gt-fx { position: absolute; inset: 0; pointer-events: none; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.gt-aura { position: absolute; border-radius: 50%; filter: blur(58px); }
.gt-aura.a1 { width: 280px; height: 280px; right: 6%; top: -130px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 50%, transparent), transparent 70%); opacity: 0.4; animation: gt-float 16s var(--perf-ease) infinite alternate; }
.gt-aura.a2 { width: 240px; height: 240px; left: 4%; bottom: -140px; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 50%, transparent), transparent 70%); opacity: 0.34; animation: gt-float 21s var(--perf-ease) infinite alternate-reverse; }
.gt-grid { position: absolute; inset: 0; opacity: 0.35;
  background-image: linear-gradient(90deg, var(--perf-border) 1px, transparent 1px); background-size: 64px 100%;
  mask-image: linear-gradient(90deg, transparent, #000 18%, #000 88%, transparent); }
.gt-mote { position: absolute; width: 2.5px; height: 2.5px; border-radius: 50%; background: color-mix(in srgb, var(--perf-gold) 70%, transparent);
  box-shadow: 0 0 6px color-mix(in srgb, var(--perf-gold) 80%, transparent); opacity: 0; animation: gt-mote var(--md, 9s) ease-in-out infinite; animation-delay: var(--mdelay, 0s); }

.gt-read { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1px; }
.gt-read-eye { font-size: 10px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: var(--perf-gold); }
.gt-read-row { display: flex; align-items: baseline; gap: 10px; }
.gt-read-val { font-size: 30px; font-weight: 850; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.gt-read-val i { font-size: 13px; font-weight: 600; font-style: normal; color: var(--perf-text-muted); margin-left: 1px; }
.gt-read-delta { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.gt-read-delta.up { color: var(--perf-ok); background: var(--perf-ok-soft); }
.gt-read-delta.down { color: var(--perf-conflict); background: var(--perf-conflict-soft); }
.gt-read-sub { font-size: 11px; color: var(--perf-text-muted); }

.gt-svg { position: absolute; left: 0; right: 0; bottom: 26px; top: 64px; width: 100%; height: calc(100% - 90px); z-index: 1; overflow: visible; }
.gt-rules line { stroke: var(--perf-border); stroke-width: 1; stroke-dasharray: 2 5; }

.gt-area { opacity: 0; animation: gt-fade 0.9s ease 0.5s forwards; }
.gt-line { fill: none; stroke: var(--perf-gold); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--perf-gold) 45%, transparent));
  stroke-dasharray: 100; stroke-dashoffset: 100; animation: gt-draw 1.4s var(--perf-ease) 0.2s forwards; }
.gt-proj { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 55%, transparent); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 4 5; opacity: 0; animation: gt-fade 0.8s ease 1.5s forwards; }

.gt-node-dot { fill: var(--c); stroke: var(--perf-surface-elevated); stroke-width: 2.5; opacity: 0; transform-box: fill-box; transform-origin: center;
  animation: gt-pop 0.5s var(--perf-spring) forwards; animation-delay: var(--d, 0.5s); filter: drop-shadow(0 0 5px color-mix(in srgb, var(--c) 70%, transparent)); }
.gt-node.now .gt-node-dot { stroke: color-mix(in srgb, var(--c) 60%, var(--perf-surface-elevated)); }
.gt-node-ping { fill: none; stroke: var(--c); stroke-width: 2; opacity: 0; transform-box: fill-box; transform-origin: center; animation: gt-ping 2.2s ease-out infinite 1.4s; }
.gt-node-val { font-size: 11px; font-weight: 850; fill: var(--perf-text); opacity: 0; animation: gt-fade 0.5s ease forwards; animation-delay: var(--d, 0.5s); }
.gt-node.now .gt-node-val { fill: var(--c); }

.gt-axis { position: absolute; left: 0; right: 0; bottom: 8px; height: 16px; z-index: 2; }
.gt-axis-lab { position: absolute; transform: translateX(-50%); font-size: 9.5px; font-weight: 650; color: var(--perf-text-dim); white-space: nowrap; }
.gt-axis-lab.now { color: var(--perf-gold); font-weight: 800; }

.gt-empty { position: absolute; inset: 64px 0 30px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12.5px; color: var(--perf-text-muted); z-index: 2; }
.gt-empty :deep(svg) { color: var(--perf-gold); }

@keyframes gt-float { from { transform: translate(0,0); } to { transform: translate(-22px, 16px); } }
@keyframes gt-mote { 0% { transform: translateY(8px); opacity: 0; } 30% { opacity: 0.8; } 70% { opacity: 0.7; } 100% { transform: translateY(-26px); opacity: 0; } }
@keyframes gt-draw { to { stroke-dashoffset: 0; } }
@keyframes gt-fade { to { opacity: 1; } }
@keyframes gt-pop { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
@keyframes gt-ping { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(2.4); } }

.gt.reduced .gt-aura, .gt.reduced .gt-mote, .gt.reduced .gt-node-ping { animation: none; }
.gt.reduced .gt-line, .gt.reduced .gt-area, .gt.reduced .gt-proj, .gt.reduced .gt-node-dot, .gt.reduced .gt-node-val { animation: none; opacity: 1; stroke-dashoffset: 0; transform: none; }
.gt.reduced .gt-node-dot { transform: scale(1); }
.gt.reduced .gt-mote { display: none; }
.gt.reduced .gt-fx { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .gt-aura, .gt-mote, .gt-node-ping { animation: none; }
  .gt-line, .gt-area, .gt-proj, .gt-node-dot, .gt-node-val { animation: none; opacity: 1; stroke-dashoffset: 0; }
  .gt-mote { display: none; }
}
</style>
