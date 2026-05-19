<template>
  <span class="rec-ticker">{{ display }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 800 },
})

const display = ref('0')

const animate = (from, to) => {
  const start = performance.now()
  const dur = Math.max(200, props.duration)
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - t, 3)
    const v = Math.round(from + (to - from) * eased)
    display.value = v.toLocaleString()
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => animate(0, props.value || 0))
watch(() => props.value, (v, prev) => animate(prev || 0, v || 0))
</script>

<style scoped>
.rec-ticker {
  font-variant-numeric: tabular-nums;
  display: inline-block;
}
</style>
