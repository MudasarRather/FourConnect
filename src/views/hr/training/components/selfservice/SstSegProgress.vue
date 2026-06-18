<template>
  <div class="sp" ref="rootRef" :style="{ '--c': color }">
    <span v-for="n in segments" :key="n" class="sp-seg" :class="{ on: shown && n <= lit }"
      :style="{ transitionDelay: (0.04 * n) + 's' }" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  pct: { type: Number, default: 0 },
  color: { type: String, default: 'var(--trn-amber)' },
  segments: { type: Number, default: 14 },
})
const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.4 })
const shown = computed(() => visible.value)
const lit = computed(() => Math.round(Math.max(0, Math.min(100, props.pct)) / 100 * props.segments))
</script>

<style scoped>
.sp { display: flex; gap: 3px; align-items: center; width: 100%; }
.sp-seg { flex: 1; height: 7px; border-radius: 3px; background: var(--trn-heat-0);
  transition: background 0.35s ease, box-shadow 0.35s ease, transform 0.35s var(--trn-spring); transform: scaleY(0.55); transform-origin: bottom; }
.sp-seg.on { background: var(--c); box-shadow: 0 0 8px -1px var(--c); transform: scaleY(1); }
@media (prefers-reduced-motion: reduce) { .sp-seg { transition: none; } }
</style>
