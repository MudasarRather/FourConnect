<template>
  <Motion ref="rootRef" :as="interactive ? 'button' : 'div'" :type="interactive ? 'button' : undefined"
    class="spark" :class="{ tap: interactive }" :style="{ '--c': accent, '--i': index }"
    :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }"
    :whileHover="interactive ? { y: -4 } : {}" :whileTap="interactive ? { scale: 0.98 } : {}"
    @click="interactive && $emit('go', go)">
    <span class="spark-glow" aria-hidden="true" />
    <span class="spark-grid" aria-hidden="true" />

    <header class="spark-top">
      <span class="spark-ic"><component :is="icon" :size="16" /></span>
      <span v-if="trend != null" class="spark-trend" :class="trendDir">
        <component :is="trendDir === 'down' ? TrendingDown : TrendingUp" :size="11" />
        {{ Math.abs(trend) }}%
      </span>
    </header>

    <div class="spark-val trv-mono">
      <TrvCountUp :value="value" :format="format || undefined" />
    </div>
    <div class="spark-lab">{{ label }}<span v-if="sub" class="spark-sub"> · {{ sub }}</span></div>

    <svg v-if="hasSeries" class="spark-line" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient :id="`sparkFill-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="accentHex" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="accentHex" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <path class="sl-area" :class="{ drawn }" :d="areaPath" :fill="`url(#sparkFill-${uid})`" />
      <path class="sl-stroke" :d="linePath" :stroke="accentHex" pathLength="1"
        stroke-dasharray="1" :stroke-dashoffset="drawn ? 0 : 1" />
      <circle class="sl-head" :class="{ drawn }" :cx="endPt[0]" :cy="endPt[1]" r="2.4" :fill="accentHex" />
    </svg>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import TrvCountUp from './TrvCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: 0 },
  format: { type: Function, default: null },
  icon: { type: [Object, Function], required: true },
  accent: { type: String, default: 'var(--trv-amber)' },
  accentHex: { type: String, default: '#fbbf24' },  // literal hex for SVG gradient/stroke
  series: { type: Array, default: () => [] },
  trend: { type: Number, default: null },
  sub: { type: String, default: '' },
  index: { type: Number, default: 0 },
  interactive: { type: Boolean, default: true },
  go: { type: [String, Object], default: '' },
})
defineEmits(['go'])

const uid = Math.random().toString(36).slice(2, 7)
const rootRef = ref(null)
const drawn = ref(false)
const trendDir = computed(() => (props.trend ?? 0) < 0 ? 'down' : 'up')

const hasSeries = computed(() => props.series.length >= 2)
const W = 100, H = 34
const pts = computed(() => {
  const a = props.series.map(Number)
  const n = a.length
  if (n < 2) return []
  const min = Math.min(...a), max = Math.max(...a)
  const span = max - min || 1
  return a.map((v, i) => [
    +(i / (n - 1) * W).toFixed(2),
    +(H - 3 - ((v - min) / span) * (H - 7)).toFixed(2),
  ])
})
const linePath = computed(() => pts.value.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' '))
const areaPath = computed(() => pts.value.length ? `${linePath.value} L ${W},${H} L 0,${H} Z` : '')
const endPt = computed(() => pts.value[pts.value.length - 1] || [W, H])

onMounted(() => {
  if (prefersReduced()) { drawn.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
})
</script>

<style scoped>
.spark {
  position: relative; overflow: hidden; isolation: isolate; text-align: left;
  display: flex; flex-direction: column; gap: 5px; padding: 16px 17px 8px;
  border-radius: 18px; cursor: default; border: 1px solid var(--trv-border);
  background: linear-gradient(158deg, color-mix(in srgb, var(--c) 9%, var(--trv-surface)), var(--trv-panel));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), var(--trv-card-shadow);
  transition: border-color 0.25s, box-shadow 0.25s;
  font-family: inherit;
}
.spark.tap { cursor: pointer; }
.spark.tap:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 18px 44px -22px color-mix(in srgb, var(--c) 60%, transparent), var(--trv-card-shadow); }
.spark-glow { position: absolute; inset: -50% 30% 50% -20%; pointer-events: none; z-index: 0; opacity: 0.7;
  background: radial-gradient(60% 70% at 25% 10%, color-mix(in srgb, var(--c) 26%, transparent), transparent 72%);
  animation: spark-drift 9s ease-in-out infinite; animation-delay: calc(var(--i, 0) * -1.3s); }
.spark-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: radial-gradient(color-mix(in srgb, var(--trv-text) 7%, transparent) 1px, transparent 1px);
  background-size: 13px 13px; -webkit-mask-image: linear-gradient(180deg, #000, transparent 70%); mask-image: linear-gradient(180deg, #000, transparent 70%); }

.spark-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.spark-ic { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.spark-trend { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 999px; }
.spark-trend.up { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.spark-trend.down { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }

.spark-val { position: relative; z-index: 1; font-size: 27px; font-weight: 850; color: var(--trv-text); line-height: 1.05; margin-top: 7px; }
.spark-lab { position: relative; z-index: 1; font-size: 11.5px; color: var(--trv-text-muted); }
.spark-sub { color: var(--trv-text-dim); }

.spark-line { position: relative; z-index: 1; width: 100%; height: 34px; margin-top: 8px; display: block; overflow: visible; }
.sl-area { opacity: 0; transition: opacity 0.8s ease 0.35s; }
.sl-area.drawn { opacity: 1; }
.sl-stroke { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  transition: stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 55%, transparent)); }
.sl-head { opacity: 0; transition: opacity 0.3s ease 1.15s; }
.sl-head.drawn { opacity: 1; }

@keyframes spark-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(6%, -4%); } }
@media (prefers-reduced-motion: reduce) {
  .spark-glow { animation: none; }
  .sl-area, .sl-stroke, .sl-head { transition: none; }
}
</style>
