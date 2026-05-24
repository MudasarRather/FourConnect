<template>
  <span class="onb-anim-num">{{ display }}<span v-if="suffix" class="suf">{{ suffix }}</span></span>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  suffix: { type: String, default: '' },
  format: { type: Function, default: (n) => Math.round(n).toLocaleString() },
})

const display = ref(props.format(0))
let rafId = null

const animate = (from, to) => {
  if (rafId) cancelAnimationFrame(rafId)
  const start = performance.now()
  const step = (t) => {
    const k = Math.min(1, (t - start) / props.duration)
    const eased = 1 - Math.pow(1 - k, 3)
    const v = from + (to - from) * eased
    display.value = props.format(v)
    if (k < 1) rafId = requestAnimationFrame(step)
  }
  rafId = requestAnimationFrame(step)
}

onMounted(() => animate(0, props.value))
watch(() => props.value, (v, old) => animate(old || 0, v))
onBeforeUnmount(() => { if (rafId) cancelAnimationFrame(rafId) })
</script>

<style scoped>
.onb-anim-num { font-variant-numeric: tabular-nums; }
.suf { font-size: 0.65em; opacity: 0.7; margin-left: 1px; }
</style>
