<template>
  <span class="fb-stars" :class="{ ignite: ignite && !reduced }" role="img"
    :aria-label="`${Number(rating).toFixed(1)} out of 5`" :style="{ '--sz': size + 'px', '--gap': gap + 'px' }">
    <span v-for="i in 5" :key="i" class="fb-star" :style="{ '--i': i - 1 }">
      <span class="fb-star-bg">★</span>
      <span class="fb-star-fg" :style="{ width: fill(i) + '%' }">★</span>
    </span>
  </span>
</template>

<script setup>
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  rating: { type: Number, default: 0 },
  size: { type: Number, default: 16 },
  gap: { type: Number, default: 2 },
  ignite: { type: Boolean, default: false }, // sequential pop-in on mount
})
const reduced = prefersReduced()

const fill = (i) => {
  const r = Math.max(0, Math.min(5, Number(props.rating) || 0))
  return Math.max(0, Math.min(1, r - (i - 1))) * 100
}
</script>

<style scoped>
.fb-stars { display: inline-flex; gap: var(--gap, 2px); line-height: 1; }
.fb-star { position: relative; display: inline-block; width: var(--sz, 16px); height: var(--sz, 16px);
  font-size: var(--sz, 16px); line-height: 1; }
.fb-star-bg { color: var(--trn-border-strong); }
.fb-star-fg { position: absolute; inset: 0; overflow: hidden; white-space: nowrap; color: var(--trn-star);
  text-shadow: 0 0 6px var(--trn-dome-glow); }

/* sequential ignite — pure CSS, no IntersectionObserver (cheap for many instances) */
.fb-stars.ignite .fb-star { animation: fb-ignite 0.5s var(--trn-spring) backwards;
  animation-delay: calc(var(--i) * 0.08s + 0.1s); }
@keyframes fb-ignite {
  0% { opacity: 0; transform: scale(0.3) rotate(-30deg); }
  55% { opacity: 1; transform: scale(1.22) rotate(4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@media (prefers-reduced-motion: reduce) {
  .fb-stars.ignite .fb-star { animation: none; }
}
</style>
