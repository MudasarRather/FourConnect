<template>
  <!-- ═══════════ THE SCORE RIDGE ═══════════
       Calibration distribution — how the workforce's review scores fall across
       the rating bands, drawn as a smooth ridgeline with an average marker.
       The signature instrument of the Performance arena. -->
  <div ref="rootEl" class="rg" :class="{ drawn }">
    <div class="rg-head">
      <span class="rg-eyebrow"><Gauge :size="12" /> Score calibration</span>
      <span v-if="avg != null" class="rg-avg-tag">avg <b>{{ avg.toFixed(1) }}</b>/{{ max }}</span>
    </div>

    <div class="rg-stage">
      <svg class="rg-svg" viewBox="0 0 500 210" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="rgFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0.42" />
            <stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- grid baselines -->
        <line v-for="g in 4" :key="g" class="rg-grid" x1="0" :y1="g * 42" x2="500" :y2="g * 42" />

        <!-- pillars -->
        <rect v-for="(p, i) in points" :key="'b' + i" class="rg-pillar"
          :x="p.x - 26" :y="p.y" width="52" :height="Math.max(0, 180 - p.y)" rx="6" :style="{ '--bi': i }" />

        <!-- area + ridge -->
        <path class="rg-area" :d="areaPath" fill="url(#rgFill)" />
        <path class="rg-line" :d="linePath" pathLength="1" />

        <!-- average marker -->
        <line v-if="avg != null" class="rg-avg" :x1="avgX" y1="6" :x2="avgX" y2="180" />
      </svg>

      <!-- peak counts -->
      <div class="rg-peaks">
        <div v-for="(p, i) in points" :key="'p' + i" class="rg-peak" :style="{ left: (p.x / 500 * 100) + '%', top: (p.y / 210 * 100) + '%' }">
          <b>{{ counts[i] }}</b>
        </div>
      </div>

      <div v-if="!total" class="rg-empty">No scored reviews yet — completed reviews plot here.</div>
    </div>

    <div class="rg-axis">
      <span v-for="b in max" :key="b" class="rg-tick" :style="{ '--c': bandTone(b) }">
        <i />{{ b }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Gauge } from 'lucide-vue-next'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'
import { scoreTone } from '@/composables/usePerformance'

const props = defineProps({
  bands: { type: Array, default: () => [] },   // [{ band, count }]
  avg: { type: Number, default: null },
  max: { type: Number, default: 5 },
})

const rootEl = ref(null)
const { visible } = useInView(rootEl, { threshold: 0.2 })
const drawn = ref(false)
onMounted(() => {
  if (prefersReduced()) { drawn.value = true; return }
  const t = setInterval(() => { if (visible.value) { drawn.value = true; clearInterval(t) } }, 100)
  setTimeout(() => clearInterval(t), 4000)
})

const counts = computed(() => {
  const m = {}
  for (const b of props.bands) m[b.band] = b.count
  return Array.from({ length: props.max }, (_, i) => m[i + 1] || 0)
})
const total = computed(() => counts.value.reduce((a, b) => a + b, 0))
const maxCount = computed(() => Math.max(1, ...counts.value))

const points = computed(() => {
  const n = props.max
  const x0 = 40, x1 = 460, base = 180, top = 18
  return counts.value.map((c, i) => {
    const x = n === 1 ? 250 : x0 + (i / (n - 1)) * (x1 - x0)
    const y = base - (c / maxCount.value) * (base - top)
    return { x: Math.round(x), y: Math.round(y) }
  })
})
const linePath = computed(() => {
  const p = points.value
  if (!p.length) return ''
  let d = `M ${p[0].x} ${p[0].y}`
  for (let i = 1; i < p.length; i++) {
    const dx = (p[i].x - p[i - 1].x) * 0.42
    d += ` C ${p[i - 1].x + dx} ${p[i - 1].y}, ${p[i].x - dx} ${p[i].y}, ${p[i].x} ${p[i].y}`
  }
  return d
})
const areaPath = computed(() => {
  const p = points.value
  if (!p.length) return ''
  return `${linePath.value} L ${p[p.length - 1].x} 180 L ${p[0].x} 180 Z`
})
const avgX = computed(() => {
  if (props.avg == null) return 0
  const frac = props.max === 1 ? 0.5 : Math.max(0, Math.min(1, (props.avg - 1) / (props.max - 1)))
  return Math.round(40 + frac * 420)
})
const bandTone = (b) => scoreTone(b, props.max)
</script>

<style scoped>
.rg { display: flex; flex-direction: column; gap: 10px; padding: 16px 17px; border-radius: 18px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow); }
.rg-head { display: flex; align-items: center; justify-content: space-between; }
.rg-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-muted); }
.rg-eyebrow :deep(svg) { color: var(--perf-gold); }
.rg-avg-tag { font-size: 11px; font-weight: 700; color: var(--perf-text-secondary); }
.rg-avg-tag b { color: var(--perf-gold); font-size: 13px; }

.rg-stage { position: relative; width: 100%; aspect-ratio: 500 / 210; }
.rg-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.rg-grid { stroke: var(--perf-track); stroke-width: 1; }
.rg-pillar { fill: color-mix(in srgb, var(--perf-gold) 8%, transparent); transform-box: fill-box; transform-origin: bottom; transform: scaleY(0);
  transition: transform 0.6s var(--perf-spring); transition-delay: calc(var(--bi) * 0.07s); }
.rg.drawn .rg-pillar { transform: scaleY(1); }
.rg-area { opacity: 0; transition: opacity 0.8s ease 0.3s; }
.rg.drawn .rg-area { opacity: 1; }
.rg-line { fill: none; stroke: var(--perf-gold); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--perf-gold) 45%, transparent));
  stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.1s var(--perf-spring) 0.2s;
  vector-effect: non-scaling-stroke; }
.rg.drawn .rg-line { stroke-dashoffset: 0; }
.rg-avg { stroke: var(--perf-ok); stroke-width: 1.6; stroke-dasharray: 3 3; opacity: 0; transition: opacity 0.5s ease 1s; vector-effect: non-scaling-stroke; }
.rg.drawn .rg-avg { opacity: 0.85; }

.rg-peaks { position: absolute; inset: 0; pointer-events: none; }
.rg-peak { position: absolute; transform: translate(-50%, -150%); opacity: 0; transition: opacity 0.4s ease; transition-delay: 0.8s; }
.rg.drawn .rg-peak { opacity: 1; }
.rg-peak b { font-size: 11px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }

.rg-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }

.rg-axis { display: flex; justify-content: space-between; padding: 0 18px; }
.rg-tick { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--perf-text-muted); }
.rg-tick i { width: 8px; height: 8px; border-radius: 2px; background: var(--c); }

@media (prefers-reduced-motion: reduce) {
  .rg-pillar, .rg-area, .rg-line, .rg-avg, .rg-peak { transition: none; }
}
</style>
