<template><span class="leave-mono">{{ display }}</span></template>

<script setup>
/**
 * Tiny rAF-driven number count-up used across the Reports Studio cards and the
 * preview modal KPIs. Re-animates whenever `value` changes; honours
 * prefers-reduced-motion by snapping straight to the target.
 */
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  compact: { type: Boolean, default: false }, // 12,300 -> 12.3k
})

const display = ref(fmt(0))
let raf = null
let startTs = 0
let fromVal = 0

const reduced = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function fmt(n) {
  let body
  if (props.compact && Math.abs(n) >= 10000) {
    body = `${(Math.round(n / 100) / 10).toLocaleString('en-IN', { maximumFractionDigits: 1 })}k`
  } else {
    body = Number(n).toLocaleString('en-IN', {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals,
    })
  }
  return `${props.prefix}${body}${props.suffix}`
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3)

function animate(to) {
  cancelAnimationFrame(raf)
  if (reduced || props.duration <= 0) { display.value = fmt(to); return }
  fromVal = parseFloat(String(display.value).replace(/[^0-9.-]/g, '')) || 0
  startTs = 0
  const step = (ts) => {
    if (!startTs) startTs = ts
    const p = Math.min(1, (ts - startTs) / props.duration)
    const cur = fromVal + (to - fromVal) * easeOut(p)
    display.value = fmt(cur)
    if (p < 1) raf = requestAnimationFrame(step)
    else display.value = fmt(to)
  }
  raf = requestAnimationFrame(step)
}

watch(() => props.value, (v) => animate(Number(v) || 0), { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
