<template>
  <div class="onb-ring" :style="{ '--ring-size': size + 'px', '--ring-color': color }">
    <svg :viewBox="`0 0 ${size} ${size}`" class="onb-ring-svg">
      <circle
        :cx="half" :cy="half" :r="radius"
        fill="none" stroke="rgba(255,255,255,0.07)" :stroke-width="stroke"
      />
      <circle
        :cx="half" :cy="half" :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        :transform="`rotate(-90 ${half} ${half})`"
        style="transition: stroke-dashoffset .9s cubic-bezier(0.22, 1, 0.36, 1)"
      />
    </svg>
    <div class="onb-ring-inner">
      <div class="onb-ring-value">{{ displayValue }}<span v-if="showPct">%</span></div>
      <div class="onb-ring-label">{{ label }}</div>
      <div v-if="subLabel" class="onb-ring-sub">{{ subLabel }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  total: { type: Number, default: 100 },
  label: { type: String, default: '' },
  subLabel: { type: String, default: '' },
  color: { type: String, default: '#fbbf24' },
  size: { type: Number, default: 86 },
  stroke: { type: Number, default: 6 },
  showPct: { type: Boolean, default: true },
})

const half = computed(() => props.size / 2)
const radius = computed(() => half.value - props.stroke)
const circumference = computed(() => 2 * Math.PI * radius.value)

const pct = computed(() => {
  if (!props.total) return 0
  return Math.max(0, Math.min(100, (props.value / props.total) * 100))
})
const dashOffset = computed(() => circumference.value * (1 - pct.value / 100))

const displayValue = ref(0)
const animate = (target) => {
  const start = displayValue.value
  const dur = 800
  const t0 = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const eased = 1 - Math.pow(1 - k, 3)
    displayValue.value = Math.round(start + (target - start) * eased)
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
onMounted(() => animate(Math.round(pct.value)))
watch(() => props.value, () => animate(Math.round(pct.value)))
</script>

<style scoped>
.onb-ring {
  position: relative;
  width: var(--ring-size);
  height: var(--ring-size);
  display: inline-flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 4px 14px color-mix(in srgb, var(--ring-color) 18%, transparent));
}
.onb-ring-svg {
  width: 100%; height: 100%;
}
.onb-ring-inner {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  pointer-events: none;
}
.onb-ring-value {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
}
.onb-ring-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--hr-text-muted);
  margin-top: 2px;
}
.onb-ring-sub {
  font-size: 9px; color: var(--hr-text-dim);
}
</style>
