<template>
  <div class="trn-orbit-meter" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`">
      <circle :cx="c" :cy="c" :r="r" fill="none" :stroke-width="stroke" stroke="var(--trn-border-strong)" />
      <circle class="ring" :cx="c" :cy="c" :r="r" fill="none" :stroke-width="stroke"
        :stroke="strokeColor" stroke-linecap="round"
        :stroke-dasharray="circ" :stroke-dashoffset="offset"
        :transform="`rotate(-90 ${c} ${c})`" />
    </svg>
    <div class="om-center">
      <span class="om-val trn-mono">{{ Math.round(pct) }}<i>%</i></span>
      <span v-if="label" class="om-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  pct: { type: Number, default: 0 },
  size: { type: Number, default: 92 },
  stroke: { type: Number, default: 7 },
  color: { type: String, default: 'var(--trn-amber)' },
  label: { type: String, default: '' },
})
const c = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - props.stroke)
const circ = computed(() => 2 * Math.PI * r.value)
const offset = computed(() => circ.value * (1 - Math.max(0, Math.min(100, props.pct)) / 100))
const strokeColor = computed(() => props.color)
</script>

<style scoped>
.trn-orbit-meter { position: relative; }
.trn-orbit-meter svg { width: 100%; height: 100%; }
.ring { transition: stroke-dashoffset 1s var(--trn-spring); filter: drop-shadow(0 0 5px var(--trn-dome-glow)); }
.om-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
.om-val { font-size: 19px; font-weight: 800; color: var(--trn-text); line-height: 1; }
.om-val i { font-size: 11px; font-style: normal; color: var(--trn-text-muted); margin-left: 1px; }
.om-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--trn-text-dim); margin-top: 3px; }
@media (prefers-reduced-motion: reduce) { .ring { transition: none; } }
</style>
