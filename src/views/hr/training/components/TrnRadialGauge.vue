<template>
  <div class="rg" ref="rootRef">
    <div class="rg-dial">
      <span class="rg-aura" aria-hidden="true" />
      <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="rg-svg">
        <g v-for="(r, i) in rings" :key="i">
          <circle class="rg-track" :cx="C" :cy="C" :r="radius(i)" fill="none" :stroke-width="STROKE" />
          <circle class="rg-arc" :cx="C" :cy="C" :r="radius(i)" fill="none" :stroke-width="STROKE"
            stroke-linecap="round"
            :stroke-dasharray="circ(i)"
            :stroke-dashoffset="visible ? offset(i, r.value) : circ(i)"
            :style="{ stroke: r.color, transitionDelay: (0.15 + i * 0.16) + 's' }"
            :transform="`rotate(-90 ${C} ${C})`" />
        </g>
      </svg>
      <div class="rg-center">
        <span class="rg-val"><TrnCountUp :value="center.value || 0" :suffix="center.suffix || ''" /></span>
        <span class="rg-lab">{{ center.label }}</span>
      </div>
    </div>
    <ul class="rg-legend">
      <li v-for="(r, i) in rings" :key="i" :style="{ '--d': (0.2 + i * 0.1) + 's' }">
        <span class="rg-dot" :style="{ background: r.color, boxShadow: `0 0 9px ${r.color}` }" />
        <span class="rg-name">{{ r.label }}</span>
        <span class="rg-pct trn-mono" :style="{ color: r.color }">{{ Math.round(r.value) }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TrnCountUp from './TrnCountUp.vue'
import { useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  rings: { type: Array, default: () => [] }, // [{ label, value(0-100), color }]
  center: { type: Object, default: () => ({ value: 0, label: '', suffix: '%' }) },
})

const SIZE = 158
const C = SIZE / 2
const STROKE = 9
const GAP = 4.5

const rootRef = ref(null)
const { visible } = useInView(rootRef, { threshold: 0.3 })

const radius = (i) => (SIZE / 2 - STROKE / 2 - 1) - i * (STROKE + GAP)
const circ = (i) => 2 * Math.PI * radius(i)
const offset = (i, v) => circ(i) * (1 - Math.max(0, Math.min(100, v)) / 100)
</script>

<style scoped>
.rg { display: flex; flex-direction: column; align-items: center; gap: 18px; height: 100%; justify-content: center; padding: 4px 0; }
.rg-dial { position: relative; width: 158px; height: 158px; flex-shrink: 0; }
.rg-aura { position: absolute; inset: 14px; border-radius: 50%; background: radial-gradient(circle, var(--trn-dome-glow), transparent 70%);
  animation: rg-breathe 5s ease-in-out infinite; }
.rg-svg { position: relative; width: 100%; height: 100%; }
.rg-track { stroke: var(--trn-border-strong); opacity: 0.45; }
.rg-arc { transition: stroke-dashoffset 1.25s var(--trn-spring); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--trn-amber) 28%, transparent)); }
.rg-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-align: center; }
.rg-val { font-family: var(--trn-mono); font-size: 30px; font-weight: 800; line-height: 1; color: var(--trn-text); letter-spacing: -0.02em; }
.rg-lab { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-text-dim); }

.rg-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; width: 100%; max-width: 232px; }
.rg-legend li { display: flex; align-items: center; gap: 10px; font-size: 11.5px;
  opacity: 0; transform: translateY(6px); animation: rg-legend-in 0.5s var(--trn-spring) forwards; animation-delay: var(--d, 0.2s); }
.rg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rg-name { flex: 1; min-width: 0; color: var(--trn-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rg-pct { font-weight: 700; font-size: 12px; min-width: 38px; text-align: right; flex-shrink: 0; }

@keyframes rg-breathe { 0%, 100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.05); } }
@keyframes rg-legend-in { to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .rg-arc { transition: none; }
  .rg-aura { animation: none; }
  .rg-legend li { animation: none; opacity: 1; transform: none; }
}
</style>
