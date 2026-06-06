<template>
  <svg class="spark" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.34" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path v-if="pts.length > 1" class="spark-area" :d="areaD" :fill="`url(#${gid})`" />
    <path v-if="pts.length > 1" class="spark-line" :d="lineD" :stroke="color" fill="none"
      pathLength="1" :style="{ animationDelay: delay + 'ms' }" />
    <circle v-if="pts.length" class="spark-dot" :cx="pts[pts.length-1].x" :cy="pts[pts.length-1].y" r="2.6"
      :fill="color" :style="{ animationDelay: (delay + 700) + 'ms' }" />
  </svg>
</template>

<script>
let _sparkUid = 0
</script>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  color: { type: String, default: '#fbbf24' },
  delay: { type: Number, default: 0 },
})

const W = 100, H = 34, PAD = 3
const gid = `spk-${_sparkUid++}`

const nums = computed(() => props.values.map(v => Number(v) || 0))
const pts = computed(() => {
  const n = nums.value
  if (!n.length) return []
  const min = Math.min(...n), max = Math.max(...n)
  const span = max - min || 1
  const innerW = W - PAD * 2, innerH = H - PAD * 2
  const step = n.length > 1 ? innerW / (n.length - 1) : 0
  return n.map((v, i) => ({
    x: +(PAD + i * step).toFixed(2),
    y: +(PAD + innerH - ((v - min) / span) * innerH).toFixed(2),
  }))
})
const lineD = computed(() => pts.value.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' '))
const areaD = computed(() => {
  if (pts.value.length < 2) return ''
  const first = pts.value[0], last = pts.value[pts.value.length - 1]
  return `${lineD.value} L${last.x} ${H - PAD} L${first.x} ${H - PAD} Z`
})
</script>

<style scoped>
.spark { width: 100%; height: 34px; display: block; overflow: visible; }
.spark-line { stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; animation: pay-draw 1.1s var(--pay-ease) both; }
.spark-area { animation: pay-area-grow 1.1s var(--pay-ease) both; }
.spark-dot { animation: pay-spark-pop 0.5s var(--pay-spring) both; filter: drop-shadow(0 0 3px currentColor); }
@media (prefers-reduced-motion: reduce) {
  .spark-line, .spark-area, .spark-dot { animation: none !important; stroke-dashoffset: 0 !important; }
}
</style>
