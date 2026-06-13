<template>
  <span class="shift-countup">{{ display }}</span>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

const display = ref(fmt(0))
let raf = null
let reduced = false

function fmt(n) {
  const v = Number(n || 0).toFixed(props.decimals)
  const [int, dec] = v.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${props.prefix}${grouped}${dec ? '.' + dec : ''}${props.suffix}`
}

function animate(to) {
  cancelAnimationFrame(raf)
  if (reduced) { display.value = fmt(to); return }
  const from = 0
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    display.value = fmt(from + (to - from) * eased)
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  animate(props.value)
})
watch(() => props.value, (v) => animate(v))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.shift-countup { font-variant-numeric: tabular-nums; font-family: var(--shift-mono); }
</style>
