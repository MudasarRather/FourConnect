<template>
  <!-- Charged step-conduit: the wizard nav. Flowing rail charges to the current step;
       nodes ignite as they complete; the active node pulses. Click a reached node to
       jump. Core-level animation (motion-v nodes + CSS rail flow). -->
  <nav class="sd-stepper" :style="{ '--prog': progFill }" aria-label="Create-ticket steps">
    <span class="ss-rail" aria-hidden="true"><span class="ss-charge" /></span>
    <Motion
      v-for="(s, i) in steps" :key="s.key"
      as="button" type="button"
      class="ss-node"
      :class="{ done: s.done, active: i === current, reachable: i <= reached && i !== current }"
      :disabled="i > reached"
      :initial="{ opacity: 0, y: 10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.42, delay: 0.04 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
      :whileHover="i <= reached ? { y: -2 } : {}"
      :whileTap="i <= reached ? { scale: 0.94 } : {}"
      @click="i <= reached && emit('jump', i)"
    >
      <span class="ss-dot">
        <component :is="s.done && i !== current ? Check : (s.icon || Circle)" :size="14" />
        <span class="ss-ping" aria-hidden="true" />
      </span>
      <span class="ss-meta">
        <span class="ss-no">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="ss-lbl">{{ s.label }}</span>
      </span>
    </Motion>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, Circle } from 'lucide-vue-next'

const props = defineProps({
  steps: { type: Array, default: () => [] },   // [{ key, label, icon, done }]
  current: { type: Number, default: 0 },
  reached: { type: Number, default: 0 },        // furthest step the user may jump to
})
const emit = defineEmits(['jump'])

const progFill = computed(() => {
  const n = props.steps.length
  return n > 1 ? `${(Math.max(0, props.current) / (n - 1)) * 100}%` : '0%'
})
</script>

<style scoped>
.sd-stepper { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; width: 100%; }
.ss-rail { position: absolute; top: 17px; left: 22px; right: 22px; height: 2px; background: color-mix(in srgb, var(--sd-border-strong) 90%, transparent); border-radius: 2px; overflow: hidden; }
.ss-charge { position: absolute; inset: 0 auto 0 0; width: var(--prog, 0%); background: var(--sd-grad-rail); background-size: 200% 100%; box-shadow: 0 0 12px color-mix(in srgb, var(--sd-ember) 60%, transparent); transition: width 0.55s var(--sd-spring); animation: sd-rail-flow 3s linear infinite; }

.ss-node { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; flex: 1; min-width: 0; background: none; border: 0; padding: 0; cursor: pointer; font-family: inherit; }
.ss-node[disabled] { cursor: default; }
.ss-dot { position: relative; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: var(--sd-text-muted); background: var(--sd-surface-elevated); border: 1.5px solid var(--sd-border-strong); transition: all 0.3s var(--sd-spring); }
.ss-node.reachable:hover .ss-dot { border-color: var(--sd-amber-border); color: var(--sd-amber); }
.ss-node.done .ss-dot { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }
.ss-node.active .ss-dot { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; box-shadow: 0 0 0 5px var(--sd-amber-soft), 0 8px 22px rgba(251, 146, 60, 0.3); transform: scale(1.1); }
[data-theme="light"] .ss-node.active .ss-dot { color: #fff8ec; }
.ss-node.done.active .ss-dot { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; }
[data-theme="light"] .ss-node.done.active .ss-dot { color: #fff8ec; }

/* active pulse ring */
.ss-ping { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-amber) 55%, transparent); opacity: 0; }
.ss-node.active .ss-ping { animation: ss-ping 1.9s var(--sd-spring) infinite; }

.ss-meta { display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 0; }
.ss-no { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.ss-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.01em; color: var(--sd-text-muted); white-space: nowrap; transition: color 0.25s; }
.ss-node.active .ss-lbl { color: var(--sd-text); }
.ss-node.active .ss-no { color: var(--sd-amber); }
.ss-node.done .ss-lbl { color: var(--sd-text-secondary); }

@keyframes ss-ping { 0% { opacity: 0.75; transform: scale(1); } 70%, 100% { opacity: 0; transform: scale(1.5); } }

@media (max-width: 640px) { .ss-lbl, .ss-no { display: none; } .ss-rail { top: 17px; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ss-charge { animation: none; }
  html:not([data-cinematic="on"]) .ss-node.active .ss-ping { animation: none; }
}
</style>
