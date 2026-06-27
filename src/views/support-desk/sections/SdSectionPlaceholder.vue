<template>
  <Motion
    as="section"
    class="sd-ph"
    :initial="{ opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
  >
    <div class="sd-ph-card sd-card sd-grain">
      <div class="sd-ph-glyph" aria-hidden="true">
        <component :is="icon" :size="30" />
        <span class="sd-ph-ring" />
        <span class="sd-ph-ring sd-ph-ring--2" />
      </div>
      <p class="sd-ph-eyebrow"><span class="sd-eyebrow-dot" />{{ phase }}</p>
      <h2 class="sd-ph-title">{{ label }}</h2>
      <p class="sd-ph-blurb">{{ blurb }}</p>
      <div class="sd-ph-meter" aria-hidden="true"><span class="sd-ph-fill" /></div>
      <p class="sd-ph-note">This section is scaffolded — its workspace lands in an upcoming build phase.</p>
    </div>
  </Motion>
</template>

<script setup>
import { Motion } from 'motion-v'
import { CircleDashed } from 'lucide-vue-next'

defineProps({
  label: { type: String, default: 'Section' },
  icon: { type: [Object, Function], default: () => CircleDashed },
  blurb: { type: String, default: 'A cinematic, fully-animated workspace will live here.' },
  phase: { type: String, default: 'SUPPORT DESK · UPCOMING' },
})
</script>

<style scoped>
.sd-ph { display: grid; place-items: center; min-height: 420px; padding: 24px 0; }
.sd-ph-card {
  position: relative;
  width: min(560px, 92%);
  padding: 40px 36px;
  text-align: center;
  overflow: hidden;
}
.sd-ph-glyph {
  position: relative;
  width: 78px; height: 78px;
  margin: 0 auto 22px;
  display: grid; place-items: center;
  border-radius: 20px;
  color: var(--sd-amber);
  background: var(--sd-amber-soft);
  border: 1px solid var(--sd-amber-border);
}
.sd-ph-ring {
  position: absolute; inset: -8px;
  border-radius: 24px;
  border: 1px solid var(--sd-amber-border);
  opacity: 0.5;
  animation: sd-pulse-ring 3s ease-out infinite;
}
.sd-ph-ring--2 { inset: -16px; border-radius: 30px; animation-delay: 1.5s; opacity: 0.3; }

.sd-ph-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--sd-mono);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--sd-amber);
  margin: 0 0 10px;
}
.sd-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--sd-ember); box-shadow: 0 0 10px var(--sd-fluid-glow);
}
.sd-ph-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); margin: 0 0 10px; }
.sd-ph-blurb { font-size: 14px; color: var(--sd-text-secondary); margin: 0 auto 22px; max-width: 42ch; line-height: 1.55; }

.sd-ph-meter {
  height: 4px; border-radius: 999px; overflow: hidden;
  background: var(--sd-amber-soft);
  width: 60%; margin: 0 auto 16px;
}
.sd-ph-fill {
  display: block; height: 100%; width: 38%;
  background: var(--sd-grad-rail); background-size: 200% 100%;
  border-radius: inherit;
  animation: sd-rail-flow 2.4s linear infinite;
}
.sd-ph-note { font-size: 11.5px; color: var(--sd-text-dim); margin: 0; font-family: var(--sd-mono); }

@media (prefers-reduced-motion: reduce) {
  .sd-ph-ring, .sd-ph-fill { animation: none !important; }
}
</style>
