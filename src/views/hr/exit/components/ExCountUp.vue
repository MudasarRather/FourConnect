<template>
  <span ref="el" class="ex-countup">{{ display }}</span>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 1300 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  format: { type: Function, default: null },
})

const el = ref(null)
const display = ref('')
const { visible } = useInView(el, { threshold: 0.25 })

const render = (v) => {
  if (props.format) return props.format(v)
  const n = Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals,
  })
  return `${props.prefix || ''}${n}${props.suffix || ''}`
}

let raf = null
const run = () => {
  if (prefersReduced()) { display.value = render(props.value); return }
  const start = performance.now()
  const from = 0, to = Number(props.value || 0)
  const tick = (now) => {
    const k = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - k, 3)
    display.value = render(from + (to - from) * eased)
    if (k < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => { display.value = render(0) })
watch(visible, (v) => { if (v) run() }, { immediate: false })
watch(() => props.value, () => { if (visible.value) run(); else display.value = render(props.value) })
</script>

<style scoped>
.ex-countup { font-variant-numeric: tabular-nums; }
</style>
