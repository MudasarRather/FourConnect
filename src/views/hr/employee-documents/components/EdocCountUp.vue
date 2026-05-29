<template><span>{{ shown }}</span></template>

<script setup>
import { ref, watch, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  comma: { type: Boolean, default: false },
  decimals: { type: Number, default: 0 },
})

const cur = ref(0)
let raf = null

const run = (to) => {
  cancelAnimationFrame(raf)
  const from = cur.value
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / props.duration)
    const e = 1 - Math.pow(1 - t, 3)
    cur.value = from + (to - from) * e
    if (t < 1) raf = requestAnimationFrame(step)
    else cur.value = to
  }
  raf = requestAnimationFrame(step)
}
watch(() => props.value, (v) => run(Number(v) || 0), { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(raf))

const shown = computed(() => {
  const n = props.decimals ? cur.value.toFixed(props.decimals) : Math.round(cur.value)
  return props.comma ? Number(n).toLocaleString('en-IN') : n
})
</script>
