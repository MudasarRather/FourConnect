<template>
  <div ref="el" class="nca" :class="{ over: overdue }">
    <svg viewBox="0 0 120 70" class="nca-svg">
      <path d="M10 62 A 50 50 0 0 1 110 62" class="nca-track" />
      <path d="M10 62 A 50 50 0 0 1 110 62" class="nca-fill" :class="{ drawn: visible }"
        :style="{ '--frac': frac, stroke: overdue ? 'var(--ex-blocked)' : 'url(#ncaGrad)' }" />
      <defs>
        <linearGradient id="ncaGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#34d399" /><stop offset="60%" stop-color="#fbbf24" /><stop offset="100%" stop-color="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
    <div class="nca-center">
      <span class="nca-val">{{ overdue ? `+${-days}` : days }}</span>
      <span class="nca-lab">{{ overdue ? 'overdue' : 'days left' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  days: { type: Number, default: 0 },        // days remaining (negative = overdue)
  total: { type: Number, default: 30 },      // required notice days
})
const el = ref(null)
const { visible } = useInView(el, { threshold: 0.3 })
const overdue = computed(() => props.days < 0)
const frac = computed(() => {
  if (overdue.value) return 1
  const t = Math.max(1, props.total)
  return Math.max(0, Math.min(1, 1 - props.days / t))   // elapsed share
})
</script>

<style scoped>
.nca { position: relative; width: 120px; height: 70px; flex-shrink: 0; }
.nca-svg { width: 100%; height: 100%; }
.nca-track { fill: none; stroke: var(--ex-steel-soft); stroke-width: 7; stroke-linecap: round; }
.nca-fill { fill: none; stroke-width: 7; stroke-linecap: round; stroke-dasharray: 157;
  stroke-dashoffset: 157; }
.nca-fill.drawn { animation: nca-draw 1.1s var(--ex-spring) forwards; }
@keyframes nca-draw { to { stroke-dashoffset: calc(157 * (1 - var(--frac))); } }
.nca-center { position: absolute; left: 0; right: 0; bottom: 4px; display: flex; flex-direction: column; align-items: center; }
.nca-val { font-family: var(--ex-mono); font-size: 20px; font-weight: 850; line-height: 1; color: var(--ex-text); }
.nca.over .nca-val { color: var(--ex-blocked); }
.nca-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-muted); }
@media (prefers-reduced-motion: reduce) { .nca-fill.drawn { animation: none; stroke-dashoffset: calc(157 * (1 - var(--frac))); } }
</style>
