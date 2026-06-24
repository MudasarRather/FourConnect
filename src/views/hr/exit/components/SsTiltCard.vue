<template>
  <!-- Reusable cinematic card: staggered entrance + hover-lift + 3D pointer-tilt
       + spotlight glare + a status-accent spine. Slot keeps the page's scoped
       styles intact (slotted markup belongs to the parent). -->
  <Motion ref="rootRef" as="article" class="sstc ex-grain" :style="{ '--accent': accent }"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :whileHover="reduced ? {} : { y: -3 }"
    :transition="{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }">
    <span class="sstc-spine" aria-hidden="true" />
    <span class="sstc-glare" aria-hidden="true" />
    <div class="sstc-body"><slot /></div>
  </Motion>
</template>

<script setup>
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

defineProps({
  accent: { type: String, default: 'var(--ex-violet)' },
  delay: { type: Number, default: 0 },
})

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
</script>

<style scoped>
.sstc {
  position: relative; overflow: hidden; isolation: isolate; padding: 16px; border-radius: 18px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.sstc:hover { border-color: color-mix(in srgb, var(--accent) 34%, var(--ex-border-strong)); box-shadow: var(--ex-shadow-hover); }
.sstc-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent)); opacity: 0.85; }
.sstc-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s; z-index: 1;
  background: radial-gradient(380px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%); }
.sstc-body { position: relative; z-index: 2; transition: transform 0.3s var(--ex-spring); }
.sstc:hover .sstc-body {
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -4deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 6deg));
}
@media (prefers-reduced-motion: reduce) {
  .sstc, .sstc-body, .sstc-glare { transition: none; }
  .sstc:hover .sstc-body { transform: none; }
}
</style>
