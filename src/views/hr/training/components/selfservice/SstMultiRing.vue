<template>
  <div class="mr" ref="rootRef" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`">
      <defs>
        <filter :id="glowId" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g v-for="(r, i) in rs" :key="i">
        <circle :cx="c" :cy="c" :r="r.radius" fill="none" stroke="var(--trn-heat-0)" :stroke-width="stroke" />
        <circle class="mr-arc" :cx="c" :cy="c" :r="r.radius" fill="none" :stroke="r.color" :stroke-width="stroke"
          stroke-linecap="round" :stroke-dasharray="r.circ" :stroke-dashoffset="shown ? r.offset : r.circ"
          :transform="`rotate(-90 ${c} ${c})`" :filter="`url(#${glowId})`" :style="{ transitionDelay: (0.12 + i * 0.14) + 's' }" />
      </g>
    </svg>
    <div class="mr-center">
      <span class="mr-val trn-mono"><TrnCountUp :value="center.value || 0" :decimals="center.decimals || 0" /><i>{{ center.suffix || '' }}</i></span>
      <span v-if="center.label" class="mr-label">{{ center.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TrnCountUp from '../TrnCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  rings: { type: Array, default: () => [] }, // [{ pct, color, label }]
  size: { type: Number, default: 168 },
  stroke: { type: Number, default: 9 },
  gap: { type: Number, default: 6 },
  center: { type: Object, default: () => ({}) },
})

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.3 })
const shown = computed(() => visible.value)
const c = computed(() => props.size / 2)
const glowId = `mrg-${Math.round(props.size)}-${props.rings.length}`

const rs = computed(() => props.rings.map((r, i) => {
  const radius = props.size / 2 - props.stroke / 2 - 1 - i * (props.stroke + props.gap)
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, Number(r.pct) || 0))
  return { radius, circ, offset: circ * (1 - pct / 100), color: r.color }
}))
</script>

<style scoped>
.mr { position: relative; }
.mr svg { width: 100%; height: 100%; transform: rotate(0); }
.mr-arc { transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
.mr-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.mr-val { font-size: 26px; font-weight: 850; color: var(--trn-text); line-height: 1; letter-spacing: -0.02em; }
.mr-val i { font-size: 13px; font-style: normal; color: var(--trn-text-muted); margin-left: 1px; }
.mr-label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--trn-text-dim); margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .mr-arc { transition: none; } }
</style>
