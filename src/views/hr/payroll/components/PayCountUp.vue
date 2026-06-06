<template><span>{{ display }}</span></template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 800 },
  decimals: { type: Number, default: 0 },
})

const shown = ref(0)
const display = computed(() => shown.value.toFixed(props.decimals))
let raf = null
const run = (to) => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) { shown.value = to; return }
  cancelAnimationFrame(raf)
  const from = shown.value, start = performance.now()
  const tick = (t) => {
    const p = Math.min(1, (t - start) / props.duration)
    shown.value = from + (to - from) * (1 - Math.pow(1 - p, 3))
    if (p < 1) raf = requestAnimationFrame(tick); else shown.value = to
  }
  raf = requestAnimationFrame(tick)
}
onMounted(() => run(props.value))
watch(() => props.value, (v) => run(v))
</script>
