<template>
  <span class="rmb-mono">{{ display }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

const display = ref(format(0))
let raf = null

function format(n) {
  const v = Number(n)
  return (props.prefix || '') + (Number.isFinite(v) ? v : 0).toLocaleString('en-IN', {
    minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals,
  }) + (props.suffix || '')
}

function animate(to) {
  const target = Number(to) || 0
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) { display.value = format(target); return }
  const from = 0
  const start = performance.now()
  const dur = props.duration || 900
  cancelAnimationFrame(raf)
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - t, 3)
    display.value = format(from + (target - from) * eased)
    if (t < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => animate(props.value))
watch(() => props.value, (v) => animate(v))
</script>
