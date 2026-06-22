<template>
  <span ref="el" class="odo" :class="{ lg: size === 'lg' }" :aria-label="prefix + display">
    <span class="odo-cur">{{ prefix }}</span>
    <span v-for="(c, i) in chars" :key="i + '-' + c.k" class="odo-ch" :class="{ digit: c.d }">
      <template v-if="c.d">
        <span class="odo-reel" :style="{ transform: `translateY(${started ? -c.n : 0}em)`, transitionDelay: (i * 0.04) + 's' }">
          <span v-for="n in 10" :key="n" class="odo-n">{{ n - 1 }}</span>
        </span>
      </template>
      <template v-else>{{ c.t }}</template>
    </span>
  </span>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  value: { type: Number, default: 0 },
  prefix: { type: String, default: '₹' },
  size: { type: String, default: 'md' },
})

const el = ref(null)
const started = ref(false)

const display = computed(() => Math.round(Number(props.value) || 0).toLocaleString('en-IN'))
// each char: digit reels roll; separators render static
const chars = computed(() => display.value.split('').map((t, idx) => {
  const isDigit = /[0-9]/.test(t)
  return { t, d: isDigit, n: isDigit ? Number(t) : 0, k: idx }
}))

onMounted(() => {
  if (prefersReduced()) { started.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { started.value = true }))
})
// re-roll from 0 when the value meaningfully changes
watch(() => props.value, () => {
  if (prefersReduced()) { started.value = true; return }
  started.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => { started.value = true }))
})
</script>

<style scoped>
.odo { display: inline-flex; align-items: baseline; font-family: var(--trv-mono); font-weight: 850; font-variant-numeric: tabular-nums; color: var(--odo-color, var(--trv-flap-text)); letter-spacing: 0.01em; line-height: 1; }
.odo-cur { font-size: 0.62em; opacity: 0.7; margin-right: 0.06em; }
.odo-ch { display: inline-block; }
.odo-ch.digit { position: relative; height: 1em; overflow: hidden; width: 1ch; }
.odo-reel { display: flex; flex-direction: column; transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
.odo-n { height: 1em; display: flex; align-items: center; justify-content: center; }
@media (prefers-reduced-motion: reduce) { .odo-reel { transition: none; } }
</style>
