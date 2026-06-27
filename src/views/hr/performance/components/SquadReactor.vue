<template>
  <div ref="root" class="rx" :class="{ reduced }" @pointermove="onMove" @pointerleave="reset">
    <!-- ambient field -->
    <div class="rx-field" aria-hidden="true" :style="parallax">
      <span class="rx-glow" />
      <span class="rx-ring r1" /><span class="rx-ring r2" /><span class="rx-ring r3" />
    </div>

    <!-- sweeping radar beam -->
    <span class="rx-sweep" aria-hidden="true" />

    <!-- the instrument -->
    <svg class="rx-svg" viewBox="0 0 200 200" role="img" :aria-label="`Squad readiness ${readinessPct}%`">
      <defs>
        <radialGradient id="rxCore" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stop-color="var(--perf-gold-bright)" stop-opacity="0.9" />
          <stop offset="55%" stop-color="var(--perf-orange)" stop-opacity="0.5" />
          <stop offset="100%" stop-color="var(--perf-ember)" stop-opacity="0.08" />
        </radialGradient>
      </defs>

      <!-- polar grid -->
      <g class="rx-grid">
        <circle cx="100" cy="100" r="78" /><circle cx="100" cy="100" r="56" /><circle cx="100" cy="100" r="34" />
      </g>

      <!-- gauge track + readiness arc -->
      <circle class="rx-track" cx="100" cy="100" r="82" />
      <circle class="rx-arc" cx="100" cy="100" r="82" :stroke-dasharray="CIRC" :stroke-dashoffset="arcOffset" />

      <!-- per-report spokes -->
      <g class="rx-spokes">
        <g v-for="s in spokes" :key="s.id" :class="{ pending: s.pending, awaiting: !s.has }">
          <line class="rx-spoke" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" :style="{ '--c': s.color }" />
          <circle class="rx-node" :cx="s.x2" :cy="s.y2" :r="s.has ? 4 : 3" :style="{ '--c': s.color }" />
        </g>
      </g>

      <!-- core -->
      <circle class="rx-corefill" cx="100" cy="100" r="34" fill="url(#rxCore)" />
      <circle class="rx-corering" cx="100" cy="100" r="34" />
    </svg>

    <!-- center readout -->
    <div class="rx-readout">
      <span class="rx-eye">Squad readiness</span>
      <b class="rx-val"><SetCountUp :value="displayAvg" :decimals="1" /></b>
      <span class="rx-pct">{{ readinessPct }}% ready · {{ reviewedCount }}/{{ spokes.length }} scored</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { scoreTone } from '@/composables/usePerformance'
import SetCountUp from '../../settings/components/SetCountUp.vue'

const props = defineProps({
  members: { type: Array, default: () => [] },
  avg: { type: [Number, String], default: null },
  reduced: { type: Boolean, default: false },
})
const root = ref(null)
const CIRC = 2 * Math.PI * 82            // gauge circumference ≈ 515

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

// per-report radial spokes (evenly distributed, length = score fraction)
const spokes = computed(() => {
  const list = props.members || []
  const n = Math.max(list.length, 1)
  return list.map((m, i) => {
    const rev = m.review
    const max = rev?.rating_max || 5
    const score = rev?.overall_score
    const has = !!rev && score != null
    const frac = has ? Math.max(0, Math.min(1, score / max)) : 0
    const hike = rev?.hike_status || 'NONE'
    const pending = !!rev && (['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(rev.status)
      || (['COMPLETED', 'ACKNOWLEDGED'].includes(rev.status) && hike === 'NONE'))
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2
    const ri = 34
    const ro = 34 + (has ? frac : 0.16) * 42
    return {
      id: m.employee_id || i,
      initials: initials(m.employee_name),
      has, pending,
      color: has ? scoreTone(score, max) : 'var(--perf-unset)',
      x1: +(100 + ri * Math.cos(ang)).toFixed(2),
      y1: +(100 + ri * Math.sin(ang)).toFixed(2),
      x2: +(100 + ro * Math.cos(ang)).toFixed(2),
      y2: +(100 + ro * Math.sin(ang)).toFixed(2),
    }
  })
})
const reviewed = computed(() => (props.members || []).filter(m => m.review && m.review.overall_score != null))
const reviewedCount = computed(() => reviewed.value.length)
const readiness = computed(() => {
  if (!reviewed.value.length) return 0
  const sum = reviewed.value.reduce((a, m) => a + (m.review.overall_score / (m.review.rating_max || 5)), 0)
  return sum / reviewed.value.length
})
const readinessPct = computed(() => Math.round(readiness.value * 100))
const arcOffset = computed(() => CIRC * (1 - readiness.value))
const displayAvg = computed(() => Number(props.avg || 0))

// subtle pointer-parallax on the ambient field
const parallax = ref({})
function onMove(e) {
  if (props.reduced || !root.value) return
  const r = root.value.getBoundingClientRect()
  const dx = (e.clientX - r.left) / r.width - 0.5
  const dy = (e.clientY - r.top) / r.height - 0.5
  parallax.value = { transform: `translate3d(${(dx * 14).toFixed(1)}px, ${(dy * 14).toFixed(1)}px, 0)` }
}
const reset = () => { parallax.value = {} }
</script>

<style scoped>
.rx { position: relative; width: clamp(196px, 23vw, 244px); aspect-ratio: 1; margin: 0 auto; display: grid; place-items: center; }

/* ambient field */
.rx-field { position: absolute; inset: 0; transition: transform 0.4s var(--perf-ease); will-change: transform; }
.rx-glow { position: absolute; inset: 20%; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 40%, transparent), transparent 68%); filter: blur(22px);
  animation: rx-breathe 5s ease-in-out infinite; }
.rx-ring { position: absolute; inset: 0; margin: auto; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--perf-gold) 22%, transparent); }
.rx-ring.r1 { width: 90%; height: 90%; animation: rx-spin 26s linear infinite; }
.rx-ring.r2 { width: 68%; height: 68%; border-style: dashed; animation: rx-spin 18s linear infinite reverse; }
.rx-ring.r3 { width: 46%; height: 46%; border-color: color-mix(in srgb, var(--perf-gold) 30%, transparent); animation: rx-spin 12s linear infinite; }
.rx-ring.r1::before, .rx-ring.r3::before { content: ''; position: absolute; top: -3px; left: 50%; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: var(--perf-gold); box-shadow: 0 0 10px var(--perf-gold); }

/* radar sweep */
.rx-sweep { position: absolute; inset: 4%; border-radius: 50%; pointer-events: none; mix-blend-mode: screen;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--perf-gold) 38%, transparent) 26deg, transparent 60deg);
  animation: rx-spin 4.4s linear infinite; mask-image: radial-gradient(circle, #000 64%, transparent 92%); -webkit-mask-image: radial-gradient(circle, #000 64%, transparent 92%); }

/* svg instrument */
.rx-svg { position: relative; width: 100%; height: 100%; overflow: visible; }
.rx-grid circle { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 12%, transparent); stroke-width: 1; }
.rx-track { fill: none; stroke: var(--perf-track); stroke-width: 5; }
.rx-arc { fill: none; stroke: var(--perf-gold); stroke-width: 5; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 100px 100px;
  transition: stroke-dashoffset 1.1s var(--perf-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--perf-gold) 55%, transparent)); }

.rx-spoke { stroke: var(--c); stroke-width: 3; stroke-linecap: round; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 60%, transparent));
  opacity: 0; transform-origin: 100px 100px; animation: rx-grow 0.8s var(--perf-spring) forwards; }
.rx-spokes g:nth-child(1) .rx-spoke { animation-delay: 0.05s } .rx-spokes g:nth-child(2) .rx-spoke { animation-delay: 0.11s }
.rx-spokes g:nth-child(3) .rx-spoke { animation-delay: 0.17s } .rx-spokes g:nth-child(4) .rx-spoke { animation-delay: 0.23s }
.rx-spokes g:nth-child(5) .rx-spoke { animation-delay: 0.29s } .rx-spokes g:nth-child(n+6) .rx-spoke { animation-delay: 0.35s }
.rx-node { fill: var(--c); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 75%, transparent)); }
.rx-spokes g.awaiting .rx-spoke { stroke-dasharray: 2 3; opacity: 0.6; }
.rx-spokes g.pending .rx-node { animation: rx-pulse 1.8s ease-in-out infinite; }

.rx-corefill { opacity: 0.9; animation: rx-breathe 5s ease-in-out infinite; }
.rx-corering { fill: none; stroke: color-mix(in srgb, var(--perf-gold) 50%, transparent); stroke-width: 1.5; }

/* center readout */
.rx-readout { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; pointer-events: none; }
.rx-eye { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-gold); }
.rx-val { font-size: 32px; font-weight: 850; line-height: 1; color: var(--perf-text); font-variant-numeric: tabular-nums; text-shadow: 0 0 22px color-mix(in srgb, var(--perf-gold) 45%, transparent); }
.rx-pct { font-size: 8.5px; font-weight: 650; color: var(--perf-text-muted); }

@keyframes rx-spin { to { transform: rotate(360deg); } }
@keyframes rx-breathe { 0%, 100% { opacity: 0.7; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes rx-grow { to { opacity: 1; } }
@keyframes rx-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.rx.reduced .rx-glow, .rx.reduced .rx-ring, .rx.reduced .rx-sweep, .rx.reduced .rx-corefill, .rx.reduced .rx-node { animation: none; }
.rx.reduced .rx-spoke { animation: none; opacity: 1; }
.rx.reduced .rx-sweep { display: none; }
.rx.reduced .rx-field { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .rx-glow, .rx-ring, .rx-sweep, .rx-corefill, .rx-node { animation: none; }
  .rx-spoke { animation: none; opacity: 1; }
  .rx-sweep { display: none; }
}
</style>
