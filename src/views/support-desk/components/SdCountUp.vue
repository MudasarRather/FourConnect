<template>
  <span class="sd-cup sd-mono" :class="{ tnum: true }">{{ display }}<i v-if="suffix" class="sd-cup-suf">{{ suffix }}</i></span>
</template>

<script setup>
/*
  SdCountUp — a lightweight count-up odometer for the ticket dashboards.
  Animates from the previous value to the target with an ease-out curve.
  Honours OS Reduce Motion (snaps to the value) unless Cinematic mode is on.
*/
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },   // ms
  decimals: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
})

const display = ref('0')
let raf = 0
let from = 0

const reduced = () => {
  try {
    const cine = document.documentElement.getAttribute('data-cinematic') === 'on'
    return !cine && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { return false }
}

const fmt = (n) => {
  const v = props.decimals ? Number(n).toFixed(props.decimals) : Math.round(n)
  return Number(v).toLocaleString()
}

const run = (target) => {
  if (raf) cancelAnimationFrame(raf)
  const safeTarget = Number.isFinite(target) ? target : 0
  if (reduced()) { display.value = fmt(safeTarget); from = safeTarget; return }
  const start = performance.now()
  const begin = from
  const delta = safeTarget - begin
  const step = (t) => {
    const p = Math.min(1, (t - start) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3)          // easeOutCubic
    display.value = fmt(begin + delta * eased)
    if (p < 1) raf = requestAnimationFrame(step)
    else { from = safeTarget; raf = 0 }
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => run(props.value))
watch(() => props.value, (v) => run(v))
onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
</script>

<style scoped>
.sd-cup { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.sd-cup-suf { font-style: normal; font-size: 0.62em; opacity: 0.75; margin-left: 1px; }
</style>
