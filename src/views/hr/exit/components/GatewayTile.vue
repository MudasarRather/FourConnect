<template>
  <div class="gt-shell" :style="{ '--i': index }">
    <button ref="cardRef" class="gt" type="button" @click="$emit('activate')">
      <span class="gt-glare" aria-hidden="true" />
      <span class="gt-spine" :style="{ '--c': hex }" aria-hidden="true" />
      <span class="gt-ico" :style="{ '--c': hex }"><component :is="icon" :size="18" /></span>
      <span class="gt-lab">{{ label }}</span>
      <span v-if="count" class="gt-badge"><ExCountUp :value="count" /></span>
      <span v-if="alert" class="gt-ping" :style="{ '--c': hex }" aria-hidden="true" />
      <ArrowUpRight class="gt-arrow" :size="14" />
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowUpRight } from 'lucide-vue-next'
import ExCountUp from './ExCountUp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  icon: { type: [Object, Function], default: null },
  label: { type: String, default: '' },
  hex: { type: String, default: '#fb923c' },
  count: { type: Number, default: 0 },
  alert: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})
defineEmits(['activate'])

const cardRef = ref(null)
usePointerSpotlight(cardRef)
</script>

<style scoped>
.gt-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.04s); }
.gt {
  position: relative; overflow: hidden; width: 100%; display: flex; align-items: center; gap: 11px;
  padding: 13px 14px; border-radius: 15px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border);
  transition: transform 0.25s var(--ex-spring), border-color 0.25s, box-shadow 0.25s;
  transform-style: preserve-3d;
}
.gt:hover {
  border-color: color-mix(in srgb, var(--ex-violet) 36%, transparent);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.34);
  transform: perspective(900px)
    rotateX(calc((var(--my, 0.5) - 0.5) * -7deg))
    rotateY(calc((var(--mx, 0.5) - 0.5) * 10deg))
    translateY(-3px);
}
.gt-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(220px 140px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(255, 240, 214, 0.16), transparent 62%); }
.gt-spine { position: absolute; left: 0; top: 12%; bottom: 12%; width: 3px; border-radius: 0 3px 3px 0;
  background: var(--c); opacity: 0.85; box-shadow: 0 0 10px var(--c); }
.gt-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  transition: transform 0.25s var(--ex-spring); }
.gt:hover .gt-ico { transform: translateZ(14px) scale(1.05); }
.gt-lab { font-size: 12.5px; font-weight: 700; color: var(--ex-text); }
.gt-badge { margin-left: auto; font-family: var(--ex-mono); font-size: 11px; font-weight: 800; color: var(--ex-violet);
  background: var(--ex-violet-soft); padding: 2px 8px; border-radius: 999px; border: 1px solid var(--ex-violet-border); }
.gt-arrow { position: absolute; right: 11px; bottom: 10px; color: var(--ex-text-dim); opacity: 0; transform: translate(-3px, 3px);
  transition: opacity 0.25s, transform 0.25s var(--ex-spring); }
.gt:hover .gt-arrow { opacity: 0.8; transform: translate(0, 0); }
.gt-ping { position: absolute; top: 9px; right: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); animation: ex-node-ping 2s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .gt-shell { animation: none; }
  .gt:hover { transform: translateY(-2px); }
  .gt:hover .gt-ico { transform: none; }
  .gt-ping { animation: none; }
}
</style>
