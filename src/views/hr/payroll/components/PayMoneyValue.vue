<template>
  <span class="pay-money" :class="toneClass">
    <span v-if="sign && num > 0" class="sgn">+</span>{{ display }}
  </span>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { inr, inrShort } from '@/composables/usePayroll'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  short: { type: Boolean, default: false },
  sign: { type: Boolean, default: false },
  tone: { type: String, default: '' },       // 'net' | 'deduction' | 'statutory' | ''
  animate: { type: Boolean, default: true },
  duration: { type: Number, default: 700 },
})

const num = computed(() => Number(props.value || 0))
const shown = ref(0)
const display = computed(() => props.short ? inrShort(shown.value) : inr(shown.value))
const toneClass = computed(() => props.tone ? `tone-${props.tone}` : '')

let raf = null
function run(to) {
  if (!props.animate) { shown.value = to; return }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) { shown.value = to; return }
  cancelAnimationFrame(raf)
  const from = shown.value
  const start = performance.now()
  const tick = (t) => {
    const p = Math.min(1, (t - start) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3)
    shown.value = from + (to - from) * eased
    if (p < 1) raf = requestAnimationFrame(tick)
    else shown.value = to
  }
  raf = requestAnimationFrame(tick)
}
onMounted(() => run(num.value))
watch(num, (v) => run(v))
</script>

<style scoped>
.pay-money { font-family: var(--pay-mono); font-variant-numeric: tabular-nums; font-weight: 700; }
.tone-net { color: var(--pay-net); }
.tone-deduction { color: var(--pay-deduction); }
.tone-statutory { color: var(--pay-statutory); }
.sgn { opacity: 0.7; margin-right: 1px; }
</style>
