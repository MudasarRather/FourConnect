<template>
  <span class="hr-mono">{{ prefix }}{{ display }}{{ suffix }}</span>
</template>

<script setup>
// Eased count-up used across the HR command dashboard. Mirrors AssetCountUp but
// renders with the HR monospace token and is reduced-motion aware.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 1.3 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  start: { type: Boolean, default: true }, // gate on in-view
})

const display = ref('0')
let raf = null

const fmt = (n) => Number(n).toLocaleString(undefined, {
  minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals,
})

function run() {
  if (raf) cancelAnimationFrame(raf)
  const target = Number(props.value) || 0
  if (prefersReduced()) { display.value = fmt(target); return }
  const dur = Math.max(120, props.duration * 1000)
  const t0 = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur)
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = fmt(target * eased)
    if (p < 1) raf = requestAnimationFrame(tick)
    else display.value = fmt(target)
  }
  raf = requestAnimationFrame(tick)
}

watch(() => [props.value, props.start], () => { if (props.start) run() })
onMounted(() => { if (props.start) run(); else display.value = fmt(0) })
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>
