<template>
  <span ref="elRef" class="trn-mono">{{ display }}</span>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useCountUp } from '@/composables/useCountUp'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
  duration: { type: Number, default: 1.4 },
})

const elRef = ref(null)
const fmt = (n) => {
  if (!isFinite(n)) return `${props.prefix || ''}0${props.suffix || ''}`
  const num = props.decimals > 0
    ? Number(n).toLocaleString(undefined, { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
    : Math.round(n).toLocaleString()
  return `${props.prefix || ''}${num}${props.suffix || ''}`
}

const { display, play } = useCountUp(() => props.value, {
  duration: props.duration, format: fmt, startOnMount: false,
})

// Resolve .$el guard handled inside useInView; play once visible.
const { visible } = useInView(elRef, { threshold: 0.25 })
watch(visible, (v) => { if (v) play() }, { immediate: true })
watch(() => props.value, () => { if (visible.value) play() })
</script>
