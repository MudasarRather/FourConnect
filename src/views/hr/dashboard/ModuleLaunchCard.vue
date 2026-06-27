<template>
  <Motion as="div" class="mlc-shell"
    :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.04 * (index % 8), ease: [0.16, 1, 0.3, 1] }">
    <button ref="card" type="button" class="mlc" :style="{ '--tone': mod.color, '--soft': mod.soft }"
      @click="$emit('go', mod.target)">
      <span class="mlc-glare" aria-hidden="true" />
      <span class="mlc-spine" aria-hidden="true" />
      <header class="mlc-top">
        <span class="mlc-ic"><component :is="mod.icon" :size="19" /></span>
        <span class="mlc-go"><ArrowUpRight :size="15" /></span>
      </header>
      <span class="mlc-name">{{ mod.name }}</span>
      <span class="mlc-tag">{{ mod.tagline }}</span>
      <span class="mlc-stat">
        <span class="mlc-stat-val hr-mono">{{ mod.stat }}</span>
        <span class="mlc-stat-lab">{{ mod.statLabel }}</span>
      </span>
    </button>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { ArrowUpRight } from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  mod: { type: Object, required: true },
  index: { type: Number, default: 0 },
})
defineEmits(['go'])
const reduced = prefersReduced()
const card = ref(null)
usePointerSpotlight(card)
</script>

<style scoped>
.mlc-shell { height: 100%; }
.mlc {
  position: relative; width: 100%; height: 100%; min-height: 134px;
  display: flex; flex-direction: column; gap: 4px; text-align: left; cursor: pointer; font: inherit;
  padding: 15px 16px 14px; border-radius: 16px; overflow: hidden;
  background: var(--hr-surface); border: 1px solid var(--hr-border);
  --mx: 0.5; --my: 0.5; --spot: 0;
  transition: border-color 0.3s var(--hr-spring), box-shadow 0.3s var(--hr-spring), transform 0.3s var(--hr-spring);
  transform: perspective(900px) rotateX(0) rotateY(0);
}
.mlc:hover {
  border-color: color-mix(in srgb, var(--tone) 45%, transparent);
  box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--tone) 70%, transparent);
  transform: perspective(900px) rotateX(calc((var(--my) - 0.5) * -7deg)) rotateY(calc((var(--mx) - 0.5) * 9deg)) translateY(-3px);
}
.mlc-glare { position: absolute; inset: 0; pointer-events: none; border-radius: inherit; opacity: var(--spot, 0); transition: opacity 0.25s;
  background: radial-gradient(220px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--tone) 22%, transparent), transparent 60%); }
.mlc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--tone); box-shadow: 0 0 12px color-mix(in srgb, var(--tone) 60%, transparent); opacity: 0.85; }

.mlc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.mlc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--tone);
  background: color-mix(in srgb, var(--tone) 15%, transparent); border: 1px solid color-mix(in srgb, var(--tone) 26%, transparent); }
.mlc-go { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--hr-text-dim); transition: color 0.25s, background 0.25s, transform 0.25s var(--hr-spring); }
.mlc:hover .mlc-go { color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); transform: translate(2px, -2px); }

.mlc-name { font-size: 15px; font-weight: 750; color: var(--hr-text); letter-spacing: -0.01em; }
.mlc-tag { font-size: 11px; color: var(--hr-text-muted); line-height: 1.35; }
.mlc-stat { display: flex; align-items: baseline; gap: 6px; margin-top: auto; padding-top: 10px; }
.mlc-stat-val { font-size: 17px; font-weight: 850; color: var(--tone); letter-spacing: -0.01em; }
.mlc-stat-lab { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--hr-text-dim); }

@media (prefers-reduced-motion: reduce) { .mlc, .mlc:hover { transform: none !important; } }
</style>
